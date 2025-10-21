# -*- coding: utf-8 -*-
from odoo import http
from odoo.http import request
import json
import logging

_logger = logging.getLogger(__name__)

class AuthController(http.Controller):
    
    @http.route('/api/auth/login', type='json', auth='none', methods=['POST'], csrf=False, cors='*')
    def login(self, **kwargs):
        """
        Authentification utilisateur avec détection automatique du rôle
        basée sur les groupes Odoo
        """
        try:
            data = json.loads(request.httprequest.data)
            email = data.get('email')
            password = data.get('password')
            
            _logger.info(f"🔐 Tentative de connexion pour: {email}")
            
            if not email or not password:
                return {
                    'success': False,
                    'error': 'Email et mot de passe requis'
                }
            
            # Authentification Odoo
            uid = request.session.authenticate(
                request.session.db,
                email,
                password
            )
            
            if not uid:
                _logger.warning(f"❌ Échec authentification pour: {email}")
                return {
                    'success': False,
                    'error': 'Email ou mot de passe incorrect'
                }
            
            # Récupérer l'utilisateur avec sudo pour accéder aux groupes
            user = request.env['res.users'].sudo().browse(uid)
            
            # Log des groupes pour debug
            group_names = [g.full_name for g in user.groups_id]
            _logger.info(f"📋 Groupes de {user.name}: {group_names}")
            
            # Déterminer le rôle basé sur les groupes
            role = self._determine_user_role(user)
            
            _logger.info(f"✅ Connexion réussie: {user.name} (ID: {uid}, Rôle: {role})")
            
            # Préparer les données utilisateur
            user_data = {
                'id': user.id,
                'name': user.name,
                'email': user.email or user.login,
                'role': role,
            }
            
            # Ajouter des données spécifiques selon le rôle
            if role == 'medecin':
                medecin = request.env['salamet.medecin'].sudo().search([
                    ('user_id', '=', uid)
                ], limit=1)
                
                if medecin:
                    user_data['medecin_id'] = medecin.id
                    user_data['specialite'] = medecin.specialite
                    user_data['grade'] = medecin.grade
                    _logger.info(f"👨‍⚕️ Médecin trouvé: {medecin.name} ({medecin.specialite})")
                else:
                    _logger.warning(f"⚠️ Aucun médecin trouvé pour user_id={uid}")
            
            elif role == 'patiente':
                patiente = request.env['salamet.patiente'].sudo().search([
                    ('user_id', '=', uid)
                ], limit=1)
                
                if patiente:
                    user_data['patiente_id'] = patiente.id
                    user_data['nom_complet'] = patiente.nom_complet
                    _logger.info(f"👩 Patiente trouvée: {patiente.nom_complet}")
                else:
                    _logger.warning(f"⚠️ Aucune patiente trouvée pour user_id={uid}")
            
            return {
                'success': True,
                'user': user_data,
                'session_id': request.session.sid
            }
            
        except Exception as e:
            _logger.error(f"❌ Erreur lors de la connexion: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': f'Erreur serveur: {str(e)}'
            }
    
    def _determine_user_role(self, user):
        """
        Détermine le rôle de l'utilisateur basé sur ses groupes Odoo
        
        Priorité (du plus spécifique au plus général):
        1. Admin (group_salamet_admin)
        2. Médecin Senior (group_salamet_medecin_senior)
        3. Médecin Résident (group_salamet_medecin_resident)
        4. Patiente (group_salamet_patiente)
        5. Lecture seule (group_salamet_readonly)
        """
        
        # Récupérer les XML IDs des groupes
        IrModelData = request.env['ir.model.data'].sudo()
        
        # Vérifier Admin
        try:
            admin_group = IrModelData.get_object('salamet', 'group_salamet_admin')
            if admin_group.id in user.groups_id.ids:
                _logger.info(f"👑 {user.name} → ADMIN")
                return 'admin'
        except Exception as e:
            _logger.warning(f"⚠️ Groupe admin non trouvé: {e}")
        
        # Vérifier Médecin Senior
        try:
            senior_group = IrModelData.get_object('salamet', 'group_salamet_medecin_senior')
            if senior_group.id in user.groups_id.ids:
                _logger.info(f"👨‍⚕️ {user.name} → MEDECIN SENIOR")
                return 'medecin'
        except Exception as e:
            _logger.warning(f"⚠️ Groupe médecin senior non trouvé: {e}")
        
        # Vérifier Médecin Résident
        try:
            resident_group = IrModelData.get_object('salamet', 'group_salamet_medecin_resident')
            if resident_group.id in user.groups_id.ids:
                _logger.info(f"👨‍⚕️ {user.name} → MEDECIN RESIDENT")
                return 'medecin'
        except Exception as e:
            _logger.warning(f"⚠️ Groupe médecin résident non trouvé: {e}")
        
        # Vérifier Patiente
        try:
            patiente_group = IrModelData.get_object('salamet', 'group_salamet_patiente')
            if patiente_group.id in user.groups_id.ids:
                _logger.info(f"👩 {user.name} → PATIENTE")
                return 'patiente'
        except Exception as e:
            _logger.warning(f"⚠️ Groupe patiente non trouvé: {e}")
        
        # Vérifier Lecture seule
        try:
            readonly_group = IrModelData.get_object('salamet', 'group_salamet_readonly')
            if readonly_group.id in user.groups_id.ids:
                _logger.info(f"👁️ {user.name} → READONLY")
                return 'readonly'
        except Exception as e:
            _logger.warning(f"⚠️ Groupe readonly non trouvé: {e}")
        
        # Par défaut
        _logger.warning(f"⚠️ Aucun groupe Salamet trouvé pour {user.name}")
        _logger.warning(f"📋 Groupes disponibles: {[g.full_name for g in user.groups_id]}")
        return 'user'
    
    @http.route('/api/auth/logout', type='json', auth='user', methods=['POST'], csrf=False, cors='*')
    def logout(self):
        """Déconnexion utilisateur"""
        try:
            _logger.info(f"🚪 Déconnexion utilisateur: {request.env.user.name}")
            request.session.logout()
            return {'success': True}
        except Exception as e:
            _logger.error(f"❌ Erreur lors de la déconnexion: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    @http.route('/api/auth/me', type='json', auth='user', methods=['GET'], csrf=False, cors='*')
    def get_current_user(self):
        """Récupérer les informations de l'utilisateur connecté"""
        try:
            user = request.env.user
            role = self._determine_user_role(user)
            
            user_data = {
                'id': user.id,
                'name': user.name,
                'email': user.email or user.login,
                'role': role,
            }
            
            # Ajouter données spécifiques selon le rôle
            if role == 'medecin':
                medecin = request.env['salamet.medecin'].search([
                    ('user_id', '=', user.id)
                ], limit=1)
                
                if medecin:
                    user_data['medecin_id'] = medecin.id
                    user_data['specialite'] = medecin.specialite
                    user_data['grade'] = medecin.grade
            
            elif role == 'patiente':
                patiente = request.env['salamet.patiente'].search([
                    ('user_id', '=', user.id)
                ], limit=1)
                
                if patiente:
                    user_data['patiente_id'] = patiente.id
                    user_data['nom_complet'] = patiente.nom_complet
            
            return {
                'success': True,
                'user': user_data
            }
            
        except Exception as e:
            _logger.error(f"❌ Erreur récupération utilisateur: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
