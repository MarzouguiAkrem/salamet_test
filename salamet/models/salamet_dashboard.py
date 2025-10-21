# -*- coding: utf-8 -*-

from odoo import models, fields, api
from datetime import datetime, timedelta
import json


class SalametDashboard(models.Model):
    _name = 'salamet.dashboard'
    _description = 'Tableau de bord SALAMET'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    name = fields.Char(string='Nom du tableau de bord', default='Tableau de bord SALAMET')

    # =================== INDICATEURS GÉNÉRAUX ===================
    @api.model
    def get_dashboard_data(self):
        """Récupérer toutes les données du tableau de bord"""
        return {
            'kpis': self._get_kpis(),
            'notifications': self._get_notifications_urgentes(),
            'consultations_jour': self._get_consultations_jour(),
            'grossesses_risque': self._get_grossesses_a_risque(),
            'statistiques': self._get_statistiques(),
            'graphiques': self._get_graphiques_data(),
        }

    def _get_kpis(self):
        """Calculer les KPIs principaux"""
        today = fields.Date.today()

        # Grossesses actives
        grossesses_actives = self.env['salamet.grossesse'].search_count([
            ('state', 'in', ['en_cours', 'a_risque']),
            ('active', '=', True)
        ])

        # Grossesses à risque
        grossesses_risque = self.env['salamet.grossesse'].search_count([
            ('state', '=', 'a_risque'),
            ('active', '=', True)
        ])

        # Consultations aujourd'hui
        consultations_today = self.env['salamet.consultation'].search_count([
            ('date_consultation', '>=', today),
            ('date_consultation', '<', today + timedelta(days=1))
        ])

        # Notifications urgentes
        notifications_urgentes = self.env['salamet.notification'].search_count([
            ('priorite', 'in', ['critique', 'haute']),
            ('state', 'in', ['en_attente', 'vue'])
        ])

        # Notifications en retard
        notifications_retard = self.env['salamet.notification'].search_count([
            ('est_en_retard', '=', True),
            ('state', 'in', ['en_attente', 'vue'])
        ])

        # Termes proches (> 37 SA)
        termes_proches = self.env['salamet.grossesse'].search_count([
            ('tag', '>=', 37),
            ('state', 'in', ['en_cours', 'a_risque']),
            ('active', '=', True)
        ])

        # Dépassements de terme (> 41 SA)
        depassements_terme = self.env['salamet.grossesse'].search_count([
            ('tag', '>=', 41),
            ('state', 'in', ['en_cours', 'a_risque']),
            ('active', '=', True)
        ])

        return {
            'grossesses_actives': {
                'value': grossesses_actives,
                'label': 'Grossesses actives',
                'icon': '🤱',
                'color': 'primary'
            },
            'grossesses_risque': {
                'value': grossesses_risque,
                'label': 'Grossesses à risque',
                'icon': '⚠️',
                'color': 'warning'
            },
            'consultations_today': {
                'value': consultations_today,
                'label': 'Consultations aujourd\'hui',
                'icon': '🩺',
                'color': 'info'
            },
            'notifications_urgentes': {
                'value': notifications_urgentes,
                'label': 'Notifications urgentes',
                'icon': '🚨',
                'color': 'danger'
            },
            'notifications_retard': {
                'value': notifications_retard,
                'label': 'Notifications en retard',
                'icon': '⏰',
                'color': 'danger'
            },
            'termes_proches': {
                'value': termes_proches,
                'label': 'Termes proches',
                'icon': '🍼',
                'color': 'success'
            },
            'depassements_terme': {
                'value': depassements_terme,
                'label': 'Dépassements de terme',
                'icon': '🚨',
                'color': 'danger'
            }
        }

    def _get_notifications_urgentes(self):
        """Récupérer les notifications urgentes"""
        notifications = self.env['salamet.notification'].search([
            ('priorite', 'in', ['critique', 'haute']),
            ('state', 'in', ['en_attente', 'vue'])
        ], limit=10, order='priorite desc, date_prevue asc')

        return [{
            'id': notif.id,
            'titre': notif.titre,
            'patiente': notif.patiente_id.name,
            'priorite': notif.priorite,
            'type': notif.type_notification,
            'date_prevue': notif.date_prevue.strftime('%d/%m/%Y %H:%M') if notif.date_prevue else '',
            'jours_restants': notif.jours_restants,
            'en_retard': notif.est_en_retard,
        } for notif in notifications]

    def _get_consultations_jour(self):
        """Récupérer les consultations du jour"""
        today = fields.Date.today()
        consultations = self.env['salamet.consultation'].search([
            ('date_consultation', '>=', today),
            ('date_consultation', '<', today + timedelta(days=1))
        ], order='date_consultation asc')

        return [{
            'id': consult.id,
            'patiente': consult.patiente_id.name,
            'heure': consult.date_consultation.strftime('%H:%M'),
            'type': consult.type_consultation,
            'medecin': consult.medecin_id.name if consult.medecin_id else '',
            'terme': f"{consult.terme_grossesse:.1f} SA",
            'niveau_alerte': consult.niveau_alerte,
            'urgence': consult.urgence_detectee,
        } for consult in consultations]

    def _get_grossesses_a_risque(self):
        """Récupérer les grossesses à risque"""
        grossesses = self.env['salamet.grossesse'].search([
            ('state', '=', 'a_risque'),
            ('active', '=', True)
        ], limit=15, order='tag desc')

        return [{
            'id': grossesse.id,
            'patiente': grossesse.patiente_id.name,
            'terme': f"{grossesse.tag:.1f} SA",
            'pathologie': grossesse.type_pathologie_principale,
            'derniere_consultation': grossesse.derniere_consultation.strftime(
                '%d/%m/%Y') if grossesse.derniere_consultation else 'Aucune',
            'medecin': grossesse.medecin_referent_id.name if grossesse.medecin_referent_id else '',
            'niveau_risque': grossesse.niveau_risque,
        } for grossesse in grossesses]

    def _get_statistiques(self):
        """Calculer les statistiques générales"""
        # Statistiques sur 30 derniers jours
        date_debut = fields.Date.today() - timedelta(days=30)

        # Nouvelles grossesses
        nouvelles_grossesses = self.env['salamet.grossesse'].search_count([
            ('date_creation', '>=', date_debut)
        ])

        # Consultations réalisées
        consultations_mois = self.env['salamet.consultation'].search_count([
            ('date_consultation', '>=', date_debut)
        ])

        # Accouchements
        accouchements = self.env['salamet.grossesse'].search_count([
            ('state', '=', 'terminee'),
            ('date_fin', '>=', date_debut)
        ])

        # Taux de suivi (grossesses avec consultation récente)
        grossesses_suivies = self.env['salamet.grossesse'].search_count([
            ('state', 'in', ['en_cours', 'a_risque']),
            ('derniere_consultation', '>=', date_debut)
        ])

        grossesses_totales = self.env['salamet.grossesse'].search_count([
            ('state', 'in', ['en_cours', 'a_risque'])
        ])

        taux_suivi = (grossesses_suivies / grossesses_totales * 100) if grossesses_totales > 0 else 0

        return {
            'nouvelles_grossesses': nouvelles_grossesses,
            'consultations_mois': consultations_mois,
            'accouchements': accouchements,
            'taux_suivi': round(taux_suivi, 1),
        }

    def _get_graphiques_data(self):
        """Préparer les données pour les graphiques"""
        return {
            'consultations_par_semaine': self._get_consultations_par_semaine(),
            'pathologies_repartition': self._get_pathologies_repartition(),
            'notifications_par_type': self._get_notifications_par_type(),
            'evolution_grossesses': self._get_evolution_grossesses(),
        }

    def _get_consultations_par_semaine(self):
        """Données pour graphique consultations par semaine"""
        data = []
        for i in range(8):  # 8 dernières semaines
            date_fin = fields.Date.today() - timedelta(days=i * 7)
            date_debut = date_fin - timedelta(days=6)

            count = self.env['salamet.consultation'].search_count([
                ('date_consultation', '>=', date_debut),
                ('date_consultation', '<=', date_fin)
            ])

            data.append({
                'semaine': f"S{date_fin.strftime('%W')}",
                'consultations': count
            })

        return list(reversed(data))

    def _get_pathologies_repartition(self):
        """Répartition des pathologies"""
        pathologies = self.env['salamet.grossesse'].read_group([
            ('state', 'in', ['en_cours', 'a_risque']),
            ('active', '=', True)
        ], ['type_pathologie_principale'], ['type_pathologie_principale'])

        return [{
            'pathologie': p['type_pathologie_principale'],
            'count': p['type_pathologie_principale_count']
        } for p in pathologies]

    def _get_notifications_par_type(self):
        """Répartition des notifications par type"""
        notifications = self.env['salamet.notification'].read_group([
            ('state', 'in', ['en_attente', 'vue'])
        ], ['type_notification'], ['type_notification'])

        return [{
            'type': n['type_notification'],
            'count': n['type_notification_count']
        } for n in notifications]

    def _get_evolution_grossesses(self):
        """Évolution du nombre de grossesses sur 6 mois"""
        data = []
        for i in range(6):
            date = fields.Date.today().replace(day=1) - timedelta(days=i * 30)

            count = self.env['salamet.grossesse'].search_count([
                ('date_creation', '>=', date),
                ('date_creation', '<', date + timedelta(days=30))
            ])

            data.append({
                'mois': date.strftime('%m/%Y'),
                'grossesses': count
            })

        return list(reversed(data))

    # =================== ACTIONS RAPIDES ===================
    @api.model
    def action_nouvelle_consultation(self):
        """Action rapide pour créer une nouvelle consultation"""
        return {
            'type': 'ir.actions.act_window',
            'name': 'Nouvelle consultation',
            'res_model': 'salamet.consultation',
            'view_mode': 'form',
            'target': 'current',
        }

    @api.model
    def action_nouvelle_grossesse(self):
        """Action rapide pour créer une nouvelle grossesse"""
        return {
            'type': 'ir.actions.act_window',
            'name': 'Nouvelle grossesse',
            'res_model': 'salamet.grossesse',
            'view_mode': 'form',
            'target': 'current',
        }

    @api.model
    def action_notifications_urgentes(self):
        """Voir toutes les notifications urgentes"""
        return {
            'type': 'ir.actions.act_window',
            'name': 'Notifications urgentes',
            'res_model': 'salamet.notification',
            'view_mode': 'list,form',
            'domain': [('priorite', 'in', ['critique', 'haute']), ('state', 'in', ['en_attente', 'vue'])],
            'target': 'current',
        }

    @api.model
    def action_grossesses_risque(self):
        """Voir toutes les grossesses à risque"""
        return {
            'type': 'ir.actions.act_window',
            'name': 'Grossesses à risque',
            'res_model': 'salamet.grossesse',
            'view_mode': 'list,form',
            'domain': [('state', '=', 'a_risque'), ('active', '=', True)],
            'target': 'current',
        }
