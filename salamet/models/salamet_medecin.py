from odoo import models, fields, api
from odoo.exceptions import ValidationError
import re


class SalametMedecin(models.Model):
    _name = 'salamet.medecin'
    _description = 'Médecin SALAMET'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _rec_name = 'nom_complet'
    _order = 'nom_complet'  # Utiliser nom_complet au lieu de name

    # ✅ AJOUT : Champ user_id manquant !
    user_id = fields.Many2one(
        'res.users',
        string="Utilisateur Odoo",
        required=True,
        ondelete='cascade',
        help="Utilisateur Odoo associé à ce médecin"
    )

    # =================== CHAMPS DE BASE ===================
    nom_complet = fields.Char(  # ✅ Changer 'name' en 'nom_complet'
        string="Nom et prénom",
        required=True,
        tracking=True
    )

    phone = fields.Char(
        string="Téléphone",
        required=True,
        tracking=True
    )

    email = fields.Char(
        string="Email",
        required=True,
        tracking=True
    )

    # =================== CHAMPS PROFESSIONNELS ===================
    statut = fields.Selection([
        ('resident', 'Médecin Résident'),
        ('senior', 'Médecin Senior')
    ], string="Statut", required=True, tracking=True, default='resident')

    faculte_origine = fields.Char(
        string="Faculté d'origine",
        required=True,
        tracking=True
    )

    lieu_exercice = fields.Char(
        string="Lieu d'exercice",
        required=True,
        tracking=True
    )

    specialite = fields.Char(
        string="Spécialité",
        tracking=True
    )

    # =================== CHAMPS OPTIONNELS ===================
    street = fields.Char(string="Adresse")
    city = fields.Char(string="Ville")
    zip = fields.Char(string="Code postal")
    country_id = fields.Many2one('res.country', string="Pays")

    # =================== RELATIONS ===================
    partner_id = fields.Many2one(
        'res.partner',
        string="Contact associé",
        ondelete='cascade',
        help="Contact automatiquement créé dans les contacts"
    )

    patiente_ids = fields.Many2many(
        'salamet.patiente',
        'salamet_patiente_medecin_rel',
        'medecin_id',
        'patiente_id',
        string="Patientes"
    )

    grossesse_referent_ids = fields.One2many(
        'salamet.grossesse',
        'medecin_referent_id',
        string="Grossesses en tant que référent"
    )

    equipe_medicale_ids = fields.One2many(
        'salamet.equipe.medicale',
        'medecin_id',
        string="Participations aux équipes"
    )

    # =================== CHAMPS CALCULÉS ===================
    nombre_patientes = fields.Integer(
        string="Nombre de patientes",
        compute='_compute_nombre_patientes',
        store=True
    )

    nombre_grossesses_referent = fields.Integer(
        string="Nombre de grossesses en référent",
        compute='_compute_nombre_grossesses',
        store=True
    )

    active = fields.Boolean(
        string="Actif",
        default=True,
        tracking=True
    )

    # =================== MÉTHODES DE CALCUL ===================
    @api.depends('patiente_ids')
    def _compute_nombre_patientes(self):
        for record in self:
            record.nombre_patientes = len(record.patiente_ids)

    @api.depends('grossesse_referent_ids')
    def _compute_nombre_grossesses(self):
        for record in self:
            record.nombre_grossesses_referent = len(record.grossesse_referent_ids)

    # =================== ACTIONS ===================
    def action_view_patientes(self):
        """Action pour voir les patientes du médecin"""
        action = {
            'type': 'ir.actions.act_window',
            'name': f'Patientes de {self.nom_complet}',  # ✅ Changer name en nom_complet
            'res_model': 'salamet.patiente',
            'view_mode': 'kanban,list,form',
            'domain': [('medecin_ids', 'in', [self.id])],
            'context': {
                'default_medecin_ids': [(6, 0, [self.id])],
                'search_default_medecin_ids': self.id
            }
        }

        if self.nombre_patientes == 0:
            action.update({
                'view_mode': 'form',
                'target': 'new',
                'context': {'default_medecin_ids': [(6, 0, [self.id])]}
            })

        return action

    def action_view_grossesses(self):
        """Action pour voir les grossesses du médecin"""
        return {
            'type': 'ir.actions.act_window',
            'name': f'Grossesses suivies par {self.nom_complet}',  # ✅ Changer name en nom_complet
            'res_model': 'salamet.grossesse',
            'view_mode': 'list,form',
            'domain': [('medecin_referent_id', '=', self.id)],
            'context': {'default_medecin_referent_id': self.id}
        }

    # =================== MÉTHODES CRUD ===================
    @api.model
    def create(self, vals):
        """Création avec contact res.partner optionnel"""
        record = super().create(vals)

        # Créer automatiquement un contact res.partner
        if not record.partner_id:
            partner_vals = {
                'name': record.nom_complet,  # ✅ Changer name en nom_complet
                'is_company': False,
                'phone': record.phone,
                'email': record.email,
                'street': record.street,
                'city': record.city,
                'zip': record.zip,
                'country_id': record.country_id.id if record.country_id else False,
                'comment': f'Médecin SALAMET - {record.statut}'
            }

            # Ajouter catégorie si elle existe
            try:
                category = self.env.ref('salamet.partner_category_medecin')
                partner_vals['category_id'] = [(4, category.id)]
            except:
                pass

            partner = self.env['res.partner'].create(partner_vals)
            record.partner_id = partner.id

        return record

    def write(self, vals):
        """Synchronisation avec res.partner"""
        result = super().write(vals)

        # Synchroniser avec le contact
        partner_fields = {'nom_complet': 'name', 'phone': 'phone', 'email': 'email',
                          'street': 'street', 'city': 'city', 'zip': 'zip', 'country_id': 'country_id'}
        partner_vals = {}

        for field, partner_field in partner_fields.items():
            if field in vals:
                partner_vals[partner_field] = vals[field]

        if partner_vals:
            for record in self:
                if record.partner_id:
                    record.partner_id.write(partner_vals)

        return result

    def unlink(self):
        """Supprimer aussi le contact associé"""
        partners_to_delete = self.mapped('partner_id')
        result = super().unlink()
        if partners_to_delete:
            partners_to_delete.unlink()
        return result

    # =================== MÉTHODES D'AFFICHAGE ===================
    def name_get(self):
        """Affichage personnalisé avec le statut"""
        result = []
        for record in self:
            if record.statut:
                statut_label = dict(record._fields['statut'].selection).get(record.statut, '')
                name = f"{record.nom_complet} ({statut_label})"  # ✅ Changer name en nom_complet
            else:
                name = record.nom_complet  # ✅ Changer name en nom_complet
            result.append((record.id, name))
        return result

    # =================== CONTRAINTES ===================
    @api.constrains('email')
    def _check_email_format_and_unique(self):
        """Vérifier le format et l'unicité de l'email"""
        for record in self:
            if record.email:
                # Vérifier le format
                if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', record.email):
                    raise ValidationError("Le format de l'email n'est pas valide.")

                # Vérifier l'unicité
                existing = self.search([('email', '=', record.email), ('id', '!=', record.id)])
                if existing:
                    raise ValidationError(f"Un médecin avec l'email {record.email} existe déjà.")

    @api.constrains('phone')
    def _check_phone_format(self):
        """Vérifier le format du téléphone"""
        for record in self:
            if record.phone:
                # Supprimer les espaces et caractères spéciaux pour la validation
                phone_clean = re.sub(r'[^\d+]', '', record.phone)
                if len(phone_clean) < 8:
                    raise ValidationError("Le numéro de téléphone doit contenir au moins 8 chiffres.")

    # =================== MÉTHODES ONCHANGE ===================
    @api.onchange('statut')
    def _onchange_statut(self):
        """Actions lors du changement de statut"""
        if self.statut == 'senior' and not self.specialite:
            return {
                'warning': {
                    'title': 'Information',
                    'message': 'Il est recommandé de renseigner la spécialité pour un médecin senior.'
                }
            }
