# -*- coding: utf-8 -*-

from odoo import http
from odoo.http import request
from odoo.exceptions import ValidationError, AccessError
from datetime import datetime, timedelta
import json
import logging

_logger = logging.getLogger(__name__)


class SalametConsultationsController(http.Controller):
    """Contrôleur pour la gestion des consultations SALAMET"""

    @http.route('/salamet/consultations', type='http', auth='user', website=True)
    def liste_consultations(self, **kwargs):
        """Page de liste des consultations"""
        try:
            self._check_access()
            
            # Filtres
            filter_date = kwargs.get('date', datetime.now().strftime('%Y-%m-%d'))
            filter_type = kwargs.get('type', '')
            filter_patiente = kwargs.get('patiente', '')
            search = kwargs.get('search', '')
            
            domain = []
            
            if filter_date:
                domain.append(('date_consultation', '=', filter_date))
                
            if filter_type:
                domain.append(('type_consultation', '=', filter_type))
                
            if filter_patiente:
                domain.append(('grossesse_id.patiente_id.id', '=', int(filter_patiente)))
                
            if search:
                domain.append(('grossesse_id.patiente_id.name', 'ilike', search))

            # Pagination
            page = int(kwargs.get('page', 1))
            limit = 20
            offset = (page - 1) * limit

            consultations = request.env['salamet.consultation'].search(
                domain, limit=limit, offset=offset, order='date_consultation desc, heure_consultation desc'
            )
            total = request.env['salamet.consultation'].search_count(domain)

            # Données pour les filtres
            patientes = request.env['salamet.patiente'].search([])
            types_consultation = request.env['salamet.consultation']._fields['type_consultation'].selection

            return request.render('salamet.consultations_list_template', {
                'consultations': consultations,
                'total': total,
                'page': page,
                'total_pages': (total + limit - 1) // limit,
                'filter_date': filter_date,
                'filter_type': filter_type,
                'filter_patiente': int(filter_patiente) if filter_patiente else '',
                'search': search,
                'patientes': patientes,
                'types_consultation': types_consultation
            })

        except Exception as e:
            _logger.error(f"Erreur liste consultations: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors du chargement des consultations'})

    @http.route('/salamet/consultation/<int:consultation_id>', type='http', auth='user', website=True)
    def detail_consultation(self, consultation_id, **kwargs):
        """Page de détail d'une consultation"""
        try:
            self._check_access()
            
            consultation = request.env['salamet.consultation'].browse(consultation_id)
            if not consultation.exists():
                return request.not_found()

            # Historique des consultations de la même grossesse
            consultations_precedentes = request.env['salamet.consultation'].search([
                ('grossesse_id', '=', consultation.grossesse_id.id),
                ('date_consultation', '<', consultation.date_consultation)
            ], order='date_consultation desc', limit=5)

            # Calculs et analyses
            analyses = self._analyser_consultation(consultation)

            return request.render('salamet.consultation_detail_template', {
                'consultation': consultation,
                'consultations_precedentes': consultations_precedentes,
                'analyses': analyses
            })

        except Exception as e:
            _logger.error(f"Erreur détail consultation {consultation_id}: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors du chargement de la consultation'})

    @http.route('/salamet/consultation/<int:consultation_id>/edit', type='http', auth='user', website=True)
    def editer_consultation(self, consultation_id, **kwargs):
        """Page d'édition d'une consultation"""
        try:
            self._check_access()
            
            consultation = request.env['salamet.consultation'].browse(consultation_id)
            if not consultation.exists():
                return request.not_found()

            return request.render('salamet.consultation_form_template', {
                'consultation': consultation,
                'grossesse': consultation.grossesse_id,
                'mode': 'edit'
            })

        except Exception as e:
            _logger.error(f"Erreur édition consultation {consultation_id}: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors du chargement du formulaire'})

    @http.route('/salamet/consultation/<int:consultation_id>/update', type='http', auth='user', methods=['POST'], csrf=True)
    def modifier_consultation(self, consultation_id, **kwargs):
        """Modifier une consultation"""
        try:
            self._check_access()
            
            consultation = request.env['salamet.consultation'].browse(consultation_id)
            if not consultation.exists():
                return request.not_found()

            # Préparer les valeurs de mise à jour
            update_vals = {}
            
            if kwargs.get('date_consultation'):
                update_vals['date_consultation'] = datetime.strptime(kwargs['date_consultation'], '%Y-%m-%d').date()
            
            if kwargs.get('heure_consultation'):
                update_vals['heure_consultation'] = kwargs['heure_consultation']
            
            if kwargs.get('semaine_grossesse'):
                update_vals['semaine_grossesse'] = int(kwargs['semaine_grossesse'])
            
            if kwargs.get('poids'):
                update_vals['poids'] = float(kwargs['poids'])
            
            if kwargs.get('tension_systolique'):
                update_vals['tension_systolique'] = int(kwargs['tension_systolique'])
            
            if kwargs.get('tension_diastolique'):
                update_vals['tension_diastolique'] = int(kwargs['tension_diastolique'])
            
            if kwargs.get('hauteur_uterine'):
                update_vals['hauteur_uterine'] = float(kwargs['hauteur_uterine'])
            
            if kwargs.get('bcf'):
                update_vals['bcf'] = int(kwargs['bcf'])
            
            # Checkboxes
            update_vals['oedemes'] = kwargs.get('oedemes') == 'on'
            update_vals['proteinurie'] = kwargs.get('proteinurie') == 'on'
            update_vals['glycosurie'] = kwargs.get('glycosurie') == 'on'
            
            # Champs texte
            if kwargs.get('plaintes'):
                update_vals['plaintes'] = kwargs['plaintes']
            
            if kwargs.get('observations'):
                update_vals['observations'] = kwargs['observations']
            
            if kwargs.get('recommandations'):
                update_vals['recommandations'] = kwargs['recommandations']
            
            if kwargs.get('prochain_rdv'):
                update_vals['prochain_rdv'] = datetime.strptime(kwargs['prochain_rdv'], '%Y-%m-%d').date()

            consultation.write(update_vals)
            
            return request.redirect(f'/salamet/consultation/{consultation_id}')

        except Exception as e:
            _logger.error(f"Erreur modification consultation {consultation_id}: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors de la modification de la consultation'})

    @http.route('/salamet/consultations/planning', type='http', auth='user', website=True)
    def planning_consultations(self, **kwargs):
        """Planning des consultations"""
        try:
            self._check_access()
            
            # Date sélectionnée (par défaut aujourd'hui)
            date_selectionnee = kwargs.get('date', datetime.now().strftime('%Y-%m-%d'))
            date_obj = datetime.strptime(date_selectionnee, '%Y-%m-%d').date()
            
            # Consultations du jour
            consultations_jour = request.env['salamet.consultation'].search([
                ('date_consultation', '=', date_selectionnee)
            ], order='heure_consultation')
            
            # Consultations de la semaine
            debut_semaine = date_obj - timedelta(days=date_obj.weekday())
            fin_semaine = debut_semaine + timedelta(days=6)
            
            consultations_semaine = request.env['salamet.consultation'].search([
                ('date_consultation', '>=', debut_semaine),
                ('date_consultation', '<=', fin_semaine)
            ], order='date_consultation, heure_consultation')
            
            # Organiser par jour
            planning_semaine = {}
            for i in range(7):
                jour = debut_semaine + timedelta(days=i)
                planning_semaine[jour.strftime('%Y-%m-%d')] = {
                    'date': jour,
                    'consultations': consultations_semaine.filtered(
                        lambda c: c.date_consultation == jour
                    )
                }
            
            # Prochains rendez-vous
            prochains_rdv = request.env['salamet.consultation'].search([
                ('prochain_rdv', '>=', datetime.now().date())
            ], order='prochain_rdv', limit=10)

            return request.render('salamet.planning_consultations_template', {
                'date_selectionnee': date_selectionnee,
                'consultations_jour': consultations_jour,
                'planning_semaine': planning_semaine,
                'prochains_rdv': prochains_rdv,
                'debut_semaine': debut_semaine,
                'fin_semaine': fin_semaine
            })

        except Exception as e:
            _logger.error(f"Erreur planning consultations: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors du chargement du planning'})

    @http.route('/salamet/consultation/<int:consultation_id>/imprimer', type='http', auth='user')
    def imprimer_consultation(self, consultation_id, **kwargs):
        """Imprimer une consultation"""
        try:
            self._check_access()
            
            consultation = request.env['salamet.consultation'].browse(consultation_id)
            if not consultation.exists():
                return request.not_found()

            # Générer le PDF
            pdf_content = request.env.ref('salamet.consultation_report').sudo()._render_qweb_pdf([consultation_id])[0]
            
            headers = [
                ('Content-Type', 'application/pdf'),
                ('Content-Disposition', f'attachment; filename="consultation_{consultation_id}.pdf"')
            ]
            
            return request.make_response(pdf_content, headers=headers)

        except Exception as e:
            _logger.error(f"Erreur impression consultation {consultation_id}: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors de l\'impression'})

    @http.route('/salamet/api/consultations/stats', type='json', auth='user')
    def stats_consultations(self, **kwargs):
        """API pour les statistiques des consultations"""
        try:
            self._check_access()
            
            date_debut = kwargs.get('date_debut', (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
            date_fin = kwargs.get('date_fin', datetime.now().strftime('%Y-%m-%d'))
            
            domain = [
                ('date_consultation', '>=', date_debut),
                ('date_consultation', '<=', date_fin)
            ]
            
            consultations = request.env['salamet.consultation'].search(domain)
            
            # Statistiques générales
            total_consultations = len(consultations)
            consultations_par_jour = {}
            
            for consultation in consultations:
                jour = consultation.date_consultation.strftime('%Y-%m-%d')
                consultations_par_jour[jour] = consultations_par_jour.get(jour, 0) + 1
            
            # Répartition par type
            repartition_type = {}
            for consultation in consultations:
                type_cons = consultation.type_consultation or 'Consultation générale'
                repartition_type[type_cons] = repartition_type.get(type_cons, 0) + 1
            
            # Moyennes des paramètres
            poids_moyen = sum([c.poids for c in consultations if c.poids]) / len([                c for c in consultations if c.poids]) if consultations else 0
            
            tension_moyenne = {
                'systolique': sum([c.tension_systolique for c in consultations if c.tension_systolique]) / len([c for c in consultations if c.tension_systolique]) if consultations else 0,
                'diastolique': sum([c.tension_diastolique for c in consultations if c.tension_diastolique]) / len([c for c in consultations if c.tension_diastolique]) if consultations else 0
            }

            return {
                'success': True,
                'data': {
                    'total_consultations': total_consultations,
                    'consultations_par_jour': consultations_par_jour,
                    'repartition_type': repartition_type,
                    'poids_moyen': round(poids_moyen, 1),
                    'tension_moyenne': {
                        'systolique': round(tension_moyenne['systolique'], 1),
                        'diastolique': round(tension_moyenne['diastolique'], 1)
                    }
                }
            }

        except Exception as e:
            _logger.error(f"Erreur stats consultations: {str(e)}")
            return {'success': False, 'error': str(e)}

    @http.route('/salamet/api/consultation/graphique/<int:grossesse_id>', type='json', auth='user')
    def graphique_suivi_grossesse(self, grossesse_id, **kwargs):
        """API pour le graphique de suivi d'une grossesse"""
        try:
            self._check_access()
            
            consultations = request.env['salamet.consultation'].search([
                ('grossesse_id', '=', grossesse_id)
            ], order='semaine_grossesse')
            
            data = {
                'semaines': [],
                'poids': [],
                'tension_systolique': [],
                'tension_diastolique': [],
                'hauteur_uterine': [],
                'bcf': []
            }
            
            for consultation in consultations:
                if consultation.semaine_grossesse:
                    data['semaines'].append(consultation.semaine_grossesse)
                    data['poids'].append(consultation.poids or 0)
                    data['tension_systolique'].append(consultation.tension_systolique or 0)
                    data['tension_diastolique'].append(consultation.tension_diastolique or 0)
                    data['hauteur_uterine'].append(consultation.hauteur_uterine or 0)
                    data['bcf'].append(consultation.bcf or 0)
            
            return {
                'success': True,
                'data': data
            }

        except Exception as e:
            _logger.error(f"Erreur graphique grossesse {grossesse_id}: {str(e)}")
            return {'success': False, 'error': str(e)}

    def _analyser_consultation(self, consultation):
        """Analyser une consultation et détecter les anomalies"""
        analyses = {
            'alertes': [],
            'recommandations': [],
            'evolution': {}
        }
        
        try:
            # Analyse de la tension artérielle
            if consultation.tension_systolique and consultation.tension_diastolique:
                if consultation.tension_systolique >= 140 or consultation.tension_diastolique >= 90:
                    analyses['alertes'].append({
                        'type': 'danger',
                        'message': 'Hypertension artérielle détectée',
                        'valeur': f"{consultation.tension_systolique}/{consultation.tension_diastolique} mmHg"
                    })
                    analyses['recommandations'].append('Surveillance rapprochée de la tension artérielle')
                
                elif consultation.tension_systolique < 90 or consultation.tension_diastolique < 60:
                    analyses['alertes'].append({
                        'type': 'warning',
                        'message': 'Hypotension artérielle',
                        'valeur': f"{consultation.tension_systolique}/{consultation.tension_diastolique} mmHg"
                    })

            # Analyse du poids
            if consultation.poids and consultation.grossesse_id.poids_avant_grossesse:
                prise_poids = consultation.poids - consultation.grossesse_id.poids_avant_grossesse
                semaine = consultation.semaine_grossesse or 0
                
                # Prise de poids recommandée selon l'IMC initial
                imc_initial = consultation.grossesse_id.imc_initial
                if imc_initial:
                    if imc_initial < 18.5:  # Maigreur
                        prise_recommandee = semaine * 0.5  # 12.5-18 kg total
                    elif imc_initial < 25:  # Normal
                        prise_recommandee = semaine * 0.4  # 11.5-16 kg total
                    elif imc_initial < 30:  # Surpoids
                        prise_recommandee = semaine * 0.3  # 7-11.5 kg total
                    else:  # Obésité
                        prise_recommandee = semaine * 0.2  # 5-9 kg total
                    
                    if prise_poids > prise_recommandee * 1.2:
                        analyses['alertes'].append({
                            'type': 'warning',
                            'message': 'Prise de poids excessive',
                            'valeur': f"+{prise_poids:.1f} kg"
                        })
                        analyses['recommandations'].append('Conseils nutritionnels et activité physique adaptée')
                    
                    elif prise_poids < prise_recommandee * 0.8:
                        analyses['alertes'].append({
                            'type': 'warning',
                            'message': 'Prise de poids insuffisante',
                            'valeur': f"+{prise_poids:.1f} kg"
                        })
                        analyses['recommandations'].append('Évaluation nutritionnelle recommandée')

            # Analyse des examens urinaires
            if consultation.proteinurie:
                analyses['alertes'].append({
                    'type': 'danger',
                    'message': 'Protéinurie détectée',
                    'valeur': 'Présente'
                })
                analyses['recommandations'].append('Surveillance rénale et recherche de pré-éclampsie')

            if consultation.glycosurie:
                analyses['alertes'].append({
                    'type': 'warning',
                    'message': 'Glycosurie détectée',
                    'valeur': 'Présente'
                })
                analyses['recommandations'].append('Dépistage du diabète gestationnel')

            # Analyse des œdèmes
            if consultation.oedemes:
                analyses['alertes'].append({
                    'type': 'info',
                    'message': 'Œdèmes présents',
                    'valeur': 'Oui'
                })

            # Analyse de la hauteur utérine
            if consultation.hauteur_uterine and consultation.semaine_grossesse:
                hauteur_theorique = consultation.semaine_grossesse
                if consultation.hauteur_uterine < hauteur_theorique - 3:
                    analyses['alertes'].append({
                        'type': 'warning',
                        'message': 'Hauteur utérine faible',
                        'valeur': f"{consultation.hauteur_uterine} cm (attendu: ~{hauteur_theorique} cm)"
                    })
                    analyses['recommandations'].append('Échographie de croissance recommandée')
                
                elif consultation.hauteur_uterine > hauteur_theorique + 3:
                    analyses['alertes'].append({
                        'type': 'warning',
                        'message': 'Hauteur utérine élevée',
                        'valeur': f"{consultation.hauteur_uterine} cm (attendu: ~{hauteur_theorique} cm)"
                    })
                    analyses['recommandations'].append('Recherche de macrosomie ou hydramnios')

            # Analyse du BCF
            if consultation.bcf:
                if consultation.bcf < 110 or consultation.bcf > 160:
                    analyses['alertes'].append({
                        'type': 'danger',
                        'message': 'Rythme cardiaque fœtal anormal',
                        'valeur': f"{consultation.bcf} bpm"
                    })
                    analyses['recommandations'].append('Surveillance fœtale rapprochée')

            # Évolution par rapport aux consultations précédentes
            consultations_precedentes = request.env['salamet.consultation'].search([
                ('grossesse_id', '=', consultation.grossesse_id.id),
                ('date_consultation', '<', consultation.date_consultation)
            ], order='date_consultation desc', limit=1)

            if consultations_precedentes:
                precedente = consultations_precedentes[0]
                
                # Évolution du poids
                if consultation.poids and precedente.poids:
                    evolution_poids = consultation.poids - precedente.poids
                    analyses['evolution']['poids'] = {
                        'valeur': evolution_poids,
                        'tendance': 'hausse' if evolution_poids > 0 else 'baisse' if evolution_poids < 0 else 'stable'
                    }
                
                # Évolution de la tension
                if (consultation.tension_systolique and precedente.tension_systolique):
                    evolution_tension = consultation.tension_systolique - precedente.tension_systolique
                    analyses['evolution']['tension'] = {
                        'valeur': evolution_tension,
                        'tendance': 'hausse' if evolution_tension > 5 else 'baisse' if evolution_tension < -5 else 'stable'
                    }

        except Exception as e:
            _logger.error(f"Erreur analyse consultation: {str(e)}")
        
        return analyses

    def _check_access(self):
        """Vérifier les droits d'accès"""
        if not request.env.user.has_group('salamet.group_salamet_user'):
            raise AccessError("Accès non autorisé")

