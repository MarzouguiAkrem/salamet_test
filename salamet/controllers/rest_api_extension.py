# -*- coding: utf-8 -*-
from odoo import http
from odoo.http import request
import json
import logging

_logger = logging.getLogger(__name__)

class SalametRestAPI(http.Controller):
    
    @http.route('/api/salamet/user_info', type='http', auth='none', methods=['GET'], csrf=False, cors='*')
    def get_user_info(self, **kwargs):
        """
        Récupère les informations de l'utilisateur avec son rôle Salamet
        Headers requis: username, password, api-key
        """
        try:
            # Récupérer les headers
            username = request.httprequest.headers.get('username')
            password = request.httprequest.headers.get('password')
            api_key = request.httprequest.headers.get('api-key')
            
            _logger.info(f"🔍 Requête user_info pour: {username}")
            
            if not username or not password:
                return request.make_json_response({
                    'success': False,
                    'error': 'Username et password requis dans les headers'
                }, status=401)
            
            # Authentifier l'utilisateur
            try:
                uid = request.session.authenticate(
                    request.session.db,
                    username,
                    password
                )
            except Exception as e:
                _logger.error(f"❌ Erreur authentification: {e}")
                return request.make_json_response({
                    'success': False,
                    'error': 'Authentification échouée'
                }, status=401)
            
            if not uid:
                return request.make_json_response({
                    'success': False,
                    'error': 'Identifiants invalides'
                }, status=401)
            
            # Récupérer l'utilisateur
            user = request.env['res.users'].sudo().browse(uid)
            
            # Déterminer le rôle
            role = self._get_salamet_role(user)
            
            # Préparer les données
            user_data = {
                'id': user.id,
                'name': user.name,
                'email': user.email or user.login,
                'login': user.login,
                'role': role,
            }
            
            # Ajouter les données spécifiques
            if role == 'medecin':
                medecin = request.env['salamet.medecin'].sudo().search([
                    ('user_id', '=', uid)
                ], limit=1)
                
                if medecin:
                    user_data.update({
                        'medecin_id': medecin.id,
                        'specialite': medecin.specialite,
                        'grade': medecin.grade,
                        'nom_complet': medecin.name
                    })
            
            elif role == 'patiente':
                patiente = request.env['salamet.patiente'].sudo().search([
                    ('user_id', '=', uid)
                ], limit=1)
                
                if patiente:
                    user_data.update({
                        'patiente_id': patiente.id,
                        'nom_complet': patiente.nom_complet,
                        'date_naissance': patiente.date_naissance.isoformat() if patiente.date_naissance else None
                    })
            
            _logger.info(f"✅ User info récupérée: {user.name} ({role})")
            
            return request.make_json_response({
                'success': True,
                'user': user_data
            })
            
        except Exception as e:
            _logger.error(f"❌ Erreur get_user_info: {str(e)}", exc_info=True)
            return request.make_json_response({
                'success': False,
                'error': str(e)
            }, status=500)
    
    def _get_salamet_role(self, user):
        """Détermine le rôle Salamet de l'utilisateur"""
        
        # Vérifier si l'utilisateur a un profil médecin
        medecin = request.env['salamet.medecin'].sudo().search([
            ('user_id', '=', user.id)
        ], limit=1)
        
        if medecin:
            _logger.info(f"👨‍⚕️ Médecin trouvé: {medecin.name}")
            return 'medecin'
        
        # Vérifier si l'utilisateur a un profil patiente
        patiente = request.env['salamet.patiente'].sudo().search([
            ('user_id', '=', user.id)
        ], limit=1)
        
        if patiente:
            _logger.info(f"👩 Patiente trouvée: {patiente.nom_complet}")
            return 'patiente'
        
        # Vérifier les groupes en dernier recours
        group_names = [g.name.lower() for g in user.groups_id]
        
        if any('admin' in name for name in group_names):
            return 'admin'
        
        if any('medecin' in name or 'doctor' in name for name in group_names):
            return 'medecin'
        
        if any('patiente' in name or 'patient' in name for name in group_names):
            return 'patiente'
        
        _logger.warning(f"⚠️ Aucun rôle Salamet trouvé pour {user.name}")
        return 'user'
