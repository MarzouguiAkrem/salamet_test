import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MedecinDashboard from '../../components/dashboards/MedecinDashboard';
import PatienteDashboard from '../../components/dashboards/PatienteDashboard';
import { ThemedText } from '../../components/ui/ThemedText';
import { useAuth } from '../../contexts/AuthContext';

export default function DashboardScreen() {
  const { user, isLoading, isPatiente, isMedecin, isAdmin, logout } = useAuth();

  // Debug
  useEffect(() => {
    console.log('🎯 [Dashboard] État actuel:', {
      user: user,
      role: user?.role,
      isPatiente,
      isMedecin,
      isAdmin,
      isLoading
    });
  }, [user, isPatiente, isMedecin, isAdmin, isLoading]);

  // Fonction de déconnexion
  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Erreur déconnexion:', error);
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          },
        },
      ]
    );
  };

  // Affichage du chargement
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1565C0" />
        <ThemedText style={styles.loadingText}>Chargement...</ThemedText>
      </View>
    );
  }

  // Vérification de l'utilisateur
  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
        <ThemedText style={styles.errorTitle}>
          Non connecté
        </ThemedText>
        <ThemedText style={styles.errorText}>
          Vous devez vous connecter pour accéder à cette page
        </ThemedText>
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => router.replace('/auth/login')}
        >
          <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
          <Text style={styles.loginButtonText}>Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 🎯 Affichage du dashboard selon le rôle
  if (isPatiente) {
    console.log('✅ [Dashboard] Affichage PatienteDashboard');
    return <PatienteDashboard />;
  }
  
  if (isMedecin) {
    console.log('✅ [Dashboard] Affichage MedecinDashboard');
    return <MedecinDashboard />;
  }
  
    // Pour les admins ou autres rôles
  if (isAdmin) {
    console.log('⚠️ [Dashboard] Affichage dashboard admin (en développement)');
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="construct-outline" size={64} color="#9CA3AF" />
        
        <ThemedText style={styles.errorTitle}>
          Dashboard Administrateur
        </ThemedText>
        
        <ThemedText style={styles.errorText}>
          🔧 En cours de développement
        </ThemedText>
        
        <ThemedText style={styles.debugText}>
          Utilisateur: {user.name} ({user.email})
        </ThemedText>
        
        <ThemedText style={styles.debugText}>
          Rôle: {user.role}
        </ThemedText>

        {/* Bouton de déconnexion */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Rôle non reconnu
  console.log('❌ [Dashboard] Rôle non reconnu:', user.role);
  return (
    <View style={styles.errorContainer}>
      <Ionicons name="help-circle-outline" size={64} color="#EF4444" />
      
      <ThemedText style={styles.errorTitle}>
        Rôle non reconnu
      </ThemedText>
      
      <ThemedText style={styles.errorText}>
        Le rôle "{user.role}" n'est pas pris en charge
      </ThemedText>
      
      <ThemedText style={styles.debugText}>
        Utilisateur: {user.name} ({user.email})
      </ThemedText>
      
      <ThemedText style={styles.debugText}>
        Rôle détecté: {user.role}
      </ThemedText>

      {/* Bouton de déconnexion */}
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
        <Text style={styles.logoutButtonText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  debugText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 30,
    gap: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 30,
    gap: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

