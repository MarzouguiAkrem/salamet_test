from odoo import models, fields, api

class SalametEquipeMedicale(models.Model):
    _name = 'salamet.equipe.medicale'
    _description = 'Équipe Médicale SALAMET'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'patiente_id, role'

    name = fields.Char(
        string="Nom de l'équipe",
        compute='_compute_name',
        store=True
    )

    patiente_id = fields.Many2one(
        'salamet.patiente',
        string="Patiente",
        required=True,
        ondelete='cascade'
    )

    medecin_id = fields.Many2one(
        'salamet.medecin',
        string="Médecin",
        required=True,
        ondelete='cascade'
    )

    role = fields.Selection([
        ('referent', 'Médecin référent'),
        ('consultant', 'Médecin consultant'),
        ('resident', 'Médecin résident'),
        ('specialiste', 'Médecin spécialiste')
    ], string="Rôle", required=True)

    date_debut = fields.Date(
        string="Date de début",
        default=fields.Date.today,
        required=True
    )

    date_fin = fields.Date(
        string="Date de fin"
    )

    active = fields.Boolean(
        string="Actif",
        default=True
    )

    notes = fields.Text(
        string="Notes"
    )

    @api.depends('patiente_id', 'medecin_id', 'role')
    def _compute_name(self):
        for record in self:
            if record.patiente_id and record.medecin_id:
                record.name = f"{record.patiente_id.name} - {record.medecin_id.name} ({record.role})"
            else:
                record.name = "Équipe médicale"

    @api.constrains('patiente_id', 'medecin_id', 'role')
    def _check_unique_role_per_patient(self):
        for record in self:
            if record.role == 'referent':
                existing = self.search([
                    ('patiente_id', '=', record.patiente_id.id),
                    ('role', '=', 'referent'),
                    ('active', '=', True),
                    ('id', '!=', record.id)
                ])
                if existing:
                    raise models.ValidationError(
                        "Une patiente ne peut avoir qu'un seul médecin référent actif."
                    )
