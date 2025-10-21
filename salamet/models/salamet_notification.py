# -*- coding: utf-8 -*-

from odoo import models, fields, api
from odoo.exceptions import ValidationError
from datetime import datetime, timedelta
import logging

_logger = logging.getLogger(__name__)


class SalametNotification(models.Model):
    _name = 'salamet.notification'
    _description = 'Notifications de Surveillance SALAMET'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'date_prevue desc, priorite desc'
    _rec_name = 'titre'

    # =================== CHAMPS DE BASE ===================
    titre = fields.Char(
        string='Titre',
        required=True
    )

    message = fields.Text(
        string='Message',
        required=True
    )

    type_notification = fields.Selection([
        ('rappel_consultation', 'Rappel de consultation'),
        ('rappel_bilan', 'Rappel de bilan'),
        ('surveillance_pathologie', 'Surveillance pathologie'),
        ('urgence', 'Urgence médicale'),
        ('maturation_pulmonaire', 'Maturation pulmonaire'),
        ('terme_proche', 'Terme proche'),
        ('depassement_terme', 'Dépassement de terme'),
        ('suivi_traitement', 'Suivi de traitement'),
        ('information', 'Information générale'),
    ], string='Type de notification', required=True)

    priorite = fields.Selection([
        ('basse', 'Basse'),
        ('moyenne', 'Moyenne'),
        ('haute', 'Haute'),
        ('critique', 'Critique'),
    ], string='Priorité', required=True, default='moyenne')

    state = fields.Selection([
        ('en_attente', 'En attente'),
        ('vue', 'Vue'),
        ('traitee', 'Traitée'),
        ('reportee', 'Reportée'),
        ('annulee', 'Annulée'),
    ], string='État', default='en_attente')

    # =================== RELATIONS ===================
    patiente_id = fields.Many2one(
        'salamet.patiente',
        string='Patiente',
        required=True,
        ondelete='cascade'
    )

    grossesse_id = fields.Many2one(
        'salamet.grossesse',
        string='Grossesse',
        ondelete='cascade'
    )

    medecin_responsable_id = fields.Many2one(
        'salamet.medecin',
        string='Médecin responsable'
    )

    consultation_id = fields.Many2one(
        'salamet.consultation',
        string='Consultation liée',
        ondelete='set null'
    )

    # =================== DATES ET TIMING ===================
    date_creation = fields.Datetime(
        string='Date de création',
        default=fields.Datetime.now,
        readonly=True
    )

    date_prevue = fields.Datetime(
        string='Date prévue',
        required=True
    )

    date_traitement = fields.Datetime(
        string='Date de traitement',
        readonly=True
    )

    date_echeance = fields.Datetime(
        string='Date d\'échéance',
        compute='_compute_date_echeance',
        store=True
    )

    jours_restants = fields.Integer(
        string='Jours restants',
        compute='_compute_jours_restants'
    )

    est_en_retard = fields.Boolean(
        string='En retard',
        compute='_compute_est_en_retard'
    )

    # =================== INFORMATIONS COMPLÉMENTAIRES ===================
    actions_requises = fields.Text(
        string='Actions requises'
    )

    observations = fields.Text(
        string='Observations'
    )

    resultat_action = fields.Text(
        string='Résultat de l\'action',
        readonly=True
    )

    automatique = fields.Boolean(
        string='Notification automatique',
        default=True,
        help='Indique si la notification a été générée automatiquement'
    )

    recurrente = fields.Boolean(
        string='Notification récurrente',
        default=False
    )

    frequence_recurrence = fields.Selection([
        ('quotidien', 'Quotidien'),
        ('hebdomadaire', 'Hebdomadaire'),
        ('mensuel', 'Mensuel'),
    ], string='Fréquence de récurrence')

    # =================== CHAMPS CALCULÉS ===================
    @api.depends('date_prevue', 'priorite')
    def _compute_date_echeance(self):
        """Calcul de la date d'échéance selon la priorité"""
        for record in self:
            if record.date_prevue:
                if record.priorite == 'critique':
                    # Échéance immédiate
                    record.date_echeance = record.date_prevue
                elif record.priorite == 'haute':
                    # Échéance dans 1 jour
                    record.date_echeance = record.date_prevue + timedelta(days=1)
                elif record.priorite == 'moyenne':
                    # Échéance dans 3 jours
                    record.date_echeance = record.date_prevue + timedelta(days=3)
                else:  # basse
                    # Échéance dans 7 jours
                    record.date_echeance = record.date_prevue + timedelta(days=7)
            else:
                record.date_echeance = False

    @api.depends('date_echeance')
    def _compute_jours_restants(self):
        """Calcul des jours restants avant échéance"""
        for record in self:
            if record.date_echeance:
                delta = record.date_echeance.date() - fields.Date.today()
                record.jours_restants = delta.days
            else:
                record.jours_restants = 0

    @api.depends('date_echeance', 'state')
    def _compute_est_en_retard(self):
        """Vérification si la notification est en retard"""
        for record in self:
            if record.state in ['en_attente', 'vue'] and record.date_echeance:
                record.est_en_retard = record.date_echeance < fields.Datetime.now()
            else:
                record.est_en_retard = False

    # =================== MÉTHODES D'ACTION ===================
    def action_marquer_vue(self):
        """Marquer la notification comme vue"""
        self.write({
            'state': 'vue',
            'date_traitement': fields.Datetime.now()
        })
        return True

    def action_marquer_traitee(self):
        """Marquer la notification comme traitée"""
        return {
            'type': 'ir.actions.act_window',
            'name': 'Traiter la notification',
            'res_model': 'salamet.notification.traitement.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {
                'default_notification_id': self.id,
            }
        }

    def action_reporter(self):
        """Reporter la notification"""
        return {
            'type': 'ir.actions.act_window',
            'name': 'Reporter la notification',
            'res_model': 'salamet.notification.report.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {
                'default_notification_id': self.id,
            }
        }

    def action_annuler(self):
        """Annuler la notification"""
        self.write({
            'state': 'annulee',
            'date_traitement': fields.Datetime.now()
        })
        return True

    def action_creer_consultation(self):
        """Créer une consultation depuis la notification"""
        if not self.grossesse_id:
            raise ValidationError("Impossible de créer une consultation sans grossesse associée.")

        return {
            'type': 'ir.actions.act_window',
            'name': f'Nouvelle consultation - {self.patiente_id.name}',
            'res_model': 'salamet.consultation',
            'view_mode': 'form',
            'target': 'current',
            'context': {
                'default_grossesse_id': self.grossesse_id.id,
                'default_patiente_id': self.patiente_id.id,
                'default_medecin_id': self.medecin_responsable_id.id,
                'default_terme_grossesse': self.grossesse_id.tag,
                'default_motif_consultation': f'Suite à notification: {self.titre}',
            }
        }

    def action_creer_bilan(self):
        """Créer un bilan depuis la notification"""
        if not self.grossesse_id:
            raise ValidationError("Impossible de créer un bilan sans grossesse associée.")

        return {
            'type': 'ir.actions.act_window',
            'name': f'Nouveau bilan - {self.patiente_id.name}',
            'res_model': 'salamet.bilan.prenatal',
            'view_mode': 'form',
            'target': 'current',
            'context': {
                'default_grossesse_id': self.grossesse_id.id,
                'default_patiente_id': self.patiente_id.id,
                'default_terme_grossesse': self.grossesse_id.tag,
            }
        }

    # =================== MÉTHODES AUTOMATIQUES ===================
    @api.model
    def generer_notifications_automatiques(self):
        """Génération automatique des notifications (à exécuter par cron)"""
        _logger.info("Début de génération des notifications automatiques")

        # Notifications pour grossesses en cours
        grossesses_actives = self.env['salamet.grossesse'].search([
            ('state', 'in', ['en_cours', 'a_risque']),
            ('active', '=', True)
        ])

        for grossesse in grossesses_actives:
            self._generer_notifications_grossesse(grossesse)

        # Notifications pour consultations en retard
        self._generer_notifications_consultations_retard()

        # Notifications pour bilans en retard
        self._generer_notifications_bilans_retard()

        _logger.info("Fin de génération des notifications automatiques")

    @api.model
    def generer_notifications_grossesse_manuelle(self, grossesse_id, type_pathologie=None):
        """Méthode publique pour générer manuellement les notifications d'une grossesse"""
        grossesse = self.env['salamet.grossesse'].browse(grossesse_id)
        if not grossesse.exists():
            raise ValidationError("Grossesse introuvable.")

        # Utiliser la méthode privée existante
        self._generer_notifications_grossesse(grossesse)

        # Si un type de pathologie spécifique est fourni, générer aussi les notifications de pathologie
        if type_pathologie and type_pathologie != 'normale':
            self._generer_notifications_pathologie(grossesse)

        # Compter les notifications créées récemment pour cette grossesse
        notifications_recentes = self.search([
            ('grossesse_id', '=', grossesse_id),
            ('date_creation', '>=', fields.Datetime.now() - timedelta(minutes=5))
        ])

        return len(notifications_recentes)

    def _generer_notifications_grossesse(self, grossesse):
        """Générer les notifications spécifiques à une grossesse"""
        terme = grossesse.tag

        # Notification terme proche (37 SA)
        if 36.5 <= terme < 37 and not self._notification_existe(grossesse, 'terme_proche'):
            self.create({
                'titre': f'Terme proche - {grossesse.patiente_id.name}',
                'message': 'La patiente approche du terme (37 SA). Prévoir les consultations rapprochées.',
                'type_notification': 'terme_proche',
                'priorite': 'haute',
                'patiente_id': grossesse.patiente_id.id,
                'grossesse_id': grossesse.id,
                'medecin_responsable_id': grossesse.medecin_referent_id.id,
                'date_prevue': fields.Datetime.now(),
                'actions_requises': 'Programmer consultations hebdomadaires, vérifier préparation accouchement',
            })

        # Notification dépassement de terme (41 SA)
        if terme >= 41 and not self._notification_existe(grossesse, 'depassement_terme'):
            self.create({
                'titre': f'DÉPASSEMENT DE TERME - {grossesse.patiente_id.name}',
                'message': 'Dépassement de terme détecté (≥41 SA). Évaluation urgente nécessaire.',
                'type_notification': 'depassement_terme',
                'priorite': 'critique',
                'patiente_id': grossesse.patiente_id.id,
                'grossesse_id': grossesse.id,
                'medecin_responsable_id': grossesse.medecin_referent_id.id,
                'date_prevue': fields.Datetime.now(),
                'actions_requises': 'Évaluation obstétricale urgente, envisager déclenchement',
            })

        # Notifications spécifiques aux pathologies
        if grossesse.type_pathologie_principale != 'normale':
            self._generer_notifications_pathologie(grossesse)

    def _generer_notifications_pathologie(self, grossesse):
        """Générer les notifications spécifiques aux pathologies"""
        pathologie = grossesse.type_pathologie_principale

        # Diabète gestationnel - surveillance glycémique
        if pathologie in ['diabete_gestationnel', 'diabete_insuline']:
            if not self._notification_existe(grossesse, 'suivi_traitement', days=7):
                self.create({
                    'titre': f'Suivi diabète - {grossesse.patiente_id.name}',
                    'message': 'Contrôle glycémique hebdomadaire requis',
                    'type_notification': 'suivi_traitement',
                    'priorite': 'haute',
                    'patiente_id': grossesse.patiente_id.id,
                    'grossesse_id': grossesse.id,
                    'medecin_responsable_id': grossesse.medecin_referent_id.id,
                    'date_prevue': fields.Datetime.now() + timedelta(days=7),
                    'recurrente': True,
                    'frequence_recurrence': 'hebdomadaire',
                })

        # HTA/Prééclampsie - surveillance tensionnelle
        if pathologie in ['hta_gravidique', 'preeclampsie', 'preeclampsie_severe']:
            if not self._notification_existe(grossesse, 'surveillance_pathologie', days=3):
                priorite = 'critique' if pathologie == 'preeclampsie_severe' else 'haute'
                self.create({
                    'titre': f'Surveillance HTA - {grossesse.patiente_id.name}',
                    'message': f'Surveillance tensionnelle rapprochée requise ({pathologie})',
                    'type_notification': 'surveillance_pathologie',
                    'priorite': priorite,
                    'patiente_id': grossesse.patiente_id.id,
                    'grossesse_id': grossesse.id,
                    'medecin_responsable_id': grossesse.medecin_referent_id.id,
                    'date_prevue': fields.Datetime.now() + timedelta(days=2),
                    'actions_requises': 'Contrôle TA, protéinurie, bilan hépatique et rénal',
                    'recurrente': True,
                    'frequence_recurrence': 'quotidien' if pathologie == 'preeclampsie_severe' else 'hebdomadaire',
                })

        # Maturation pulmonaire
        if grossesse.maturation_pulmonaire and grossesse.tag < 34:
            if not self._notification_existe(grossesse, 'maturation_pulmonaire', days=1):
                self.create({
                    'titre': f'Maturation pulmonaire - {grossesse.patiente_id.name}',
                    'message': 'Surveillance post-maturation pulmonaire',
                    'type_notification': 'maturation_pulmonaire',
                    'priorite': 'haute',
                    'patiente_id': grossesse.patiente_id.id,
                    'grossesse_id': grossesse.id,
                    'medecin_responsable_id': grossesse.medecin_referent_id.id,
                    'date_prevue': fields.Datetime.now() + timedelta(days=1),
                    'actions_requises': 'Surveillance contractions, bien-être fœtal',
                })

    def _generer_notifications_consultations_retard(self):
        """Générer notifications pour consultations en retard"""
        # Rechercher les grossesses sans consultation récente
        date_limite = fields.Date.today() - timedelta(days=21)  # 3 semaines

        grossesses_sans_consultation = self.env['salamet.grossesse'].search([
            ('state', 'in', ['en_cours', 'a_risque']),
            ('active', '=', True),
            '|',
            ('derniere_consultation', '<', date_limite),
            ('derniere_consultation', '=', False)
        ])

        for grossesse in grossesses_sans_consultation:
            if not self._notification_existe(grossesse, 'rappel_consultation', days=7):
                jours_retard = (fields.Date.today() - (grossesse.derniere_consultation or grossesse.ddr)).days
                priorite = 'critique' if jours_retard > 30 else 'haute'

                self.create({
                    'titre': f'CONSULTATION EN RETARD - {grossesse.patiente_id.name}',
                    'message': f'Aucune consultation depuis {jours_retard} jours',
                    'type_notification': 'rappel_consultation',
                    'priorite': priorite,
                    'patiente_id': grossesse.patiente_id.id,
                    'grossesse_id': grossesse.id,
                    'medecin_responsable_id': grossesse.medecin_referent_id.id,
                    'date_prevue': fields.Datetime.now(),
                    'actions_requises': 'Programmer consultation urgente',
                })

    def _generer_notifications_bilans_retard(self):
        """Générer notifications pour bilans en retard"""
        # Bilans du 1er trimestre (avant 12 SA)
        grossesses_t1 = self.env['salamet.grossesse'].search([
            ('tag', '>', 12),
            ('tag', '<', 16),
            ('state', 'in', ['en_cours', 'a_risque']),
            ('active', '=', True)
        ])

        for grossesse in grossesses_t1:
            # Vérifier si bilan T1 existe
            bilan_t1 = self.env['salamet.bilan.prenatal'].search([
                ('grossesse_id', '=', grossesse.id),
                ('type_bilan', '=', 'premier_trimestre')
            ], limit=1)

            if not bilan_t1 and not self._notification_existe(grossesse, 'rappel_bilan', days=7):
                self.create({
                    'titre': f'Bilan T1 manquant - {grossesse.patiente_id.name}',
                    'message': 'Bilan du premier trimestre non réalisé',
                    'type_notification': 'rappel_bilan',
                    'priorite': 'haute',
                    'patiente_id': grossesse.patiente_id.id,
                    'grossesse_id': grossesse.id,
                    'medecin_responsable_id': grossesse.medecin_referent_id.id,
                    'date_prevue': fields.Datetime.now(),
                    'actions_requises': 'Programmer bilan T1 (NFS, glycémie, sérologies...)',
                })

    def _notification_existe(self, grossesse, type_notif, days=30):
        """Vérifier si une notification similaire existe déjà"""
        date_limite = fields.Datetime.now() - timedelta(days=days)

        return bool(self.search([
            ('grossesse_id', '=', grossesse.id),
            ('type_notification', '=', type_notif),
            ('date_creation', '>=', date_limite),
            ('state', '!=', 'annulee')
        ], limit=1))

    # =================== MÉTHODES DE RÉCURRENCE ===================
    def _traiter_notifications_recurrentes(self):
        """Traiter les notifications récurrentes"""
        notifications_recurrentes = self.search([
            ('recurrente', '=', True),
            ('state', '=', 'traitee'),
            ('date_traitement', '!=', False)
        ])

        for notification in notifications_recurrentes:
            self._creer_notification_suivante(notification)

    def _creer_notification_suivante(self, notification):
        """Créer la prochaine occurrence d'une notification récurrente"""
        if not notification.frequence_recurrence:
            return

        # Calculer la prochaine date
        if notification.frequence_recurrence == 'quotidien':
            prochaine_date = notification.date_prevue + timedelta(days=1)
        elif notification.frequence_recurrence == 'hebdomadaire':
            prochaine_date = notification.date_prevue + timedelta(weeks=1)
        elif notification.frequence_recurrence == 'mensuel':
            prochaine_date = notification.date_prevue + timedelta(days=30)
        else:
            return

        # Vérifier si la grossesse est toujours active
        if (notification.grossesse_id and
                notification.grossesse_id.state in ['en_cours', 'a_risque']):
            self.create({
                'titre': notification.titre,
                'message': notification.message,
                'type_notification': notification.type_notification,
                'priorite': notification.priorite,
                'patiente_id': notification.patiente_id.id,
                'grossesse_id': notification.grossesse_id.id,
                'medecin_responsable_id': notification.medecin_responsable_id.id,
                'date_prevue': prochaine_date,
                'actions_requises': notification.actions_requises,
                'recurrente': True,
                'frequence_recurrence': notification.frequence_recurrence,
            })

    # =================== CONTRAINTES ===================
    @api.constrains('date_prevue')
    def _check_date_prevue(self):
        """Vérifier que la date prévue n'est pas trop ancienne"""
        for record in self:
            if record.date_prevue:
                limite = fields.Datetime.now() - timedelta(days=365)  # 1 an
                if record.date_prevue < limite:
                    raise ValidationError(
                        "La date prévue ne peut pas être antérieure à 1 an."
                    )

    # =================== MÉTHODES CRON ===================
    @api.model
    def cron_generer_notifications(self):
        """Méthode appelée par le cron pour générer les notifications"""
        try:
            self.generer_notifications_automatiques()
            self._traiter_notifications_recurrentes()
            _logger.info("Génération automatique des notifications terminée avec succès")
        except Exception as e:
            _logger.error(f"Erreur lors de la génération des notifications: {str(e)}")

    @api.model
    def cron_nettoyer_anciennes_notifications(self):
        """Nettoyer les anciennes notifications traitées"""
        date_limite = fields.Datetime.now() - timedelta(days=90)  # 3 mois

        anciennes_notifications = self.search([
            ('state', 'in', ['traitee', 'annulee']),
            ('date_traitement', '<', date_limite),
            ('recurrente', '=', False)
        ])

        count = len(anciennes_notifications)
        anciennes_notifications.unlink()

        _logger.info(f"Nettoyage terminé: {count} notifications supprimées")

    @api.model
    def create(self, vals):
        # Auto-remplissage si pas déjà défini
        if 'patiente_id' not in vals and 'grossesse_id' in vals:
            grossesse = self.env['salamet.grossesse'].browse(vals['grossesse_id'])
            vals['patiente_id'] = grossesse.patiente_id.id

        return super().create(vals)

