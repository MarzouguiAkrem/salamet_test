import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';

const { width } = Dimensions.get('window');

export default function PatienteDashboard() {
  const { user, logout } = useAuth();
  const {
    profile,
    stats,
    grossesse_actuelle,
    loading,
    refreshing,
    refresh,
    hasGrossesseEnCours,
    hasAlerts,
    hasUnreadNotifications,
    getUnreadNotifications,
    getUpcomingAppointments
  } = useProfile();

  // Fonction de déconnexion
  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/auth/login');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          },
        },
      ]
    );
  };

  const unreadNotifications = getUnreadNotifications();
  const upcomingAppointments = getUpcomingAppointments();

  if (loading && !profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} />
      }
    >
      {/* En-tête de bienvenue avec bouton déconnexion */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.userName}>
              {profile?.patiente.nom_complet || user?.name} 👋
            </Text>
            {profile?.patiente.age && (
              <Text style={styles.userInfo}>{profile.patiente.age} ans</Text>
            )}
          </View>
          
          {/* Bouton de déconnexion */}
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Alertes urgentes */}
      {hasAlerts && (
        <View style={styles.alertSection}>
          <View style={styles.urgentAlert}>
            <Text style={styles.urgentAlertIcon}>🚨</Text>
            <View style={styles.urgentAlertContent}>
              <Text style={styles.urgentAlertTitle}>Attention requise</Text>
              <Text style={styles.urgentAlertText}>
                {stats?.alertes_actives} alerte(s) nécessitent votre attention immédiate
              </Text>
              <TouchableOpacity
                style={styles.urgentAlertButton}
                onPress={() => router.push('/notifications')}
              >
                <Text style={styles.urgentAlertButtonText}>Voir les alertes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Grossesse actuelle */}
      {hasGrossesseEnCours && grossesse_actuelle && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ma grossesse</Text>
          
          <View style={styles.pregnancyCard}>
            <View style={styles.pregnancyHeader}>
              <Text style={styles.pregnancyEmoji}>🤰</Text>
              <View style={styles.pregnancyHeaderText}>
                <Text style={styles.pregnancyTerm}>
                  {grossesse_actuelle.grossesse.tag_display}
                </Text>
                <Text style={styles.pregnancyDPA}>
                  DPA : {new Date(grossesse_actuelle.grossesse.date_prevue_accouchement).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            </View>

            <View style={styles.pregnancyStats}>
              <View style={styles.pregnancyStat}>
                <Text style={styles.pregnancyStatValue}>
                  {grossesse_actuelle.consultations.length}
                </Text>
                <Text style={styles.pregnancyStatLabel}>Consultations</Text>
              </View>
              <View style={styles.pregnancyStat}>
                <Text style={styles.pregnancyStatValue}>
                  {grossesse_actuelle.bilans.length}
                </Text>
                <Text style={styles.pregnancyStatLabel}>Bilans</Text>
              </View>
              <View style={styles.pregnancyStat}>
                <Text style={[
                  styles.pregnancyStatValue,
                  getRiskColor(grossesse_actuelle.grossesse.niveau_risque)
                ]}>
                  {grossesse_actuelle.grossesse.niveau_risque}
                </Text>
                <Text style={styles.pregnancyStatLabel}>Risque</Text>
              </View>
            </View>

            {grossesse_actuelle.grossesse.type_pathologie_principale !== 'normale' && (
              <View style={styles.pathologyBadge}>
                <Text style={styles.pathologyText}>
                  ⚕️ {grossesse_actuelle.grossesse.type_pathologie_principale}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Prochains rendez-vous */}
      {(upcomingAppointments.consultations.length > 0 || upcomingAppointments.bilans.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prochains rendez-vous</Text>
          
          {upcomingAppointments.consultations.slice(0, 2).map((consultation) => (
            <TouchableOpacity
              key={consultation.id}
              style={styles.appointmentCard}
              onPress={() => router.push(`/consultations/${consultation.id}`)}
            >
              <View style={styles.appointmentIcon}>
                <Text style={styles.appointmentIconText}>🩺</Text>
              </View>
              <View style={styles.appointmentContent}>
                <Text style={styles.appointmentType}>Consultation</Text>
                <Text style={styles.appointmentDate}>
                  {new Date(consultation.prochaine_consultation!).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                </Text>
                {consultation.terme_grossesse && (
                  <Text style={styles.appointmentTerm}>
                    Terme : {consultation.terme_grossesse.toFixed(1)} SA
                  </Text>
                )}
              </View>
              <Text style={styles.appointmentArrow}>›</Text>
            </TouchableOpacity>
          ))}

          {upcomingAppointments.bilans.slice(0, 2).map((bilan) => (
            <TouchableOpacity
              key={bilan.id}
              style={styles.appointmentCard}
              onPress={() => router.push(`/bilans/${bilan.id}`)}
            >
              <View style={styles.appointmentIcon}>
                <Text style={styles.appointmentIconText}>🧪</Text>
              </View>
              <View style={styles.appointmentContent}>
                <Text style={styles.appointmentType}>Bilan prénatal</Text>
                <Text style={styles.appointmentDate}>
                  {new Date(bilan.prochain_bilan!).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                </Text>
                <Text style={styles.appointmentTerm}>
                  {bilan.type_bilan}
                </Text>
              </View>
              <Text style={styles.appointmentArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Statistiques rapides */}
      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
          
          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => router.push('/grossesses')}
            >
              <Text style={styles.statIcon}>🤰</Text>
              <Text style={styles.statValue}>{stats.total_grossesses}</Text>
              <Text style={styles.statLabel}>Grossesses</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => router.push('/consultations')}
            >
              <Text style={styles.statIcon}>🩺</Text>
              <Text style={styles.statValue}>{stats.total_consultations}</Text>
              <Text style={styles.statLabel}>Consultations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => router.push('/bilans')}
            >
              <Text style={styles.statIcon}>🧪</Text>
              <Text style={styles.statValue}>{stats.total_bilans}</Text>
              <Text style={styles.statLabel}>Bilans</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statCard,
                hasUnreadNotifications && styles.statCardAlert
              ]}
              onPress={() => router.push('/notifications')}
            >
              <Text style={styles.statIcon}>🔔</Text>
              <Text style={styles.statValue}>{stats.notifications_non_lues}</Text>
              <Text style={styles.statLabel}>Notifications</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Notifications récentes */}
      {unreadNotifications.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notifications récentes</Text>
            <TouchableOpacity onPress={() => router.push('/notifications')}>
              <Text style={styles.seeAllText}>Tout voir ›</Text>
            </TouchableOpacity>
          </View>

          {unreadNotifications.slice(0, 3).map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                getPriorityStyle(notification.priorite)
              ]}
              onPress={() => router.push(`/notifications/${notification.id}`)}
            >
              <Text style={styles.notificationIcon}>
                {getNotificationIcon(notification.type_notification)}
              </Text>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{notification.titre}</Text>
                <Text style={styles.notificationMessage} numberOfLines={2}>
                  {notification.message}
                </Text>
                <Text style={styles.notificationDate}>
                  {new Date(notification.date_creation).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Actions rapides */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions rapides</Text>
        
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/consultations')}
          >
            <Text style={styles.quickActionIcon}>🩺</Text>
            <Text style={styles.quickActionText}>Mes consultations</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/bilans')}
          >
            <Text style={styles.quickActionIcon}>🧪</Text>
            <Text style={styles.quickActionText}>Mes bilans</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/accouchements')}
          >
            <Text style={styles.quickActionIcon}>👶</Text>
            <Text style={styles.quickActionText}>Accouchements</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/profile')}
          >
            <Text style={styles.quickActionIcon}>👤</Text>
            <Text style={styles.quickActionText}>Mon profil</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dernière mise à jour */}
      {profile?.last_updated && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Dernière mise à jour : {new Date(profile.last_updated).toLocaleTimeString('fr-FR')}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// Fonctions utilitaires
const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'faible':
      return { color: '#10b981' };
    case 'moyen':
      return { color: '#f59e0b' };
    case 'eleve':
      return { color: '#ef4444' };
    case 'tres_eleve':
      return { color: '#dc2626' };
    default:
      return { color: '#6b7280' };
  }
};

const getPriorityStyle = (priority: string) => {
  switch (priority) {
    case 'critique':
      return { borderLeftColor: '#dc2626', borderLeftWidth: 4 };
    case 'haute':
      return { borderLeftColor: '#ef4444', borderLeftWidth: 4 };
    case 'moyenne':
      return { borderLeftColor: '#f59e0b', borderLeftWidth: 4 };
    default:
      return { borderLeftColor: '#3b82f6', borderLeftWidth: 4 };
  }
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'urgence':
      return '🚨';
    case 'alerte_medicale':
      return '⚕️';
    case 'rappel_consultation':
      return '🩺';
    case 'rappel_bilan':
      return '🧪';
    default:
      return '📋';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#ec4899',
    padding: 20,
    paddingTop: 40,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  userInfo: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertSection: {
    padding: 16,
  },
  urgentAlert: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fecaca',
  },
  urgentAlertIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  urgentAlertContent: {
    flex: 1,
  },
  urgentAlertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 4,
  },
  urgentAlertText: {
    fontSize: 14,
    color: '#991b1b',
    marginBottom: 12,
  },
  urgentAlertButton: {
    backgroundColor: '#dc2626',
    padding: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  urgentAlertButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#ec4899',
    fontWeight: '600',
  },
  pregnancyCard: {
    backgroundColor: '#fdf2f8',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f9a8d4',
  },
  pregnancyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pregnancyEmoji: {
    fontSize: 48,
    marginRight: 16,
  },
  pregnancyHeaderText: {
    flex: 1,
  },
  pregnancyTerm: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ec4899',
  },
  pregnancyDPA: {
    fontSize: 14,
    color: '#9f1239',
    marginTop: 4,
  },
  pregnancyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f9a8d4',
  },
  pregnancyStat: {
    alignItems: 'center',
  },
  pregnancyStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  pregnancyStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  pathologyBadge: {
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  pathologyText: {
    fontSize: 12,
    color: '#92400e',
    textAlign: 'center',
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  appointmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appointmentIconText: {
    fontSize: 24,
  },
  appointmentContent: {
    flex: 1,
  },
  appointmentType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  appointmentDate: {
    fontSize: 13,
    color: '#3b82f6',
    marginBottom: 2,
  },
  appointmentTerm: {
    fontSize: 12,
    color: '#6b7280',
  },
  appointmentArrow: {
    fontSize: 24,
    color: '#9ca3af',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statCardAlert: {
    borderColor: '#ef4444',
    borderWidth: 2,
    backgroundColor: '#fef2f2',
  },
  statIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  notificationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  notificationDate: {
    fontSize: 11,
    color: '#9ca3af',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: (width - 48) / 2,
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#9ca3af',
  },
});
