import { useState, useEffect, useCallback } from 'react';
//import { useAuth } from './useAuth';
import profileService from '../services/profileService';
import {
  CompleteProfile,
  GrossesseComplete,
  Consultation,
  BilanPrenatal,
  Notification,
  ProfileStats
} from '../types';

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CompleteProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * 🔄 Charger le profil complet
   */
  const loadProfile = useCallback(async (forceRefresh: boolean = false) => {
    if (!user?.profile?.id) {
      setError('Aucun profil utilisateur disponible');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const apiKey = await getApiKey();
      if (!apiKey) {
        throw new Error('Clé API non disponible');
      }

      const profileData = await profileService.getCompleteProfile(
        user.profile.id,
        apiKey,
        forceRefresh
      );

      setProfile(profileData);
    } catch (err: any) {
      console.error('❌ Erreur chargement profil:', err);
      setError(err.message || 'Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * 🔄 Rafraîchir le profil
   */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile(true);
    setRefreshing(false);
  }, [loadProfile]);

  /**
   * 🔑 Récupérer l'API key
   */
  const getApiKey = async (): Promise<string | null> => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return await AsyncStorage.getItem('api_key');
  };

  /**
   * 🤰 Récupérer la grossesse actuelle
   */
  const getCurrentGrossesse = useCallback((): GrossesseComplete | undefined => {
    return profile?.grossesse_actuelle;
  }, [profile]);

  /**
   * 📊 Récupérer les statistiques
   */
  const getStats = useCallback((): ProfileStats | undefined => {
    return profile?.stats;
  }, [profile]);

  /**
   * 🔔 Récupérer les notifications non lues
   */
  const getUnreadNotifications = useCallback((): Notification[] => {
    return profile?.notifications.filter(n => !n.lu) || [];
  }, [profile]);

  /**
   * 🚨 Récupérer les alertes actives
   */
  const getActiveAlerts = useCallback((): Notification[] => {
    return profile?.notifications.filter(n => 
      n.state === 'active' && 
      (n.priorite === 'haute' || n.priorite === 'critique')
    ) || [];
  }, [profile]);

  /**
   * 📅 Récupérer les prochains rendez-vous
   */
  const getUpcomingAppointments = useCallback(() => {
    if (!profile) return { consultations: [], bilans: [] };

    const now = new Date();

    const consultations = profile.grossesses
      .flatMap(g => g.consultations)
      .filter(c => c.prochaine_consultation && new Date(c.prochaine_consultation) > now)
      .sort((a, b) => 
        new Date(a.prochaine_consultation!).getTime() - 
        new Date(b.prochaine_consultation!).getTime()
      );

    const bilans = profile.grossesses
      .flatMap(g => g.bilans)
      .filter(b => b.prochain_bilan && new Date(b.prochain_bilan) > now)
      .sort((a, b) => 
        new Date(a.prochain_bilan!).getTime() - 
        new Date(b.prochain_bilan!).getTime()
      );

    return { consultations, bilans };
  }, [profile]);

  /**
   * 📈 Récupérer l'historique des consultations
   */
  const getConsultationHistory = useCallback((limit?: number): Consultation[] => {
    if (!profile) return [];

    const consultations = profile.grossesses
      .flatMap(g => g.consultations)
      .sort((a, b) => 
        new Date(b.date_consultation).getTime() - 
        new Date(a.date_consultation).getTime()
      );

    return limit ? consultations.slice(0, limit) : consultations;
  }, [profile]);

  /**
   * 🧪 Récupérer l'historique des bilans
   */
  const getBilanHistory = useCallback((limit?: number): BilanPrenatal[] => {
    if (!profile) return [];

    const bilans = profile.grossesses
      .flatMap(g => g.bilans)
      .sort((a, b) => 
        new Date(b.date_bilan).getTime() - 
        new Date(a.date_bilan).getTime()
      );

    return limit ? bilans.slice(0, limit) : bilans;
  }, [profile]);

  /**
   * ✅ Marquer une notification comme lue
   */
  const markNotificationAsRead = useCallback(async (notificationId: number) => {
    try {
      const apiKey = await getApiKey();
      if (!apiKey) return false;

      const success = await profileService.markNotificationAsRead(notificationId, apiKey);
      
      if (success && profile) {
        // Mettre à jour localement
        const updatedNotifications = profile.notifications.map(n =>
          n.id === notificationId ? { ...n, lu: true, state: 'lue' as const } : n
        );
        
        setProfile({
          ...profile,
          notifications: updatedNotifications
        });
      }

      return success;
    } catch (error) {
      console.error('❌ Erreur marquage notification:', error);
      return false;
    }
  }, [profile]);

  /**
   * 🗑️ Vider le cache
   */
  const clearCache = useCallback(async () => {
    if (user?.profile?.id) {
      await profileService.clearCache(user.profile.id);
    }
  }, [user]);

  // Charger le profil au montage
  useEffect(() => {
    if (user?.profile?.id) {
      loadProfile();
    }
  }, [user?.profile?.id]);

  return {
    // Données
    profile,
    patiente: profile?.patiente,
    grossesses: profile?.grossesses || [],
    grossesse_actuelle: getCurrentGrossesse(),
    stats: getStats(),
    notifications: profile?.notifications || [],
    
    // États
    loading,
    error,
    refreshing,
    
    // Actions
    refresh,
    loadProfile,
    clearCache,
    
    // Getters
    getUnreadNotifications,
    getActiveAlerts,
    getUpcomingAppointments,
    getConsultationHistory,
    getBilanHistory,
    markNotificationAsRead,
    
    // Utilitaires
    hasGrossesseEnCours: profile?.stats.grossesse_en_cours || false,
    hasAlerts: (profile?.stats.alertes_actives || 0) > 0,
    hasUnreadNotifications: (profile?.stats.notifications_non_lues || 0) > 0,
  };
};
