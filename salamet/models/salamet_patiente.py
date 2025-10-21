# -*- coding: utf-8 -*-
"""Modèle Odoo : salamet.patiente
Fichier réécrit et restructuré pour respecter la mise en page et les conventions.
"""

from datetime import date
import logging
import re
import secrets
import string

from odoo import api, fields, models
from odoo.exceptions import ValidationError

_logger = logging.getLogger(__name__)


class SalametPatiente(models.Model):
    _name = "salamet.patiente"
    _description = "Patiente SALAMET"
    _inherit = ["mail.thread", "mail.activity.mixin"]
    _rec_name = "nom_complet"
    _order = "nom_complet"

    # -------------------- Relations utilisateur / contact --------------------
    user_id = fields.Many2one(
        "res.users",
        string="Utilisateur",
        required=False,
        ondelete="cascade",
        help="Utilisateur Odoo lié à cette patiente pour l'accès mobile",
        tracking=True,
    )

    partner_id = fields.Many2one(
        "res.partner",
        string="Contact associé",
        ondelete="set null",
        help="Contact automatiquement créé dans les contacts Odoo",
    )

    # -------------------- Informations de base --------------------
    name = fields.Char(string="Nom et prénom", required=True, tracking=True)

    nom_complet = fields.Char(
        string="Nom complet",
        compute="_compute_nom_complet",
        store=True,
        help="Nom complet formaté automatiquement",
    )

    date_naissance = fields.Date(string="Date de naissance", required=True, tracking=True)

    age = fields.Integer(string="Âge", compute="_compute_age", store=True)

    profession = fields.Char(string="Profession", tracking=True)

    telephone = fields.Char(string="Téléphone", tracking=True)

    email = fields.Char(string="Adresse email", tracking=True)

    adresse = fields.Text(string="Adresse complète")

    # -------------------- Informations conjugales --------------------
    nom_mari = fields.Char(string="Nom et prénom du mari/conjoint", tracking=True)
    age_mari = fields.Integer(string="Âge du mari/conjoint")
    profession_mari = fields.Char(string="Profession du mari/conjoint")
    telephone_mari = fields.Char(string="Téléphone du mari/conjoint")
    email_mari = fields.Char(string="Email du mari/conjoint")

    # -------------------- Antécédents familiaux --------------------
    antecedent_diabete_familial = fields.Boolean(string="Diabète familial", tracking=True)
    age_survenue_diabete = fields.Integer(string="Âge de survenue du diabète")
    antecedent_hta_familial = fields.Boolean(string="HTA familiale", tracking=True)
    age_survenue_hta = fields.Integer(string="Âge de survenue de l'HTA")
    autres_antecedents_familiaux = fields.Text(string="Autres antécédents familiaux")

    # -------------------- Consanguinité --------------------
    consanguinite = fields.Boolean(
        string="Consanguinité",
        tracking=True,
        help="Y a-t-il un lien de parenté entre les conjoints ?",
    )

    degre_consanguinite = fields.Selection(
        [
            ("1er", "1er degré"),
            ("2eme", "2ème degré"),
            ("3eme", "3ème degré"),
        ],
        string="Degré de consanguinité",
        tracking=True,
        help="Degré de parenté entre les conjoints",
    )

    # -------------------- Informations médicales --------------------
    groupe_sanguin = fields.Selection(
        [
            ("A+", "A+"),
            ("A-", "A-"),
            ("B+", "B+"),
            ("B-", "B-"),
            ("AB+", "AB+"),
            ("AB-", "AB-"),
            ("O+", "O+"),
            ("O-", "O-"),
        ],
        string="Groupe sanguin",
        tracking=True,
    )

    poids = fields.Float(string="Poids (kg)", tracking=True)
    taille = fields.Float(string="Taille (cm)", tracking=True)

    imc = fields.Float(string="IMC", compute="_compute_imc", store=True)

    # -------------------- Antécédents personnels --------------------
    antecedents_medicaux = fields.Text(string="Antécédents médicochirurgicaux", tracking=True)
    antecedents_chirurgicaux = fields.Text(string="Antécédents chirurgicaux", tracking=True)
    antecedents_gyneco = fields.Text(string="Antécédents gynéco-obstétricaux", tracking=True)

    # -------------------- GPA --------------------
    gestite = fields.Integer(
        string="Gestité (G)", default=0, help="Nombre total de grossesses", tracking=True
    )

    parite = fields.Integer(
        string="Parité (P)", default=0, help="Nombre d'accouchements après 22 SA", tracking=True
    )

    avortements = fields.Integer(
        string="Avortements (A)", default=0, help="Nombre d'avortements avant 22 SA", tracking=True
    )

    gpa_details = fields.Text(string="Détails GPA", help="Détails des grossesses antérieures")

    # -------------------- Relations --------------------
    medecin_ids = fields.Many2many(
        "salamet.medecin",
        "salamet_patiente_medecin_rel",
        "patiente_id",
        "medecin_id",
        string="Médecins traitants",
        tracking=True,
    )

    grossesse_ids = fields.One2many(
        "salamet.grossesse", "patiente_id", string="Grossesses"
    )

    accouchement_ids = fields.One2many(
        "salamet.accouchement", "patiente_id", string="Accouchements antérieurs"
    )

    bilan_prenatal_ids = fields.One2many(
        "salamet.bilan.prenatal", "patiente_id", string="Bilans prénataux"
    )

    # -------------------- Champs calculés --------------------
    nombre_grossesses = fields.Integer(
        string="Nombre de grossesses", compute="_compute_nombre_grossesses", store=True
    )

    nombre_accouchements = fields.Integer(
        string="Nombre d'accouchements", compute="_compute_nombre_accouchements", store=True
    )

    grossesse_actuelle_id = fields.Many2one(
        "salamet.grossesse", string="Grossesse actuelle", compute="_compute_grossesse_actuelle", store=True
    )

    est_enceinte = fields.Boolean(
        string="Enceinte actuellement", compute="_compute_grossesse_actuelle", store=True
    )

    # -------------------- Champs de risque --------------------
    facteur_risque_age = fields.Boolean(
        string="Âge à risque (< 18 ou > 35 ans)", compute="_compute_facteurs_risque", store=True
    )

    facteur_risque_imc = fields.Boolean(
        string="IMC à risque", compute="_compute_facteurs_risque", store=True
    )

    facteur_risque_antecedents = fields.Boolean(
        string="Antécédents à risque", compute="_compute_facteurs_risque", store=True
    )

    facteur_risque_consanguinite = fields.Boolean(
        string="Risque de consanguinité", compute="_compute_facteurs_risque", store=True
    )

    facteurs_risque_supplementaires = fields.Text(
        string="Facteurs de risque supplémentaires", help="Autres facteurs de risque identifiés"
    )

    niveau_risque_global = fields.Selection(
        [
            ("faible", "Faible"),
            ("moyen", "Moyen"),
            ("eleve", "Élevé"),
            ("tres_eleve", "Très élevé"),
        ],
        string="Niveau de risque global",
        compute="_compute_niveau_risque",
        store=True,
    )

    score_risque = fields.Integer(
        string="Score de risque",
        compute="_compute_niveau_risque",
        store=True,
        help="Score calculé automatiquement",
    )

    active = fields.Boolean(string="Actif", default=True, tracking=True)

    # -------------------- Calculs --------------------
    @api.depends("name")
    def _compute_nom_complet(self):
        """Calcule le nom complet formaté"""
        for record in self:
            if record.name:
                nom_nettoye = " ".join(record.name.strip().split())
                record.nom_complet = nom_nettoye.title()
            else:
                record.nom_complet = ""

    @api.depends("date_naissance")
    def _compute_age(self):
        for record in self:
            if record.date_naissance:
                today = date.today()
                record.age = (
                    today.year
                    - record.date_naissance.year
                    - ((today.month, today.day) < (record.date_naissance.month, record.date_naissance.day))
                )
            else:
                record.age = 0

    @api.depends("poids", "taille")
    def _compute_imc(self):
        for record in self:
            if record.poids and record.taille:
                try:
                    taille_m = record.taille / 100.0
                    record.imc = record.poids / (taille_m ** 2) if taille_m > 0 else 0.0
                except Exception:
                    record.imc = 0.0
            else:
                record.imc = 0.0

    @api.depends("grossesse_ids")
    def _compute_nombre_grossesses(self):
        for record in self:
            record.nombre_grossesses = len(record.grossesse_ids)

    @api.depends("accouchement_ids")
    def _compute_nombre_accouchements(self):
        for record in self:
            record.nombre_accouchements = len(record.accouchement_ids)

    @api.depends("grossesse_ids.state")
    def _compute_grossesse_actuelle(self):
        for record in self:
            grossesse_actuelle = record.grossesse_ids.filtered(lambda g: g.state == "en_cours")
            if grossesse_actuelle:
                record.grossesse_actuelle_id = grossesse_actuelle[0].id
                record.est_enceinte = True
            else:
                record.grossesse_actuelle_id = False
                record.est_enceinte = False

    @api.depends(
        "age",
        "imc",
        "antecedent_diabete_familial",
        "antecedent_hta_familial",
        "consanguinite",
        "degre_consanguinite",
    )
    def _compute_facteurs_risque(self):
        """Calcule les facteurs de risque automatiquement"""
        for record in self:
            record.facteur_risque_age = bool(record.age and (record.age < 18 or record.age > 35))
            record.facteur_risque_imc = bool(record.imc and (record.imc < 18.5 or record.imc > 30))

            antecedents_text = (record.antecedents_medicaux or "").lower()
            record.facteur_risque_antecedents = bool(
                record.antecedent_diabete_familial
                or record.antecedent_hta_familial
                or any(word in antecedents_text for word in ["diabète", "diabete", "hypertension", "cardiaque", "rénale", "renal"])  # tolerant
            )

            record.facteur_risque_consanguinite = bool(record.consanguinite)

    @api.depends(
        "age",
        "antecedent_diabete_familial",
        "antecedent_hta_familial",
        "consanguinite",
        "degre_consanguinite",
        "imc",
        "facteur_risque_age",
        "facteur_risque_imc",
        "facteur_risque_antecedents",
        "facteur_risque_consanguinite",
    )
    def _compute_niveau_risque(self):
        for record in self:
            score_risque = 0

            if record.facteur_risque_age:
                score_risque += 1

            if record.antecedent_diabete_familial:
                score_risque += 1
            if record.antecedent_hta_familial:
                score_risque += 1

            if record.consanguinite:
                if record.degre_consanguinite == "1er":
                    score_risque += 3
                elif record.degre_consanguinite == "2eme":
                    score_risque += 2
                elif record.degre_consanguinite == "3eme":
                    score_risque += 1
            
            if record.facteur_risque_imc:
                score_risque += 1
            if record.imc and record.imc > 35:
                score_risque += 1

            if record.facteur_risque_antecedents:
                score_risque += 1

            if record.facteurs_risque_supplementaires:
                lignes = [l.strip() for l in record.facteurs_risque_supplementaires.split("\n") if l.strip()]
                score_risque += len(lignes)

            # déterminer le niveau
            if score_risque == 0:
                niveau = "faible"
            elif score_risque <= 2:
                niveau = "moyen"
            elif score_risque <= 4:
                niveau = "eleve"
            else:
                niveau = "tres_eleve"

            record.score_risque = score_risque
            record.niveau_risque_global = niveau

    # -------------------- CRUD et synchronisation --------------------
    @api.model
    def create(self, vals):
        """Création d'une patiente avec création / association d'utilisateur et contact."""
        # Étape 1 : gérer l'utilisateur
        try:
            if not vals.get("user_id") and vals.get("email"):
                existing_user = self.env["res.users"].sudo().search([("login", "=", vals["email"])], limit=1)
                if existing_user:
                    vals["user_id"] = existing_user.id
                    _logger.info("Utilisateur existant lié : %s", existing_user.login)
                else:
                    # Créer un nouvel utilisateur avec le groupe patiente si possible
                    group = self.env.ref("salamet.group_salamet_patiente", raise_if_not_found=False)
                    password = self._generate_secure_password()
                    user_vals = {
                        "name": vals.get("name", "Nouvelle Patiente"),
                        "login": vals["email"],
                        "email": vals["email"],
                        "password": password,
                    }
                    new_user = self.env["res.users"].sudo().create(user_vals)
                    if group:
                        new_user.sudo().write({"groups_id": [(4, group.id)]})
                    vals["user_id"] = new_user.id
                    _logger.info("Nouvel utilisateur créé : %s", new_user.login)
        except Exception as e:
            _logger.error("Erreur lors de la création/utilisateur: %s", e)

        # Étape 2 : créer la patiente
        record = super(SalametPatiente, self).create(vals)

        # Étape 3 : créer le contact res.partner
        try:
            partner_vals = record._prepare_partner_values()
            partner = self.env["res.partner"].sudo().create(partner_vals)
            record.partner_id = partner.id
            _logger.info("Contact créé pour %s", record.nom_complet)
        except Exception as e:
            _logger.error("Erreur création partenaire : %s", e)
            record.message_post(
                body=f"Le contact associé n'a pas pu être créé: {e}", message_type="comment", subtype_xmlid="mail.mt_comment"
            )

        # Notification
        if record.user_id:
            record.message_post(body=f"Utilisateur créé : {record.user_id.login}", message_type="notification", subtype_xmlid="mail.mt_comment")

        return record

    def write(self, vals):
        """Synchronisation avec res.partner et res.users lors des mises à jour."""
        result = super(SalametPatiente, self).write(vals)

        for record in self:
            # Synchroniser avec le contact associé
            if record.partner_id:
                partner_vals = {}
                partner_fields_mapping = {
                    "nom_complet": "name",
                    "telephone": "phone",
                    "email": "email",
                    "adresse": "street",
                    "profession": "function",
                }

                for field, partner_field in partner_fields_mapping.items():
                    if field in vals:
                        partner_vals[partner_field] = vals[field]

                if partner_vals:
                    try:
                        record.partner_id.sudo().write(partner_vals)
                    except Exception as e:
                        _logger.error("Erreur synchronisation partner: %s", e)

            # Synchroniser l'email avec l'utilisateur
            if "email" in vals and record.user_id:
                try:
                    record.user_id.sudo().write({"login": vals["email"], "email": vals["email"]})
                    _logger.info("Email utilisateur mis à jour : %s", vals["email"])
                except Exception as e:
                    _logger.error("Erreur mise à jour email utilisateur : %s", e)

        return result

    def unlink(self):
        """Supprime (optionnel) le contact et l'utilisateur associés à la suppression de la patiente."""
        partners_to_delete = self.mapped("partner_id")
        users_to_delete = self.mapped("user_id")

        result = super(SalametPatiente, self).unlink()

        if self._context.get("delete_partner", True):
            try:
                partners_to_delete.sudo().unlink()
            except Exception as e:
                _logger.error("Erreur suppression partners: %s", e)

        if self._context.get("delete_user", False):
            try:
                users_to_delete.sudo().unlink()
            except Exception as e:
                _logger.error("Erreur suppression users: %s", e)

        return result

    # -------------------- Utilitaires --------------------
    def _generate_secure_password(self):
        """Génère un mot de passe sécurisé aléatoire"""
        alphabet = string.ascii_letters + string.digits + "!@#$%"
        return "".join(secrets.choice(alphabet) for _ in range(12))

    def _prepare_partner_values(self):
        """Préparer les valeurs pour la création du partenaire res.partner"""
        categories = self._get_patiente_categories()
        return {
            "name": self.nom_complet or self.name,
            "is_company": False,
            "type": "contact",
            "phone": self.telephone or "",
            "mobile": self.telephone or "",
            "email": self.email or "",
            "street": self.adresse or "",
            "function": self.profession or "",
            "comment": (
                f"Patiente SALAMET\nDate de naissance: {self.date_naissance or 'Non renseignée'}\n"
                f"Âge: {self.age} ans\nGroupe sanguin: {self.groupe_sanguin or 'Non renseigné'}"
            ),
            "category_id": [(6, 0, categories.ids)],
        }

    def _get_patiente_categories(self):
        """Récupérer ou créer la catégorie de partenaire pour les patientes"""
        category_obj = self.env["res.partner.category"]
        category = category_obj.search([("name", "=", "Patientes SALAMET")], limit=1)
        if not category:
            category = category_obj.create({"name": "Patientes SALAMET", "color": 2})
        return category

    def _determiner_type_pathologie(self):
        """Détermine le type de pathologie selon les critères médicaux"""
        self.ensure_one()
        if not self.grossesse_actuelle_id:
            return "normale"

        grossesse = self.grossesse_actuelle_id
        if hasattr(grossesse, "type_pathologie_principale") and grossesse.type_pathologie_principale:
            return grossesse.type_pathologie_principale

        antecedents = (self.antecedents_medicaux or "").upper()
        if self.antecedent_hta_familial or "HTA" in antecedents:
            return "hta_gravidique"
        if self.antecedent_diabete_familial or "DIAB" in antecedents:
            return "diabete_gestationnel"
        if self.niveau_risque_global in ["eleve", "tres_eleve"]:
            return "preeclampsie"
        return "normale"

    # -------------------- Actions UI --------------------
    def action_view_grossesses(self):
        self.ensure_one()
        action = {
            "type": "ir.actions.act_window",
            "name": f"Grossesses de {self.nom_complet}",
            "res_model": "salamet.grossesse",
            "view_mode": "list,form",
            "domain": [("patiente_id", "=", self.id)],
            "context": {"default_patiente_id": self.id},
        }
        if self.nombre_grossesses == 1 and self.grossesse_ids:
            action.update({"view_mode": "form", "res_id": self.grossesse_ids[0].id})
        return action

    def action_view_accouchements(self):
        self.ensure_one()
        return {
            "type": "ir.actions.act_window",
            "name": f"Accouchements de {self.nom_complet}",
            "res_model": "salamet.accouchement",
            "view_mode": "list,form",
            "domain": [("patiente_id", "=", self.id)],
            "context": {"default_patiente_id": self.id},
        }

    def action_nouvelle_grossesse(self):
        self.ensure_one()
        return {
            "type": "ir.actions.act_window",
            "name": f"Nouvelle grossesse - {self.nom_complet}",
            "res_model": "salamet.grossesse",
            "view_mode": "form",
            "target": "new",
            "context": {
                "default_patiente_id": self.id,
                "default_medecin_ids": [(6, 0, self.medecin_ids.ids)] if self.medecin_ids else [],
                "default_poids_avant_grossesse": self.poids,
                "default_taille": self.taille,
            },
        }

    def action_nouveau_bilan_prenatal(self):
        self.ensure_one()
        if not self.grossesse_actuelle_id:
            raise ValidationError("Aucune grossesse en cours pour cette patiente.")
        return {
            "type": "ir.actions.act_window",
            "name": f"Nouveau bilan prénatal - {self.nom_complet}",
            "res_model": "salamet.bilan.prenatal",
            "view_mode": "form",
            "target": "new",
            "context": {
                "default_patiente_id": self.id,
                "default_grossesse_id": self.grossesse_actuelle_id.id,
            },
        }

    def action_generer_notifications(self):
        self.ensure_one()
        if not self.grossesse_actuelle_id:
            raise ValidationError("Aucune grossesse en cours pour générer les notifications.")

        type_pathologie = self._determiner_type_pathologie()
        try:
            notifications_creees = self.env["salamet.notification"].generer_notifications_grossesse_manuelle(
                self.grossesse_actuelle_id.id, type_pathologie
            )
            message = f"{notifications_creees} notification(s) générée(s) pour {self.nom_complet}"
            if type_pathologie != "normale":
                message += f" (Pathologie: {type_pathologie})"
            notification_type = "success"
        except Exception as e:
            message = f"Erreur lors de la génération: {e}"
            notification_type = "danger"

        return {
            "type": "ir.actions.client",
            "tag": "display_notification",
            "params": {"message": message, "type": notification_type, "sticky": False},
        }

    def action_open_related_partner(self):
        self.ensure_one()
        if not self.partner_id:
            raise ValidationError("Aucun contact associé à cette patiente.")
        return {
            "type": "ir.actions.act_window",
            "name": f"Contact: {self.partner_id.name}",
            "res_model": "res.partner",
            "res_id": self.partner_id.id,
            "view_mode": "form",
            "target": "current",
        }

    def action_create_partner_manually(self):
        self.ensure_one()
        if self.partner_id:
            raise ValidationError("Un contact est déjà associé à cette patiente.")
        partner_vals = self._prepare_partner_values()
        partner = self.env["res.partner"].create(partner_vals)
        self.partner_id = partner.id
        return {
            "type": "ir.actions.act_window",
            "name": "Contact créé",
            "res_model": "res.partner",
            "res_id": partner.id,
            "view_mode": "form",
            "target": "current",
            "context": {"form_view_initial_mode": "edit"},
        }

    def action_create_user_manually(self):
        self.ensure_one()
        if self.user_id:
            raise ValidationError("Un utilisateur est déjà associé à cette patiente.")
        if not self.email:
            raise ValidationError("Un email est requis pour créer un utilisateur.")

        existing_user = self.env["res.users"].sudo().search([("login", "=", self.email)], limit=1)
        if existing_user:
            self.write({"user_id": existing_user.id})
            return {
                "type": "ir.actions.client",
                "tag": "display_notification",
                "params": {"message": f"Utilisateur existant lié : {existing_user.login}", "type": "success"},
            }

        password = self._generate_secure_password()
        group = self.env.ref("salamet.group_salamet_patiente", raise_if_not_found=False)
        new_user = self.env["res.users"].sudo().create({
            "name": self.nom_complet or self.name,
            "login": self.email,
            "email": self.email,
            "password": password,
        })
        if group:
            new_user.sudo().write({"groups_id": [(4, group.id)]})

        self.write({"user_id": new_user.id})
        return {
            "type": "ir.actions.client",
            "tag": "display_notification",
            "params": {"message": f"Utilisateur créé : {new_user.login}\nMot de passe : {password}", "type": "success", "sticky": True},
        }

    def action_reset_user_password(self):
        self.ensure_one()
        if not self.user_id:
            raise ValidationError("Aucun utilisateur associé à cette patiente.")
        new_password = self._generate_secure_password()
        self.user_id.sudo().write({"password": new_password})
        return {
            "type": "ir.actions.client",
            "tag": "display_notification",
            "params": {"message": f"Mot de passe réinitialisé pour {self.user_id.login}\nNouveau mot de passe : {new_password}", "type": "success", "sticky": True},
        }

    # -------------------- Contraintes / validations --------------------
    @api.constrains("date_naissance")
    def _check_date_naissance(self):
        for record in self:
            if record.date_naissance and record.date_naissance > date.today():
                raise ValidationError("La date de naissance ne peut pas être dans le futur.")
            if record.date_naissance and record.age > 120:
                raise ValidationError("L'âge ne peut pas dépasser 120 ans.")

    @api.constrains("email", "email_mari")
    def _check_email_format(self):
        regex = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        for record in self:
            if record.email:
                if not re.match(regex, record.email):
                    raise ValidationError("Le format de l'email de la patiente n'est pas valide.")

                existing_patiente = self.search([("email", "=", record.email), ("id", "!=", record.id)])
                if existing_patiente:
                    raise ValidationError(f"Une patiente avec l'email {record.email} existe déjà.")

                existing_partner = self.env["res.partner"].search([
                    ("email", "=", record.email),
                    ("id", "!=", record.partner_id.id if record.partner_id else False),
                ])
                if existing_partner:
                    raise ValidationError(f"Un contact avec l'email {record.email} existe déjà dans les contacts.")

            if record.email_mari and not re.match(regex, record.email_mari):
                raise ValidationError("Le format de l'email du conjoint n'est pas valide.")

    @api.constrains("telephone")
    def _check_phone_format(self):
        for record in self:
            if record.telephone:
                phone_clean = re.sub(r"[^\d+]", "", record.telephone)
                if len(phone_clean) < 8:
                    raise ValidationError("Le numéro de téléphone doit contenir au moins 8 chiffres.")

                existing_patiente = self.search([("telephone", "=", record.telephone), ("id", "!=", record.id)])
                if existing_patiente:
                    raise ValidationError(f"Une patiente avec le téléphone {record.telephone} existe déjà.")

    @api.constrains("gestite", "parite", "avortements")
    def _check_gpa_coherence(self):
        for record in self:
            if record.gestite < (record.parite + record.avortements):
                raise ValidationError(
                    "La gestité doit être supérieure ou égale à la somme de la parité et des avortements."
                )

    @api.constrains("poids", "taille")
    def _check_mesures_physiques(self):
        for record in self:
            if record.poids and (record.poids < 30 or record.poids > 300):
                raise ValidationError("Le poids doit être compris entre 30 et 300 kg.")
            if record.taille and (record.taille < 100 or record.taille > 250):
                raise ValidationError("La taille doit être comprise entre 100 et 250 cm.")

    @api.constrains("consanguinite", "degre_consanguinite")
    def _check_consanguinite_coherence(self):
        for record in self:
            if record.consanguinite and not record.degre_consanguinite:
                raise ValidationError("Si il y a consanguinité, le degré doit être précisé.")
            if not record.consanguinite and record.degre_consanguinite:
                raise ValidationError(
                    "Le degré de consanguinité ne peut être renseigné que si la consanguinité est confirmée."
                )

    # -------------------- Affichage personnalisé --------------------
    def name_get(self):
        result = []
        for record in self:
            name_parts = [record.nom_complet or record.name]
            if record.age:
                name_parts.append(f"({record.age} ans)")
            if record.est_enceinte:
                name_parts.append("🤰")
            if record.consanguinite:
                if record.degre_consanguinite == "1er":
                    name_parts.append("⚠️")
                elif record.degre_consanguinite in ["2eme", "3eme"]:
                    name_parts.append("⚡")
            if record.partner_id:
                name_parts.append("👤")
            name = " ".join(name_parts)
            result.append((record.id, name))
        return result

    # -------------------- Onchange --------------------
    @api.onchange("nombre_grossesses", "nombre_accouchements")
    def _onchange_update_gpa(self):
        if self.nombre_grossesses > self.gestite:
            self.gestite = self.nombre_grossesses
        if self.nombre_accouchements > self.parite:
            self.parite = self.nombre_accouchements

    @api.onchange("consanguinite")
    def _onchange_consanguinite(self):
        if not self.consanguinite:
            self.degre_consanguinite = False


# -------------------- Modèle : Facteur de risque --------------------
class SalametFacteurRisque(models.Model):
    _name = "salamet.facteur.risque"
    _description = "Facteur de risque SALAMET"
    _order = "name"

    name = fields.Char(string="Nom du facteur", required=True)
    description = fields.Text(string="Description")
    niveau_risque = fields.Selection(
        [("1", "Faible (1)"), ("2", "Modéré (2)"), ("3", "Élevé (3)"), ("4", "Très élevé (4)")],
        string="Niveau de risque",
        default="1",
    )
    categorie = fields.Selection(
        [
            ("medical", "Médical"),
            ("obstetrical", "Obstétrical"),
            ("social", "Social"),
            ("familial", "Familial"),
            ("genetique", "Génétique"),
        ],
        string="Catégorie",
    )
    active = fields.Boolean(string="Actif", default=True)
