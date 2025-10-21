# -*- coding: utf-8 -*-
import json
import logging
from odoo import http
from odoo.http import request, Response

_logger = logging.getLogger(__name__)


class SalametAPIController(http.Controller):
    """Contrôleur de base pour l'API SALAMET"""

    def _json_response(self, data=None, success=True, message="", status=200):
        """Retourne une réponse JSON standardisée"""
        response_data = {
            "success": success,
            "message": message,
        }
        
        if data is not None:
            response_data["data"] = data
        
        return Response(
            json.dumps(response_data, default=str, ensure_ascii=False),
            status=status,
            mimetype='application/json',
            headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, X-Openerp-Session-Id',
                'Access-Control-Allow-Credentials': 'true',
            }
        )

    def _error_response(self, message, status=400, error_code=None):
        """Retourne une réponse d'erreur JSON"""
        error_data = {
            "success": False,
            "error": message,
            "code": error_code or status
        }
        
        _logger.error(f"API Error: {message}")
        
        return Response(
            json.dumps(error_data, ensure_ascii=False),
            status=status,
            mimetype='application/json',
            headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, X-Openerp-Session-Id',
                'Access-Control-Allow-Credentials': 'true',
            }
        )

    def _get_user_role(self, user=None):
        """
        Retourne le rôle de l'utilisateur connecté
        
        Returns:
            dict: {
                'role': 'medecin_senior' | 'medecin_resident' | 'patiente' | 'admin' | 'readonly',
                'role_name': 'Médecin Senior' | 'Médecin Résident' | 'Patiente' | 'Administrateur' | 'Observateur',
                'permissions': {
                    'can_create': bool,
                    'can_edit': bool,
                    'can_delete': bool,
                    'can_view_all': bool
                }
            }
        """
        if user is None:
            user = request.env.user
        
        role_info = {
            'role': 'user',
            'role_name': 'Utilisateur',
            'permissions': {
                'can_create': False,
                'can_edit': False,
                'can_delete': False,
                'can_view_all': False
            }
        }
        
        # Vérification par ordre de priorité (du plus élevé au plus bas)
        if user.has_group('salamet.group_salamet_admin'):
            role_info.update({
                'role': 'admin',
                'role_name': 'Administrateur',
                'permissions': {
                    'can_create': True,
                    'can_edit': True,
                    'can_delete': True,
                    'can_view_all': True
                }
            })
        
        elif user.has_group('salamet.group_salamet_medecin_senior'):
            role_info.update({
                'role': 'medecin_senior',
                'role_name': 'Médecin Senior',
                'permissions': {
                    'can_create': True,
                    'can_edit': True,
                    'can_delete': False,
                    'can_view_all': False
                }
            })
        
        elif user.has_group('salamet.group_salamet_medecin_resident'):
            role_info.update({
                'role': 'medecin_resident',
                'role_name': 'Médecin Résident',
                'permissions': {
                    'can_create': True,
                    'can_edit': True,
                    'can_delete': False,
                    'can_view_all': False
                }
            })
        
        elif user.has_group('salamet.group_salamet_patiente'):
            role_info.update({
                'role': 'patiente',
                'role_name': 'Patiente',
                'permissions': {
                    'can_create': False,
                    'can_edit': False,
                    'can_delete': False,
                    'can_view_all': False
                }
            })
        
        elif user.has_group('salamet.group_salamet_readonly'):
            role_info.update({
                'role': 'readonly',
                'role_name': 'Observateur',
                'permissions': {
                    'can_create': False,
                    'can_edit': False,
                    'can_delete': False,
                    'can_view_all': True
                }
            })
        
        return role_info

    def _get_user_profile_data(self, user):
        """
        Récupère les données de profil selon le rôle
        
        Returns:
            dict: Données du profil (médecin ou patiente)
        """
        role_info = self._get_user_role(user)
        profile_data = None
        
        if role_info['role'] in ['medecin_senior', 'medecin_resident']:
            # Rechercher le profil médecin
            medecin = request.env['salamet.medecin'].sudo().search([
                ('user_id', '=', user.id)
            ], limit=1)
            
            if medecin:
                profile_data = {
                    'id': medecin.id,
                    'name': medecin.name,
                    'specialite': medecin.specialite if hasattr(medecin, 'specialite') else None,
                    'telephone': medecin.telephone if hasattr(medecin, 'telephone') else None,
                    'email': medecin.email if hasattr(medecin, 'email') else user.email,
                    'matricule': medecin.matricule if hasattr(medecin, 'matricule') else None,
                }
        
        elif role_info['role'] == 'patiente':
            # Rechercher le profil patiente
            patiente = request.env['salamet.patiente'].sudo().search([
                ('user_id', '=', user.id)
            ], limit=1)
            
            if patiente:
                profile_data = {
                    'id': patiente.id,
                    'name': patiente.name,
                    'prenom': patiente.prenom if hasattr(patiente, 'prenom') else None,
                    'date_naissance': patiente.date_naissance.isoformat() if hasattr(patiente, 'date_naissance') and patiente.date_naissance else None,
                    'telephone': patiente.telephone if hasattr(patiente, 'telephone') else None,
                    'email': patiente.email if hasattr(patiente, 'email') else user.email,
                    'numero_dossier': patiente.numero_dossier if hasattr(patiente, 'numero_dossier') else None,
                    'medecin': {
                        'id': patiente.medecin_id.id,
                        'name': patiente.medecin_id.name
                    } if hasattr(patiente, 'medecin_id') and patiente.medecin_id else None,
                }
        
        return profile_data
