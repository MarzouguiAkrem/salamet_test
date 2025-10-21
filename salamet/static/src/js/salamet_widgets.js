odoo.define('salamet.widgets', function (require) {
    'use strict';

    var AbstractField = require('web.AbstractField');
    var BasicModel = require('web.BasicModel');
    var fieldRegistry = require('web.field_registry');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var QWeb = core.qweb;
    var _t = core._t;

    /**
     * Widget pour afficher le terme de grossesse avec indicateur visuel
     */
    var TermeGrossesseWidget = AbstractField.extend({
        className: 'o_field_terme_grossesse',
        supportedFieldTypes: ['float'],

        _render: function() {
            var terme = this.value || 0;
            var semaines = Math.floor(terme);
            var jours = Math.round((terme - semaines) * 7);

            var couleur = this._getCouleurTerme(terme);
            var phase = this._getPhaseGrossesse(terme);

            this.$el.html(QWeb.render('salamet.terme_grossesse_widget', {
                terme: terme,
                semaines: semaines,
                jours: jours,
                couleur: couleur,
                phase: phase,
                pourcentage: Math.min((terme / 40) * 100, 100)
            }));
        },

        _getCouleurTerme: function(terme) {
            if (terme < 22) return 'danger';
            if (terme < 28) return 'warning';
            if (terme < 37) return 'info';
            if (terme <= 42) return 'success';
            return 'danger';
        },

        _getPhaseGrossesse: function(terme) {
            if (terme < 14) return 'Premier trimestre';
            if (terme < 28) return 'Deuxième trimestre';
            if (terme < 37) return 'Troisième trimestre';
            if (terme <= 42) return 'À terme';
            return 'Post-terme';
        }
    });

    /**
     * Widget pour afficher le niveau de risque avec indicateurs visuels
     */
    var NiveauRisqueWidget = AbstractField.extend({
        className: 'o_field_niveau_risque',
        supportedFieldTypes: ['selection'],

        _render: function() {
            var niveau = this.value || 'faible';
            var config = this._getConfigRisque(niveau);

            this.$el.html(QWeb.render('salamet.niveau_risque_widget', {
                niveau: niveau,
                label: config.label,
                couleur: config.couleur,
                icone: config.icone,
                description: config.description
            }));
        },

        _getConfigRisque: function(niveau) {
            var configs = {
                'faible': {
                    label: 'Risque Faible',
                    couleur: 'success',
                    icone: '✅',
                    description: 'Grossesse normale'
                },
                'modere': {
                    label: 'Risque Modéré',
                    couleur: 'warning',
                    icone: '⚠️',
                    description: 'Surveillance renforcée'
                },
                'eleve': {
                    label: 'Risque Élevé',
                    couleur: 'danger',
                    icone: '🚨',
                    description: 'Suivi spécialisé requis'
                },
                'critique': {
                    label: 'Risque Critique',
                    couleur: 'danger',
                    icone: '🆘',
                    description: 'Urgence médicale'
                }
            };
            return configs[niveau] || configs['faible'];
        }
    });

    /**
     * Widget pour afficher les notifications avec compteur
     */
    var NotificationCounterWidget = AbstractField.extend({
        className: 'o_field_notification_counter',
        supportedFieldTypes: ['integer'],

        init: function() {
            this._super.apply(this, arguments);
            this.notifications = [];
        },

        start: function() {
            var self = this;
            return this._super().then(function() {
                self._loadNotifications();
                // Actualiser toutes les 30 secondes
                setInterval(function() {
                    self._loadNotifications();
                }, 30000);
            });
        },

        _loadNotifications: function() {
            var self = this;
            if (this.recordData && this.recordData.id) {
                rpc.query({
                    model: 'salamet.notification',
                    method: 'search_read',
                    args: [[
                        ['patiente_id', '=', this.recordData.id],
                        ['state', '=', 'active'],
                        ['priorite', 'in', ['haute', 'critique']]
                    ]],
                    fields: ['titre', 'priorite', 'type_notification']
                }).then(function(notifications) {
                    self.notifications = notifications;
                    self._render();
                });
            }
        },

        _render: function() {
            var count = this.notifications.length;
            var critiques = this.notifications.filter(n => n.priorite === 'critique').length;

            this.$el.html(QWeb.render('salamet.notification_counter_widget', {
                count: count,
                critiques: critiques,
                notifications: this.notifications
            }));

            // Ajouter les événements
            this.$('.notification-item').on('click', this._onNotificationClick.bind(this));
        },

        _onNotificationClick: function(event) {
            var notifId = $(event.currentTarget).data('notification-id');
            this.do_action({
                type: 'ir.actions.act_window',
                res_model: 'salamet.notification',
                res_id: notifId,
                view_mode: 'form',
                target: 'current'
            });
        }
    });

    /**
     * Widget pour le calendrier des consultations
     */
    var CalendrierConsultationsWidget = AbstractField.extend({
        className: 'o_field_calendrier_consultations',

        init: function() {
            this._super.apply(this, arguments);
            this.consultations = [];
        },

        start: function() {
            var self = this;
            return this._super().then(function() {
                self._loadConsultations();
                self._initCalendrier();
            });
        },

        _loadConsultations: function() {
            var self = this;
            if (this.recordData && this.recordData.id) {
                rpc.query({
                    model: 'salamet.consultation',
                    method: 'search_read',
                    args: [[
                        ['grossesse_id', '=', this.recordData.id]
                    ]],
                    fields: ['date_consultation', 'type_consultation', 'medecin_id', 'urgence']
                }).then(function(consultations) {
                    self.consultations = consultations;
                    self._renderCalendrier();
                });
            }
        },

        _initCalendrier: function() {
            this.$el.html('<div class="calendrier-container"></div>');
        },

        _renderCalendrier: function() {
            var $container = this.$('.calendrier-container');
            $container.html(QWeb.render('salamet.calendrier_consultations_widget', {
                consultations: this.consultations
            }));
        }
    });

    /**
     * Widget pour les graphiques de suivi
     */
    var GraphiqueSuiviWidget = AbstractField.extend({
        className: 'o_field_graphique_suivi',

        init: function() {
            this._super.apply(this, arguments);
            this.donneesSuivi = [];
        },

        start: function() {
            var self = this;
            return this._super().then(function() {
                self._loadDonneesSuivi();
            });
        },

        _loadDonneesSuivi: function() {
            var self = this;
            if (this.recordData && this.recordData.id) {
                rpc.query({
                    model: 'salamet.consultation',
                    method: 'get_donnees_suivi_graphique',
                    args: [this.recordData.id]
                }).then(function(donnees) {
                    self.donneesSuivi = donnees;
                    self._renderGraphique();
                });
            }
        },

        _renderGraphique: function() {
            if (typeof Chart === 'undefined') {
                this.$el.html('<div class="alert alert-warning">Chart.js non disponible</div>');
                return;
            }

            this.$el.html('<canvas id="graphique-suivi-' + this.recordData.id + '" width="400" height="200"></canvas>');

            var ctx = this.$('canvas')[0].getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: this.donneesSuivi.map(d => d.date),
                    datasets: [{
                        label: 'Poids (kg)',
                        data: this.donneesSuivi.map(d => d.poids),
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        yAxisID: 'y'
                    }, {
                        label: 'Tension systolique',
                        data: this.donneesSuivi.map(d => d.tension_systolique),
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        yAxisID: 'y1'
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: {
                                drawOnChartArea: false,
                            },
                        }
                    }
                }
            });
        }
    });

    /**
     * Widget pour l'alerte de retard de consultation
     */
    var AlerteRetardWidget = AbstractField.extend({
        className: 'o_field_alerte_retard',

        _render: function() {
            var self = this;
            if (this.recordData && this.recordData.id) {
                rpc.query({
                    model: 'salamet.grossesse',
                    method: 'check_retard_consultation',
                    args: [this.recordData.id]
                }).then(function(retard) {
                    if (retard.en_retard) {
                        self.$el.html(QWeb.render('salamet.alerte_retard_widget', {
                            jours_retard: retard.jours_retard,
                            derniere_consultation: retard.derniere_consultation,
                            prochaine_prevue: retard.prochaine_prevue
                        }));
                    } else {
                        self.$el.empty();
                    }
                });
            }
        }
    });

    /**
     * Widget pour les recommandations automatiques
     */
    var RecommandationsWidget = AbstractField.extend({
        className: 'o_field_recommandations',

        _render: function() {
            var self = this;
            if (this.recordData && this.recordData.id) {
                rpc.query({
                    model: 'salamet.grossesse',
                    method: 'get_recommandations_automatiques',
                    args: [this.recordData.id]
                }).then(function(recommandations) {
                    self.$el.html(QWeb.render('salamet.recommandations_widget', {
                        recommandations: recommandations
                    }));
                });
            }
        }
    });

    // Enregistrer les widgets
    fieldRegistry.add('terme_grossesse', TermeGrossesseWidget);
    fieldRegistry.add('niveau_risque', NiveauRisqueWidget);
    fieldRegistry.add('notification_counter', NotificationCounterWidget);
    fieldRegistry.add('calendrier_consultations', CalendrierConsultationsWidget);
    fieldRegistry.add('graphique_suivi', GraphiqueSuiviWidget);
    fieldRegistry.add('alerte_retard', AlerteRetardWidget);
    fieldRegistry.add('recommandations', RecommandationsWidget);

    return {
        TermeGrossesseWidget: TermeGrossesseWidget,
        NiveauRisqueWidget: NiveauRisqueWidget,
        NotificationCounterWidget: NotificationCounterWidget,
        CalendrierConsultationsWidget: CalendrierConsultationsWidget,
        GraphiqueSuiviWidget: GraphiqueSuiviWidget,
        AlerteRetardWidget: AlerteRetardWidget,
        RecommandationsWidget: RecommandationsWidget
    };
});

// Templates QWeb pour les widgets
odoo.define('salamet.widget_templates', function (require) {
    'use strict';

    var core = require('web.core');
    var QWeb = core.qweb;

    QWeb.add_template(`
        <templates>
            <!-- Template pour le widget terme de grossesse -->
            <t t-name="salamet.terme_grossesse_widget">
                <div class="terme-grossesse-container">
                    <div class="terme-display">
                        <span class="terme-value">
                            <t t-esc="semaines"/>SA + <t t-esc="jours"/>j
                        </span>
                        <span t-attf-class="badge badge-#{couleur} ml-2">
                            <t t-esc="phase"/>
                        </span>
                    </div>
                    <div class="progress mt-2" style="height: 8px;">
                        <div t-attf-class="progress-bar bg-#{couleur}"
                             t-attf-style="width: #{pourcentage}%"
                             role="progressbar">
                        </div>
                    </div>
                    <small class="text-muted">
                        <t t-esc="terme"/> / 40 SA
                    </small>
                </div>
            </t>

            <!-- Template pour le widget niveau de risque -->
            <t t-name="salamet.niveau_risque_widget">
                <div class="niveau-risque-container">
                    <span t-attf-class="badge badge-#{couleur} badge-lg">
                        <t t-esc="icone"/> <t t-esc="label"/>
                    </span>
                    <div class="mt-1">
                        <small class="text-muted">
                            <t t-esc="description"/>
                        </small>
                    </div>
                </div>
            </t>

            <!-- Template pour le compteur de notifications -->
            <t t-name="salamet.notification_counter_widget">
                <div class="notification-counter-container">
                    <t t-if="count > 0">
                        <div class="notification-summary">
                            <span class="badge badge-warning">
                                <i class="fa fa-bell"></i> <t t-esc="count"/>
                            </span>
                            <t t-if="critiques > 0">
                                <span class="badge badge-danger ml-1">
                                    <i class="fa fa-exclamation-triangle"></i> <t t-esc="critiques"/>
                                </span>
                            </t>
                        </div>
                        <div class="notification-list mt-2">
                            <t t-foreach="notifications" t-as="notif">
                                <div class="notification-item" t-att-data-notification-id="notif.id">
                                    <small t-attf-class="text-#{notif.priorite === 'critique' ? 'danger' : 'warning'}">
                                        <i class="fa fa-bell"></i> <t t-esc="notif.titre"/>
                                    </small>
                                </div>
                            </t>
                        </div>
                    </t>
                    <t t-else="">
                        <span class="badge badge-success">
                            <i class="fa fa-check"></i> Aucune alerte
                        </span>
                    </t>
                </div>
            </t>

            <!-- Template pour le calendrier des consultations -->
            <t t-name="salamet.calendrier_consultations_widget">
                <div class="calendrier-consultations">
                    <h6>Consultations programmées</h6>
                    <t t-if="consultations.length > 0">
                        <div class="consultation-list">
                            <t t-foreach="consultations" t-as="consult">
                                <div t-attf-class="consultation-item #{consult.urgence ? 'urgent' : ''}">
                                    <div class="date">
                                        <t t-esc="consult.date_consultation"/>
                                    </div>
                                    <div class="type">
                                        <t t-esc="consult.type_consultation"/>
                                    </div>
                                    <div class="medecin">
                                        Dr. <t t-esc="consult.medecin_id[1]"/>
                                    </div>
                                </div>
                            </t>
                        </div>
                    </t>
                    <t t-else="">
                        <p class="text-muted">Aucune consultation programmée</p>
                    </t>
                </div>
            </t>

            <!-- Template pour l'alerte de retard -->
            <t t-name="salamet.alerte_retard_widget">
                <div class="alert alert-warning">
                    <i class="fa fa-clock-o"></i>
                    <strong>Retard de consultation !</strong>
                    <br/>
                    <small>
                        Dernière consultation : <t t-esc="derniere_consultation"/>
                        (<t t-esc="jours_retard"/> jours de retard)
                    </small>
                </div>
            </t>

            <!-- Template pour les recommandations -->
            <t t-name="salamet.recommandations_widget">
                <div class="recommandations-container">
                    <h6><i class="fa fa-lightbulb-o"></i> Recommandations</h6>
                    <t t-if="recommandations.length > 0">
                        <ul class="list-unstyled">
                            <t t-foreach="recommandations" t-as="reco">
                                <li class="mb-2">
                                    <span t-attf-class="badge badge-#{reco.priorite}">
                                        <t t-esc="reco.type"/>
                                    </span>
                                    <span class="ml-2">
                                        <t t-esc="reco.message"/>
                                    </span>
                                </li>
                            </t>
                        </ul>
                    </t>
                    <t t-else="">
                        <p class="text-muted">Aucune recommandation particulière</p>
                    </t>
                </div>
            </t>
        </templates>
    `);
});
