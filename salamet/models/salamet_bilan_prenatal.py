# -*- coding: utf-8 -*-

from odoo import models, fields, api
from odoo.exceptions import ValidationError, UserError
from datetime import datetime, timedelta
import logging

_logger = logging.getLogger(__name__)


class SalametBilanPrenatal(models.Model):
    _name = 'salamet.bilan.prenatal'
    _description = 'Bilan Prénatal SALAMET'
    _order = 'date_bilan desc'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    # Informations de base
    name = fields.Char(
        string='Référence',
        required=True,
        copy=False,
        readonly=True,
        default=lambda self: self.env['ir.sequence'].next_by_code('salamet.bilan.prenatal') or 'New'
    )

    grossesse_id = fields.Many2one(
        'salamet.grossesse',
        string='Grossesse',
        required=True,
        ondelete='cascade',
        tracking=True
    )

    grossesse_readonly = fields.Boolean(
        string='Grossesse en lecture seule',
        compute='_compute_grossesse_readonly',
        help="Indique si le champ grossesse doit être en lecture seule"
    )

    patiente_id = fields.Many2one(
        'salamet.patiente',
        string='Patiente',
        related='grossesse_id.patiente_id',
        store=True,
        readonly=True
    )

    medecin_id = fields.Many2one(
        'salamet.medecin',
        string='Médecin prescripteur',
        required=True,
        tracking=True
    )

    date_bilan = fields.Date(
        string='Date du bilan',
        required=True,
        default=fields.Date.context_today,
        tracking=True
    )

    terme_grossesse = fields.Float(
        string='Terme (SA)',
        related='grossesse_id.terme_actuel',
        store=True,
        readonly=True
    )

    trimestre = fields.Selection([
        ('1', 'Premier trimestre (0-13 SA)'),
        ('2', 'Deuxième trimestre (14-27 SA)'),
        ('3', 'Troisième trimestre (28-42 SA)')
    ], string='Trimestre', compute='_compute_trimestre', store=True)

    type_bilan = fields.Selection([
        ('obligatoire', 'Bilan obligatoire'),
        ('complementaire', 'Bilan complémentaire'),
        ('urgence', 'Bilan d\'urgence'),
        ('controle', 'Bilan de contrôle')
    ], string='Type de bilan', required=True, default='obligatoire', tracking=True)

    state = fields.Selection([
        ('prescrit', 'Prescrit'),
        ('en_cours', 'En cours'),
        ('termine', 'Terminé'),
        ('interprete', 'Interprété'),
        ('alerte', 'Alerte')
    ], string='État', default='prescrit', tracking=True)

    # ========== EXAMENS BIOLOGIQUES DIRECTS ==========
    # Hématologie
    hemoglobine = fields.Float(
        string='Hémoglobine (g/dl)',
        digits=(4, 1),
        help='Valeurs normales: 11-13 g/dl chez la femme enceinte'
    )

    hematocrite = fields.Float(
        string='Hématocrite (%)',
        digits=(4, 1),
        help='Valeurs normales: 33-39% chez la femme enceinte'
    )

    plaquettes = fields.Integer(
        string='Plaquettes (/mm³)',
        help='Valeurs normales: 150 000-400 000/mm³'
    )

    leucocytes = fields.Integer(
        string='Leucocytes (/mm³)',
        help='Valeurs normales: 4 000-10 000/mm³'
    )

    # Biochimie
    glycemie = fields.Float(
        string='Glycémie à jeun (g/l)',
        digits=(4, 2),
        help='Valeurs normales: 0.70-0.92 g/l'
    )

    hgpo = fields.Float(
        string='HGPO 75g - 2h (g/l)',
        digits=(4, 2),
        help='Valeur normale: < 1.53 g/l à 2h'
    )

    hgpo_t0 = fields.Float(
        string='HGPO T0 (g/l)',
        digits=(4, 2),
        help='Valeur normale: < 0.92 g/l'
    )

    hgpo_t60 = fields.Float(
        string='HGPO T60 (g/l)',
        digits=(4, 2),
        help='Valeur normale: < 1.80 g/l'
    )

    proteinurie = fields.Selection([
        ('negative', 'Négative'),
        ('traces', 'Traces'),
        ('positive_1', '+'),
        ('positive_2', '++'),
        ('positive_3', '+++'),
        ('positive_4', '++++')
    ], string='Protéinurie')

    proteinurie_24h = fields.Float(
        string='Protéinurie 24h (g/24h)',
        digits=(4, 2),
        help='Valeur normale: < 0.3 g/24h'
    )


    # Fonction rénale
    creatinine = fields.Float(
        string='Créatinine (mg/l)',
        digits=(4, 1),
        help='Valeurs normales: 5-12 mg/l'
    )

    uree = fields.Float(
        string='Urée (g/l)',
        digits=(4, 2),
        help='Valeurs normales: 0.15-0.45 g/l'
    )

    # Bilan martial
    fer_serique = fields.Float(
        string='Fer sérique (µg/dl)',
        digits=(4, 1),
        help='Valeurs normales: 50-170 µg/dl'
    )

    ferritine = fields.Float(
        string='Ferritine (ng/ml)',
        digits=(4, 1),
        help='Valeurs normales: 15-200 ng/ml'
    )

    # Vitamines
    vitamine_b12 = fields.Float(
        string='Vitamine B12 (pg/ml)',
        digits=(6, 1)
    )

    acide_folique = fields.Float(
        string='Acide folique (ng/ml)',
        digits=(4, 1)
    )

    # Hormones thyroïdiennes
    tsh = fields.Float(
        string='TSH (mUI/l)',
        digits=(4, 2),
        help='Thyroid Stimulating Hormone'
    )

    # Marqueurs inflammatoires
    crp = fields.Float(
        string='CRP (mg/l)',
        digits=(4, 1),
        help='C-Reactive Protein'
    )

    # ========== EXAMENS BIOLOGIQUES - Relation One2many (pour historique détaillé) ==========
    examen_biologique_ids = fields.One2many(
        'salamet.examen.biologique',
        'bilan_id',
        string='Examens Biologiques Détaillés'
    )

    # ========== SÉROLOGIES ==========
    toxoplasmose_igg = fields.Selection([
        ('negative', 'Négative'),
        ('positive', 'Positive'),
        ('non_fait', 'Non fait')
    ], string='Toxoplasmose IgG')

    toxoplasmose_igm = fields.Selection([
        ('negative', 'Négative'),
        ('positive', 'Positive'),
        ('non_fait', 'Non fait')
    ], string='Toxoplasmose IgM')

    rubeole_igg = fields.Selection([
        ('negative', 'Négative'),
        ('positive', 'Positive'),
        ('non_fait', 'Non fait')
    ], string='Rubéole IgG')

    cmv_igg = fields.Selection([
        ('negative', 'Négative'),
        ('positive', 'Positive'),
        ('non_fait', 'Non fait')
    ], string='CMV IgG')

    cmv_igm = fields.Selection([
        ('negative', 'Négative'),
        ('positive', 'Positive'),
        ('non_fait', 'Non fait')
    ], string='CMV IgM')

    hbsag = fields.Selection([
        ('negative', 'Négative'),
        ('positive', 'Positive'),
        ('non_fait', 'Non fait')
    ], string='HBsAg')

    vih = fields.Selection([
        ('negative', 'Négative'),
        ('positive', 'Positive'),
        ('non_fait', 'Non fait')
    ], string='VIH')

    syphilis = fields.Selection([
        ('negative', 'Négative'),
        ('positive', 'Positive'),
        ('non_fait', 'Non fait')
    ], string='Syphilis (TPHA/VDRL)')

    # ========== EXAMENS COMPLÉMENTAIRES ==========
    echographie_ids = fields.One2many(
        'salamet.echographie',
        'bilan_id',
        string='Échographies'
    )

    # Dépistage des aneuploïdies
    depistage_aneuploidies = fields.Selection([
        ('non_fait', 'Non fait'),
        ('fait', 'Fait')
    ], string='Dépistage des aneuploïdies', default='non_fait')

    risque_aneuploidies = fields.Selection([
        ('faible', 'Risque faible'),
        ('intermediaire', 'Risque intermédiaire'),
        ('eleve', 'Risque élevé')
    ], string='Niveau de risque')

    notes_depistage = fields.Text(
        string='Notes sur le dépistage',
        help='Notes complémentaires pour risque intermédiaire ou élevé'
    )

    # ========== RÉSULTATS ET INTERPRÉTATION ==========
    resultats_normaux = fields.Boolean(
        string='Résultats normaux',
        compute='_compute_resultats_normaux',
        store=True
    )

    anomalies_detectees = fields.Text(string='Anomalies détectées')
    interpretation = fields.Text(string='Interprétation médicale')
    recommandations = fields.Text(string='Recommandations')

    # ========== ALERTES ==========
    alerte = fields.Boolean(
        string='Alerte',
        compute='_compute_alerte_active',
        store=True,
        help='Indique si une alerte est active pour ce bilan'
    )

    niveau_alerte = fields.Selection([
        ('aucune', 'Aucune alerte'),
        ('surveillance', 'Surveillance renforcée'),
        ('urgence', 'Urgence médicale')
    ], string='Niveau d\'alerte', default='aucune', tracking=True)

    alerte_active = fields.Boolean(
        string='Alerte active',
        compute='_compute_alerte_active',
        store=True
    )

    # ========== SUIVI ==========
    prochain_bilan = fields.Date(string='Prochain bilan prévu')
    notes = fields.Text(string='Notes')

    ############################
    # Dans le modèle salamet.bilan.prenatal
    hematologie_ids = fields.One2many(
        'salamet.examen.hematologie',
        'bilan_id',
        string='Examens Hématologie'
    )

    biochimie_ids = fields.One2many(
        'salamet.examen.biochimie',
        'bilan_id',
        string='Examens Biochimie'
    )

    # Dans la classe SalametBilanPrenatal, ajoutez :
    serologie_ids = fields.One2many(
        'salamet.serologie',
        'bilan_id',
        string='Sérologies'
    )

    ###########################

    # ========== MÉTHODES COMPUTE ==========
    @api.depends('grossesse_id')
    def _compute_grossesse_readonly(self):
        """Détermine si le champ grossesse doit être en lecture seule"""
        for bilan in self:
            if self.env.context.get('default_grossesse_id') or bilan.id:
                bilan.grossesse_readonly = True
            else:
                bilan.grossesse_readonly = False

    @api.depends('terme_grossesse')
    def _compute_trimestre(self):
        for record in self:
            if record.terme_grossesse:
                if record.terme_grossesse <= 13:
                    record.trimestre = '1'
                elif record.terme_grossesse <= 27:
                    record.trimestre = '2'
                else:
                    record.trimestre = '3'
            else:
                record.trimestre = '1'

    @api.depends('hemoglobine', 'glycemie', 'hgpo', 'hgpo_t0', 'hgpo_t60', 'proteinurie', 'proteinurie_24h',
                 'toxoplasmose_igm', 'cmv_igm', 'hbsag', 'vih', 'syphilis', 'risque_aneuploidies')
    def _compute_resultats_normaux(self):
        for record in self:
            anomalies = []

            # Vérification hématologie
            if record.hemoglobine and record.hemoglobine < 11:
                anomalies.append('Anémie')

            if record.plaquettes and record.plaquettes < 150000:
                anomalies.append('Thrombopénie')

            # Vérification glycémie
            if record.glycemie and record.glycemie > 0.92:
                anomalies.append('Hyperglycémie à jeun')

            # Vérification HGPO (critères diabète gestationnel)
            if record.hgpo_t0 and record.hgpo_t0 >= 0.92:
                anomalies.append('Diabète gestationnel (T0)')
            if record.hgpo_t60 and record.hgpo_t60 >= 1.80:
                anomalies.append('Diabète gestationnel (T60)')
            if record.hgpo and record.hgpo >= 1.53:
                anomalies.append('Diabète gestationnel (T120)')

            # Vérification protéinurie
            if record.proteinurie in ['positive_2', 'positive_3', 'positive_4']:
                anomalies.append('Protéinurie significative')
            if record.proteinurie_24h and record.proteinurie_24h > 0.3:
                anomalies.append('Protéinurie 24h élevée')

            # Vérification sérologies
            if record.toxoplasmose_igm == 'positive':
                anomalies.append('Toxoplasmose aiguë')
            if record.cmv_igm == 'positive':
                anomalies.append('CMV aigu')
            if record.hbsag == 'positive':
                anomalies.append('Hépatite B')
            if record.vih == 'positive':
                anomalies.append('VIH')
            if record.syphilis == 'positive':
                anomalies.append('Syphilis')

            # Vérification dépistage aneuploïdies
            if record.risque_aneuploidies in ['intermediaire', 'eleve']:
                anomalies.append(f'Risque aneuploïdies {record.risque_aneuploidies}')

            record.resultats_normaux = len(anomalies) == 0
            if anomalies:
                record.anomalies_detectees = ', '.join(anomalies)
            else:
                record.anomalies_detectees = False

    @api.depends('niveau_alerte', 'resultats_normaux', 'state')
    def _compute_alerte_active(self):
        for record in self:
            alerte_active = (
                    record.niveau_alerte in ['surveillance', 'urgence'] or
                    not record.resultats_normaux or
                    record.state == 'alerte'
            )
            record.alerte_active = alerte_active
            record.alerte = alerte_active

    # ========== MÉTHODES ONCHANGE ==========
    @api.onchange('hemoglobine')
    def _onchange_hemoglobine(self):
        if self.hemoglobine and self.hemoglobine < 10:
            return {
                'warning': {
                    'title': 'Anémie sévère',
                    'message': 'Hémoglobine très basse, surveillance renforcée recommandée.'
                }
            }

    @api.onchange('glycemie', 'hgpo_t0', 'hgpo_t60', 'hgpo')
    def _onchange_glycemie(self):
        messages = []
        if self.glycemie and self.glycemie > 0.92:
            messages.append('Glycémie à jeun élevée')
        if self.hgpo_t0 and self.hgpo_t0 >= 0.92:
            messages.append('HGPO T0 anormale')
        if self.hgpo_t60 and self.hgpo_t60 >= 1.80:
            messages.append('HGPO T60 anormale')
        if self.hgpo and self.hgpo >= 1.53:
            messages.append('HGPO T120 anormale')

        if messages:
            return {
                'warning': {
                    'title': 'Anomalie glycémique',
                    'message': 'Suspicion de diabète gestationnel: ' + ', '.join(messages)
                }
            }

    @api.onchange('proteinurie', 'proteinurie_24h')
    def _onchange_proteinurie(self):
        if (self.proteinurie in ['positive_3', 'positive_4'] or
                (self.proteinurie_24h and self.proteinurie_24h > 0.5)):
            return {
                'warning': {
                    'title': 'Protéinurie importante',
                    'message': 'Protéinurie significative détectée, surveillance de la pression artérielle recommandée.'
                }
            }

    # ========== MÉTHODES CRUD ==========
    @api.model
    def create(self, vals):
        if vals.get('name', 'New') == 'New':
            vals['name'] = self.env['ir.sequence'].next_by_code('salamet.bilan.prenatal') or 'New'
        bilan = super().create(vals)
        bilan._generer_notifications()
        return bilan

    def write(self, vals):
        result = super().write(vals)
        if any(field in vals for field in ['state', 'niveau_alerte', 'resultats_normaux']):
            self._generer_notifications()
        return result

    # ========== MÉTHODES MÉTIER ==========
    def _generer_notifications(self):
        """Génère les notifications selon les résultats"""
        for record in self:
            if not record.resultats_normaux or record.niveau_alerte != 'aucune':
                existing_notification = self.env['salamet.notification'].search([
                    ('modele_lie', '=', 'salamet.bilan.prenatal'),
                    ('enregistrement_lie', '=', record.id),
                    ('type_notification', '=', 'alerte_medicale')
                ], limit=1)

                if not existing_notification:
                    self.env['salamet.notification'].create({
                        'titre': f'Alerte bilan prénatal - {record.patiente_id.name}',
                        'message': f'Anomalies détectées dans le bilan du {record.date_bilan}',
                        'type_notification': 'alerte_medicale',
                        'priorite': 'haute' if record.niveau_alerte == 'urgence' else 'moyenne',
                        'grossesse_id': record.grossesse_id.id,
                        'patiente_id': record.patiente_id.id,
                        'medecin_id': record.medecin_id.id,
                        'date_prevue': fields.Datetime.now(),
                        'modele_lie': 'salamet.bilan.prenatal',
                        'enregistrement_lie': record.id,
                    })

    def action_marquer_termine(self):
        """Marque le bilan comme terminé"""
        self.write({'state': 'termine'})
        return True

    def action_interpreter(self):
        """Ouvre l'assistant d'interprétation"""
        return {
            'type': 'ir.actions.act_window',
            'name': 'Interprétation du bilan',
            'res_model': 'salamet.bilan.interpretation.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {'default_bilan_id': self.id}
        }

    def action_generer_alerte(self):
        """Action pour générer une alerte manuelle"""
        self.write({
            'state': 'alerte',
            'niveau_alerte': 'urgence'
        })
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'message': 'Alerte générée avec succès',
                'type': 'success',
            }
        }

    # ========== MÉTHODES UTILITAIRES ==========
    def is_anemie(self):
        """Vérifie s'il y a une anémie"""
        return self.hemoglobine and self.hemoglobine < 11

    def is_diabete_gestationnel(self):
        """Vérifie les critères de diabète gestationnel"""
        return (
                (self.hgpo_t0 and self.hgpo_t0 >= 0.92) or
                (self.hgpo_t60 and self.hgpo_t60 >= 1.80) or
                (self.hgpo and self.hgpo >= 1.53) or
                (self.glycemie and self.glycemie > 0.92)
        )

    def has_proteinurie_significative(self):
        """Vérifie s'il y a une protéinurie significative"""
        return (
                self.proteinurie in ['positive_2', 'positive_3', 'positive_4'] or
                (self.proteinurie_24h and self.proteinurie_24h > 0.3)
        )

    def get_anomalies_automatiques(self):
        """Détecte automatiquement les anomalies"""
        anomalies = []

        if self.is_anemie():
            anomalies.append("Anémie")

        if self.is_diabete_gestationnel():
            anomalies.append("Diabète gestationnel")

        if self.has_proteinurie_significative():
            anomalies.append("Protéinurie significative")

        if self.plaquettes and self.plaquettes < 150000:
            anomalies.append("Thrombopénie")

        return anomalies

##################################################
class SalametSerologie(models.Model):
    """Modèle pour les sérologies"""
    _name = 'salamet.serologie'
    _description = 'Sérologie SALAMET'
    _order = 'date_examen desc'

    # ⭐ CORRECTION: Utiliser bilan_id au lieu de bilan_prenatal_id
    bilan_id = fields.Many2one(
        'salamet.bilan.prenatal',
        string='Bilan prénatal',
        required=True,
        ondelete='cascade'
    )

    # ⭐ AJOUT: Champ patiente_id pour les règles de sécurité
    patiente_id = fields.Many2one(
        'salamet.patiente',
        string='Patiente',
        related='bilan_id.patiente_id',
        store=True,
        readonly=True
    )

    # Informations de base
    date_examen = fields.Date(
        string='Date d\'examen',
        required=True,
        default=fields.Date.today
    )

    type_serologie = fields.Selection([
        ('toxoplasmose_igg', 'Toxoplasmose IgG'),
        ('toxoplasmose_igm', 'Toxoplasmose IgM'),
        ('rubeole_igg', 'Rubéole IgG'),
        ('rubeole_igm', 'Rubéole IgM'),
        ('cmv_igg', 'CMV IgG'),
        ('cmv_igm', 'CMV IgM'),
        ('hbsag', 'HBsAg (Hépatite B)'),
        ('hcv', 'VHC (Hépatite C)'),
        ('vih', 'VIH'),
        ('syphilis', 'Syphilis (TPHA/VDRL)'),
        ('streptocoque_b', 'Streptocoque B'),
        ('autre', 'Autre')
    ], string='Type de sérologie', required=True)

    # Résultats
    resultat = fields.Selection([
        ('negatif', 'Négatif'),
        ('positif', 'Positif'),
        ('douteux', 'Douteux'),
        ('non_fait', 'Non fait')
    ], string='Résultat', required=True)

    valeur_numerique = fields.Float(
        string='Valeur numérique',
        help="Valeur numérique si applicable (ex: titre, UI/ml)"
    )

    unite = fields.Char(
        string='Unité',
        help="Unité de mesure (UI/ml, titre, etc.)"
    )

    valeurs_reference = fields.Char(
        string='Valeurs de référence',
        help="Valeurs de référence du laboratoire"
    )

    interpretation = fields.Selection([
        ('normal', 'Normal'),
        ('immunise', 'Immunisé'),
        ('surveillance', 'Surveillance'),
        ('positif', 'Positif - Action requise')
    ], string='Interprétation', compute='_compute_interpretation', store=True)

    commentaire = fields.Text(
        string='Commentaire',
        help="Commentaires sur cette sérologie"
    )

    @api.depends('type_serologie', 'resultat')
    def _compute_interpretation(self):
        """Calcul automatique de l'interprétation"""
        for record in self:
            if record.resultat == 'negatif':
                if record.type_serologie in ['toxoplasmose_igg', 'rubeole_igg']:
                    record.interpretation = 'surveillance'  # Non immunisée
                elif record.type_serologie in ['vih', 'syphilis', 'hbsag']:
                    record.interpretation = 'normal'  # Bon signe
                else:
                    record.interpretation = 'normal'
            elif record.resultat == 'positif':
                if record.type_serologie in ['toxoplasmose_igg', 'rubeole_igg']:
                    record.interpretation = 'immunise'  # Immunisée
                elif record.type_serologie in ['vih', 'syphilis', 'hbsag']:
                    record.interpretation = 'positif'  # Action requise
                else:
                    record.interpretation = 'surveillance'
            else:
                record.interpretation = 'surveillance'

    def name_get(self):
        """Affichage personnalisé"""
        result = []
        for record in self:
            name = f"{dict(record._fields['type_serologie'].selection).get(record.type_serologie)} - {record.date_examen}"
            result.append((record.id, name))
        return result



# ========== MODÈLES LIÉS ==========
class SalametExamenBiologique(models.Model):
    _name = 'salamet.examen.biologique'
    _description = 'Examen Biologique Détaillé'
    _order = 'date_examen desc'

    bilan_id = fields.Many2one('salamet.bilan.prenatal', string='Bilan', ondelete='cascade')
    grossesse_id = fields.Many2one('salamet.grossesse', string='Grossesse', required=True)
    patient_id = fields.Many2one(
        'salamet.patiente',
        string='Patiente',
        related='grossesse_id.patiente_id',
        store=True,
        readonly=True
    )

    date_examen = fields.Date(string='Date', required=True, default=fields.Date.context_today)

    # Champs Hématologie
    hemoglobine = fields.Float(string='Hémoglobine (g/dL)', digits=(4, 1))
    hematocrite = fields.Float(string='Hématocrite (%)', digits=(4, 1))
    plaquettes = fields.Integer(string='Plaquettes (/mm³)')
    leucocytes = fields.Integer(string='Leucocytes (/mm³)')

    # Champs Biochimie
    glycemie = fields.Float(string='Glycémie à jeun (g/L)', digits=(4, 2))
    hgpo = fields.Float(string='HGPO 75g - 2h (g/L)', digits=(4, 2))
    proteinurie = fields.Float(string='Protéinurie (g/24h)', digits=(4, 2))


    # Commentaire général
    commentaire = fields.Text(string='Commentaire')

    # Méthodes pour calculer les anomalies
    @api.depends('hemoglobine', 'hematocrite', 'plaquettes', 'leucocytes',
                 'glycemie', 'hgpo', 'proteinurie')
    def _compute_anomalies(self):
        for record in self:
            anomalies = []

            # Vérifications hématologie
            if record.hemoglobine and (record.hemoglobine < 11.0 or record.hemoglobine > 16.0):
                anomalies.append('Hémoglobine anormale')
            if record.hematocrite and (record.hematocrite < 33.0 or record.hematocrite > 45.0):
                anomalies.append('Hématocrite anormal')
            if record.plaquettes and (record.plaquettes < 150000 or record.plaquettes > 400000):
                anomalies.append('Plaquettes anormales')
            if record.leucocytes and (record.leucocytes < 4000 or record.leucocytes > 11000):
                anomalies.append('Leucocytes anormaux')

            # Vérifications biochimie
            if record.glycemie and (record.glycemie < 0.70 or record.glycemie > 0.92):
                anomalies.append('Glycémie anormale')
            if record.hgpo and record.hgpo > 1.40:
                anomalies.append('HGPO anormale')
            if record.proteinurie and record.proteinurie > 0.3:
                anomalies.append('Protéinurie anormale')

            record.anomalies_detectees = ', '.join(anomalies) if anomalies else False

    anomalies_detectees = fields.Char(string='Anomalies détectées', compute='_compute_anomalies', store=True)

    def name_get(self):
        result = []
        for record in self:
            name = f"Examen du {record.date_examen} - {record.patient_id.name}"
            result.append((record.id, name))
        return result

# Le modèle SalametEchographie reste inchangé...
class SalametEchographie(models.Model):
    _name = 'salamet.echographie'
    _description = 'Échographie'
    _order = 'date_echo desc'

    bilan_id = fields.Many2one('salamet.bilan.prenatal', string='Bilan', ondelete='cascade')
    grossesse_id = fields.Many2one('salamet.grossesse', string='Grossesse', required=True)

    date_echo = fields.Date(string='Date', required=True, default=fields.Date.context_today)
    terme_echo = fields.Float(string='Terme à l\'écho (SA)', required=True)
    type_echo = fields.Selection([
        ('datation', 'Échographie de datation'),
        ('morphologique', 'Échographie morphologique'),
        ('biometrie', 'Biométrie fœtale'),
        ('doppler', 'Doppler'),
        ('croissance', 'Contrôle de croissance'),
        ('autre', 'Autre')
    ], string='Type', required=True)

    # Biométrie fœtale
    lcc = fields.Float(string='LCC (mm)', help='Longueur cranio-caudale')
    cn = fields.Float(string='CN (mm)', help='Clarté nucale')
    bip = fields.Float(string='BIP (mm)', help='Diamètre bipariétal')
    pc = fields.Float(string='PC (mm)', help='Périmètre crânien')
    pa = fields.Float(string='PA (mm)', help='Périmètre abdominal')
    lf = fields.Float(string='LF (mm)', help='Longueur fémorale')
    efw = fields.Float(string='EPF (g)', help='Estimation du poids fœtal')

    # Présentation fœtale
    presentation = fields.Selection([
        ('cephalique', 'Céphalique'),
        ('siege', 'Siège'),
        ('transverse', 'Transverse'),
        ('oblique', 'Oblique'),
        ('indeterminee', 'Indéterminée')
    ], string='Présentation fœtale')

    # Morphologie
    morphologie_normale = fields.Boolean(string='Morphologie normale', default=True)
    anomalies_morphologiques = fields.Text(string='Anomalies morphologiques')

    # Liquide amniotique
    liquide_amniotique = fields.Selection([
        ('normal', 'Normal'),
        ('oligoamnios', 'Oligoamnios'),
        ('polyamnios', 'Polyamnios')
    ], string='Liquide amniotique', default='normal')

    # Placenta
    placenta_position = fields.Selection([
        ('anterieur', 'Antérieur'),
        ('posterieur', 'Postérieur'),
        ('fundique', 'Fundique'),
        ('lateral', 'Latéral'),
        ('praevia', 'Prævia')
    ], string='Position placentaire')

    # Doppler
    doppler_realise = fields.Boolean(string='Doppler réalisé')
    doppler_uterine_droite = fields.Float(string='A. utérine droite (IP)', help='Index de pulsatilité')
    doppler_uterine_gauche = fields.Float(string='A. utérine gauche (IP)')
    notch_uterine = fields.Selection([
        ('absent', 'Absent'),
        ('unilateral', 'Unilatéral'),
        ('bilateral', 'Bilatéral')
    ], string='Notch utérin')
    doppler_ombilical = fields.Float(string='A. ombilicale (IP)')
    doppler_cerebrale = fields.Float(string='A. cérébrale moyenne (IP)')
    doppler_cerebroplacentaire = fields.Float(string='Ratio cérébro-placentaire', compute='_compute_ratio_cp',
                                              store=True)
    doppler_ductus = fields.Selection([
        ('normal', 'Normal'),
        ('anormal', 'Anormal'),
        ('absent', 'Absent/Inversé')
    ], string='Ductus venosus')

    # Résultats
    conclusion = fields.Text(string='Conclusion')
    recommandations = fields.Text(string='Recommandations')

    # Alerte
    alerte = fields.Boolean(string='Alerte', compute='_compute_alerte', store=True)
    niveau_alerte_echo = fields.Selection([
        ('aucune', 'Aucune'),
        ('surveillance', 'Surveillance'),
        ('urgente', 'Urgente')
    ], string='Niveau d\'alerte', compute='_compute_niveau_alerte_echo', store=True)

    @api.depends('doppler_cerebrale', 'doppler_ombilical')
    def _compute_ratio_cp(self):
        for record in self:
            if record.doppler_cerebrale and record.doppler_ombilical and record.doppler_ombilical != 0:
                record.doppler_cerebroplacentaire = record.doppler_cerebrale / record.doppler_ombilical
            else:
                record.doppler_cerebroplacentaire = 0

    @api.depends('morphologie_normale', 'liquide_amniotique', 'placenta_position', 'cn', 'doppler_ombilical',
                 'doppler_cerebroplacentaire', 'notch_uterine')
    def _compute_alerte(self):
        for record in self:
            alertes = []
            if not record.morphologie_normale:
                alertes.append('morphologie')
            if record.liquide_amniotique != 'normal':
                alertes.append('liquide')
            if record.placenta_position == 'praevia':
                alertes.append('placenta')
            if record.cn and record.cn > 3.5:
                alertes.append('cn_elevee')
            if record.doppler_ombilical and record.doppler_ombilical > 1.0:
                alertes.append('doppler_ombilical')
            if record.doppler_cerebroplacentaire and record.doppler_cerebroplacentaire < 1.0:
                alertes.append('doppler_cp')
            if record.notch_uterine == 'bilateral':
                alertes.append('notch_bilateral')
            record.alerte = len(alertes) > 0

    @api.depends('alerte', 'cn', 'doppler_ombilical', 'placenta_position', 'morphologie_normale')
    def _compute_niveau_alerte_echo(self):
        for record in self:
            if not record.alerte:
                record.niveau_alerte_echo = 'aucune'
            elif (record.placenta_position == 'praevia' or
                  not record.morphologie_normale or
                  (record.doppler_ombilical and record.doppler_ombilical > 1.5)):
                record.niveau_alerte_echo = 'urgente'
            else:
                record.niveau_alerte_echo = 'surveillance'

    @api.onchange('terme_echo')
    def _onchange_terme_echo(self):
        if self.terme_echo:
            if self.terme_echo <= 14:
                self.type_echo = 'datation'
            elif 18 <= self.terme_echo <= 24:
                self.type_echo = 'morphologique'
            elif self.terme_echo >= 28:
                self.type_echo = 'biometrie'


class SalametExamenHematologie(models.Model):
    _name = 'salamet.examen.hematologie'
    _description = 'Examen Hématologie'
    _order = 'date_examen desc'

    bilan_id = fields.Many2one('salamet.bilan.prenatal', string='Bilan', ondelete='cascade')
    patiente_id = fields.Many2one(
        'salamet.patiente',
        string='Patiente',
        related='bilan_id.patiente_id',
        store=True,
        readonly=True
    )
    date_examen = fields.Date(string='Date', required=True, default=fields.Date.context_today)

    # Valeurs hématologie
    hemoglobine = fields.Float(string='Hémoglobine (g/dL)', digits=(4, 1))
    hematocrite = fields.Float(string='Hématocrite (%)', digits=(4, 1))
    plaquettes = fields.Integer(string='Plaquettes (/mm³)')
    leucocytes = fields.Integer(string='Leucocytes (/mm³)')

    anomalie_hematologie = fields.Selection([
        ('normal', 'Normal'),
        ('limite', 'Limite'),
        ('anormal', 'Anormal')
    ], string='Résultat', compute='_compute_anomalie_hematologie', store=True)

    commentaire_hematologie = fields.Text(string='Commentaire')

    @api.depends('hemoglobine', 'hematocrite', 'plaquettes', 'leucocytes')
    def _compute_anomalie_hematologie(self):
        for record in self:
            anomalies = []
            if record.hemoglobine and (record.hemoglobine < 11.0 or record.hemoglobine > 16.0):
                anomalies.append('Hémoglobine')
            if record.hematocrite and (record.hematocrite < 33.0 or record.hematocrite > 45.0):
                anomalies.append('Hématocrite')
            if record.plaquettes and (record.plaquettes < 150000 or record.plaquettes > 400000):
                anomalies.append('Plaquettes')
            if record.leucocytes and (record.leucocytes < 4000 or record.leucocytes > 11000):
                anomalies.append('Leucocytes')

            if anomalies:
                record.anomalie_hematologie = 'anormal'
            else:
                record.anomalie_hematologie = 'normal'


class SalametExamenBiochimie(models.Model):
    _name = 'salamet.examen.biochimie'
    _description = 'Examen Biochimie'
    _order = 'date_examen desc'

    bilan_id = fields.Many2one('salamet.bilan.prenatal', string='Bilan', ondelete='cascade')
    patiente_id = fields.Many2one(
        'salamet.patiente',
        string='Patiente',
        related='bilan_id.patiente_id',
        store=True,
        readonly=True
    )
    date_examen = fields.Date(string='Date', required=True, default=fields.Date.context_today)

    # Valeurs biochimie
    glycemie = fields.Float(string='Glycémie (g/L)', digits=(4, 2))
    hgpo = fields.Float(string='HGPO 75g - 2h (g/L)', digits=(4, 2))
    proteinurie = fields.Float(string='Protéinurie (g/24h)', digits=(4, 2))


    anomalie_biochimie = fields.Selection([
        ('normal', 'Normal'),
        ('limite', 'Limite'),
        ('anormal', 'Anormal')
    ], string='Résultat', compute='_compute_anomalie_biochimie', store=True)

    commentaire_biochimie = fields.Text(string='Commentaire')

    @api.depends('glycemie', 'hgpo', 'proteinurie')
    def _compute_anomalie_biochimie(self):
        for record in self:
            anomalies = []
            if record.glycemie and (record.glycemie < 0.70 or record.glycemie > 0.92):
                anomalies.append('Glycémie')
            if record.hgpo and record.hgpo > 1.40:
                anomalies.append('HGPO')
            if record.proteinurie and record.proteinurie > 0.3:
                anomalies.append('Protéinurie')


            if anomalies:
                record.anomalie_biochimie = 'anormal'
            else:
                record.anomalie_biochimie = 'normal'
