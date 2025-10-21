# -*- coding: utf-8 -*-

from odoo import http
from odoo.http import request
from odoo.exceptions import ValidationError, AccessError
from datetime import datetime, timedelta
import json
import logging

_logger = logging.getLogger(__name__)


class SalametNotificationsController(http.Controller):
    """Contrôleur pour la gestion des notifications SALAMET"""

    @http.route('/salamet/notifications', type='http', auth='user', website=True)
    def liste_notifications(self, **kwargs):
        """Page de liste des notifications"""
        try:
            self._check_access()
            
            # Filtres
            filter_type = kwargs.get('type', '')
            filter_statut = kwargs.get('statut', 'non_lue')
            filter_priorite = kwargs.get('priorite', '')
            
            domain = [('destinataire_id', '=', request.env.user.id)]
            
            if filter_type:
                domain.append(('type_notification', '=', filter_type))
                
            if filter_statut == 'lue':
                domain.append(('date_lecture', '!=', False))
            elif filter_statut == 'non_lue':
                domain.append(('date_lecture', '=', False))
                
            if filter_priorite:
                domain.append(('priorite', '=', filter_priorite))

            # Pagination
            page = int(kwargs.get('page', 1))
            limit = 20
            offset = (page - 1) * limit

            notifications = request.env['salamet.notification'].search(
                domain, limit=limit, offset=offset, order='date_creation desc'
            )
            total = request.env['salamet.notification'].search_count(domain)

            # Marquer comme lues les notifications affichées
            notifications_non_lues = notifications.filtered(lambda n: not n.date_lecture)
            if notifications_non_lues:
                notifications_non_lues.write({'date_lecture': datetime.now()})

            # Types de notifications pour le filtre
            types_notification = request.env['salamet.notification']._fields['type_notification'].selection

            return request.render('salamet.notifications_list_template', {
                'notifications': notifications,
                'total': total,
                'page': page,
                'total_pages': (total + limit - 1) // limit,
                'filter_type': filter_type,
                'filter_statut': filter_statut,
                'filter_priorite': filter_priorite,
                'types_notification': types_notification
            })

        except Exception as e:
            _logger.error(f"Erreur liste notifications: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors du chargement des notifications'})

    @http.route('/salamet/notification/<int:notification_id>', type='http', auth='user', website=True)
    def detail_notification(self, notification_id, **kwargs):
        """Page de détail d'une notification"""
        try:
            self._check_access()
            
            notification = request.env['salamet.notification'].browse(notification_id)
            if not notification.exists():
                return request.not_found()

            # Vérifier que l'utilisateur est le destinataire
            if notification.destinataire_id.id != request.env.user.id:
                raise AccessError("Accès non autorisé à cette notification")

            # Marquer comme lue si ce n'est pas déjà fait
            if not notification.date_lecture:
                notification.write({'date_lecture': datetime.now()})

            return request.render('salamet.notification_detail_template', {
                'notification': notification
            })

        except AccessError as e:
            return request.render('salamet.error_template',
                                {'error': str(e)})
        except Exception as e:
            _logger.error(f"Erreur détail notification {notification_id}: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors du chargement de la notification'})

    @http.route('/salamet/notifications/marquer-lues', type='http', auth='user', methods=['POST'], csrf=True)
    def marquer_toutes_lues(self, **kwargs):
        """Marquer toutes les notifications comme lues"""
        try:
            self._check_access()
            
            notifications_non_lues = request.env['salamet.notification'].search([
                ('destinataire_id', '=', request.env.user.id),
                ('date_lecture', '=', False)
            ])
            
            notifications_non_lues.write({'date_lecture': datetime.now()})
            
            return request.redirect('/salamet/notifications')

        except Exception as e:
            _logger.error(f"Erreur marquer toutes lues: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors de la mise à jour'})

    @http.route('/salamet/notifications/supprimer-lues', type='http', auth='user', methods=['POST'], csrf=True)
    def supprimer_notifications_lues(self, **kwargs):
        """Supprimer toutes les notifications lues"""
        try:
            self._check_access()
            
            notifications_lues = request.env['salamet.notification'].search([
                ('destinataire_id', '=', request.env.user.id),
                ('date_lecture', '!=', False),
                ('date_lecture', '<', datetime.now() - timedelta(days=7))  # Plus de 7 jours
            ])
            
            notifications_lues.unlink()
            
            return request.redirect('/salamet/notifications')

        except Exception as e:
            _logger.error(f"Erreur suppression notifications: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors de la suppression'})

    @http.route('/salamet/notifications/parametres', type='http', auth='user', website=True)
    def parametres_notifications(self, **kwargs):
        """Page de paramétrage des notifications"""
        try:
            self._check_access()
            
            # Récupérer les préférences actuelles de l'utilisateur
            user = request.env.user
            preferences = {
                'notifications_email': user.notification_email_send,
                'notifications_rdv': getattr(user, 'salamet_notif_rdv', True),
                'notifications_vaccinations': getattr(user, 'salamet_notif_vaccinations', True),
                'notifications_alertes': getattr(user, 'salamet_notif_alertes', True),
                'notifications_rapports': getattr(user, 'salamet_notif_rapports', False)
            }

            return request.render('salamet.notifications_parametres_template', {
                'preferences': preferences
            })

        except Exception as e:
            _logger.error(f"Erreur paramètres notifications: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors du chargement des paramètres'})

    @http.route('/salamet/notifications/parametres/save', type='http', auth='user', methods=['POST'], csrf=True)
    def sauvegarder_parametres(self, **kwargs):
        """Sauvegarder les paramètres de notifications"""
        try:
            self._check_access()
            
            user = request.env.user
            
            # Mettre à jour les préférences
            user.write({
                'notification_email_send': kwargs.get('notifications_email') == 'on',
                'salamet_notif_rdv': kwargs.get('notifications_rdv') == 'on',
                'salamet_notif_vaccinations': kwargs.get('notifications_vaccinations') == 'on',
                'salamet_notif_alertes': kwargs.get('notifications_alertes') == 'on',
                'salamet_notif_rapports': kwargs.get('notifications_rapports') == 'on'
            })
            
            return request.redirect('/salamet/notifications/parametres?success=1')

        except Exception as e:
            _logger.error(f"Erreur sauvegarde paramètres: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors de la sauvegarde'})

    @http.route('/salamet/api/notifications/count', type='json', auth='user')
    def count_notifications_non_lues(self, **kwargs):
        """API pour compter les notifications non lues"""
        try:
            self._check_access()
            
            count = request.env['salamet.notification'].search_count([
                ('destinataire_id', '=', request.env.user.id),
                ('date_lecture', '=', False)
            ])
            
            return {
                'success': True,
                'count': count
            }

        except Exception as e:
            _logger.error(f"Erreur count notifications: {str(e)}")
            return {'success': False, 'error': str(e)}

    @http.route('/salamet/api/notifications/recent', type='json', auth='user')
    def notifications_recentes(self, **kwargs):
        """API pour récupérer les notifications récentes"""
        try:
            self._check_access()
            
            limit = int(kwargs.get('limit', 5))
            
            notifications = request.env['salamet.notification'].search([
                ('destinataire_id', '=', request.env.user.id)
            ], order='date_creation desc', limit=limit)
            
            data = []
            for notif in notifications:
                data.append({
                    'id': notif.id,
                    'titre': notif.titre,
                    'message': notif.message[:100] + '...' if len(notif.message) > 100 else notif.message,
                    'type': notif.type_notification,
                    'priorite': notif.priorite,
                    'date_creation': notif.date_creation.strftime('%d/%m/%Y %H:%M'),
                    'lue': bool(notif.date_lecture),
                    'url': notif.url_action or f'/salamet/notification/{notif.id}'
                })
            
            return {
                'success': True,
                'notifications': data
            }

        except Exception as e:
            _logger.error(f"Erreur notifications récentes: {str(e)}")
            return {'success': False, 'error': str(e)}

    @http.route('/salamet/api/notification/<int:notification_id>/marquer-lue', type='json', auth='user')
    def marquer_notification_lue(self, notification_id, **kwargs):
        """API pour marquer une notification comme lue"""
        try:
            self._check_access()
            
            notification = request.env['salamet.notification'].browse(notification_id)
            if not notification.exists():
                return {'success': False, 'error': 'Notification introuvable'}

            # Vérifier que l'utilisateur est le destinataire
            if notification.destinataire_id.id != request.env.user.id:
                return {'success': False, 'error': 'Accès non autorisé'}

            if not notification.date_lecture:
                notification.write({'date_lecture': datetime.now()})
            
            return {'success': True}

        except Exception as e:
            _logger.error(f"Erreur marquer notification lue {notification_id}: {str(e)}")
            return {'success': False, 'error': str(e)}

    @http.route('/salamet/notifications/creer', type='http', auth='user', website=True)
    def creer_notification(self, **kwargs):
        """Page de création d'une notification (pour les administrateurs)"""
        try:
            self._check_admin_access()
            
            # Récupérer les utilisateurs pour le destinataire
            utilisateurs = request.env['res.users'].search([
                ('groups_id', 'in', [request.env.ref('salamet.group_salamet_user').id])
            ])
            
            return request.render('salamet.notification_form_template', {
                'utilisateurs': utilisateurs,
                'mode': 'create'
            })

        except AccessError as e:
            return request.render('salamet.error_template',
                                {'error': str(e)})
        except Exception as e:
            _logger.error(f"Erreur création notification: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors du chargement du formulaire'})

    @http.route('/salamet/notifications/create', type='http', auth='user', methods=['POST'], csrf=True)
    def sauvegarder_notification(self, **kwargs):
        """Créer une nouvelle notification"""
        try:
            self._check_admin_access()
            
            # Validation des données
            required_fields = ['titre', 'message', 'type_notification']
            for field in required_fields:
                if not kwargs.get(field):
                    raise ValidationError(f"Le champ {field} est requis")

            # Destinataires
            destinataires = []
            if kwargs.get('destinataire_id'):
                destinataires = [int(kwargs['destinataire_id'])]
            elif kwargs.get('diffusion') == 'tous':
                utilisateurs = request.env['res.users'].search([
                    ('groups_id', 'in', [request.env.ref('salamet.group_salamet_user').id])
                ])
                destinataires = utilisateurs.ids

            # Créer les notifications
            for destinataire_id in destinataires:
                notification_vals = {
                    'titre': kwargs['titre'],
                    'message': kwargs['message'],
                    'type_notification': kwargs['type_notification'],
                    'priorite': kwargs.get('priorite', 'normale'),
                    'destinataire_id': destinataire_id,
                    'expediteur_id': request.env.user.id,
                    'url_action': kwargs.get('url_action', ''),
                    'date_expiration': datetime.strptime(kwargs['date_expiration'], '%Y-%m-%d').date() if kwargs.get('date_expiration') else False
                }
                
                request.env['salamet.notification'].create(notification_vals)
            
            return request.redirect('/salamet/notifications?success=created')

        except ValidationError as e:
            _logger.warning(f"Validation erreur création notification: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': str(e)})
        except Exception as e:
            _logger.error(f"Erreur création notification: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors de la création de la notification'})

    @http.route('/salamet/notifications/automatiques', type='http', auth='user', website=True)
    def notifications_automatiques(self, **kwargs):
        """Page de gestion des notifications automatiques"""
        try:
            self._check_admin_access()
            
            # Récupérer les règles de notifications automatiques
            regles = request.env['salamet.notification.regle'].search([])
            
            return request.render('salamet.notifications_automatiques_template', {
                'regles': regles
            })

        except AccessError as e:
            return request.render('salamet.error_template',
                                {'error': str(e)})
        except Exception as e:
            _logger.error(f"Erreur notifications automatiques: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors du chargement'})

    def _check_access(self):
        """Vérifier les droits d'accès"""
        if not request.env.user.has_group('salamet.group_salamet_user'):
            raise AccessError("Accès non autorisé")

    def _check_admin_access(self):
        """Vérifier les droits d'administration"""
        if not request.env.user.has_group('salamet.group_salamet_manager'):
            raise AccessError("Accès non autorisé - Droits administrateur requis")
