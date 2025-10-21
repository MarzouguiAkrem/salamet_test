# -*- coding: utf-8 -*-
{
    'name': 'SALAMET - Surveillance et Alerte Maternité',
    'version': '18.0.1.0.0',
    'category': 'Healthcare',
    'summary': 'Système de surveillance et d\'alerte pour le suivi des grossesses à risque',
    'description': '''
        SALAMET (Surveillance et ALerte MATernité)
        ==========================================

        Système complet de surveillance et d'alerte pour le suivi des grossesses à risque.

        Fonctionnalités principales :
        • 🤱 Gestion complète des grossesses
        • 🩺 Suivi des consultations prénatales
        • 🧪 Gestion des bilans prénataux
        • 🔔 Système de notifications intelligentes
        • 📊 Tableau de bord en temps réel
        • 🚨 Alertes automatiques
        • 📈 Analyses et rapports

        Conçu pour améliorer la qualité du suivi prénatal et réduire les risques maternels et fœtaux.
    ''',
    'author': 'Équipe SALAMET',
    'website': 'https://salamet.health',
    'license': 'LGPL-3',
    'depends': [
        'base',
        'web',
        'mail',
        'calendar',
        'hr',
        'contacts',
    ],
    'data': [
        # Sécurité
        'security/salamet_security.xml',
        'security/ir.model.access.csv',

        # Données de base
        'data/salamet_data.xml',
        'data/salamet_cron.xml',

        # Vues
        'views/salamet_patiente_views.xml',
        'views/salamet_grossesse_views.xml',
        'views/salamet_medecin_views.xml',
        'views/salamet_consultation_views.xml',
        'views/salamet_bilan_prenatal_views.xml',
        'views/salamet_notification_views.xml',
        'views/salamet_dashboard_views.xml',
        'views/salamet_actions.xml',
        'views/salamet_accouchement_views.xml',

        # Menus
        'views/salamet_menus.xml',

        # Rapports
        'reports/salamet_reports.xml',

        # Wizards
        'wizard/salamet_wizard_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'salamet/static/src/css/salamet_dashboard.css',
            'salamet/static/src/js/salamet_dashboard.js',
        ],
        'web.assets_frontend': [
            'salamet/static/src/css/salamet_frontend.css',
        ],
    },
    'demo': [
        
    ],
    'images': [
        'static/description/banner.png',
        'static/description/icon.png',
    ],
    'installable': True,
    'auto_install': False,
    'application': True,
}
