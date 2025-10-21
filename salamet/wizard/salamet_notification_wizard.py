# -*- coding: utf-8 -*-

from odoo import models, fields, api
from odoo.exceptions import ValidationError
from datetime import datetime, timedelta
import logging

_logger = logging.getLogger(__name__)


class SalametNotificationWizard(models.TransientModel):
    _name = 'salamet.notification.wizard'
    _description = 'Assistant de création de notifications'

    # Sélection des patientes
    patiente_ids = fields.Many2many(
        'salamet.patiente',
        string='Patientes',
        help='Sélectionner les patientes pour lesquelles créer des notifications'
    )

    grossesse_ids = fields.Many2many(
        'salamet.grossesse',
        string='Grossesses',
        help='Sélectionner les grossesses concernées'
    )

    # Type de notification
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
    ], string='Type de notification', required=True, default='rappel_consultation')

    # Contenu de la notification
    titre = fields.Char(string='Titre', required=True)
    message = fields.Text(string='Message', required=True)

    # Priorité et planification
    priorite = fields.Selection([
        ('basse', 'Basse'),
        ('moyenne', 'Moyenne'),
        ('haute', 'Haute'),
        ('critique', 'Critique'),
    ], string='Priorité', required=True, default='moyenne')

    date_prevue = fields.Datetime(
        string='Date prévue',
        required=True,
        default=fields.Datetime.now
    )

    # Récurrence
    recurrence = fields.Boolean(string='Notification récurrente')

    intervalle_recurrence = fields.Selection([
        ('quotidien', 'Quotidien'),
        ('hebdomadaire', 'Hebdomadaire'),
        ('mensuel', 'Mensuel'),
    ], string='Intervalle de récurrence')

    nombre_recurrence = fields.Integer(string='Nombre d\'intervalles', default=1)
    fin_recurrence = fields.Date(string='Fin de récurrence')

    # Médecin responsable
    medecin_responsable_id = fields.Many2one(
        'salamet.medecin',
        string='Médecin responsable'
    )

    # Options avancées
    envoyer_email = fields.Boolean(string='Envoyer par email', default=True)
    envoyer_sms = fields.Boolean(string='Envoyer par SMS')

    # Filtres automatiques
    filtre_terme_min = fields.Float(string='Terme minimum (SA)')
    filtre_terme_max = fields.Float(string='Terme maximum (SA)')
    filtre_niveau_risque = fields.Selection([
        ('faible', 'Faible'),
        ('modere', 'Modéré'),
        ('eleve', 'Élevé'),
        ('critique', 'Critique')
    ], string='Niveau de risque minimum')

    @api.onchange('type_notification')
    def _onchange_type_notification(self):
        """Pré-remplir le titre et message selon le type"""
        if self.type_notification:
            templates = {
                'rappel_consultation': {
                    'titre': 'Rappel de consultation',
                    'message': 'Vous avez une consultation prévue. Merci de vous présenter à l\'heure.'
                },
                'rappel_bilan': {
                    'titre': 'Bilan prénatal à effectuer',
                    'message': 'Il est temps d\'effectuer votre bilan prénatal. Prenez rendez-vous rapidement.'
                },
                'surveillance_pathologie': {
                    'titre': 'Surveillance pathologie',
                    'message': 'Une surveillance médicale est nécessaire pour votre pathologie.'
                },
                'urgence': {
                    'titre': 'Urgence médicale',
                    'message': 'Consultez immédiatement votre médecin ou rendez-vous aux urgences.'
                }
            }

            template = templates.get(self.type_notification, {})
            self.titre = template.get('titre', '')
            self.message = template.get('message', '')

    @api.onchange('filtre_terme_min', 'filtre_terme_max', 'filtre_niveau_risque')
    def _onchange_filtres(self):
        """Filtrer automatiquement les patientes selon les critères"""
        domain = [('state', 'in', ['en_cours', 'a_risque'])]

        if self.filtre_terme_min:
            domain.append(('tag', '>=', self.filtre_terme_min))

        if self.filtre_terme_max:
            domain.append(('tag', '<=', self.filtre_terme_max))

        if self.filtre_niveau_risque:
            domain.append(('niveau_risque', '=', self.filtre_niveau_risque))

        if len(domain) > 1:  # Si on a des filtres en plus du state
            grossesses = self.env['salamet.grossesse'].search(domain)
            self.grossesse_ids = grossesses
            self.patiente_ids = grossesses.mapped('patiente_id')

    def action_creer_notifications(self):
        """Créer les notifications pour les patientes sélectionnées"""
        if not self.patiente_ids and not self.grossesse_ids:
            raise ValidationError("Veuillez sélectionner au moins une patiente ou une grossesse.")

        notifications_creees = 0

        # Déterminer les patientes cibles
        patientes = self.patiente_ids
        if self.grossesse_ids:
            patientes |= self.grossesse_ids.mapped('patiente_id')

        for patiente in patientes:
            # Trouver la grossesse active
            grossesse = self.env['salamet.grossesse'].search([
                ('patiente_id', '=', patiente.id),
                ('state', 'in', ['en_cours', 'a_risque'])
            ], limit=1)

            # Créer la notification
            notification_vals = {
                'titre': self.titre,
                'message': self.message,
                'type_notification': self.type_notification,
                'priorite': self.priorite,
                'date_prevue': self.date_prevue,
                'patiente_id': patiente.id,
                'grossesse_id': grossesse.id if grossesse else False,
                'medecin_responsable_id': self.medecin_responsable_id.id if self.medecin_responsable_id else False,
                'recurrente': self.recurrence,
                'frequence_recurrence': self.intervalle_recurrence if self.recurrence else False,
            }

            notification = self.env['salamet.notification'].create(notification_vals)
            notifications_creees += 1

            # Gérer la récurrence
            if self.recurrence and self.fin_recurrence:
                self._creer_notifications_recurrentes(notification)

        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': 'Notifications créées',
                'message': f'{notifications_creees} notification(s) créée(s) avec succès.',
                'type': 'success',
                'sticky': False,
            }
        }

    def _creer_notifications_recurrentes(self, notification_base):
        """Créer les notifications récurrentes"""
        date_courante = self.date_prevue

        while date_courante.date() <= self.fin_recurrence:
            if self.intervalle_recurrence == 'quotidien':
                date_courante += timedelta(days=self.nombre_recurrence)
            elif self.intervalle_recurrence == 'hebdomadaire':
                date_courante += timedelta(weeks=self.nombre_recurrence)
            elif self.intervalle_recurrence == 'mensuel':
                date_courante += timedelta(days=30 * self.nombre_recurrence)

            if date_courante.date() <= self.fin_recurrence:
                vals = {
                    'titre': notification_base.titre,
                    'message': notification_base.message,
                    'type_notification': notification_base.type_notification,
                    'priorite': notification_base.priorite,
                    'date_prevue': date_courante,
                    'patiente_id': notification_base.patiente_id.id,
                    'grossesse_id': notification_base.grossesse_id.id,
                    'medecin_responsable_id': notification_base.medecin_responsable_id.id,
                    'recurrente': True,
                    'frequence_recurrence': self.intervalle_recurrence,
                }
                self.env['salamet.notification'].create(vals)


# =================== WIZARD TRAITEMENT NOTIFICATION ===================
class SalametNotificationTraitementWizard(models.TransientModel):
    _name = 'salamet.notification.traitement.wizard'
    _description = 'Assistant de traitement des notifications'

    notification_id = fields.Many2one(
        'salamet.notification',
        string='Notification',
        required=True
    )

    resultat_action = fields.Text(
        string='Résultat de l\'action',
        required=True
    )

    observations = fields.Text(
        string='Observations'
    )

    creer_consultation = fields.Boolean(
        string='Créer une consultation',
        default=False
    )

    creer_bilan = fields.Boolean(
        string='Créer un bilan',
        default=False
    )

    def action_traiter(self):
        """Traiter la notification"""
        self.notification_id.write({
            'state': 'traitee',
            'date_traitement': fields.Datetime.now(),
            'resultat_action': self.resultat_action,
            'observations': self.observations,
        })

        actions = []

        if self.creer_consultation:
            actions.append(self.notification_id.action_creer_consultation())

        if self.creer_bilan:
            actions.append(self.notification_id.action_creer_bilan())

        if actions:
            return actions[0]  # Retourner la première action

        return {'type': 'ir.actions.act_window_close'}


# =================== WIZARD REPORT NOTIFICATION ===================
class SalametNotificationReportWizard(models.TransientModel):
    _name = 'salamet.notification.report.wizard'
    _description = 'Assistant de report des notifications'

    notification_id = fields.Many2one(
        'salamet.notification',
        string='Notification',
        required=True
    )

    nouvelle_date = fields.Datetime(
        string='Nouvelle date',
        required=True,
        default=lambda self: fields.Datetime.now() + timedelta(days=7)
    )

    motif_report = fields.Text(
        string='Motif du report',
        required=True
    )

    def action_reporter(self):
        """Reporter la notification"""
        self.notification_id.write({
            'state': 'reportee',
            'date_prevue': self.nouvelle_date,
            'observations': f"Reportée le {fields.Datetime.now().strftime('%d/%m/%Y %H:%M')}: {self.motif_report}",
        })

        return {'type': 'ir.actions.act_window_close'}


# =================== WIZARD INTERPRETATION BILAN ===================
class SalametBilanInterpretationWizard(models.TransientModel):
    _name = 'salamet.bilan.interpretation.wizard'
    _description = 'Assistant d\'interprétation de bilan'

    bilan_id = fields.Many2one(
        'salamet.bilan.prenatal',
        string='Bilan prénatal',
        required=True
    )

    # Interprétation automatique
    interpretation_auto = fields.Text(
        string='Interprétation automatique',
        compute='_compute_interpretation_auto',
        readonly=True
    )

    # Interprétation médicale
    interpretation_medicale = fields.Text(
        string='Interprétation médicale',
        required=True
    )

    recommandations = fields.Text(
        string='Recommandations',
        required=True
    )

    # Niveau d'alerte
    niveau_alerte = fields.Selection([
        ('aucune', 'Aucune alerte'),
        ('surveillance', 'Surveillance renforcée'),
        ('urgence', 'Urgence médicale')
    ], string='Niveau d\'alerte', required=True, default='aucune')

    # Actions à entreprendre
    consultation_urgente = fields.Boolean(string='Consultation urgente requise')
    hospitalisation = fields.Boolean(string='Hospitalisation recommandée')
    bilan_complementaire = fields.Boolean(string='Bilan complémentaire nécessaire')

    # Suivi
    prochain_bilan = fields.Date(string='Prochain bilan prévu')
    prochain_rdv = fields.Date(string='Prochain RDV recommandé')

    @api.depends('bilan_id')
    def _compute_interpretation_auto(self):
        """Génère une interprétation automatique basée sur les résultats"""
        for wizard in self:
            if not wizard.bilan_id:
                wizard.interpretation_auto = ""
                continue

            bilan = wizard.bilan_id
            interpretations = []

            # Analyse hémoglobine
            if bilan.hemoglobine:
                if bilan.hemoglobine < 11.0:
                    interpretations.append(f"Anémie (Hb: {bilan.hemoglobine} g/dL)")
                elif bilan.hemoglobine > 16.0:
                    interpretations.append(f"Polyglobulie (Hb: {bilan.hemoglobine} g/dL)")

            # Analyse glycémie
            if bilan.glycemie:
                if bilan.glycemie > 0.92:
                    interpretations.append(f"Hyperglycémie à jeun (Gly: {bilan.glycemie} g/L)")

            # Analyse HGPO
            if bilan.hgpo:
                if bilan.hgpo > 1.53:
                    interpretations.append(f"Diabète gestationnel (HGPO: {bilan.hgpo} g/L)")

            # Analyse protéinurie
            if bilan.proteinurie:
                if bilan.proteinurie > 0.3:
                    interpretations.append(f"Protéinurie significative ({bilan.proteinurie} g/24h)")

            # Analyse sérologies
            if bilan.toxoplasmose_igm == 'positive':
                interpretations.append("Toxoplasmose aiguë suspectée (IgM+)")

            if bilan.cmv_igm == 'positive':
                interpretations.append("Infection CMV aiguë suspectée (IgM+)")

            if bilan.hbsag == 'positive':
                interpretations.append("Portage HBsAg - Hépatite B")

            if bilan.vih == 'positive':
                interpretations.append("Sérologie VIH positive")

            if bilan.syphilis == 'positive':
                interpretations.append("Sérologie syphilis positive")

            if interpretations:
                wizard.interpretation_auto = "Anomalies détectées :\n" + "\n".join(
                    f"• {interp}" for interp in interpretations)
            else:
                wizard.interpretation_auto = "Bilan dans les limites de la normale."

    def action_valider_interpretation(self):
        """Valide l'interprétation et met à jour le bilan"""
        self.ensure_one()

        # Mettre à jour le bilan
        self.bilan_id.write({
            'interpretation': self.interpretation_medicale,
            'recommandations': self.recommandations,
            'niveau_alerte': self.niveau_alerte,
            'prochain_bilan': self.prochain_bilan,
            'state': 'interprete'
        })

        # Créer les actions nécessaires
        if self.consultation_urgente:
            self._creer_consultation_urgente()

        if self.hospitalisation:
            self._creer_demande_hospitalisation()

        if self.bilan_complementaire:
            self._creer_bilan_complementaire()

        # Créer notification si alerte
        if self.niveau_alerte != 'aucune':
            self._creer_notification_alerte()

        return {
            'type': 'ir.actions.act_window',
            'res_model': 'salamet.bilan.prenatal',
            'res_id': self.bilan_id.id,
            'view_mode': 'form',
            'target': 'current'
        }

    def _creer_consultation_urgente(self):
        """Crée une consultation urgente"""
        self.env['salamet.consultation'].create({
            'grossesse_id': self.bilan_id.grossesse_id.id,
            'patiente_id': self.bilan_id.patiente_id.id,
            'medecin_id': self.bilan_id.medecin_id.id,
            'date_consultation': fields.Date.today(),
            'type_consultation': 'urgence',
            'motif_consultation': f'Suite bilan prénatal du {self.bilan_id.date_bilan}',
            'urgence': True,
            'state': 'programme'
        })

    def _creer_demande_hospitalisation(self):
        """Crée une demande d'hospitalisation"""
        self.env['salamet.notification'].create({
            'titre': f'Demande d\'hospitalisation - {self.bilan_id.patiente_id.name}',
            'message': f'Hospitalisation recommandée suite au bilan du {self.bilan_id.date_bilan}',
            'type_notification': 'urgence',
            'priorite': 'critique',
            'date_prevue': fields.Datetime.now(),
            'patiente_id': self.bilan_id.patiente_id.id,
            'grossesse_id': self.bilan_id.grossesse_id.id,
            'medecin_responsable_id': self.bilan_id.medecin_id.id,
        })

    def _creer_bilan_complementaire(self):
        """Crée un bilan complémentaire"""
        self.env['salamet.bilan.prenatal'].create({
            'grossesse_id': self.bilan_id.grossesse_id.id,
            'medecin_id': self.bilan_id.medecin_id.id,
            'date_bilan': self.prochain_bilan or fields.Date.today(),
            'type_bilan': 'complementaire',
            'state': 'prescrit'
        })

    def _creer_notification_alerte(self):
        """Crée une notification d'alerte"""
        priorite = 'critique' if self.niveau_alerte == 'urgence' else 'haute'

        self.env['salamet.notification'].create({
            'titre': f'Alerte bilan prénatal - {self.bilan_id.patiente_id.name}',
            'message': f'Niveau d\'alerte: {dict(self._fields["niveau_alerte"].selection)[self.niveau_alerte]}',
            'type_notification': 'urgence',
            'priorite': priorite,
            'date_prevue': fields.Datetime.now(),
            'patiente_id': self.bilan_id.patiente_id.id,
            'grossesse_id': self.bilan_id.grossesse_id.id,
            'medecin_responsable_id': self.bilan_id.medecin_id.id,
        })
