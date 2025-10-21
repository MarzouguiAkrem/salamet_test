# -*- coding: utf-8 -*-
# models/salamet_grossesse.py
from odoo import models, fields, api
from odoo.exceptions import ValidationError
from datetime import datetime, timedelta
import math


class SalametGrossesse(models.Model):
    _name = 'salamet.grossesse'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _description = 'Grossesse SALAMET'
    _order = 'date_debut desc'

    name = fields.Char(
        string='Référence',
        required=True,
        copy=False,
        readonly=True,
        default=lambda self: self.env['ir.sequence'].next_by_code('salamet.grossesse') or 'New'
    )

    # =================== INFORMATIONS DE BASE ===================
    patiente_id = fields.Many2one(
        'salamet.patiente',
        string='Patiente',
        required=True,
        tracking=True
    )

    type_grossesse = fields.Selection([
        ('actuelle', 'Grossesse actuelle'),
        ('anterieure', 'Grossesse antérieure')
    ], string='Type de grossesse', default='actuelle', required=True)

    # =================== DATES ET CALCULS ===================
    ddr = fields.Date(
        string='DDR (Date des dernières règles)',
        required=True,
        tracking=True,
        help="Date des dernières règles"
    )

    date_debut = fields.Date(
        string='Date de début de grossesse',
        compute='_compute_date_debut',
        store=True,
        tracking=True
    )

    tag_semaines = fields.Integer(
        string='TAG - Semaines',
        compute='_compute_tag',
        store=True,
        help="Terme d'aménorrhée gestationnel - Semaines complètes"
    )

    tag_jours = fields.Integer(
        string='TAG - Jours',
        compute='_compute_tag',
        store=True,
        help="Terme d'aménorrhée gestationnel - Jours supplémentaires"
    )

    tag_display = fields.Char(
        string='TAG',
        compute='_compute_tag_display',
        store=True,
        help="Affichage du TAG au format XXsa+Xj"
    )

    tag = fields.Float(
        string='TAG (décimal)',
        compute='_compute_tag_decimal',
        store=True,
        help="TAG en format décimal pour les calculs"
    )

    date_prevue_accouchement = fields.Date(
        string='Date prévue d\'accouchement',
        compute='_compute_date_prevue',
        store=True,
        tracking=True
    )

    # =================== TRAITEMENT ET SURVEILLANCE ===================
    traitement_grossesse = fields.Boolean(
        string='Traitement au cours de la grossesse',
        tracking=True
    )

    details_traitement = fields.Text(
        string='Détails du traitement',
        help="Préciser le traitement si applicable"
    )

    maturation_pulmonaire = fields.Boolean(
        string='Maturation pulmonaire reçue',
        tracking=True
    )

    date_maturation_pulmonaire = fields.Date(
        string='Date de maturation pulmonaire'
    )

    # =================== PATHOLOGIES (SIMPLIFIÉES) ===================
    pathologies_associees = fields.Text(
        string='Pathologies associées',
        help="Liste des pathologies associées à cette grossesse",
        tracking=True
    )

    # Pathologies courantes en booléens
    pathologie_diabete = fields.Boolean(
        string="Diabète gestationnel",
        tracking=True
    )

    pathologie_hta = fields.Boolean(
        string="Hypertension artérielle",
        tracking=True
    )

    pathologie_preeclampsie = fields.Boolean(
        string="Prééclampsie",
        tracking=True
    )

    pathologie_rciu = fields.Boolean(
        string="RCIU",
        tracking=True
    )

    pathologie_autre = fields.Boolean(
        string="Autres pathologies",
        tracking=True
    )

    nombre_pathologies = fields.Integer(
        string="Nombre de pathologies",
        compute='_compute_nombre_pathologies',
        store=True,
        help="Nombre total de pathologies identifiées"
    )

    type_pathologie_principale = fields.Selection([
        ('normale', 'Grossesse normale'),
        ('htac', 'HTAC (HTA chronique)'),
        ('htag', 'HTAG (HTA gravidique)'),
        ('preeclampsie_legere', 'Prééclampsie légère'),
        ('preeclampsie_moderee', 'Prééclampsie modérée'),
        ('preeclampsie_severe', 'Prééclampsie sévère'),
        ('diabete_equilibre', 'Diabète gestationnel équilibré'),
        ('diabete_insuline', 'Diabète sous insuline'),
    ], string='Pathologie principale', default='normale', tracking=True)

    diagnostic_pathologie = fields.Text(
        string='Pourquoi ce diagnostic ?',
        help="Justification du diagnostic de pathologie"
    )

    traitement_pathologie = fields.Selection([
        ('repos', 'Simple repos'),
        ('traitement', 'Sous traitement')
    ], string='Prise en charge')

    details_traitement_pathologie = fields.Text(
        string='Détails traitement et dose',
        help="Préciser le traitement et la posologie"
    )

    # =================== ÉTAT ET SUIVI ===================
    state = fields.Selection([
        ('en_cours', 'En cours'),
        ('a_risque', 'À risque'),
        ('terminee', 'Terminée'),
        ('interrompue', 'Interrompue')
    ], string='État', default='en_cours', tracking=True)

    niveau_risque = fields.Selection([
        ('faible', 'Faible'),
        ('moyen', 'Moyen'),
        ('eleve', 'Élevé'),
        ('tres_eleve', 'Très élevé')
    ], string='Niveau de risque', compute='_compute_niveau_risque', store=True, tracking=True)

    score_risque = fields.Integer(
        string='Score de risque',
        compute='_compute_niveau_risque',
        store=True,
        help="Score calculé automatiquement"
    )

    # =================== INFORMATIONS MÉDICALES ===================
    terme_actuel = fields.Float(
        string='Terme actuel (SA)',
        compute='_compute_terme_actuel',
        store=True
    )

    poids_avant_grossesse = fields.Float(
        string='Poids avant grossesse (kg)',
        tracking=True
    )

    taille = fields.Float(
        string='Taille (cm)',
        tracking=True
    )

    imc_initial = fields.Float(
        string='IMC initial',
        compute='_compute_imc',
        store=True
    )

    # =================== RELATIONS ===================
    medecin_referent_id = fields.Many2one(
        'salamet.medecin',
        string='Médecin référent',
        tracking=True
    )

    medecin_ids = fields.Many2many(
        'salamet.medecin',
        string='Équipe médicale',
        tracking=True
    )

    bilan_prenatal_ids = fields.One2many(
        'salamet.bilan.prenatal',
        'grossesse_id',
        string='Bilans prénataux'
    )

    consultation_ids = fields.One2many(
        'salamet.consultation',
        'grossesse_id',
        string='Consultations'
    )

    notification_ids = fields.One2many(
        'salamet.notification',
        'grossesse_id',
        string='Notifications de surveillance'
    )

    # =================== CHAMPS CALCULÉS ===================
    nombre_consultations = fields.Integer(
        string='Nombre de consultations',
        compute='_compute_nombre_consultations',
        store=True
    )

    derniere_consultation = fields.Date(
        string='Dernière consultation',
        compute='_compute_derniere_consultation',
        store=True
    )

    nombre_bilans = fields.Integer(
        string='Nombre de bilans',
        compute='_compute_nombre_bilans',
        store=True
    )

    active = fields.Boolean(string='Active', default=True)

    # =================== CHAMPS POUR NOTES ET OBSERVATIONS ===================
    observations = fields.Text(
        string='Observations générales',
        help="Observations générales sur la grossesse"
    )

    notes_medicales = fields.Text(
        string='Notes médicales',
        help="Notes médicales détaillées"
    )

    # =================== MÉTHODES DE CALCUL ===================
    @api.depends('ddr')
    def _compute_date_debut(self):
        for grossesse in self:
            if grossesse.ddr:
                # Date de début = DDR + 14 jours (ovulation présumée)
                grossesse.date_debut = grossesse.ddr + timedelta(days=14)
            else:
                grossesse.date_debut = False

    @api.depends('ddr')
    def _compute_tag(self):
        """Calcul du TAG en semaines et jours"""
        for grossesse in self:
            if grossesse.ddr and grossesse.state in ['en_cours', 'a_risque']:
                delta = fields.Date.today() - grossesse.ddr
                total_jours = delta.days

                # Calcul des semaines complètes et jours restants
                semaines_completes = total_jours // 7
                jours_restants = total_jours % 7

                grossesse.tag_semaines = semaines_completes
                grossesse.tag_jours = jours_restants
            else:
                grossesse.tag_semaines = 0
                grossesse.tag_jours = 0

    @api.depends('tag_semaines', 'tag_jours')
    def _compute_tag_display(self):
        """Affichage du TAG au format médical"""
        for grossesse in self:
            if grossesse.tag_semaines > 0:
                if grossesse.tag_jours > 0:
                    grossesse.tag_display = f"{grossesse.tag_semaines}SA+{grossesse.tag_jours}j"
                else:
                    grossesse.tag_display = f"{grossesse.tag_semaines}SA"
            else:
                grossesse.tag_display = "0SA"

    @api.depends('tag_semaines', 'tag_jours')
    def _compute_tag_decimal(self):
        """TAG en format décimal pour les calculs"""
        for grossesse in self:
            grossesse.tag = grossesse.tag_semaines + (grossesse.tag_jours / 7.0)

    @api.depends('ddr')
    def _compute_date_prevue(self):
        for grossesse in self:
            if grossesse.ddr:
                # DPA = DDR + 280 jours (40 SA)
                grossesse.date_prevue_accouchement = grossesse.ddr + timedelta(days=280)
            else:
                grossesse.date_prevue_accouchement = False

    @api.depends('date_debut')
    def _compute_terme_actuel(self):
        for grossesse in self:
            if grossesse.date_debut and grossesse.state in ['en_cours', 'a_risque']:
                delta = fields.Date.today() - grossesse.date_debut
                grossesse.terme_actuel = delta.days / 7
            else:
                grossesse.terme_actuel = 0

    @api.depends('poids_avant_grossesse', 'taille')
    def _compute_imc(self):
        for grossesse in self:
            if grossesse.poids_avant_grossesse and grossesse.taille:
                taille_m = grossesse.taille / 100
                grossesse.imc_initial = grossesse.poids_avant_grossesse / (taille_m ** 2)
            else:
                grossesse.imc_initial = 0

    @api.depends('pathologie_diabete', 'pathologie_hta', 'pathologie_preeclampsie',
                 'pathologie_rciu', 'pathologie_autre')
    def _compute_nombre_pathologies(self):
        """Calcule le nombre de pathologies cochées"""
        for grossesse in self:
            count = 0
            if grossesse.pathologie_diabete:
                count += 1
            if grossesse.pathologie_hta:
                count += 1
            if grossesse.pathologie_preeclampsie:
                count += 1
            if grossesse.pathologie_rciu:
                count += 1
            if grossesse.pathologie_autre:
                count += 1

            # Compter aussi les pathologies dans le champ texte
            if grossesse.pathologies_associees:
                lignes = [l.strip() for l in grossesse.pathologies_associees.split('\n') if l.strip()]
                count += len(lignes)

            grossesse.nombre_pathologies = count

    @api.depends('type_pathologie_principale', 'nombre_pathologies', 'imc_initial', 'patiente_id.age')
    def _compute_niveau_risque(self):
        for grossesse in self:
            score_risque = 0

            # Score selon pathologie principale
            pathologie_scores = {
                'normale': 0,
                'htac': 2,
                'htag': 1,
                'preeclampsie_legere': 2,
                'preeclampsie_moderee': 3,
                'preeclampsie_severe': 4,
                'diabete_equilibre': 1,
                'diabete_insuline': 3,
                'rciu': 2,
            }
            score_risque += pathologie_scores.get(grossesse.type_pathologie_principale, 0)

            # Score selon pathologies associées
            score_risque += grossesse.nombre_pathologies

            # Score selon IMC
            if grossesse.imc_initial:
                if grossesse.imc_initial < 18.5 or grossesse.imc_initial > 30:
                    score_risque += 1
                if grossesse.imc_initial > 35:
                    score_risque += 1

            # Score selon âge maternel
            if grossesse.patiente_id and grossesse.patiente_id.age:
                if grossesse.patiente_id.age < 18 or grossesse.patiente_id.age > 35:
                    score_risque += 1
                if grossesse.patiente_id.age > 40:
                    score_risque += 1

            # Détermination du niveau
            if score_risque == 0:
                niveau = 'faible'
            elif score_risque <= 2:
                niveau = 'moyen'
            elif score_risque <= 4:
                niveau = 'eleve'
            else:
                niveau = 'tres_eleve'

            grossesse.score_risque = score_risque
            grossesse.niveau_risque = niveau

    @api.depends('consultation_ids')
    def _compute_nombre_consultations(self):
        for grossesse in self:
            grossesse.nombre_consultations = len(grossesse.consultation_ids)

    @api.depends('consultation_ids.date_consultation')
    def _compute_derniere_consultation(self):
        for grossesse in self:
            if grossesse.consultation_ids:
                dates = grossesse.consultation_ids.mapped('date_consultation')
                if dates:
                    grossesse.derniere_consultation = max(dates)
                else:
                    grossesse.derniere_consultation = False
            else:
                grossesse.derniere_consultation = False

    @api.depends('bilan_prenatal_ids')
    def _compute_nombre_bilans(self):
        for grossesse in self:
            grossesse.nombre_bilans = len(grossesse.bilan_prenatal_ids)

    # =================== ACTIONS SMART BUTTONS ===================
    def action_view_consultations(self):
        """Afficher les consultations de cette grossesse"""
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': f'Consultations - {self.patiente_id.name}',
            'res_model': 'salamet.consultation',
            'view_mode': 'list,form',
            'domain': [('grossesse_id', '=', self.id)],
            'context': {
                'default_grossesse_id': self.id,
                'default_patiente_id': self.patiente_id.id,
                'default_medecin_id': self.medecin_referent_id.id if self.medecin_referent_id else False,
                'default_terme_grossesse': self.tag,
            },
            'target': 'current',
        }

    def action_view_bilans(self):
        """Afficher les bilans prénataux de cette grossesse"""
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': f'Bilans prénataux - {self.patiente_id.name}',
            'res_model': 'salamet.bilan.prenatal',
            'view_mode': 'list,form',
            'domain': [('grossesse_id', '=', self.id)],
            'context': {
                'default_grossesse_id': self.id,
                'default_patiente_id': self.patiente_id.id,
                'default_terme_grossesse': self.tag,
            },
            'target': 'current',
        }

    def action_view_notifications(self):
        """Afficher les notifications de surveillance de cette grossesse"""
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': f'Notifications - {self.patiente_id.name}',
            'res_model': 'salamet.notification',
            'view_mode': 'kanban,list,form',
            'domain': [('grossesse_id', '=', self.id)],
            'context': {
                'default_grossesse_id': self.id,
                'default_patiente_id': self.patiente_id.id,
            },
            'target': 'current',
        }

    # =================== AUTRES ACTIONS ===================
    def action_terminer_grossesse(self):
        """Action pour terminer une grossesse"""
        self.state = 'terminee'
        # Désactiver les notifications actives
        notifications_actives = self.notification_ids.filtered(lambda n: n.state == 'active')
        if notifications_actives:
            notifications_actives.write({'state': 'terminee'})

    def action_interrompre_grossesse(self):
        """Action pour interrompre une grossesse"""
        self.state = 'interrompue'
        # Désactiver les notifications actives
        notifications_actives = self.notification_ids.filtered(lambda n: n.state == 'active')
        if notifications_actives:
            notifications_actives.write({'state': 'terminee'})

    def action_marquer_a_risque(self):
        """Marquer la grossesse comme à risque"""
        self.state = 'a_risque'

    def action_generer_notifications_surveillance(self):
        """Générer les notifications de surveillance selon la pathologie"""
        if self.type_pathologie_principale != 'normale':
            # Vérifier si le modèle notification existe
            if 'salamet.notification' in self.env:
                self.env['salamet.notification'].generer_notifications_grossesse(
                    self.id,
                    self.type_pathologie_principale
                )
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'message': f'Notifications de surveillance générées pour {self.type_pathologie_principale}',
                        'type': 'success',
                        'sticky': False,
                    }
                }
            else:
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'message': 'Le système de notifications sera disponible prochainement',
                        'type': 'info',
                        'sticky': False,
                    }
                }
        else:
            raise ValidationError("Aucune notification spécifique nécessaire pour une grossesse normale.")

    def action_nouvelle_consultation(self):
        """Créer une nouvelle consultation"""
        return {
            'type': 'ir.actions.act_window',
            'name': f'Nouvelle consultation - {self.patiente_id.name}',
            'res_model': 'salamet.consultation',
            'view_mode': 'form',
            'target': 'new',
            'context': {
                'default_grossesse_id': self.id,
                'default_patiente_id': self.patiente_id.id,
                'default_medecin_id': self.medecin_referent_id.id if self.medecin_referent_id else False,
                'default_terme_grossesse': self.tag,
            }
        }

    def action_nouveau_bilan(self):
        """Créer un nouveau bilan prénatal"""
        return {
            'type': 'ir.actions.act_window',
            'name': f'Nouveau bilan prénatal - {self.patiente_id.name}',
            'res_model': 'salamet.bilan.prenatal',
            'view_mode': 'form',
            'target': 'new',
            'context': {
                'default_grossesse_id': self.id,
                'default_patiente_id': self.patiente_id.id,
                'default_terme_grossesse': self.tag,
            }
        }

    # =================== CONTRAINTES ===================
    @api.constrains('ddr')
    def _check_ddr(self):
        """Vérifier la cohérence de la DDR"""
        for record in self:
            if record.ddr and record.ddr > fields.Date.today():
                raise ValidationError("La date des dernières règles ne peut pas être dans le futur.")
            if record.ddr and (fields.Date.today() - record.ddr).days > 300:
                raise ValidationError("La date des dernières règles semble trop ancienne (plus de 300 jours).")

    @api.constrains('patiente_id', 'state')
    def _check_grossesse_unique_en_cours(self):
        """Une seule grossesse en cours par patiente"""
        for record in self:
            if record.state == 'en_cours':
                autres_grossesses = self.search([
                    ('patiente_id', '=', record.patiente_id.id),
                    ('state', '=', 'en_cours'),
                    ('id', '!=', record.id)
                ])
                if autres_grossesses:
                    raise ValidationError("Une patiente ne peut avoir qu'une seule grossesse en cours.")

    # =================== MÉTHODES ONCHANGE ===================
    @api.onchange('type_pathologie_principale')
    def _onchange_type_pathologie(self):
        """Mise à jour automatique du niveau de risque"""
        if self.type_pathologie_principale in ['preeclampsie_severe', 'diabete_insuline']:
            self.state = 'a_risque'

    @api.onchange('patiente_id')
    def _onchange_patiente(self):
        """Récupérer les données de la patiente"""
        if self.patiente_id:
            self.poids_avant_grossesse = self.patiente_id.poids
            self.taille = self.patiente_id.taille
            if self.patiente_id.medecin_ids:
                self.medecin_referent_id = self.patiente_id.medecin_ids[0]
                self.medecin_ids = [(6, 0, self.patiente_id.medecin_ids.ids)]

    # =================== MÉTHODES D'AFFICHAGE ===================
    def name_get(self):
        """Affichage personnalisé"""
        result = []
        for record in self:
            if record.patiente_id:
                name = f"{record.name} - {record.patiente_id.name}"
                if record.tag_display:
                    name += f" ({record.tag_display})"
            else:
                name = record.name
            result.append((record.id, name))
        return result


# =================== MODÈLE PATHOLOGIE (OPTIONNEL) ===================
class SalametPathologie(models.Model):
    """Modèle pour les pathologies prédéfinies"""
    _name = 'salamet.pathologie'
    _description = 'Pathologie SALAMET'
    _order = 'name'

    name = fields.Char(
        string="Nom de la pathologie",
        required=True
    )

    code = fields.Char(
        string="Code",
        help="Code médical de la pathologie"
    )

    description = fields.Text(
        string="Description"
    )

    niveau_risque = fields.Selection([
        ('1', 'Faible (1)'),
        ('2', 'Modéré (2)'),
        ('3', 'Élevé (3)'),
        ('4', 'Très élevé (4)')
    ], string="Niveau de risque", default='1')

    categorie = fields.Selection([
        ('cardiovasculaire', 'Cardiovasculaire'),
        ('endocrinien', 'Endocrinien'),
        ('obstetrical', 'Obstétrical'),
        ('infectieux', 'Infectieux'),
        ('autre', 'Autre')
    ], string="Catégorie")

    surveillance_specifique = fields.Text(
        string="Surveillance spécifique",
        help="Protocole de surveillance recommandé"
    )

    active = fields.Boolean(
        string="Actif",
        default=True
    )
