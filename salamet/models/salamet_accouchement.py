from odoo import models, fields, api

class SalametAccouchement(models.Model):
    _name = 'salamet.accouchement'
    _description = 'Accouchement antérieur'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'date_accouchement desc'

    name = fields.Char(
        string="Référence",
        compute='_compute_name',
        store=True
    )

    patiente_id = fields.Many2one(
        'salamet.patiente',
        string="Patiente",
        required=True,
        ondelete='cascade'
    )

    date_accouchement = fields.Date(
        string="Date d'accouchement",
        required=True
    )

    terme_accouchement = fields.Char(
        string="Terme",
        help="Terme de l'accouchement (ex: 39 SA)"
    )

    type_accouchement = fields.Selection([
        ('voie_basse', 'Voie basse'),
        ('cesarienne', 'Césarienne'),
        ('forceps', 'Forceps'),
        ('ventouse', 'Ventouse'),
    ], string="Type d'accouchement")

    poids_naissance = fields.Float(
        string="Poids de naissance (g)",
        help="Poids du bébé à la naissance en grammes"
    )

    sexe_enfant = fields.Selection([
        ('masculin', 'Masculin'),
        ('feminin', 'Féminin'),
    ], string="Sexe de l'enfant")

    complications = fields.Text(
        string="Complications"
    )

    observations = fields.Text(
        string="Observations"
    )

    date_prevue = fields.Date(
        string="Date prévue d'accouchement",
        help="Date prévue pour l'accouchement (DPA)"
    )

    @api.depends('patiente_id', 'date_accouchement')
    def _compute_name(self):
        for record in self:
            if record.patiente_id and record.date_accouchement:
                record.name = f"Accouchement {record.patiente_id.name} - {record.date_accouchement}"
            else:
                record.name = "Nouvel accouchement"
