# -*- coding: utf-8 -*-

from odoo import http
from odoo.http import request
from odoo.exceptions import ValidationError, AccessError
from datetime import datetime, timedelta
import json
import logging

_logger = logging.getLogger(__name__)


class SalametGrossessesController(http.Controller):
    """Contrôleur pour la gestion des grossesses SALAMET"""

    @http.route('/salamet/grossesses', type='http', auth='user', website=True)
    def liste_grossesses(self, **kwargs):
        """Page de liste des grossesses"""
        try:
            self._check_access()
            
            # Filtres
            filter_state = kwargs.get('state', 'en_cours')
            filter_risque = kwargs.get('risque', '')
            search = kwargs.get('search', '')
            
            domain = []
            
            if filter_state:
                domain.append(('state', '=', filter_state))
                
            if filter_risque:
                domain.append(('niveau_risque', '=', filter_risque))
                
            if search:
                domain.append(('patiente_id.name', 'ilike', search))

            # Pagination
            page = int(kwargs.get('page', 1))
            limit = 20
            offset = (page - 1) * limit

            grossesses = request.env['salamet.grossesse'].search(
                domain, limit=limit, offset=offset, order='date_debut desc'
            )
            total = request.env['salamet.grossesse'].search_count(domain)

            return request.render('salamet.grossesses_list_template', {
                'grossesses': grossesses,
                'total': total,
                'page': page,
                'total_pages': (total + limit - 1) // limit,
                'filter_state': filter_state,
                'filter_risque': filter_risque,
                'search': search
            })

        except Exception as e:
            _logger.error(f"Erreur liste grossesses: {str(e)}")
            return request.render('salamet.error_template',                                {'error': 'Erreur lors du chargement des grossesses'})

    @http.route('/salamet/grossesse/<int:grossesse_id>', type='http', auth='user', website=True)
    def detail_grossesse(self, grossesse_id, **kwargs):
        """Page de détail d'une grossesse"""
        try:
            self._check_access()
            
            grossesse = request.env['salamet.grossesse'].browse(grossesse_id)
            if not grossesse.exists():
                return request.not_found()

            # Récupérer les consultations liées
            consultations = request.env['salamet.consultation'].search([
                ('grossesse_id', '=', grossesse_id)
            ], order='date_consultation desc')

            # Récupérer les examens
            examens = request.env['salamet.examen'].search([
                ('grossesse_id', '=', grossesse_id)
            ], order='date_examen desc')

            # Calculer les statistiques
            stats = self._calculer_stats_grossesse(grossesse)

            return request.render('salamet.grossesse_detail_template', {
                'grossesse': grossesse,
                'consultations': consultations,
                'examens': examens,
                'stats': stats
            })

        except Exception as e:
            _logger.error(f"Erreur détail grossesse {grossesse_id}: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors du chargement de la grossesse'})

    @http.route('/salamet/grossesse/nouvelle', type='http', auth='user', website=True)
    def nouvelle_grossesse(self, **kwargs):
        """Page de création d'une nouvelle grossesse"""
        try:
            self._check_access()
            
            # Récupérer les patientes
            patientes = request.env['salamet.patiente'].search([])
            
            return request.render('salamet.grossesse_form_template', {
                'patientes': patientes,
                'mode': 'create'
            })

        except Exception as e:
            _logger.error(f"Erreur nouvelle grossesse: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors du chargement du formulaire'})

    @http.route('/salamet/grossesse/create', type='http', auth='user', methods=['POST'], csrf=True)
    def creer_grossesse(self, **kwargs):
        """Créer une nouvelle grossesse"""
        try:
            self._check_access()
            
            # Validation des données
            required_fields = ['patiente_id', 'date_debut', 'date_prevue_accouchement']
            for field in required_fields:
                if not kwargs.get(field):
                    raise ValidationError(f"Le champ {field} est requis")

            # Conversion des dates
            date_debut = datetime.strptime(kwargs['date_debut'], '%Y-%m-%d').date()
            date_prevue = datetime.strptime(kwargs['date_prevue_accouchement'], '%Y-%m-%d').date()

            # Créer la grossesse
            grossesse_vals = {
                'patiente_id': int(kwargs['patiente_id']),
                'date_debut': date_debut,
                'date_prevue_accouchement': date_prevue,
                'poids_avant_grossesse': float(kwargs.get('poids_avant_grossesse', 0)),
                'taille': float(kwargs.get('taille', 0)),
                'groupe_sanguin': kwargs.get('groupe_sanguin', ''),
                'antecedents_medicaux': kwargs.get('antecedents_medicaux', ''),
                'antecedents_obstetricaux': kwargs.get('antecedents_obstetricaux', ''),
                'notes': kwargs.get('notes', '')
            }

            grossesse = request.env['salamet.grossesse'].create(grossesse_vals)
            
            return request.redirect(f'/salamet/grossesse/{grossesse.id}')

        except ValidationError as e:
            _logger.warning(f"Validation erreur création grossesse: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': str(e)})
        except Exception as e:
            _logger.error(f"Erreur création grossesse: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors de la création de la grossesse'})

    @http.route('/salamet/grossesse/<int:grossesse_id>/edit', type='http', auth='user', website=True)
    def editer_grossesse(self, grossesse_id, **kwargs):
        """Page d'édition d'une grossesse"""
        try:
            self._check_access()
            
            grossesse = request.env['salamet.grossesse'].browse(grossesse_id)
            if not grossesse.exists():
                return request.not_found()

            patientes = request.env['salamet.patiente'].search([])
            
            return request.render('salamet.grossesse_form_template', {
                'grossesse': grossesse,
                'patientes': patientes,
                'mode': 'edit'
            })

        except Exception as e:
            _logger.error(f"Erreur édition grossesse {grossesse_id}: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors du chargement du formulaire'})

    @http.route('/salamet/grossesse/<int:grossesse_id>/update', type='http', auth='user', methods=['POST'], csrf=True)
    def modifier_grossesse(self, grossesse_id, **kwargs):
        """Modifier une grossesse"""
        try:
            self._check_access()
            
            grossesse = request.env['salamet.grossesse'].browse(grossesse_id)
            if not grossesse.exists():
                return request.not_found()

            # Préparer les valeurs de mise à jour
            update_vals = {}
            
            if kwargs.get('date_debut'):
                update_vals['date_debut'] = datetime.strptime(kwargs['date_debut'], '%Y-%m-%d').date()
            
            if kwargs.get('date_prevue_accouchement'):
                update_vals['date_prevue_accouchement'] = datetime.strptime(kwargs['date_prevue_accouchement'], '%Y-%m-%d').date()
            
            if kwargs.get('poids_avant_grossesse'):
                update_vals['poids_avant_grossesse'] = float(kwargs['poids_avant_grossesse'])
            
            if kwargs.get('taille'):
                update_vals['taille'] = float(kwargs['taille'])
            
            if kwargs.get('groupe_sanguin'):
                update_vals['groupe_sanguin'] = kwargs['groupe_sanguin']
            
            if kwargs.get('antecedents_medicaux'):
                update_vals['antecedents_medicaux'] = kwargs['antecedents_medicaux']
            
            if kwargs.get('antecedents_obstetricaux'):
                update_vals['antecedents_obstetricaux'] = kwargs['antecedents_obstetricaux']
            
            if kwargs.get('notes'):
                update_vals['notes'] = kwargs['notes']

            grossesse.write(update_vals)
            
            return request.redirect(f'/salamet/grossesse/{grossesse_id}')

        except Exception as e:
            _logger.error(f"Erreur modification grossesse {grossesse_id}: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors de la modification de la grossesse'})

    @http.route('/salamet/grossesse/<int:grossesse_id>/consultation/nouvelle', type='http', auth='user', website=True)
    def nouvelle_consultation(self, grossesse_id, **kwargs):
        """Page de création d'une nouvelle consultation"""
        try:
            self._check_access()
            
            grossesse = request.env['salamet.grossesse'].browse(grossesse_id)
            if not grossesse.exists():
                return request.not_found()

            return request.render('salamet.consultation_form_template', {
                'grossesse': grossesse,
                'mode': 'create'
            })

        except Exception as e:
            _logger.error(f"Erreur nouvelle consultation: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors du chargement du formulaire'})

    @http.route('/salamet/grossesse/<int:grossesse_id>/consultation/create', type='http', auth='user', methods=['POST'], csrf=True)
    def creer_consultation(self, grossesse_id, **kwargs):
        """Créer une nouvelle consultation"""
        try:
            self._check_access()
            
            grossesse = request.env['salamet.grossesse'].browse(grossesse_id)
            if not grossesse.exists():
                return request.not_found()

            # Validation des données
            required_fields = ['date_consultation', 'semaine_grossesse']
            for field in required_fields:
                if not kwargs.get(field):
                    raise ValidationError(f"Le champ {field} est requis")

            # Créer la consultation
            consultation_vals = {
                'grossesse_id': grossesse_id,
                'date_consultation': datetime.strptime(kwargs['date_consultation'], '%Y-%m-%d').date(),
                'semaine_grossesse': int(kwargs['semaine_grossesse']),
                'poids': float(kwargs.get('poids', 0)),
                'tension_systolique': int(kwargs.get('tension_systolique', 0)) if kwargs.get('tension_systolique') else False,
                'tension_diastolique': int(kwargs.get('tension_diastolique', 0)) if kwargs.get('tension_diastolique') else False,
                'hauteur_uterine': float(kwargs.get('hauteur_uterine', 0)) if kwargs.get('hauteur_uterine') else False,
                'bcf': int(kwargs.get('bcf', 0)) if kwargs.get('bcf') else False,
                'oedemes': kwargs.get('oedemes') == 'on',
                'proteinurie': kwargs.get('proteinurie') == 'on',
                'glycosurie': kwargs.get('glycosurie') == 'on',
                'plaintes': kwargs.get('plaintes', ''),
                'observations': kwargs.get('observations', ''),
                'recommandations': kwargs.get('recommandations', ''),
                'prochain_rdv': datetime.strptime(kwargs['prochain_rdv'], '%Y-%m-%d').date() if kwargs.get('prochain_rdv') else False
            }

            consultation = request.env['salamet.consultation'].create(consultation_vals)
            
            return request.redirect(f'/salamet/grossesse/{grossesse_id}')

        except ValidationError as e:
            _logger.warning(f"Validation erreur création consultation: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': str(e)})
        except Exception as e:
            _logger.error(f"Erreur création consultation: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors de la création de la consultation'})

    @http.route('/salamet/grossesse/<int:grossesse_id>/terminer', type='http', auth='user', methods=['POST'], csrf=True)
    def terminer_grossesse(self, grossesse_id, **kwargs):
        """Terminer une grossesse"""
        try:
            self._check_access()
            
            grossesse = request.env['salamet.grossesse'].browse(grossesse_id)
            if not grossesse.exists():
                return request.not_found()

            # Validation des données
            required_fields = ['date_accouchement', 'type_accouchement', 'issue_grossesse']
            for field in required_fields:
                if not kwargs.get(field):
                    raise ValidationError(f"Le champ {field} est requis")

            # Mettre à jour la grossesse
            update_vals = {
                'state': 'terminee',
                'date_accouchement': datetime.strptime(kwargs['date_accouchement'], '%Y-%m-%d').date(),
                'type_accouchement': kwargs['type_accouchement'],
                'issue_grossesse': kwargs['issue_grossesse'],
                'complications': kwargs.get('complications', ''),
                'notes_accouchement': kwargs.get('notes_accouchement', '')
            }

            # Informations sur le bébé si naissance vivante
            if kwargs['issue_grossesse'] == 'vivante':
                if kwargs.get('poids_bebe'):
                    update_vals['poids_bebe'] = float(kwargs['poids_bebe'])
                if kwargs.get('taille_bebe'):
                    update_vals['taille_bebe'] = float(kwargs['taille_bebe'])
                if kwargs.get('sexe_bebe'):
                    update_vals['sexe_bebe'] = kwargs['sexe_bebe']
                if kwargs.get('apgar_1min'):
                    update_vals['apgar_1min'] = int(kwargs['apgar_1min'])
                if kwargs.get('apgar_5min'):
                    update_vals['apgar_5min'] = int(kwargs['apgar_5min'])

            grossesse.write(update_vals)
            
            return request.redirect(f'/salamet/grossesse/{grossesse_id}')

        except ValidationError as e:
            _logger.warning(f"Validation erreur terminer grossesse: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': str(e)})
        except Exception as e:
            _logger.error(f"Erreur terminer grossesse {grossesse_id}: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors de la finalisation de la grossesse'})

    @http.route('/salamet/api/grossesses/stats', type='json', auth='user')
    def stats_grossesses(self, **kwargs):
        """API pour les statistiques des grossesses"""
        try:
            self._check_access()
            
            # Statistiques générales
            total_grossesses = request.env['salamet.grossesse'].search_count([])
            grossesses_en_cours = request.env['salamet.grossesse'].search_count([('state', '=', 'en_cours')])
            grossesses_terminees = request.env['salamet.grossesse'].search_count([('state', '=', 'terminee')])
            grossesses_risque = request.env['salamet.grossesse'].search_count([('niveau_risque', '!=', 'faible')])

            # Statistiques par mois (6 derniers mois)
            stats_mensuelles = []
            for i in range(6):
                date_debut = datetime.now().replace(day=1) - timedelta(days=30*i)
                date_fin = (date_debut + timedelta(days=32)).replace(day=1) - timedelta(days=1)
                
                count = request.env['salamet.grossesse'].search_count([
                    ('date_debut', '>=', date_debut.strftime('%Y-%m-%d')),
                    ('date_debut', '<=', date_fin.strftime('%Y-%m-%d'))
                ])
                
                stats_mensuelles.append({
                    'mois': date_debut.strftime('%Y-%m'),
                    'count': count
                })

            return {
                'success': True,
                'data': {
                    'total_grossesses': total_grossesses,
                    'grossesses_en_cours': grossesses_en_cours,
                    'grossesses_terminees': grossesses_terminees,
                    'grossesses_risque': grossesses_risque,
                    'stats_mensuelles': list(reversed(stats_mensuelles))
                }
            }

        except Exception as e:
            _logger.error(f"Erreur stats grossesses: {str(e)}")
            return {'success': False, 'error': str(e)}

    def _check_access(self):
        """Vérifier les droits d'accès"""
        if not request.env.user.has_group('salamet.group_salamet_user'):
            raise AccessError("Accès non autorisé")

    def _calculer_stats_grossesse(self, grossesse):
        """Calculer les statistiques d'une grossesse"""
        try:
            stats = {
                'nb_consultations': len(grossesse.consultation_ids),
                'nb_examens': len(grossesse.examen_ids),
                'semaine_actuelle': grossesse.semaine_actuelle,
                'jours_restants': (grossesse.date_prevue_accouchement - datetime.now().date()).days if grossesse.date_prevue_accouchement else 0
            }

            # Dernière consultation
            if grossesse.consultation_ids:
                derniere_consultation = grossesse.consultation_ids.sorted('date_consultation', reverse=True)[0]
                stats['derniere_consultation'] = derniere_consultation.date_consultation
                stats['dernier_poids'] = derniere_consultation.poids
                stats['derniere_tension'] = f"{derniere_consultation.tension_systolique}/{derniere_consultation.tension_diastolique}" if derniere_consultation.tension_systolique else None

            # Prise de poids
            if grossesse.consultation_ids and grossesse.poids_avant_grossesse:
                poids_actuel = grossesse.consultation_ids.sorted('date_consultation', reverse=True)[0].poids
                if poids_actuel:
                    stats['prise_poids'] = poids_actuel - grossesse.poids_avant_grossesse

            return stats

        except Exception as e:
            _logger.error(f"Erreur calcul stats grossesse: {str(e)}")
            return {}

