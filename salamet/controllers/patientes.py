# -*- coding: utf-8 -*-
# salamet/controllers/patientes.py - VERSION COMPLÈTE AMÉLIORÉE
from odoo import http
from odoo.http import request
from odoo.exceptions import ValidationError, AccessError, UserError
import json
import logging
from datetime import datetime, date
from werkzeug.exceptions import BadRequest

_logger = logging.getLogger(__name__)

class SalametPatientesController(http.Controller):
    """Contrôleur pour la gestion des patientes SALAMET"""

    # =================== ROUTES PRINCIPALES ===================

    @http.route('/salamet/patientes/medecin/<int:medecin_id>', type='json', auth='user', methods=['GET', 'POST'])
    def api_patientes_by_medecin(self, medecin_id, **kwargs):
        """API pour récupérer les patientes d'un médecin spécifique"""
        try:
            # Vérifications d'accès
            self._check_access()
            medecin = self._verify_medecin_access(medecin_id)

            # Récupération des paramètres
            params = self._extract_request_params(kwargs)
            
            _logger.info(f"Récupération patientes pour médecin {medecin_id} - Params: {params}")

            # Construction du domain de recherche
            domain = self._build_search_domain(medecin_id, params)
            
            # Recherche avec pagination
            offset = (params['page'] - 1) * params['limit']
            patientes = request.env['salamet.patiente'].search(
                domain,
                limit=params['limit'],
                offset=offset,
                order='nom_complet'
            )
            total = request.env['salamet.patiente'].search_count(domain)

            _logger.info(f"Trouvé {len(patientes)} patientes sur {total} total")

            # Formatage des données
            data = []
            for patiente in patientes:
                try:
                    patiente_data = self._format_patiente_summary(patiente)
                    data.append(patiente_data)
                except Exception as e:
                    _logger.error(f"Erreur formatage patiente {patiente.id}: {str(e)}")
                    continue

            response = {
                'success': True,
                'data': data,
                'total': total,
                'page': params['page'],
                'limit': params['limit'],
                'total_pages': (total + params['limit'] - 1) // params['limit'],
                'medecin': {
                    'id': medecin.id,
                    'nom': medecin.nom_complet or '',
                    'specialite': getattr(medecin, 'specialite', '') or '',
                    'statut': getattr(medecin, 'statut', '') or ''
                }
            }

            return response

        except AccessError as e:
            _logger.warning(f"Accès refusé pour médecin {medecin_id}: {str(e)}")
            return {'success': False, 'error': f'Accès refusé: {str(e)}'}
        except Exception as e:
            _logger.error(f"Erreur API patientes par médecin {medecin_id}: {str(e)}")
            return {'success': False, 'error': f'Erreur interne: {str(e)}'}

    @http.route('/salamet/patientes/<int:patiente_id>/detail', type='json', auth='user', methods=['GET', 'POST'])
    def api_get_patiente_detail(self, patiente_id, **kwargs):
        """API pour récupérer les détails complets d'une patiente"""
        try:
            self._check_access()
            
            # Vérifier l'accès à cette patiente
            patiente = self._verify_patiente_access(patiente_id)
            
            _logger.info(f"Récupération détails patiente {patiente_id}")

            # Formatage complet des données
            data = self._format_patiente_detail(patiente)

            return {'success': True, 'data': data}

        except AccessError as e:
            _logger.warning(f"Accès refusé pour patiente {patiente_id}: {str(e)}")
            return {'success': False, 'error': f'Accès refusé: {str(e)}'}
        except Exception as e:
            _logger.error(f"Erreur récupération détail patiente {patiente_id}: {str(e)}")
            return {'success': False, 'error': f'Erreur interne: {str(e)}'}

    @http.route('/salamet/patientes/<int:patiente_id>/update', type='json', auth='user', methods=['POST'])
    def api_update_patiente(self, patiente_id, **kwargs):
        """API pour modifier une patiente"""
        try:
            self._check_access()
            
            # Vérifier l'accès en écriture à cette patiente
            patiente = self._verify_patiente_access(patiente_id, check_write=True)
            
            # Récupérer les données à modifier
            data = request.jsonrequest or {}
            if not data:
                return {'success': False, 'error': 'Aucune donnée fournie'}

            _logger.info(f"Modification patiente {patiente_id} - Données: {list(data.keys())}")

            # Valider et nettoyer les données
            validated_data = self._validate_patiente_data(data, is_update=True)
            
            # Effectuer la modification
            patiente.write(validated_data)
            
            # Retourner les données mises à jour
            updated_data = self._format_patiente_detail(patiente)
            
            _logger.info(f"Patiente {patiente_id} modifiée avec succès")
            
            return {
                'success': True,
                'message': f'Patiente {patiente.nom_complet} modifiée avec succès',
                'data': updated_data
            }

        except ValidationError as e:
            _logger.warning(f"Erreur validation modification patiente {patiente_id}: {str(e)}")
            return {'success': False, 'error': f'Erreur de validation: {str(e)}'}
        except AccessError as e:
            _logger.warning(f"Accès refusé modification patiente {patiente_id}: {str(e)}")
            return {'success': False, 'error': f'Accès refusé: {str(e)}'}
        except Exception as e:
            _logger.error(f"Erreur modification patiente {patiente_id}: {str(e)}")
            return {'success': False, 'error': f'Erreur interne: {str(e)}'}

    @http.route('/salamet/patientes/create', type='json', auth='user', methods=['POST'])
    def api_create_patiente(self, **kwargs):
        """API pour créer une nouvelle patiente"""
        try:
            self._check_access()
            
            # Récupérer les données
            data = request.jsonrequest or {}
            if not data:
                return {'success': False, 'error': 'Aucune donnée fournie'}

            _logger.info(f"Création nouvelle patiente - Données: {list(data.keys())}")

            # Valider les données
            validated_data = self._validate_patiente_data(data, is_update=False)
            
            # Ajouter le médecin courant si spécifié
            current_medecin = self._get_current_medecin()
            if current_medecin and 'medecin_ids' not in validated_data:
                validated_data['medecin_ids'] = [(6, 0, [current_medecin.id])]
            
            # Créer la patiente
            patiente = request.env['salamet.patiente'].create(validated_data)
            
            # Retourner les données créées
            created_data = self._format_patiente_detail(patiente)
            
            _logger.info(f"Patiente {patiente.id} créée avec succès")
            
            return {
                'success': True,
                'message': f'Patiente {patiente.nom_complet} créée avec succès',
                'data': created_data
            }

        except ValidationError as e:
            _logger.warning(f"Erreur validation création patiente: {str(e)}")
            return {'success': False, 'error': f'Erreur de validation: {str(e)}'}
        except Exception as e:
            _logger.error(f"Erreur création patiente: {str(e)}")
            return {'success': False, 'error': f'Erreur interne: {str(e)}'}

    @http.route('/salamet/patientes/<int:patiente_id>/delete', type='json', auth='user', methods=['POST'])
    def api_delete_patiente(self, patiente_id, **kwargs):
        """API pour supprimer une patiente (soft delete par défaut)"""
        try:
            self._check_access()
            
            # Vérifier l'accès en suppression à cette patiente
            patiente = self._verify_patiente_access(patiente_id, check_delete=True)
            
            # Récupérer les options de suppression
            data = request.jsonrequest or {}
            force_delete = data.get('force_delete', False)
            delete_partner = data.get('delete_partner', False)
            
            patiente_nom = patiente.nom_complet
            
            _logger.info(f"Suppression patiente {patiente_id} - Force: {force_delete}, Partner: {delete_partner}")

            if force_delete:
                # Suppression définitive
                patiente.with_context(delete_partner=delete_partner).unlink()
                message = f'Patiente {patiente_nom} supprimée définitivement'
            else:
                # Désactivation (soft delete)
                patiente.write({'active': False})
                message = f'Patiente {patiente_nom} désactivée'
            
            _logger.info(f"Patiente {patiente_id} supprimée avec succès")
            
            return {
                'success': True,
                'message': message
            }

        except AccessError as e:
            _logger.warning(f"Accès refusé suppression patiente {patiente_id}: {str(e)}")
            return {'success': False, 'error': f'Accès refusé: {str(e)}'}
        except Exception as e:
            _logger.error(f"Erreur suppression patiente {patiente_id}: {str(e)}")
            return {'success': False, 'error': f'Erreur interne: {str(e)}'}

    @http.route('/salamet/patientes/<int:patiente_id>/assign-medecin', type='json', auth='user', methods=['POST'])
    def api_assign_medecin_to_patiente(self, patiente_id, **kwargs):
        """API pour assigner/désassigner un médecin à une patiente"""
        try:
            self._check_access()
            
            patiente = self._verify_patiente_access(patiente_id, check_write=True)
            
            data = request.jsonrequest or {}
            medecin_id = data.get('medecin_id')
            action = data.get('action', 'assign')  # 'assign' ou 'unassign'
            
            if not medecin_id:
                return {'success': False, 'error': 'ID du médecin requis'}
            
            medecin = request.env['salamet.medecin'].browse(medecin_id)
            if not medecin.exists():
                return {'success': False, 'error': 'Médecin introuvable'}
            
            if action == 'assign':
                if medecin_id not in patiente.medecin_ids.ids:
                    patiente.write({'medecin_ids': [(4, medecin_id)]})
                    message = f'Médecin {medecin.nom_complet} assigné à {patiente.nom_complet}'
                else:
                    message = f'Médecin {medecin.nom_complet} déjà assigné'
            else:  # unassign
                if medecin_id in patiente.medecin_ids.ids:
                    patiente.write({'medecin_ids': [(3, medecin_id)]})
                    message = f'Médecin {medecin.nom_complet} désassigné de {patiente.nom_complet}'
                else:
                    message = f'Médecin {medecin.nom_complet} non assigné'
            
            return {
                'success': True,
                'message': message,
                'medecins': [{'id': m.id, 'nom': m.nom_complet} for m in patiente.medecin_ids]
            }

        except Exception as e:
            _logger.error(f"Erreur assignation médecin: {str(e)}")
            return {'success': False, 'error': str(e)}

    @http.route('/salamet/patientes/search', type='json', auth='user', methods=['POST'])
    def api_search_patientes(self, **kwargs):
        """API de recherche globale de patientes"""
        try:
            self._check_access()
            
            data = request.jsonrequest or {}
            search_term = data.get('search', '').strip()
            filters = data.get('filters', {})
            limit = min(int(data.get('limit', 50)), 100)
            
            if not search_term and not filters:
                return {'success': False, 'error': 'Terme de recherche ou filtres requis'}
            
            # Construction du domain
            domain = [('active', '=', True)]
            
            # Recherche textuelle
            if search_term:
                domain.extend([
                    '|', '|', '|', '|',
                    ('name', 'ilike', search_term),
                    ('nom_complet', 'ilike', search_term),
                    ('telephone', 'ilike', search_term),
                    ('email', 'ilike', search_term),
                    ('numero_securite_sociale', 'ilike', search_term)
                ])
            
            # Appliquer les filtres
            if isinstance(filters, dict):
                if filters.get('medecin_id'):
                    domain.append(('medecin_ids', 'in', [int(filters['medecin_id'])]))
                if filters.get('est_enceinte') is not None:
                    domain.append(('est_enceinte', '=', filters['est_enceinte']))
                if filters.get('niveau_risque'):
                    domain.append(('niveau_risque_global', '=', filters['niveau_risque']))
            
            # Recherche
            patientes = request.env['salamet.patiente'].search(domain, limit=limit, order='nom_complet')
            
            # Formatage
            data = [self._format_patiente_summary(p) for p in patientes]
            
            return {
                'success': True,
                'data': data,
                'total': len(data),
                'search_term': search_term
            }

        except Exception as e:
            _logger.error(f"Erreur recherche patientes: {str(e)}")
            return {'success': False, 'error': str(e)}

    @http.route('/salamet/patientes/stats', type='json', auth='user', methods=['GET', 'POST'])
    def api_patientes_stats(self, **kwargs):
        """API pour les statistiques des patientes"""
        try:
            self._check_access()
            
            # Statistiques globales
            total_patientes = request.env['salamet.patiente'].search_count([('active', '=', True)])
            patientes_enceintes = request.env['salamet.patiente'].search_count([
                ('active', '=', True),
                ('est_enceinte', '=', True)
            ])
            
            # Répartition par niveau de risque
            risque_stats = {}
            for niveau in ['faible', 'moyen', 'eleve', 'tres_eleve']:
                count = request.env['salamet.patiente'].search_count([
                    ('active', '=', True),
                    ('niveau_risque_global', '=', niveau)
                ])
                risque_stats[niveau] = count
            
            # Statistiques par médecin (si médecin connecté)
            medecin_stats = {}
            current_medecin = self._get_current_medecin()
            if current_medecin:
                medecin_stats = {
                    'mes_patientes': len(current_medecin.patiente_ids),
                    'mes_patientes_enceintes': len(current_medecin.patiente_ids.filtered('est_enceinte')),
                    'mes_grossesses_referent': len(current_medecin.grossesse_referent_ids)
                }
            
            return {
                'success': True,
                'stats': {
                    'total_patientes': total_patientes,
                    'patientes_enceintes': patientes_enceintes,
                    'repartition_risque': risque_stats,
                    'medecin_stats': medecin_stats
                }
            }

        except Exception as e:
            _logger.error(f"Erreur statistiques patientes: {str(e)}")
            return {'success': False, 'error': str(e)}

    @http.route('/salamet/health', type='json', auth='user', methods=['GET', 'POST'])
    def api_health_check(self, **kwargs):
        """Endpoint de vérification de santé de l'API"""
        try:
            user = request.env.user
            company = request.env.company

            # Test d'accès aux modèles
            patientes_count = request.env['salamet.patiente'].search_count([])
            medecins_count = request.env['salamet.medecin'].search_count([])

            return {
                'success': True,
                'message': 'API Salamet Patientes opérationnelle',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'user': {
                    'id': user.id,
                    'name': user.name,
                    'login': user.login
                },
                'company': {
                    'id': company.id,
                    'name': company.name
                },
                'stats': {
                    'patientes': patientes_count,
                    'medecins': medecins_count
                }
            }
        except Exception as e:
            _logger.error(f"Erreur health check: {str(e)}")
            return {
                'success': False,
                'message': f'Erreur API: {str(e)}',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }

    # =================== MÉTHODES UTILITAIRES PRIVÉES ===================

    def _check_access(self):
        """Vérifier l'accès aux patientes"""
        try:
            # Vérifier si l'utilisateur a les droits SALAMET
            if not request.env.user.has_group('salamet.group_salamet_user'):
                # Fallback : vérifier si l'utilisateur est connecté et interne
                if not request.env.user or request.env.user._is_public():
                    raise AccessError("Authentification requise")
                # Si utilisateur interne sans groupe spécifique, permettre l'accès
                if not request.env.user._is_internal():
                    raise AccessError("Accès non autorisé")
        except Exception:
            # Si les groupes n'existent pas, vérifier juste l'authentification
            if not request.env.user or request.env.user._is_public():
                raise AccessError("Authentification requise")
        return True

    def _verify_medecin_access(self, medecin_id):
        """Vérifier l'accès à un médecin spécifique"""
        medecin = request.env['salamet.medecin'].browse(medecin_id)
        if not medecin.exists():
            raise ValidationError('Médecin introuvable')
        
        # Vérifier si l'utilisateur peut accéder à ce médecin
        current_user = request.env.user
        
        # Admin peut tout voir
        if current_user._is_admin():
            return medecin
        
        # Médecin peut voir ses propres patientes
        current_medecin = self._get_current_medecin()
        if current_medecin and current_medecin.id == medecin_id:
            return medecin
        
        # Sinon, vérifier les droits d'accès
        try:
            medecin.check_access_rights('read')
            medecin.check_access_rule('read')
        except AccessError:
            raise AccessError(f"Accès refusé au médecin {medecin.nom_complet}")
        
        return medecin

    def _verify_patiente_access(self, patiente_id, check_write=False, check_delete=False):
        """Vérifier l'accès à une patiente spécifique"""
        patiente = request.env['salamet.patiente'].browse(patiente_id)
        if not patiente.exists():
            raise ValidationError('Patiente introuvable')
        
        current_user = request.env.user
        
        # Admin peut tout faire
        if current_user._is_admin():
            return patiente
        
        # Vérifier les droits d'accès
        try:
            if check_delete:
                patiente.check_access_rights('unlink')
                patiente.check_access_rule('unlink')
            elif check_write:
                patiente.check_access_rights('write')
                patiente.check_access_rule('write')
            else:
                patiente.check_access_rights('read')
                patiente.check_access_rule('read')
        except AccessError:
            action = 'modifier' if check_write else ('supprimer' if check_delete else 'consulter')
            raise AccessError(f"Accès refusé pour {action} la patiente {patiente.nom_complet}")
        
        # Vérifier si le médecin connecté peut accéder à cette patiente
        current_medecin = self._get_current_medecin()
        if current_medecin:
            if current_medecin.id not in patiente.medecin_ids.ids:
                raise AccessError(f"Cette patiente n'est pas assignée à votre suivi")
        
        return patiente

    def _get_current_medecin(self):
        """Récupérer le médecin correspondant à l'utilisateur connecté"""
        try:
            current_user = request.env.user
            medecin = request.env['salamet.medecin'].search([('user_id', '=', current_user.id)], limit=1)
            return medecin if medecin.exists() else None
        except Exception as e:
            _logger.warning(f"Erreur récupération médecin courant: {str(e)}")
            return None

    def _extract_request_params(self, kwargs):
        """Extraire et valider les paramètres de requête"""
        if request.httprequest.method == 'POST':
            json_data = request.jsonrequest or {}
            search = json_data.get('search', '')
            filters = json_data.get('filters', {})
            page = int(json_data.get('page', 1))
            limit = int(json_data.get('limit', 20))
        else:
            search = kwargs.get('search', '')
            filters = kwargs.get('filters', {})
            page = int(kwargs.get('page', 1))
            limit = int(kwargs.get('limit', 20))
        
        # Validation
        page = max(1, page)
        limit = min(max(1, limit), 100)
        
        return {
            'search': search,
            'filters': filters,
            'page': page,
            'limit': limit
        }

    def _build_search_domain(self, medecin_id, params):
        """Construire le domain de recherche"""
        domain = [
            ('active', '=', True),
            ('medecin_ids', 'in', [medecin_id])
        ]
        
        # Recherche textuelle
        if params['search']:
            search_term = params['search']
            domain.extend([
                '|', '|', '|', '|',
                ('name', 'ilike', search_term),
                ('nom_complet', 'ilike', search_term),
                ('telephone', 'ilike', search_term),
                ('email', 'ilike', search_term),
                ('numero_securite_sociale', 'ilike', search_term)
            ])
        
        # Filtres spécifiques
        filters = params['filters']
        if isinstance(filters, dict):
            if filters.get('est_enceinte') is not None:
                domain.append(('est_enceinte', '=', filters['est_enceinte']))
            
            if filters.get('niveau_risque'):
                domain.append(('niveau_risque_global', '=', filters['niveau_risque']))
            
            if filters.get('age_min'):
                try:
                    age_min = int(filters['age_min'])
                    domain.append(('age', '>=', age_min))
                except (ValueError, TypeError):
                    pass
            
            if filters.get('age_max'):
                try:
                    age_max = int(filters['age_max'])
                    domain.append(('age', '<=', age_max))
                except (ValueError, TypeError):
                    pass
            
            if filters.get('groupe_sanguin'):
                domain.append(('groupe_sanguin', '=', filters['groupe_sanguin']))
            
            if filters.get('consanguinite') is not None:
                domain.append(('consanguinite', '=', filters['consanguinite']))
        
        return domain

    def _validate_patiente_data(self, data, is_update=False):
        """Valider et nettoyer les données de patiente"""
        validated_data = {}
        
        # Champs texte
        text_fields = ['name', 'nom_complet', 'profession', 'telephone', 'email', 'adresse',
                      'nom_mari', 'profession_mari', 'telephone_mari', 'email_mari',
                      'antecedents_medicaux', 'antecedents_chirurgicaux', 'antecedents_gyneco',
                      'autres_antecedents_familiaux', 'degre_consanguinite', 'facteurs_risque_supplementaires']
        
        for field in text_fields:
            if field in data:
                value = data[field]
                if value is not None:
                    validated_data[field] = str(value).strip()
        
        # Champs date
        if 'date_naissance' in data:
            date_value = data['date_naissance']
            if date_value:
                try:
                    if isinstance(date_value, str):
                        validated_data['date_naissance'] = datetime.strptime(date_value, '%Y-%m-%d').date()
                    else:
                        validated_data['date_naissance'] = date_value
                except ValueError:
                    raise ValidationError("Format de date de naissance invalide (YYYY-MM-DD attendu)")
        
        # Champs numériques
        numeric_fields = ['poids', 'taille', 'age_mari', 'age_survenue_diabete', 'age_survenue_hta',
                         'gestite', 'parite', 'avortements']
        
        for field in numeric_fields:
            if field in data:
                value = data[field]
                if value is not None:
                    try:
                        validated_data[field] = float(value) if field in ['poids', 'taille'] else int(value)
                    except (ValueError, TypeError):
                        raise ValidationError(f"Valeur numérique invalide pour {field}")
        
        # Champs booléens
        boolean_fields = ['consanguinite', 'antecedent_diabete_familial', 'antecedent_hta_familial', 'active']
        
        for field in boolean_fields:
            if field in data:
                validated_data[field] = bool(data[field])
        
        # Champs de sélection
        if 'groupe_sanguin' in data:
            valid_groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
            if data['groupe_sanguin'] in valid_groups:
                validated_data['groupe_sanguin'] = data['groupe_sanguin']
        
        # Relations Many2many (médecins)
        if 'medecin_ids' in data:
            medecin_ids = data['medecin_ids']
            if isinstance(medecin_ids, list):
                # Vérifier que les médecins existent
                medecins = request.env['salamet.medecin'].browse(medecin_ids)
                if len(medecins) == len(medecin_ids):
                    validated_data['medecin_ids'] = [(6, 0, medecin_ids)]
                else:
                    raise ValidationError("Un ou plusieurs médecins spécifiés n'existent pas")
        
        # Validation des champs requis pour création
        if not is_update:
            required_fields = ['name', 'date_naissance']
            for field in required_fields:
                if field not in validated_data or not validated_data[field]:
                    raise ValidationError(f"Le champ {field} est requis")
        
        return validated_data

    def _format_patiente_summary(self, patiente):
        """Formater les données résumées d'une patiente"""
        try:
            # Récupérer la grossesse actuelle
            grossesse_actuelle = None
            if hasattr(patiente, 'grossesse_actuelle_id') and patiente.grossesse_actuelle_id:
                grossesse_actuelle = patiente.grossesse_actuelle_id
            elif hasattr(patiente, 'grossesse_ids') and patiente.grossesse_ids:
                grossesses_en_cours = patiente.grossesse_ids.filtered(
                    lambda g: getattr(g, 'state', 'en_cours') == 'en_cours'
                )
                if grossesses_en_cours:
                    grossesse_actuelle = grossesses_en_cours.sorted('date_debut', reverse=True)[0]

            return {
                'id': patiente.id,
                'name': patiente.name or '',
                'nom_complet': patiente.nom_complet or '',
                'date_naissance': self._format_date(patiente.date_naissance),
                'age': patiente.age or 0,
                'telephone': patiente.telephone or '',
                'email': patiente.email or '',
                'adresse': patiente.adresse or '',
                                'groupe_sanguin': patiente.groupe_sanguin or '',
                'est_enceinte': getattr(patiente, 'est_enceinte', False),
                'niveau_risque_global': getattr(patiente, 'niveau_risque_global', 'faible'),
                'consanguinite': getattr(patiente, 'consanguinite', False),
                
                # Informations sur la grossesse actuelle
                'grossesse_actuelle': self._format_grossesse_summary(grossesse_actuelle) if grossesse_actuelle else None,
                
                # Médecins assignés
                'medecins': [
                    {
                        'id': medecin.id,
                        'nom': medecin.nom_complet or '',
                        'specialite': getattr(medecin, 'specialite', '') or ''
                    }
                    for medecin in patiente.medecin_ids
                ],
                
                # Statistiques rapides
                'nb_grossesses': len(getattr(patiente, 'grossesse_ids', [])),
                'nb_consultations': len(getattr(patiente, 'consultation_ids', [])),
                'derniere_consultation': self._get_derniere_consultation_date(patiente),
                
                # Statut et métadonnées
                'active': patiente.active,
                'create_date': self._format_datetime(patiente.create_date),
                'write_date': self._format_datetime(patiente.write_date)
            }
        except Exception as e:
            _logger.error(f"Erreur formatage patiente summary {patiente.id}: {str(e)}")
            return {
                'id': patiente.id,
                'name': patiente.name or '',
                'nom_complet': patiente.nom_complet or '',
                'error': f'Erreur formatage: {str(e)}'
            }

    def _format_patiente_detail(self, patiente):
        """Formater les données complètes d'une patiente"""
        try:
            # Données de base
            data = self._format_patiente_summary(patiente)
            
            # Ajouter les détails complets
            data.update({
                # Informations personnelles étendues
                'profession': patiente.profession or '',
                'numero_securite_sociale': getattr(patiente, 'numero_securite_sociale', '') or '',
                'poids': patiente.poids or 0.0,
                'taille': patiente.taille or 0.0,
                'imc': getattr(patiente, 'imc', 0.0) or 0.0,
                
                # Informations du conjoint
                'nom_mari': patiente.nom_mari or '',
                'profession_mari': patiente.profession_mari or '',
                'telephone_mari': patiente.telephone_mari or '',
                'email_mari': patiente.email_mari or '',
                'age_mari': patiente.age_mari or 0,
                
                # Consanguinité
                'degre_consanguinite': patiente.degre_consanguinite or '',
                
                # Antécédents médicaux
                'antecedents_medicaux': patiente.antecedents_medicaux or '',
                'antecedents_chirurgicaux': patiente.antecedents_chirurgicaux or '',
                'antecedents_gyneco': patiente.antecedents_gyneco or '',
                
                # Antécédents familiaux
                'antecedent_diabete_familial': getattr(patiente, 'antecedent_diabete_familial', False),
                'age_survenue_diabete': getattr(patiente, 'age_survenue_diabete', 0) or 0,
                'antecedent_hta_familial': getattr(patiente, 'antecedent_hta_familial', False),
                'age_survenue_hta': getattr(patiente, 'age_survenue_hta', 0) or 0,
                'autres_antecedents_familiaux': patiente.autres_antecedents_familiaux or '',
                
                # Historique obstétrical
                'gestite': getattr(patiente, 'gestite', 0) or 0,
                'parite': getattr(patiente, 'parite', 0) or 0,
                'avortements': getattr(patiente, 'avortements', 0) or 0,
                
                # Facteurs de risque
                'facteurs_risque_supplementaires': patiente.facteurs_risque_supplementaires or '',
                
                # Grossesses détaillées
                'grossesses': self._format_grossesses_detail(patiente),
                
                # Consultations récentes
                'consultations_recentes': self._format_consultations_recentes(patiente),
                
                # Examens et résultats
                'examens_recents': self._format_examens_recents(patiente),
                
                # Alertes et notifications
                'alertes': self._get_alertes_patiente(patiente),
                
                # Prochains rendez-vous
                'prochains_rdv': self._get_prochains_rdv(patiente)
            })
            
            return data
            
        except Exception as e:
            _logger.error(f"Erreur formatage patiente detail {patiente.id}: {str(e)}")
            # Retourner au moins les données de base
            return self._format_patiente_summary(patiente)

    def _format_grossesse_summary(self, grossesse):
        """Formater le résumé d'une grossesse"""
        if not grossesse:
            return None
        
        try:
            return {
                'id': grossesse.id,
                'date_debut': self._format_date(grossesse.date_debut),
                'date_prevue_accouchement': self._format_date(getattr(grossesse, 'date_prevue_accouchement', None)),
                'semaines_amenorrhee': getattr(grossesse, 'semaines_amenorrhee', 0) or 0,
                'niveau_risque': getattr(grossesse, 'niveau_risque', 'faible') or 'faible',
                'state': getattr(grossesse, 'state', 'en_cours') or 'en_cours',
                'medecin_referent': {
                    'id': grossesse.medecin_referent_id.id,
                    'nom': grossesse.medecin_referent_id.nom_complet or ''
                } if getattr(grossesse, 'medecin_referent_id', None) else None,
                'nb_consultations': len(getattr(grossesse, 'consultation_ids', [])),
                'derniere_consultation': self._get_derniere_consultation_grossesse(grossesse)
            }
        except Exception as e:
            _logger.error(f"Erreur formatage grossesse summary {grossesse.id}: {str(e)}")
            return {'id': grossesse.id, 'error': str(e)}

    def _format_grossesses_detail(self, patiente):
        """Formater toutes les grossesses d'une patiente"""
        try:
            if not hasattr(patiente, 'grossesse_ids'):
                return []
            
            grossesses = []
            for grossesse in patiente.grossesse_ids.sorted('date_debut', reverse=True):
                try:
                    grossesse_data = self._format_grossesse_summary(grossesse)
                    if grossesse_data:
                        # Ajouter des détails supplémentaires
                        grossesse_data.update({
                            'complications': getattr(grossesse, 'complications', '') or '',
                            'notes': getattr(grossesse, 'notes', '') or '',
                            'issue_grossesse': getattr(grossesse, 'issue_grossesse', '') or '',
                            'poids_naissance': getattr(grossesse, 'poids_naissance', 0.0) or 0.0,
                            'date_accouchement_reel': self._format_date(getattr(grossesse, 'date_accouchement_reel', None))
                        })
                        grossesses.append(grossesse_data)
                except Exception as e:
                    _logger.error(f"Erreur formatage grossesse {grossesse.id}: {str(e)}")
                    continue
            
            return grossesses
        except Exception as e:
            _logger.error(f"Erreur formatage grossesses patiente {patiente.id}: {str(e)}")
            return []

    def _format_consultations_recentes(self, patiente, limit=5):
        """Formater les consultations récentes d'une patiente"""
        try:
            if not hasattr(patiente, 'consultation_ids'):
                return []
            
            consultations = []
            recent_consultations = patiente.consultation_ids.sorted('date_consultation', reverse=True)[:limit]
            
            for consultation in recent_consultations:
                try:
                    consultations.append({
                        'id': consultation.id,
                        'date_consultation': self._format_datetime(consultation.date_consultation),
                        'type_consultation': getattr(consultation, 'type_consultation', '') or '',
                        'medecin': {
                            'id': consultation.medecin_id.id,
                            'nom': consultation.medecin_id.nom_complet or ''
                        } if getattr(consultation, 'medecin_id', None) else None,
                        'motif': getattr(consultation, 'motif', '') or '',
                        'diagnostic': getattr(consultation, 'diagnostic', '') or '',
                        'traitement': getattr(consultation, 'traitement', '') or '',
                        'observations': getattr(consultation, 'observations', '') or '',
                        'grossesse_id': consultation.grossesse_id.id if getattr(consultation, 'grossesse_id', None) else None
                    })
                except Exception as e:
                    _logger.error(f"Erreur formatage consultation {consultation.id}: {str(e)}")
                    continue
            
            return consultations
        except Exception as e:
            _logger.error(f"Erreur formatage consultations patiente {patiente.id}: {str(e)}")
            return []

    def _format_examens_recents(self, patiente, limit=10):
        """Formater les examens récents d'une patiente"""
        try:
            examens = []
            
            # Rechercher les examens liés aux consultations de la patiente
            if hasattr(patiente, 'consultation_ids'):
                for consultation in patiente.consultation_ids.sorted('date_consultation', reverse=True)[:limit]:
                    if hasattr(consultation, 'examen_ids'):
                        for examen in consultation.examen_ids:
                            try:
                                examens.append({
                                    'id': examen.id,
                                    'type_examen': getattr(examen, 'type_examen', '') or '',
                                    'date_examen': self._format_date(getattr(examen, 'date_examen', None)),
                                    'resultat': getattr(examen, 'resultat', '') or '',
                                    'valeur_numerique': getattr(examen, 'valeur_numerique', 0.0) or 0.0,
                                    'unite': getattr(examen, 'unite', '') or '',
                                    'normal': getattr(examen, 'normal', True),
                                    'consultation_id': consultation.id,
                                    'date_consultation': self._format_datetime(consultation.date_consultation)
                                })
                            except Exception as e:
                                _logger.error(f"Erreur formatage examen {examen.id}: {str(e)}")
                                continue
            
            # Trier par date d'examen décroissante
            examens.sort(key=lambda x: x.get('date_examen', ''), reverse=True)
            
            return examens[:limit]
        except Exception as e:
            _logger.error(f"Erreur formatage examens patiente {patiente.id}: {str(e)}")
            return []

    def _get_alertes_patiente(self, patiente):
        """Récupérer les alertes pour une patiente"""
        try:
            alertes = []
            
            # Alerte âge
            if patiente.age and (patiente.age < 18 or patiente.age > 40):
                alertes.append({
                    'type': 'age',
                    'niveau': 'warning' if patiente.age > 35 else 'info',
                    'message': f'Âge de {patiente.age} ans - Surveillance renforcée recommandée'
                })
            
            # Alerte consanguinité
            if getattr(patiente, 'consanguinite', False):
                alertes.append({
                    'type': 'consanguinite',
                    'niveau': 'warning',
                    'message': 'Consanguinité détectée - Conseil génétique recommandé'
                })
            
            # Alerte antécédents familiaux
            if getattr(patiente, 'antecedent_diabete_familial', False):
                alertes.append({
                    'type': 'diabete_familial',
                    'niveau': 'info',
                    'message': 'Antécédent familial de diabète - Surveillance glycémique'
                })
            
            if getattr(patiente, 'antecedent_hta_familial', False):
                alertes.append({
                    'type': 'hta_familiale',
                    'niveau': 'info',
                    'message': 'Antécédent familial d\'HTA - Surveillance tensionnelle'
                })
            
            # Alerte IMC
            imc = getattr(patiente, 'imc', 0.0)
            if imc:
                if imc < 18.5:
                    alertes.append({
                        'type': 'imc',
                        'niveau': 'warning',
                        'message': f'IMC bas ({imc:.1f}) - Surveillance nutritionnelle'
                    })
                elif imc > 30:
                    alertes.append({
                        'type': 'imc',
                        'niveau': 'warning',
                        'message': f'Obésité (IMC {imc:.1f}) - Surveillance renforcée'
                    })
                elif imc > 25:
                    alertes.append({
                        'type': 'imc',
                        'niveau': 'info',
                        'message': f'Surpoids (IMC {imc:.1f}) - Surveillance du poids'
                    })
            
            # Alerte niveau de risque global
            niveau_risque = getattr(patiente, 'niveau_risque_global', 'faible')
            if niveau_risque in ['eleve', 'tres_eleve']:
                alertes.append({
                    'type': 'risque_global',
                    'niveau': 'danger' if niveau_risque == 'tres_eleve' else 'warning',
                    'message': f'Niveau de risque {niveau_risque.replace("_", " ")} - Suivi spécialisé requis'
                })
            
            # Alerte grossesse en cours
            if getattr(patiente, 'est_enceinte', False):
                grossesse_actuelle = None
                if hasattr(patiente, 'grossesse_ids'):
                    grossesses_en_cours = patiente.grossesse_ids.filtered(
                        lambda g: getattr(g, 'state', 'en_cours') == 'en_cours'
                    )
                    if grossesses_en_cours:
                        grossesse_actuelle = grossesses_en_cours[0]
                        sa = getattr(grossesse_actuelle, 'semaines_amenorrhee', 0)
                        if sa > 37:
                            alertes.append({
                                'type': 'terme_proche',
                                'niveau': 'info',
                                'message': f'Terme proche ({sa} SA) - Préparation à l\'accouchement'
                            })
            
            return alertes
        except Exception as e:
            _logger.error(f"Erreur récupération alertes patiente {patiente.id}: {str(e)}")
            return []

    def _get_prochains_rdv(self, patiente, limit=5):
        """Récupérer les prochains rendez-vous d'une patiente"""
        try:
            rdv = []
            
            # Rechercher dans les consultations futures
            if hasattr(patiente, 'consultation_ids'):
                consultations_futures = patiente.consultation_ids.filtered(
                    lambda c: getattr(c, 'date_consultation', False) and 
                             c.date_consultation > datetime.now()
                ).sorted('date_consultation')[:limit]
                
                for consultation in consultations_futures:
                    try:
                        rdv.append({
                            'id': consultation.id,
                            'date': self._format_datetime(consultation.date_consultation),
                            'type': 'consultation',
                            'motif': getattr(consultation, 'motif', '') or 'Consultation de suivi',
                            'medecin': {
                                'id': consultation.medecin_id.id,
                                'nom': consultation.medecin_id.nom_complet or ''
                            } if getattr(consultation, 'medecin_id', None) else None,
                            'statut': getattr(consultation, 'state', 'planifie') or 'planifie'
                        })
                    except Exception as e:
                        _logger.error(f"Erreur formatage RDV consultation {consultation.id}: {str(e)}")
                        continue
            
            return rdv
        except Exception as e:
            _logger.error(f"Erreur récupération RDV patiente {patiente.id}: {str(e)}")
            return []

    def _get_derniere_consultation_date(self, patiente):
        """Récupérer la date de la dernière consultation"""
        try:
            if hasattr(patiente, 'consultation_ids') and patiente.consultation_ids:
                derniere = patiente.consultation_ids.filtered(
                    lambda c: getattr(c, 'date_consultation', False) and 
                             c.date_consultation <= datetime.now()
                ).sorted('date_consultation', reverse=True)
                
                if derniere:
                    return self._format_datetime(derniere[0].date_consultation)
            return None
        except Exception as e:
            _logger.error(f"Erreur récupération dernière consultation patiente {patiente.id}: {str(e)}")
            return None

    def _get_derniere_consultation_grossesse(self, grossesse):
        """Récupérer la date de la dernière consultation pour une grossesse"""
        try:
            if hasattr(grossesse, 'consultation_ids') and grossesse.consultation_ids:
                derniere = grossesse.consultation_ids.filtered(
                    lambda c: getattr(c, 'date_consultation', False) and 
                             c.date_consultation <= datetime.now()
                ).sorted('date_consultation', reverse=True)
                
                if derniere:
                    return self._format_datetime(derniere[0].date_consultation)
            return None
        except Exception as e:
            _logger.error(f"Erreur récupération dernière consultation grossesse {grossesse.id}: {str(e)}")
            return None

    def _format_date(self, date_value):
        """Formater une date"""
        if not date_value:
            return None
        try:
            if isinstance(date_value, str):
                return date_value
            elif isinstance(date_value, (date, datetime)):
                return date_value.strftime('%Y-%m-%d')
            else:
                return str(date_value)
        except Exception:
            return None

    def _format_datetime(self, datetime_value):
        """Formater une datetime"""
        if not datetime_value:
            return None
        try:
            if isinstance(datetime_value, str):
                return datetime_value
            elif isinstance(datetime_value, datetime):
                return datetime_value.strftime('%Y-%m-%d %H:%M:%S')
            elif isinstance(datetime_value, date):
                return datetime_value.strftime('%Y-%m-%d')
            else:
                return str(datetime_value)
        except Exception:
            return None

    # =================== ROUTES SUPPLÉMENTAIRES ===================

    @http.route('/salamet/patientes/<int:patiente_id>/export', type='http', auth='user', methods=['GET'])
    def export_patiente_data(self, patiente_id, format='pdf', **kwargs):
        """Exporter les données d'une patiente"""
        try:
            self._check_access()
            patiente = self._verify_patiente_access(patiente_id)
            
            if format == 'json':
                data = self._format_patiente_detail(patiente)
                response = request.make_response(
                    json.dumps(data, indent=2, ensure_ascii=False),
                    headers=[
                        ('Content-Type', 'application/json'),
                        ('Content-Disposition', f'attachment; filename="patiente_{patiente_id}.json"')
                    ]
                )
                return response
            else:
                # Pour PDF, rediriger vers le rapport Odoo
                return request.redirect(f'/web/content/salamet.patiente/{patiente_id}/rapport_patiente.pdf')
                
        except Exception as e:
            _logger.error(f"Erreur export patiente {patiente_id}: {str(e)}")
            return request.make_response(f"Erreur: {str(e)}", status=500)

    @http.route('/salamet/patientes/import', type='json', auth='user', methods=['POST'])
    def import_patientes_data(self, **kwargs):
        """Importer des données de patientes"""
        try:
            self._check_access()
            
            data = request.jsonrequest or {}
            patientes_data = data.get('patientes', [])
            
            if not patientes_data:
                return {'success': False, 'error': 'Aucune donnée fournie'}
            
            results = {
                'success': True,
                'created': 0,
                'updated': 0,
                'errors': []
            }
            
            for patiente_data in patientes_data:
                try:
                    # Vérifier si la patiente existe déjà
                    existing = None
                    if patiente_data.get('id'):
                        existing = request.env['salamet.patiente'].browse(patiente_data['id'])
                        if not existing.exists():
                            existing = None
                    
                    # Valider les données
                    validated_data = self._validate_patiente_data(patiente_data, is_update=bool(existing))
                    
                    if existing:
                        # Mise à jour
                        existing.write(validated_data)
                        results['updated'] += 1
                    else:
                        # Création
                        request.env['salamet.patiente'].create(validated_data)
                        results['created'] += 1
                        
                except Exception as e:
                    results['errors'].append({
                        'patiente': patiente_data.get('name', 'Inconnue'),
                        'error': str(e)
                    })
            
            return results
            
        except Exception as e:
            _logger.error(f"Erreur import patientes: {str(e)}")
            return {'success': False, 'error': str(e)}

    @http.route('/salamet/patientes/<int:patiente_id>/timeline', type='json', auth='user', methods=['GET', 'POST'])
    def get_patiente_timeline(self, patiente_id, **kwargs):
        """Récupérer la timeline complète d'une patiente"""
        try:
            self._check_access()
            patiente = self._verify_patiente_access(patiente_id)
            
            timeline = []
            
            # Ajouter les consultations
            if hasattr(patiente, 'consultation_ids'):
                for consultation in patiente.consultation_ids:
                    timeline.append({
                        'type': 'consultation',
                        'date': self._format_datetime(consultation.date_consultation),
                        'title': f'Consultation - {getattr(consultation, "type_consultation", "Générale")}',
                        'description': getattr(consultation, 'motif', '') or '',
                        'medecin': consultation.medecin_id.nom_complet if getattr(consultation, 'medecin_id', None) else '',
                        'id': consultation.id
                    })
            
            # Ajouter les grossesses
            if hasattr(patiente, 'grossesse_ids'):
                for grossesse in patiente.grossesse_ids:
                    timeline.append({
                        'type': 'grossesse_debut',
                        'date': self._format_date(grossesse.date_debut),
                        'title': 'Début de grossesse',
                        'description': f'Grossesse #{grossesse.id}',
                        'id': grossesse.id
                    })
                    
                    if getattr(grossesse, 'date_accouchement_reel', None):
                        timeline.append({
                            'type': 'accouchement',
                            'date': self._format_date(grossesse.date_accouchement_reel),
                            'title': 'Accouchement',
                            'description': f'Issue: {getattr(grossesse, "issue_grossesse", "Non spécifiée")}',
                            'id': grossesse.id
                        })
            
            # Trier par date
            timeline.sort(key=lambda x: x['date'] or '', reverse=True)
            
            return {
                'success': True,
                'timeline': timeline,
                'patiente': {
                    'id': patiente.id,
                    'nom': patiente.nom_complet
                }
            }
            
        except Exception as e:
            _logger.error(f"Erreur timeline patiente {patiente_id}: {str(e)}")
            return {'success': False, 'error': str(e)}

# Fin du fichier controllers/patientes.py

