# -*- coding: utf-8 -*-

from odoo import models, fields, api
from odoo.exceptions import ValidationError
from datetime import datetime, timedelta
import logging

_logger = logging.getLogger(__name__)


class SalametConsultation(models.Model):
    _name = 'salamet.consultation'
    _description = 'Consultation Prénatale SALAMET'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'date_consultation desc'
    _rec_name = 'display_name'

    # =================== CHAMPS DE BASE ===================
    name = fields.Char(
        string='Référence',
        required=True,
        copy=False,
        readonly=True,
        default=lambda self: self.env['ir.sequence'].next_by_code('salamet.consultation') or 'New'
    )

    display_name = fields.Char(
        string='Nom d\'affichage',
        compute='_compute_display_name',
        store=True
    )

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
        required=True,
        ondelete='cascade'
    )

    medecin_id = fields.Many2one(
        'salamet.medecin',
        string='Médecin',
        required=True
    )

    # =================== INFORMATIONS CONSULTATION ===================
    date_consultation = fields.Datetime(
        string='Date et heure',
        required=True,
        default=fields.Datetime.now
    )

    type_consultation = fields.Selection([
        ('premiere', 'Première consultation'),
        ('suivi', 'Consultation de suivi'),
        ('urgence', 'Consultation d\'urgence'),
        ('controle', 'Consultation de contrôle'),
        ('pre_accouchement', 'Consultation pré-accouchement'),
    ], string='Type de consultation', required=True, default='suivi')

    terme_grossesse = fields.Float(
        string='Terme (SA)',
        help='Terme de grossesse en semaines d\'aménorrhée'
    )

    motif_consultation = fields.Text(
        string='Motif de consultation',
        required=True
    )

    # =================== EXAMEN CLINIQUE ===================
    # Constantes vitales
    poids_actuel = fields.Float(
        string='Poids actuel (kg)',
        digits=(5, 2)
    )

    prise_poids = fields.Float(
        string='Prise de poids (kg)',
        compute='_compute_prise_poids',
        store=True
    )

    tension_arterielle_systolique = fields.Integer(
        string='TA Systolique (mmHg)'
    )

    tension_arterielle_diastolique = fields.Integer(
        string='TA Diastolique (mmHg)'
    )

    tension_arterielle = fields.Char(
        string='Tension artérielle',
        compute='_compute_tension_arterielle',
        store=True
    )

    frequence_cardiaque = fields.Integer(
        string='Fréquence cardiaque (bpm)'
    )

    temperature = fields.Float(
        string='Température (°C)',
        digits=(3, 1)
    )

    # Examen obstétrical
    hauteur_uterine = fields.Float(
        string='Hauteur utérine (cm)',
        digits=(4, 1)
    )

    presentation_foetale = fields.Selection([
        ('cephalique', 'Céphalique'),
        ('siege', 'Siège'),
        ('transverse', 'Transverse'),
        ('indeterminee', 'Indéterminée'),
    ], string='Présentation fœtale')

    bcf = fields.Integer(
        string='BCF (bpm)',
        help='Bruits du cœur fœtal'
    )

    mouvements_actifs_foetus = fields.Boolean(
        string='Mouvements actifs fœtus',
        default=True
    )

    col_uterus = fields.Selection([
        ('ferme', 'Fermé'),
        ('entrouverte', 'Entrouvert'),
        ('dilatation_1_2', 'Dilatation 1-2 cm'),
        ('dilatation_3_5', 'Dilatation 3-5 cm'),
        ('dilatation_complete', 'Dilatation complète'),
    ], string='Col de l\'utérus')

    # =================== EXAMENS COMPLÉMENTAIRES ===================
    proteinurie = fields.Selection([
        ('negative', 'Négative'),
        ('traces', 'Traces'),
        ('positive_1', '+'),
        ('positive_2', '++'),
        ('positive_3', '+++'),
        ('positive_4', '++++'),
    ], string='Protéinurie')

    glycosurie = fields.Selection([
        ('negative', 'Négative'),
        ('traces', 'Traces'),
        ('positive_1', '+'),
        ('positive_2', '++'),
        ('positive_3', '+++'),
        ('positive_4', '++++'),
    ], string='Glycosurie')

    oedemes = fields.Selection([
        ('absents', 'Absents'),
        ('legers', 'Légers'),
        ('moderes', 'Modérés'),
        ('importants', 'Importants'),
        ('generalises', 'Généralisés'),
    ], string='Œdèmes')

    # =================== OBSERVATIONS ET DIAGNOSTIC ===================
    observations = fields.Text(
        string='Observations cliniques'
    )

    diagnostic = fields.Text(
        string='Diagnostic'
    )

    conduite_tenir = fields.Text(
        string='Conduite à tenir'
    )

    prescriptions = fields.Text(
        string='Prescriptions'
    )

    # =================== SUIVI ===================
    prochaine_consultation = fields.Date(
        string='Prochaine consultation'
    )

    urgence_detectee = fields.Boolean(
        string='Urgence détectée',
        default=False
    )

    hospitalisation_necessaire = fields.Boolean(
        string='Hospitalisation nécessaire',
        default=False
    )

    niveau_alerte = fields.Selection([
        ('vert', 'Vert - Normal'),
        ('orange', 'Orange - Surveillance'),
        ('rouge', 'Rouge - Urgence'),
    ], string='Niveau d\'alerte', default='vert')

    state = fields.Selection([
        ('brouillon', 'Brouillon'),
        ('validee', 'Validée'),
        ('annulee', 'Annulée'),
    ], string='Statut', default='brouillon', tracking=True)

    # =================== CHAMPS CALCULÉS ===================
    @api.depends('patiente_id', 'date_consultation', 'terme_grossesse')
    def _compute_display_name(self):
        for record in self:
            if record.patiente_id and record.date_consultation:
                date_str = record.date_consultation.strftime('%d/%m/%Y')
                terme_str = f" - {record.terme_grossesse:.1f} SA" if record.terme_grossesse else ""
                record.display_name = f"{record.patiente_id.name} - {date_str}{terme_str}"
            else:
                record.display_name = record.name or 'Nouvelle consultation'

    @api.depends('poids_actuel', 'grossesse_id.poids_avant_grossesse')
    def _compute_prise_poids(self):
        for record in self:
            if record.poids_actuel and record.grossesse_id.poids_avant_grossesse:
                record.prise_poids = record.poids_actuel - record.grossesse_id.poids_avant_grossesse
            else:
                record.prise_poids = 0.0

    @api.depends('tension_arterielle_systolique', 'tension_arterielle_diastolique')
    def _compute_tension_arterielle(self):
        for record in self:
            if record.tension_arterielle_systolique and record.tension_arterielle_diastolique:
                record.tension_arterielle = f"{record.tension_arterielle_systolique}/{record.tension_arterielle_diastolique}"
            else:
                record.tension_arterielle = ""

    # =================== MÉTHODES ONCHANGE ===================
    @api.onchange('grossesse_id')
    def _onchange_grossesse(self):
        """Mise à jour automatique des champs liés à la grossesse"""
        if self.grossesse_id:
            self.patiente_id = self.grossesse_id.patiente_id
            self.terme_grossesse = self.grossesse_id.tag
            if self.grossesse_id.medecin_referent_id:
                self.medecin_id = self.grossesse_id.medecin_referent_id

    @api.onchange('tension_arterielle_systolique', 'tension_arterielle_diastolique')
    def _onchange_tension_arterielle(self):
        """Détection automatique d'HTA"""
        if self.tension_arterielle_systolique and self.tension_arterielle_diastolique:
            if (self.tension_arterielle_systolique >= 160 or
                    self.tension_arterielle_diastolique >= 110):
                self.niveau_alerte = 'rouge'
                self.urgence_detectee = True
            elif (self.tension_arterielle_systolique >= 140 or
                  self.tension_arterielle_diastolique >= 90):
                self.niveau_alerte = 'orange'

    @api.onchange('proteinurie')
    def _onchange_proteinurie(self):
        """Détection de protéinurie significative"""
        if self.proteinurie in ['positive_2', 'positive_3', 'positive_4']:
            self.niveau_alerte = 'orange'
            if self.proteinurie in ['positive_3', 'positive_4']:
                self.niveau_alerte = 'rouge'
                self.urgence_detectee = True

    @api.onchange('bcf')
    def _onchange_bcf(self):
        """Surveillance des bruits du cœur fœtal"""
        if self.bcf:
            if self.bcf < 110 or self.bcf > 160:
                self.niveau_alerte = 'rouge'
                self.urgence_detectee = True
            elif self.bcf < 120 or self.bcf > 150:
                self.niveau_alerte = 'orange'

    # =================== MÉTHODES MÉTIER ===================
    def action_generer_alerte_urgence(self):
        """Générer une alerte d'urgence"""
        if self.urgence_detectee:
            # Créer une notification d'urgence
            self.env['salamet.notification'].create({
                'titre': f'URGENCE - {self.patiente_id.name}',
                'message': f'Urgence détectée lors de la consultation du {self.date_consultation.strftime("%d/%m/%Y")}',
                'grossesse_id': self.grossesse_id.id,
                'patiente_id': self.patiente_id.id,
                'type_notification': 'urgence',
                'priorite': 'haute',
                'date_prevue': fields.Datetime.now(),
            })

            # Marquer la grossesse à risque
            if self.grossesse_id.state == 'en_cours':
                self.grossesse_id.state = 'a_risque'

            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'message': f'Alerte d\'urgence générée pour {self.patiente_id.name}',
                    'type': 'warning',
                    'sticky': True,
                }
            }

    def action_programmer_suivi(self):
        """Programmer le suivi automatique"""
        if not self.prochaine_consultation:
            # Calcul automatique de la prochaine consultation
            if self.terme_grossesse:
                if self.terme_grossesse < 28:
                    # Avant 28 SA : consultation toutes les 4 semaines
                    jours_suivant = 28
                elif self.terme_grossesse < 36:
                    # Entre 28 et 36 SA : consultation toutes les 2 semaines
                    jours_suivant = 14
                else:
                    # Après 36 SA : consultation toutes les semaines
                    jours_suivant = 7

                # Ajustement selon le niveau de risque
                if self.niveau_alerte == 'orange':
                    jours_suivant = jours_suivant // 2
                elif self.niveau_alerte == 'rouge':
                    jours_suivant = min(jours_suivant // 3, 3)

                self.prochaine_consultation = fields.Date.today() + timedelta(days=jours_suivant)

        # Créer une notification de rappel
        if self.prochaine_consultation:
            # Convertir la date en datetime pour le champ date_prevue
            date_prevue = fields.Datetime.to_datetime(self.prochaine_consultation)

            self.env['salamet.notification'].create({
                'titre': f'Rappel consultation - {self.patiente_id.name}',
                'message': f'Consultation de suivi programmée',
                'grossesse_id': self.grossesse_id.id,
                'patiente_id': self.patiente_id.id,
                'type_notification': 'rappel_consultation',
                'priorite': 'moyenne',
                'date_prevue': date_prevue,
            })

    # =================== CONTRAINTES ===================
    @api.constrains('date_consultation', 'grossesse_id')
    def _check_date_consultation(self):
        """Vérifier la cohérence de la date de consultation"""
        for record in self:
            if record.grossesse_id and record.grossesse_id.ddr:
                if record.date_consultation.date() < record.grossesse_id.ddr:
                    raise ValidationError(
                        "La date de consultation ne peut pas être antérieure à la DDR."
                    )

    @api.constrains('tension_arterielle_systolique', 'tension_arterielle_diastolique')
    def _check_tension_arterielle(self):
        """Vérifier la cohérence de la tension artérielle"""
        for record in self:
            if (record.tension_arterielle_systolique and
                    record.tension_arterielle_diastolique):
                if record.tension_arterielle_systolique <= record.tension_arterielle_diastolique:
                    raise ValidationError(
                        "La tension systolique doit être supérieure à la tension diastolique."
                    )

    # =================== MÉTHODES DE CRÉATION/ÉCRITURE ===================
    @api.model
    def create(self, vals):
        """Surcharge de la création"""
        consultation = super().create(vals)

        # Mise à jour de la dernière consultation dans la grossesse
        if consultation.grossesse_id:
            consultation.grossesse_id.derniere_consultation = consultation.date_consultation.date()

        # Génération automatique d'alertes si nécessaire
        if consultation.urgence_detectee:
            consultation.action_generer_alerte_urgence()

        # Programmation automatique du suivi
        consultation.action_programmer_suivi()

        return consultation

    def write(self, vals):
        """Surcharge de l'écriture"""
        result = super().write(vals)

        # Vérification des changements critiques
        for record in self:
            if 'urgence_detectee' in vals and vals['urgence_detectee']:
                record.action_generer_alerte_urgence()

        return result
