odoo.define('salamet.dashboard', function (require) {
    'use strict';

    var AbstractAction = require('web.AbstractAction');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var QWeb = core.qweb;

    var SalametDashboard = AbstractAction.extend({
        template: 'salamet_dashboard_template',

        init: function(parent, action) {
            this._super(parent, action);
            this.dashboardData = {};
        },

        start: function() {
            var self = this;
            return this._super().then(function() {
                self.loadDashboardData();
                self.setupAutoRefresh();
                self.updateCurrentDate();
            });
        },

        loadDashboardData: function() {
            var self = this;
            return rpc.query({
                model: 'salamet.dashboard',
                method: 'get_dashboard_data',
            }).then(function(data) {
                self.dashboardData = data;
                self.renderDashboard();
            });
        },

        renderDashboard: function() {
            this.renderKPIs();
            this.renderNotificationsUrgentes();
            this.renderConsultationsJour();
            this.renderGrossessesRisque();
            this.renderCharts();
        },

        renderKPIs: function() {
            var $container = this.$('#kpis-container');
            $container.empty();

            var kpis = this.dashboardData.kpis;
            for (var key in kpis) {
                var kpi = kpis[key];
                var $kpiCard = $(`
                    <div class="col-md-3 mb-3">
                        <div class="card border-${kpi.color}">
                            <div class="card-body text-center">
                                <div class="kpi-icon" style="font-size: 2rem;">${kpi.icon}</div>
                                <div class="kpi-value" style="font-size: 2rem; font-weight: bold; color: var(--bs-${kpi.color});">
                                    ${kpi.value}
                                </div>
                                <div class="kpi-label text-muted">${kpi.label}</div>
                            </div>
                        </div>
                    </div>
                `);
                $container.append($kpiCard);
            }
        },

        renderNotificationsUrgentes: function() {
            var $container = this.$('#notifications-urgentes');
            $container.empty();

            var notifications = this.dashboardData.notifications;
            if (notifications.length === 0) {
                $container.append('<div class="list-group-item text-center text-muted">Aucune notification urgente</div>');
                return;
            }

            notifications.forEach(function(notif) {
                var prioriteClass = notif.priorite === 'critique' ? 'danger' : 'warning';
                                var retardBadge = notif.en_retard ? '<span class="badge badge-danger ml-2">⏰ En retard</span>' : '';

                var $notifItem = $(`
                    <div class="list-group-item list-group-item-action border-${prioriteClass}">
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1">
                                <span class="badge badge-${prioriteClass}">${notif.priorite === 'critique' ? '🚨' : '⚠️'}</span>
                                ${notif.patiente}
                                ${retardBadge}
                            </h6>
                            <small>${notif.date_prevue}</small>
                        </div>
                        <p class="mb-1">${notif.titre}</p>
                        <small class="text-muted">${notif.type}</small>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-primary" onclick="salamet.dashboard.ouvrirNotification(${notif.id})">
                                Voir
                            </button>
                        </div>
                    </div>
                `);
                $container.append($notifItem);
            });
        },

        renderConsultationsJour: function() {
            var $container = this.$('#consultations-jour');
            $container.empty();

            var consultations = this.dashboardData.consultations_jour;
            if (consultations.length === 0) {
                $container.append('<div class="list-group-item text-center text-muted">Aucune consultation prévue</div>');
                return;
            }

            consultations.forEach(function(consult) {
                var alerteClass = '';
                var alerteBadge = '';

                if (consult.urgence) {
                    alerteClass = 'border-danger';
                    alerteBadge = '<span class="badge badge-danger">🚨 Urgence</span>';
                } else if (consult.niveau_alerte === 'haute') {
                    alerteClass = 'border-warning';
                    alerteBadge = '<span class="badge badge-warning">⚠️ Alerte</span>';
                }

                var $consultItem = $(`
                    <div class="list-group-item list-group-item-action ${alerteClass}">
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1">
                                ${consult.heure} - ${consult.patiente}
                                ${alerteBadge}
                            </h6>
                            <small>${consult.terme}</small>
                        </div>
                        <p class="mb-1">${consult.type}</p>
                        <small class="text-muted">Dr. ${consult.medecin}</small>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-primary" onclick="salamet.dashboard.ouvrirConsultation(${consult.id})">
                                Ouvrir
                            </button>
                        </div>
                    </div>
                `);
                $container.append($consultItem);
            });
        },

        renderGrossessesRisque: function() {
            var $tbody = this.$('#grossesses-risque tbody');
            $tbody.empty();

            var grossesses = this.dashboardData.grossesses_risque;
            if (grossesses.length === 0) {
                $tbody.append('<tr><td colspan="7" class="text-center text-muted">Aucune grossesse à risque</td></tr>');
                return;
            }

            grossesses.forEach(function(grossesse) {
                var niveauBadge = '';
                switch(grossesse.niveau_risque) {
                    case 'critique':
                        niveauBadge = '<span class="badge badge-danger">Critique</span>';
                        break;
                    case 'eleve':
                        niveauBadge = '<span class="badge badge-warning">Élevé</span>';
                        break;
                    case 'modere':
                        niveauBadge = '<span class="badge badge-info">Modéré</span>';
                        break;
                    default:
                        niveauBadge = '<span class="badge badge-secondary">Normal</span>';
                }

                var $row = $(`
                    <tr>
                        <td><strong>${grossesse.patiente}</strong></td>
                        <td>${grossesse.terme}</td>
                        <td>${grossesse.pathologie || '-'}</td>
                        <td>${grossesse.derniere_consultation}</td>
                        <td>${grossesse.medecin}</td>
                        <td>${niveauBadge}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary" onclick="salamet.dashboard.ouvrirGrossesse(${grossesse.id})">
                                Voir
                            </button>
                        </td>
                    </tr>
                `);
                $tbody.append($row);
            });
        },

        renderCharts: function() {
            this.renderConsultationsChart();
            this.renderPathologiesChart();
        },

        renderConsultationsChart: function() {
            var ctx = this.$('#chart-consultations')[0].getContext('2d');
            var data = this.dashboardData.graphiques.consultations_par_semaine;

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(d => d.semaine),
                    datasets: [{
                        label: 'Consultations',
                        data: data.map(d => d.consultations),
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        },

        renderPathologiesChart: function() {
            var ctx = this.$('#chart-pathologies')[0].getContext('2d');
            var data = this.dashboardData.graphiques.pathologies_repartition;

            var colors = [
                '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
            ];

            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: data.map(d => d.pathologie || 'Aucune'),
                    datasets: [{
                        data: data.map(d => d.count),
                        backgroundColor: colors.slice(0, data.length)
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        },

        setupAutoRefresh: function() {
            var self = this;
            // Actualiser toutes les 5 minutes
            setInterval(function() {
                self.loadDashboardData();
            }, 300000);
        },

        updateCurrentDate: function() {
            var now = new Date();
            var dateStr = now.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            this.$('#current-date').text(dateStr);
        },

        // Actions rapides
        nouvelleConsultation: function() {
            return rpc.query({
                model: 'salamet.dashboard',
                method: 'action_nouvelle_consultation',
            }).then(function(action) {
                return self.do_action(action);
            });
        },

        nouvelleGrossesse: function() {
            return rpc.query({
                model: 'salamet.dashboard',
                method: 'action_nouvelle_grossesse',
            }).then(function(action) {
                return self.do_action(action);
            });
        },

        voirNotifications: function() {
            return rpc.query({
                model: 'salamet.dashboard',
                method: 'action_notifications_urgentes',
            }).then(function(action) {
                return self.do_action(action);
            });
        },

        voirGrossessesRisque: function() {
            return rpc.query({
                model: 'salamet.dashboard',
                method: 'action_grossesses_risque',
            }).then(function(action) {
                return self.do_action(action);
            });
        },

        ouvrirNotification: function(id) {
            this.do_action({
                type: 'ir.actions.act_window',
                res_model: 'salamet.notification',
                res_id: id,
                view_mode: 'form',
                target: 'current'
            });
        },

        ouvrirConsultation: function(id) {
            this.do_action({
                type: 'ir.actions.act_window',
                res_model: 'salamet.consultation',
                res_id: id,
                view_mode: 'form',
                target: 'current'
            });
        },

        ouvrirGrossesse: function(id) {
            this.do_action({
                type: 'ir.actions.act_window',
                res_model: 'salamet.grossesse',
                res_id: id,
                view_mode: 'form',
                target: 'current'
            });
        }
    });

    // Enregistrer l'action
    core.action_registry.add('salamet_dashboard', SalametDashboard);

    // Exposer les méthodes globalement pour les boutons
    window.salamet = window.salamet || {};
    window.salamet.dashboard = {
        nouvelleConsultation: function() {
            return rpc.query({
                model: 'salamet.dashboard',
                method: 'action_nouvelle_consultation',
            }).then(function(action) {
                return window.location = `/web#action=${action.id}`;
            });
        },

        nouvelleGrossesse: function() {
            return rpc.query({
                model: 'salamet.dashboard',
                method: 'action_nouvelle_grossesse',
            }).then(function(action) {
                return window.location = `/web#action=${action.id}`;
            });
        },

        voirNotifications: function() {
            return rpc.query({
                model: 'salamet.dashboard',
                method: 'action_notifications_urgentes',
            }).then(function(action) {
                return window.location = `/web#action=${action.id}`;
            });
        },

        voirGrossessesRisque: function() {
            return rpc.query({
                model: 'salamet.dashboard',
                method: 'action_grossesses_risque',
            }).then(function(action) {
                return window.location = `/web#action=${action.id}`;
            });
        },

        ouvrirNotification: function(id) {
            window.location = `/web#id=${id}&model=salamet.notification&view_type=form`;
        },

        ouvrirConsultation: function(id) {
            window.location = `/web#id=${id}&model=salamet.consultation&view_type=form`;
        },

        ouvrirGrossesse: function(id) {
            window.location = `/web#id=${id}&model=salamet.grossesse&view_type=form`;
        }
    };

    return SalametDashboard;
});

