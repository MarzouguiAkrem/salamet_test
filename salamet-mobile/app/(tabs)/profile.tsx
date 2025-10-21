import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout, profile: authProfile, refreshProfile } = useAuth();
  const {
    profile,
    loading,
    refreshing,
    refresh,
    stats,
    grossesse_actuelle,
    hasGrossesseEnCours,
    hasAlerts,
    hasUnreadNotifications
  } = useProfile();

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
            await logout();
            router.replace('/auth/login');
          }
        }
      ]
    );
  };

  if (loading && !profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
        />
      }
    >
      {/* En-tête du profil */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {profile?.patiente.nom_complet?.charAt(0) || user?.name.charAt(0) || '?'}
          </Text>
        </View>
        
        <Text style={styles.name}>{profile?.patiente.nom_complet || user?.name}</Text>
        <Text style={styles.email}>{profile?.patiente.email || user?.email}</Text>
        
        {profile?.patiente.age && (
          <Text style={styles.age}>{profile.patiente.age} ans</Text>
        )}
      </View>

      {/* Informations de base */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations personnelles</Text>
        
        {profile?.patiente.telephone && (
          <InfoRow label="Téléphone" value={profile.patiente.telephone} />
        )}
        
        {profile?.patiente.adresse && (
          <InfoRow label="Adresse" value={profile.patiente.adresse} />
        )}
        
        {profile?.patiente.groupe_sanguin && (
          <InfoRow label="Groupe sanguin" value={profile.patiente.groupe_sanguin} />
        )}
        
        {profile?.patiente.poids && (
          <InfoRow label="Poids" value={`${profile.patiente.poids} kg`} />
        )}
        
        {profile?.patiente.taille && (
          <InfoRow label="Taille" value={`${profile.patiente.taille} cm`} />
        )}
        
        {profile?.patiente.imc && (
          <InfoRow label="IMC" value={profile.patiente.imc.toFixed(1)} />
        )}
      </View>

      {/* Statut grossesse */}
      {hasGrossesseEnCours && grossesse_actuelle && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Grossesse actuelle</Text>
          
          <View style={[styles.card, styles.pregnancyCard]}>
            <Text style={styles.pregnancyTag}>
              {grossesse_actuelle.grossesse.tag_display}
            </Text>
            
            <InfoRow 
              label="Date prévue d'accouchement" 
              value={new Date(grossesse_actuelle.grossesse.date_prevue_accouchement).toLocaleDateString('fr-FR')} 
            />
            
            <InfoRow 
              label="Niveau de risque" 
              value={grossesse_actuelle.grossesse.niveau_risque} 
              valueStyle={getRiskStyle(grossesse_actuelle.grossesse.niveau_risque)}
            />
            
            {grossesse_actuelle.grossesse.type_pathologie_principale !== 'normale' && (
              <InfoRow 
                label="Pathologie" 
                value={grossesse_actuelle.grossesse.type_pathologie_principale} 
              />
            )}
          </View>
                </View>
      )}

      {/* Statistiques */}
      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistiques</Text>
          
          <View style={styles.statsGrid}>
            <StatCard
              label="Grossesses"
              value={stats.total_grossesses}
              icon="🤰"
            />
            <StatCard
              label="Consultations"
              value={stats.total_consultations}
              icon="🩺"
            />
            <StatCard
              label="Bilans"
              value={stats.total_bilans}
              icon="🧪"
            />
            <StatCard
              label="Notifications"
              value={stats.notifications_non_lues}
              icon="🔔"
              alert={stats.notifications_non_lues > 0}
            />
          </View>
        </View>
      )}

      {/* Prochains rendez-vous */}
      {(stats?.prochaine_consultation || stats?.prochain_bilan) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prochains rendez-vous</Text>
          
          {stats.prochaine_consultation && (
            <View style={styles.appointmentCard}>
              <Text style={styles.appointmentIcon}>🩺</Text>
              <View style={styles.appointmentInfo}>
                <Text style={styles.appointmentLabel}>Consultation</Text>
                <Text style={styles.appointmentDate}>
                  {new Date(stats.prochaine_consultation).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            </View>
          )}
          
          {stats.prochain_bilan && (
            <View style={styles.appointmentCard}>
              <Text style={styles.appointmentIcon}>🧪</Text>
              <View style={styles.appointmentInfo}>
                <Text style={styles.appointmentLabel}>Bilan prénatal</Text>
                <Text style={styles.appointmentDate}>
                  {new Date(stats.prochain_bilan).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Alertes */}
      {hasAlerts && (
        <View style={styles.section}>
          <View style={styles.alertBanner}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Alertes actives</Text>
              <Text style={styles.alertText}>
                Vous avez {stats?.alertes_actives} alerte(s) nécessitant votre attention
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Antécédents */}
      {profile?.patiente && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Antécédents</Text>
          
          <InfoRow label="Gestité" value={profile.patiente.gestite.toString()} />
          <InfoRow label="Parité" value={profile.patiente.parite.toString()} />
          <InfoRow label="Avortements" value={profile.patiente.avortements.toString()} />
          
          {profile.patiente.antecedents_medicaux && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Antécédents médicaux</Text>
              <Text style={styles.infoValue}>{profile.patiente.antecedents_medicaux}</Text>
            </View>
          )}
        </View>
      )}

      {/* Informations conjugales */}
      {profile?.patiente.nom_mari && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations conjugales</Text>
          
          <InfoRow label="Conjoint" value={profile.patiente.nom_mari} />
          
          {profile.patiente.telephone_mari && (
            <InfoRow label="Téléphone conjoint" value={profile.patiente.telephone_mari} />
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/grossesses')}
        >
          <Text style={styles.actionButtonText}>📋 Voir mes grossesses</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/consultations')}
        >
          <Text style={styles.actionButtonText}>🩺 Mes consultations</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/bilans')}
        >
          <Text style={styles.actionButtonText}>🧪 Mes bilans</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/notifications')}
        >
          <Text style={styles.actionButtonText}>
            🔔 Notifications {hasUnreadNotifications && '(nouvelles)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Déconnexion */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>🚪 Se déconnecter</Text>
        </TouchableOpacity>
      </View>

      {/* Dernière mise à jour */}
      {profile?.last_updated && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Dernière mise à jour : {new Date(profile.last_updated).toLocaleString('fr-FR')}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// Composants auxiliaires
const InfoRow: React.FC<{
  label: string;
  value: string;
  valueStyle?: any;
}> = ({ label, value, valueStyle }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, valueStyle]}>{value}</Text>
  </View>
);

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: string;
  alert?: boolean;
}> = ({ label, value, icon, alert }) => (
  <View style={[styles.statCard, alert && styles.statCardAlert]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// Fonction utilitaire pour le style du risque
const getRiskStyle = (risk: string) => {
  switch (risk) {
    case 'faible':
      return { color: '#10b981' };
    case 'moyen':
      return { color: '#f59e0b' };
    case 'eleve':
      return { color: '#ef4444' };
    case 'tres_eleve':
      return { color: '#dc2626', fontWeight: 'bold' };
    default:
      return {};
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
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ec4899',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  age: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  card: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pregnancyCard: {
    borderColor: '#ec4899',
    borderWidth: 2,
  },
  pregnancyTag: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ec4899',
    textAlign: 'center',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statCardAlert: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  statIcon: {
    fontSize: 32,
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
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  appointmentIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  appointmentDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  alertBanner: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 12,
    color: '#78350f',
  },
  actionButton: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

