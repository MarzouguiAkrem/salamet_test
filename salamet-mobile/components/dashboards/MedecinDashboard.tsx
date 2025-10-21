import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { 
  Alert, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  View, 
  Image,
  Text
} from 'react-native';
import { Card } from '../ui/Card';
import { ThemedText } from '../ui/ThemedText';
import { useAuth } from '../../contexts/AuthContext';

export default function MedecinDashboard() {
  const { user, logout } = useAuth();

  // Palette de couleurs médicales
  const colors = {
    primary: '#1565C0',
    primaryLight: '#1976D2',
    secondary: '#0D47A1',
    accent: '#2196F3',
    success: '#2E7D32',
    warning: '#F57C00',
    error: '#C62828',
    cardiology: '#E91E63',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#263238',
    textSecondary: '#546E7A',
  };

  // Fonction pour formater le nom du médecin
  const getDoctorName = () => {
    if (!user) return 'Dr. Utilisateur';
    
    const profile = user.profile as any;
    
    if (profile?.titre) {
      return `${profile.titre} ${profile.nom || profile.prenom || 'Utilisateur'}`;
    }
    
    const nom = profile?.nom || '';
    const prenom = profile?.prenom || '';
    
    if (nom && prenom) {
      return `Dr. ${prenom} ${nom}`;
    } else if (nom) {
      return `Dr. ${nom}`;
    } else if (prenom) {
      return `Dr. ${prenom}`;
    } else if (user.email) {
      const emailName = user.email.split('@')[0];
      return `Dr. ${emailName.charAt(0).toUpperCase() + emailName.slice(1)}`;
    }
    
    return 'Dr. Utilisateur';
  };

  // Fonction pour obtenir les initiales
  const getDoctorInitials = () => {
    if (!user) return 'DU';
    
    const profile = user.profile as any;
    const nom = profile?.nom || '';
    const prenom = profile?.prenom || '';
    
    if (nom && prenom) {
      return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
    } else if (nom) {
      return nom.substring(0, 2).toUpperCase();
    } else if (prenom) {
      return prenom.substring(0, 2).toUpperCase();
    } else if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    
    return 'DU';
  };

  // Fonction de déconnexion
  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      `${getDoctorName()}, êtes-vous sûr de vouloir vous déconnecter ?`,
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

  const quickActions = [
    {
      title: 'Accouchements',
      icon: 'baby-outline',
      route: '/accouchements',
      color: colors.cardiology,
      bgColor: '#FCE4EC',
      description: 'Gérer les accouchements'
    },
    {
      title: 'Notifications',
      icon: 'notifications-outline',
      route: '/notifications',
      color: colors.warning,
      bgColor: '#FFF3E0',
      description: 'Alertes et rappels'
    },
    {
      title: 'Nouvelle Patiente',
      icon: 'person-add-outline',
      route: '/forms/patiente-add',
      color: colors.primary,
      bgColor: '#E3F2FD',
      description: 'Ajouter une patiente'
    },
    {
      title: 'Urgences',
      icon: 'medical-outline',
      route: '/urgences',
      color: colors.error,
      bgColor: '#FFEBEE',
      description: 'Cas urgents'
    }
  ];

  const stats = [
    {
      value: '15',
      label: 'Consultations',
      icon: 'medical-outline',
      color: colors.success,
      trend: '+12%',
      bgColor: '#E8F5E8'
    },
    {
      value: '3',
      label: 'Accouchements',
      icon: 'baby-outline',
      color: colors.cardiology,
      trend: '+5%',
      bgColor: '#FCE4EC'
    },
    {
      value: '8',
      label: 'Nouvelles Patientes',
      icon: 'person-add-outline',
      color: colors.primary,
      trend: '+20%',
      bgColor: '#E3F2FD'
    },
    {
      value: '2',
      label: 'Urgences',
      icon: 'warning-outline',
      color: colors.warning,
      trend: '-10%',
      bgColor: '#FFF3E0'
    }
  ];

  const recentActivities = [
    {
      title: 'Consultation - Marie Dupont',
      time: 'Il y a 15 min',
      type: 'consultation',
      icon: 'medical-outline',
      color: colors.success
    },
    {
      title: 'Accouchement - Sophie Martin',
      time: 'Il y a 1h',
      type: 'accouchement',
      icon: 'baby-outline',
      color: colors.cardiology
    },
    {
      title: 'Nouvelle patiente - Julie Bernard',
      time: 'Il y a 2h',
      type: 'nouvelle',
      icon: 'person-add-outline',
      color: colors.primary
    }
  ];

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header avec gradient bleu médical */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerContent}>
          <View style={styles.welcomeSection}>
            <ThemedText style={styles.welcomeTitle}>
              Bonjour {getDoctorName()}
            </ThemedText>
            <ThemedText style={styles.welcomeSubtitle}>
              {new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </ThemedText>
            {user?.profile?.specialite && (
              <ThemedText style={styles.specialite}>
                {user.profile.specialite}
              </ThemedText>
            )}
          </View>
          
          {/* Section profil et déconnexion */}
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => router.push('/profile')}
            >
              <View style={styles.profileIcon}>
                {user?.profile?.avatar ? (
                  <Image 
                    source={{ uri: user.profile.avatar }} 
                    style={styles.avatarImage}
                  />
                ) : (
                  <ThemedText style={[styles.initials, { color: colors.primary }]}>
                    {getDoctorInitials()}
                  </ThemedText>
                )}
              </View>
            </TouchableOpacity>
            
            {/* Bouton de déconnexion */}
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={styles.logoutIcon}>
                <Ionicons name="log-out-outline" size={22} color={colors.error} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Message de bienvenue */}
        <View style={styles.welcomeCard}>
          <Card style={styles.personalizedWelcome}>
            <View style={styles.welcomeCardContent}>
              <Ionicons name="medical" size={24} color={colors.primary} />
              <View style={styles.welcomeText}>
                <ThemedText style={[styles.welcomeCardTitle, { color: colors.text }]}>
                  Bienvenue dans votre espace médical
                </ThemedText>
                <ThemedText style={[styles.welcomeCardSubtitle, { color: colors.textSecondary }]}>
                  Dernière connexion : {user?.derniereConnexion ? 
                    new Date(user.derniereConnexion).toLocaleDateString('fr-FR') : 
                    'Aujourd\'hui'
                  }
                </ThemedText>
              </View>
            </View>
          </Card>
        </View>

        {/* Statistiques */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, { color: colors.secondary }]}>
              📊 Aperçu du jour
            </ThemedText>
          </View>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <Card key={index} style={styles.statCard}>
                <View style={styles.statHeader}>
                  <View style={[styles.statIconContainer, { backgroundColor: stat.bgColor }]}>
                    <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                  </View>
                  <View style={[
                    styles.trendBadge, 
                    { backgroundColor: stat.trend.startsWith('+') ? '#E8F5E8' : '#FFEBEE' }
                  ]}>
                    <ThemedText style={[
                      styles.statTrend, 
                      { color: stat.trend.startsWith('+') ? colors.success : colors.error }
                    ]}>
                      {stat.trend}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={[styles.statValue, { color: colors.secondary }]}>
                  {stat.value}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {stat.label}
                </ThemedText>
              </Card>
            ))}
          </View>
        </View>

        {/* Actions rapides */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.secondary }]}>
            ⚡ Actions rapides
          </ThemedText>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionCard}
                onPress={() => router.push(action.route)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: action.bgColor }]}>
                  <Ionicons name={action.icon as any} size={28} color={action.color} />
                </View>
                <View style={styles.actionContent}>
                  <ThemedText style={[styles.actionTitle, { color: colors.text }]}>
                    {action.title}
                  </ThemedText>
                  <ThemedText style={[styles.actionDescription, { color: colors.textSecondary }]}>
                    {action.description}
                  </ThemedText>
                </View>
                <View style={[styles.chevronContainer, { backgroundColor: colors.surface }]}>
                  <Ionicons 
                    name="chevron-forward" 
                    size={18} 
                    color={colors.primary} 
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Activités récentes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, { color: colors.secondary }]}>
              🕒 Activités récentes
            </ThemedText>
            <TouchableOpacity style={styles.seeAllButton}>
              <ThemedText style={[styles.seeAllText, { color: colors.primary }]}>
                Voir tout
              </ThemedText>
            </TouchableOpacity>
          </View>
          <Card style={styles.activitiesCard}>
            {recentActivities.map((activity, index) => (
              <View 
                key={index} 
                style={[
                  styles.activityItem,
                  index < recentActivities.length - 1 && styles.activityBorder
                ]}
              >
                <View style={[styles.activityIconContainer, { backgroundColor: `${activity.color}15` }]}>
                  <Ionicons name={activity.icon as any} size={18} color={activity.color} />
                </View>
                <View style={styles.activityContent}>
                  <ThemedText style={[styles.activityTitle, { color: colors.text }]}>
                    {activity.title}
                  </ThemedText>
                  <ThemedText style={[styles.activityTime, { color: colors.textSecondary }]}>
                    {activity.time}
                  </ThemedText>
                </View>
                <View style={styles.activityStatus}>
                  <View style={[styles.statusDot, { backgroundColor: activity.color }]} />
                </View>
              </View>
            ))}
          </Card>
        </View>

        {/* Raccourcis */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.secondary }]}>
            🔗 Raccourcis
          </ThemedText>
          <View style={styles.shortcutsGrid}>
            <TouchableOpacity 
              style={[styles.shortcutButton, { borderColor: colors.primary }]}
              onPress={() => router.push('/grossesses')}
            >
              <Ionicons name="heart" size={20} color={colors.cardiology} />
              <ThemedText style={[styles.shortcutText, { color: colors.primary }]}>
                Grossesses
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.shortcutButton, { borderColor: colors.primary }]}
              onPress={() => router.push('/consultations')}
            >
              <Ionicons name="medical" size={20} color={colors.success} />
              <ThemedText style={[styles.shortcutText, { color: colors.primary }]}>
                Consultations
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.shortcutButton, { borderColor: colors.primary }]}
              onPress={() => router.push('/bilans')}
            >
              <Ionicons name="document-text" size={20} color={colors.warning} />
              <ThemedText style={[styles.shortcutText, { color: colors.primary }]}>
                Bilans
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.shortcutButton, { borderColor: colors.primary }]}
              onPress={() => router.push('/patients')}
            >
              <Ionicons name="people" size={20} color={colors.primary} />
              <ThemedText style={[styles.shortcutText, { color: colors.primary }]}>
                Patientes
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#E3F2FD',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  specialite: {
    fontSize: 12,
    color: '#BBDEFB',
    fontStyle: 'italic',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileButton: {
    padding: 4,
  },
  profileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  initials: {
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    padding: 4,
  },
  logoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  welcomeCard: {
    marginBottom: 20,
  },
  personalizedWelcome: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#1565C0',
  },
  welcomeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  welcomeText: {
    flex: 1,
  },
  welcomeCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  welcomeCardSubtitle: {
    fontSize: 13,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  seeAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#E3F2FD',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statTrend: {
    fontSize: 11,
    fontWeight: '700',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionsGrid: {
    gap: 14,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    fontWeight: '500',
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activitiesCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  activityBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 13,
    fontWeight: '500',
  },
  activityStatus: {
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  shortcutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    gap: 10,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  shortcutText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
