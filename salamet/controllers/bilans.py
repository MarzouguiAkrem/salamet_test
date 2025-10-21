# -*- coding: utf-8 -*-

from odoo import http
from odoo.http import request
from odoo.exceptions import ValidationError, AccessError
from datetime import datetime, timedelta
import json
import logging

_logger = logging.getLogger(__name__)


class SalametBilansController(http.Controller):
    """Contrôleur pour la gestion des bilans SALAMET"""

    @http.route('/salamet/bilans', type='http', auth='user', website=True)
    def liste_bilans(self, **kwargs):
        """Page de liste des bilans"""
        try:
            self._check_access()
            
            # Filtres
            filter_type = kwargs.get('type', '')
            filter_periode = kwargs.get('periode', 'mois')
            filter_date_debut = kwargs.get('date_debut', '')
            filter_date_fin = kwargs.get('date_fin', '')
            
            # Calculer les dates par défaut selon la période
            if not filter_date_debut or not filter_date_fin:
                date_fin = datetime.now().date()
                if filter_periode == 'semaine':
                    date_debut = date_fin - timedelta(days=7)
                elif filter_periode == 'trimestre':
                    date_debut = date_fin - timedelta(days=90)
                elif filter_periode == 'annee':
                    date_debut = date_fin - timedelta(days=365)
                else:  # mois par défaut
                    date_debut = date_fin - timedelta(days=30)
            else:
                date_debut = datetime.strptime(filter_date_debut, '%Y-%m-%d').date()
                date_fin = datetime.strptime(filter_date_fin, '%Y-%m-%d').date()

            # Générer les statistiques selon le type de bilan
            if filter_type == 'patientes':
                stats = self._generer_bilan_patientes(date_debut, date_fin)
                template = 'salamet.bilan_patientes_template'
            elif filter_type == 'grossesses':
                stats = self._generer_bilan_grossesses(date_debut, date_fin)
                template = 'salamet.bilan_grossesses_template'
            elif filter_type == 'consultations':
                stats = self._generer_bilan_consultations(date_debut, date_fin)
                template = 'salamet.bilan_consultations_template'
            elif filter_type == 'vaccinations':
                stats = self._generer_bilan_vaccinations(date_debut, date_fin)
                template = 'salamet.bilan_vaccinations_template'
            else:
                stats = self._generer_bilan_general(date_debut, date_fin)
                template = 'salamet.bilan_general_template'

            return request.render(template, {
                'stats': stats,
                'date_debut': date_debut,
                'date_fin': date_fin,
                'filter_type': filter_type,
                'filter_periode': filter_periode
            })

        except Exception as e:
            _logger.error(f"Erreur liste bilans: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors du chargement des bilans'})

    @http.route('/salamet/bilan/export/<string:type_bilan>', type='http', auth='user')
    def exporter_bilan(self, type_bilan, **kwargs):
        """Exporter un bilan en PDF ou Excel"""
        try:
            self._check_access()
            
            format_export = kwargs.get('format', 'pdf')
            date_debut = datetime.strptime(kwargs.get('date_debut'), '%Y-%m-%d').date()
            date_fin = datetime.strptime(kwargs.get('date_fin'), '%Y-%m-%d').date()

            # Générer les données selon le type
            if type_bilan == 'patientes':
                data = self._generer_bilan_patientes(date_debut, date_fin)
            elif type_bilan == 'grossesses':
                data = self._generer_bilan_grossesses(date_debut, date_fin)
            elif type_bilan == 'consultations':
                data = self._generer_bilan_consultations(date_debut, date_fin)
            elif type_bilan == 'vaccinations':
                data = self._generer_bilan_vaccinations(date_debut, date_fin)
            else:
                data = self._generer_bilan_general(date_debut, date_fin)

            if format_export == 'excel':
                return self._export_excel(type_bilan, data, date_debut, date_fin)
            else:
                return self._export_pdf(type_bilan, data, date_debut, date_fin)

        except Exception as e:
            _logger.error(f"Erreur export bilan {type_bilan}: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors de l\'export du bilan'})

    @http.route('/salamet/bilan/dashboard', type='http', auth='user', website=True)
    def dashboard_bilans(self, **kwargs):
        """Dashboard des bilans avec graphiques"""
        try:
            self._check_access()
            
            # Statistiques pour les 12 derniers mois
            stats_mensuelles = self._generer_stats_mensuelles()
            
            # Statistiques actuelles
            stats_actuelles = self._generer_stats_actuelles()
            
            # Alertes et indicateurs
            alertes = self._generer_alertes()

            return request.render('salamet.dashboard_bilans_template', {
                'stats_mensuelles': stats_mensuelles,
                'stats_actuelles': stats_actuelles,
                'alertes': alertes
            })

        except Exception as e:
            _logger.error(f"Erreur dashboard bilans: {str(e)}")
            return request.render('salamet.error_template',
                                {'error': 'Erreur lors du chargement du dashboard'})

    def _generer_bilan_patientes(self, date_debut, date_fin):
        """Générer le bilan des patientes"""
        domain_periode = [
            ('create_date', '>=', date_debut.strftime('%Y-%m-%d')),
            ('create_date', '<=', date_fin.strftime('%Y-%m-%d 23:59:59'))
        ]

        # Statistiques générales
        nouvelles_patientes = request.env['salamet.patiente'].search_count(domain_periode)
        total_patientes = request.env['salamet.patiente'].search_count([])
        
        # Répartition par âge
        patientes = request.env['salamet.patiente'].search([])
        repartition_age = {
            '0-17': 0, '18-25': 0, '26-35': 0, '36-45': 0, '45+': 0
        }
        
        for patiente in patientes:
            age = patiente.age
            if age < 18:
                repartition_age['0-17'] += 1
            elif age <= 25:
                repartition_age['18-25'] += 1
            elif age <= 35:
                repartition_age['26-35'] += 1
            elif age <= 45:
                repartition_age['36-45'] += 1
            else:
                repartition_age['45+'] += 1

        # Répartition par commune
        repartition_commune = {}
        for patiente in patientes:
            commune = patiente.commune or 'Non spécifiée'
            repartition_commune[commune] = repartition_commune.get(commune, 0) + 1

        return {
            'nouvelles_patientes': nouvelles_patientes,
            'total_patientes': total_patientes,
            'repartition_age': repartition_age,
            'repartition_commune': dict(sorted(repartition_commune.items(), key=lambda x: x[1], reverse=True)[:10])
        }

    def _generer_bilan_grossesses(self, date_debut, date_fin):
        """Générer le bilan des grossesses"""
        domain_periode = [
            ('date_debut', '>=', date_debut),
            ('date_debut', '<=', date_fin)
        ]

        # Statistiques générales
        nouvelles_grossesses = request.env['salamet.grossesse'].search_count(domain_periode)
        grossesses_en_cours = request.env['salamet.grossesse'].search_count([('state', '=', 'en_cours')])
        grossesses_terminees = request.env['salamet.grossesse'].search_count([
            ('state', '=', 'terminee'),
            ('date_accouchement', '>=', date_debut),
            ('date_accouchement', '<=', date_fin)
        ])

        # Répartition par niveau de risque
        repartition_risque = {}
        grossesses = request.env['salamet.grossesse'].search(domain_periode)
        for grossesse in grossesses:
            risque = grossesse.niveau_risque
            repartition_risque[risque] = repartition_risque.get(risque, 0) + 1

        # Issues des grossesses terminées
        grossesses_terminees_obj = request.env['salamet.grossesse'].search([
            ('state', '=', 'terminee'),
            ('date_accouchement', '>=', date_debut),
            ('date_accouchement', '<=', date_fin)
        ])
        
        issues_grossesses = {}
        types_accouchement = {}
        for grossesse in grossesses_terminees_obj:
            # Issues
            issue = grossesse.issue_grossesse or 'Non spécifiée'
            issues_grossesses[issue] = issues_grossesses.get(issue, 0) + 1
            
            # Types d'accouchement
            type_acc = grossesse.type_accouchement or 'Non spécifié'
            types_accouchement[type_acc] = types_accouchement.get(type_acc, 0) + 1

        return {
            'nouvelles_grossesses': nouvelles_grossesses,
            'grossesses_en_cours': grossesses_en_cours,
            'grossesses_terminees': grossesses_terminees,
            'repartition_risque': repartition_risque,
            'issues_grossesses': issues_grossesses,
            'types_accouchement': types_accouchement
        }

    def _generer_bilan_consultations(self, date_debut, date_fin):
        """Générer le bilan des consultations"""
        domain_periode = [
            ('date_consultation', '>=', date_debut),
            ('date_consultation', '<=', date_fin)
        ]

        consultations = request.env['salamet.consultation'].search(domain_periode)
        total_consultations = len(consultations)

        # Répartition par type
        repartition_type = {}
        for consultation in consultations:
            type_cons = consultation.type_consultation or 'Consultation générale'
            repartition_type[type_cons] = repartition_type.get(type_cons, 0) + 1

        # Consultations par semaine de grossesse
        consultations_par_semaine = {}
        for consultation in consultations:
            semaine = consultation.semaine_grossesse
            if semaine:
                consultations_par_semaine[semaine] = consultations_par_semaine.get(semaine, 0) + 1

        # Moyennes des paramètres vitaux
        poids_total = sum([c.poids for c in consultations if c.poids])
        poids_moyen = poids_total / len([c for c in consultations if c.poids]) if consultations else 0

        tension_sys_total = sum([c.tension_systolique for c in consultations if c.tension_systolique])
        tension_sys_moyenne = tension_sys_total / len([c for c in consultations if c.tension_systolique]) if consultations else 0

        return {
            'total_consultations': total_consultations,
            'repartition_type': repartition_type,
            'consultations_par_semaine': dict(sorted(consultations_par_semaine.items())),
            'poids_moyen': round(poids_moyen, 1),
            'tension_sys_moyenne': round(tension_sys_moyenne, 1)
        }

    def _generer_bilan_vaccinations(self, date_debut, date_fin):
        """Générer le bilan des vaccinations"""
        domain_periode = [
            ('date_vaccination', '>=', date_debut),
            ('date_vaccination', '<=', date_fin)
        ]

        vaccinations = request.env['salamet.vaccination'].search(domain_periode)
        total_vaccinations = len(vaccinations)

        # Répartition par type de vaccin
        repartition_vaccin = {}
        for vaccination in vaccinations:
            vaccin = vaccination.type_vaccin
            repartition_vaccin[vaccin] = repartition_vaccin.get(vaccin, 0) + 1

        # Couverture vaccinale
        patientes_vaccinees = len(set([v.patiente_id.id for v in vaccinations]))
        total_patientes = request.env['salamet.patiente'].search_count([])
        taux_couverture = (patientes_vaccinees / total_patientes * 100) if total_patientes else 0

        # Vaccinations en retard
        vaccinations_retard = request.env['salamet.vaccination'].search([
            ('date_prevue', '<', datetime.now().date()),
            ('state', '=', 'planifie')
        ])

        return {
            'total_vaccinations': total_vaccinations,
            'repartition_vaccin': repartition_vaccin,
            'patientes_vaccinees': patientes_vaccinees,
            'taux_couverture': round(taux_couverture, 1),
            'vaccinations_retard': len(vaccinations_retard)
        }

    def _generer_bilan_general(self, date_debut, date_fin):
        """Générer le bilan général"""
        return {
            'patientes': self._generer_bilan_patientes(date_debut, date_fin),
            'grossesses': self._generer_bilan_grossesses(date_debut, date_fin),
            'consultations': self._generer_bilan_consultations(date_debut, date_fin),
            'vaccinations': self._generer_bilan_vaccinations(date_debut, date_fin)
        }

    def _generer_stats_mensuelles(self):
        """Générer les statistiques des 12 derniers mois"""
        stats = []
        for i in range(12):
            date_fin = datetime.now().replace(day=1) - timedelta(days=1)
            date_debut = (date_fin.replace(day=1) - timedelta(days=30*i)).replace(day=1)
            date_fin = (date_debut + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            stats.append({
                'mois': date_debut.strftime('%Y-%m'),
                'patientes': request.env['salamet.patiente'].search_count([
                    ('create_date', '>=', date_debut.strftime('%Y-%m-%d')),
                    ('create_date', '<=', date_fin.strftime('%Y-%m-%d 23:59:59'))
                ]),
                'grossesses': request.env['salamet.grossesse'].search_count([
                    ('date_debut', '>=', date_debut),
                    ('date_debut', '<=', date_fin)
                ]),
                'consultations': request.env['salamet.consultation'].search_count([
                    ('date_consultation', '>=', date_debut),
                    ('date_consultation', '<=', date_fin)
                ])
            })
        
        return list(reversed(stats))

    def _generer_stats_actuelles(self):
        """Générer les statistiques actuelles"""
        return {
            'total_patientes': request.env['salamet.patiente'].search_count([]),
            'grossesses_en_cours': request.env['salamet.grossesse'].search_count([('state', '=', 'en_cours')]),
            'consultations_mois': request.env['salamet.consultation'].search_count([
                ('date_consultation', '>=', datetime.now().replace(day=1).strftime('%Y-%m-%d'))
            ]),
            'vaccinations_retard': request.env['salamet.vaccination'].search_count([
                ('date_prevue', '<', datetime.now().date()),
                ('state', '=', 'planifie')
            ])
        }

    def _generer_alertes(self):
        """Générer les alertes"""
        alertes = []
        
        # Grossesses à risque
        grossesses_risque = request.env['salamet.grossesse'].search_count([
            ('niveau_risque', 'in', ['moyen', 'eleve']),
            ('state', '=', 'en_cours')
        ])
        if grossesses_risque > 0:
            alertes.append({
                'type': 'warning',
                'message': f"{grossesses_risque} grossesse(s) à risque nécessitent un suivi particulier"
            })

        # Vaccinations en retard
        vaccinations_retard = request.env['salamet.vaccination'].search_count([
            ('date_prevue', '<', datetime.now().date()),
            ('state', '=', 'planifie')
        ])
        if vaccinations_retard > 0:
            alertes.append({
                'type': 'danger',
                'message': f"{vaccinations_retard} vaccination(s) en retard"
            })

        return alertes

    def _export_pdf(self, type_bilan, data, date_debut, date_fin):
        """Exporter en PDF"""
        # Implémentation de l'export PDF
        pass

    def _export_excel(self, type_bilan, data, date_debut, date_fin):
        """Exporter en Excel"""
        # Implémentation de l'export Excel
        pass

    def _check_access(self):
        """Vérifier les droits d'accès"""
        if not request.env.user.has_group('salamet.group_salamet_manager'):
            raise AccessError("Accès non autorisé - Droits administrateur requis")
