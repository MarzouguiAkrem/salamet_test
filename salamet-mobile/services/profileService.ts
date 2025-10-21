import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from './api';
import {
  CompleteProfile,
  PatienteProfile,
  Grossesse,
  GrossesseComplete,
  Consultation,
  BilanPrenatal,
  Accouchement,
  Notification,
  ProfileStats,
  OdooApiResponse
} from '../types';

class ProfileService {
  private readonly CACHE_KEY = 'complete_profile_cache';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * 🎯 MÉTHODE PRINCIPALE : Récupérer le profil complet d'une patiente
   */
  async getCompleteProfile(patienteId: number, apiKey: string, forceRefresh: boolean = false): Promise<CompleteProfile> {
    try {
      console.log('📊 Récupération du profil complet pour patiente:', patienteId);

      // Vérifier le cache si pas de forceRefresh
      if (!forceRefresh) {
        const cachedProfile = await this.getCachedProfile(patienteId);
        if (cachedProfile) {
          console.log('✅ Profil récupéré depuis le cache');
          return cachedProfile;
        }
      }

      // Récupérer toutes les données en parallèle
      const [
        patiente,
        grossesses,
        notifications
      ] = await Promise.all([
        this.getPatienteData(patienteId, apiKey),
        this.getGrossessesWithDetails(patienteId, apiKey),
        this.getNotifications(patienteId, apiKey)
      ]);

      // Identifier la grossesse actuelle
      const grossesse_actuelle = grossesses.find(g => g.grossesse.state === 'en_cours');

      // Calculer les statistiques
      const stats = this.calculateStats(patiente, grossesses, notifications);

      // Construire le profil complet
      const completeProfile: CompleteProfile = {
        patiente,
        grossesses,
        grossesse_actuelle,
        stats,
        notifications: notifications.slice(0, 10), // 10 dernières notifications
        last_updated: new Date().toISOString()
      };

      // Sauvegarder en cache
      await this.cacheProfile(patienteId, completeProfile);

      console.log('✅ Profil complet récupéré avec succès');
      return completeProfile;

    } catch (error: any) {
      console.error('❌ Erreur récupération profil complet:', error);
      throw new Error(`Impossible de récupérer le profil complet: ${error.message}`);
    }
  }

  /**
   * 📋 Récupérer les données de la patiente
   */
  private async getPatienteData(patienteId: number, apiKey: string): Promise<PatienteProfile> {
    try {
      const response = await apiService.get('/send_request', {
        model: 'salamet.patiente',
        Id: patienteId,
        fields: JSON.stringify([
          'id', 'name', 'nom_complet', 'date_naissance', 'age',
          'telephone', 'email', 'adresse', 'groupe_sanguin',
          'poids', 'taille', 'imc',
          'nom_mari', 'telephone_mari',
          'gestite', 'parite', 'avortements',
          'antecedents_medicaux', 'antecedents_chirurgicaux',
          'est_enceinte', 'grossesse_actuelle_id',
          'nombre_grossesses', 'nombre_accouchements',
          'niveau_risque_global', 'score_risque',
          'medecin_ids', 'user_id'
        ])
      }, {
        'api-key': apiKey
      });

      if (response.records && response.records.length > 0) {
        return response.records[0];
      }

      throw new Error('Patiente non trouvée');
    } catch (error: any) {
      console.error('❌ Erreur récupération patiente:', error);
      throw error;
    }
  }

  /**
   * 🤰 Récupérer toutes les grossesses avec leurs détails
   */
  private async getGrossessesWithDetails(patienteId: number, apiKey: string): Promise<GrossesseComplete[]> {
    try {
      // Récupérer toutes les grossesses
      const grossesses = await this.getGrossesses(patienteId, apiKey);

      // Pour chaque grossesse, récupérer les détails
      const grossessesCompletes = await Promise.all(
        grossesses.map(async (grossesse) => {
          const [consultations, bilans, accouchement, notifications] = await Promise.all([
            this.getConsultations(grossesse.id, apiKey),
            this.getBilans(grossesse.id, apiKey),
            this.getAccouchement(grossesse.id, apiKey),
            this.getNotificationsByGrossesse(grossesse.id, apiKey)
          ]);

          return {
            grossesse,
            consultations,
            bilans,
            accouchement,
            notifications
          };
        })
      );

      return grossessesCompletes;
    } catch (error: any) {
      console.error('❌ Erreur récupération grossesses:', error);
      return [];
    }
  }

  /**
   * 🤰 Récupérer les grossesses
   */
  private async getGrossesses(patienteId: number, apiKey: string): Promise<Grossesse[]> {
    try {
      const response = await apiService.get('/send_request', {
        model: 'salamet.grossesse',
        domain: JSON.stringify([['patiente_id', '=', patienteId]]),
        fields: JSON.stringify([
          'id', 'name', 'patiente_id',
          'ddr', 'date_debut', 'date_prevue_accouchement',
          'tag_semaines', 'tag_jours', 'tag_display', 'tag',
          'state', 'niveau_risque', 'score_risque',
          'type_pathologie_principale', 'pathologies_associees', 'nombre_pathologies',
          'pathologie_diabete', 'pathologie_hta', 'pathologie_preeclampsie', 'pathologie_rciu',
          'traitement_grossesse', 'details_traitement', 'maturation_pulmonaire',
          'nombre_consultations', 'nombre_bilans', 'derniere_consultation',
          'poids_avant_grossesse', 'taille', 'imc_initial',
          'medecin_referent_id', 'medecin_ids',
          'observations', 'notes_medicales'
        ])
      }, {
        'api-key': apiKey
      });

      return response.records || [];
    } catch (error: any) {
      console.error('❌ Erreur récupération grossesses:', error);
      return [];
    }
  }

  /**
   * 🩺 Récupérer les consultations d'une grossesse
   */
  private async getConsultations(grossesseId: number, apiKey: string): Promise<Consultation[]> {
    try {
      const response = await apiService.get('/send_request', {
        model: 'salamet.consultation',
        domain: JSON.stringify([['grossesse_id', '=', grossesseId]]),
        fields: JSON.stringify([
          'id', 'name', 'display_name',
          'patiente_id', 'grossesse_id', 'medecin_id',
          'date_consultation', 'type_consultation', 'terme_grossesse',
          'motif_consultation',
          'poids_actuel', 'prise_poids',
          'tension_arterielle_systolique', 'tension_arterielle_diastolique', 'tension_arterielle',
          'frequence_cardiaque', 'temperature',
          'hauteur_uterine', 'presentation_foetale', 'bcf', 'mouvements_actifs_foetus', 'col_uterus',
          'proteinurie', 'glycosurie', 'oedemes',
          'observations', 'diagnostic', 'conduite_tenir', 'prescriptions',
          'prochaine_consultation', 'urgence_detectee', 'hospitalisation_necessaire',
          'niveau_alerte', 'state'
        ])
      }, {
        'api-key': apiKey
      });

      return response.records || [];
    } catch (error: any) {
      console.error('❌ Erreur récupération consultations:', error);
      return [];
    }
  }

  /**
   * 🧪 Récupérer les bilans d'une grossesse
   */
  private async getBilans(grossesseId: number, apiKey: string): Promise<BilanPrenatal[]> {
    try {
      const response = await apiService.get('/send_request', {
        model: 'salamet.bilan.prenatal',
        domain: JSON.stringify([['grossesse_id', '=', grossesseId]]),
        fields: JSON.stringify([
          'id', 'name',
          'grossesse_id', 'patiente_id', 'medecin_id',
          'date_bilan', 'terme_grossesse', 'trimestre', 'type_bilan', 'state',
          'hemoglobine', 'hematocrite', 'plaquettes', 'leucocytes',
          'glycemie', 'hgpo', 'hgpo_t0', 'hgpo_t60', 'proteinurie', 'proteinurie_24h',
          'creatinine', 'uree', 'fer_serique', 'ferritine', 'tsh',
          'toxoplasmose_igg', 'toxoplasmose_igm', 'rubeole_igg',
          'cmv_igg', 'cmv_igm', 'hbsag', 'vih', 'syphilis',
          'depistage_aneuploidies', 'risque_aneuploidies', 'notes_depistage',
          'resultats_normaux', 'anomalies_detectees', 'interpretation', 'recommandations',
          'alerte', 'niveau_alerte', 'alerte_active',
          'prochain_bilan', 'notes'
        ])
      }, {
        'api-key': apiKey
      });

      return response.records || [];
    } catch (error: any) {
      console.error('❌ Erreur récupération bilans:', error);
      return [];
    }
  }

  /**
   * 👶 Récupérer l'accouchement d'une grossesse
   */
  private async getAccouchement(grossesseId: number, apiKey: string): Promise<Accouchement | undefined> {
    try {
      // Note: Il faut ajouter grossesse_id dans le modèle accouchement
      // Pour l'instant, on cherche par patiente_id
      const response = await apiService.get('/send_request', {
        model: 'salamet.accouchement',
        domain: JSON.stringify([['grossesse_id', '=', grossesseId]]),
        fields: JSON.stringify([
          'id', 'name', 'patiente_id',
          'date_accouchement', 'terme_accouchement', 'type_accouchement',
          'poids_naissance', 'sexe_enfant',
          'complications', 'observations', 'date_prevue'
        ])
      }, {
        'api-key': apiKey
      });

      return response.records && response.records.length > 0 ? response.records[0] : undefined;
    } catch (error: any) {
      console.error('❌ Erreur récupération accouchement:', error);
      return undefined;
    }
  }

  /**
   * 🔔 Récupérer les notifications d'une patiente
   */
  private async getNotifications(patienteId: number, apiKey: string): Promise<Notification[]> {
    try {
      const response = await apiService.get('/send_request', {
        model: 'salamet.notification',
        domain: JSON.stringify([['patiente_id', '=', patienteId]]),
        fields: JSON.stringify([
          'id', 'titre', 'message',
          'type_notification', 'priorite',
          'grossesse_id', 'patiente_id', 'medecin_id',
          'date_prevue', 'date_creation', 'date_lecture',
          'state', 'lu',
          'modele_lie', 'enregistrement_lie',
          'action_url'
        ])
      }, {
        'api-key': apiKey
      });

      return response.records || [];
    } catch (error: any) {
      console.error('❌ Erreur récupération notifications:', error);
      return [];
    }
  }

  /**
   * 🔔 Récupérer les notifications d'une grossesse
   */
  private async getNotificationsByGrossesse(grossesseId: number, apiKey: string): Promise<Notification[]> {
    try {
      const response = await apiService.get('/send_request', {
        model: 'salamet.notification',
        domain: JSON.stringify([['grossesse_id', '=', grossesseId]]),
        fields: JSON.stringify([
          'id', 'titre', 'message',
          'type_notification', 'priorite',
          'date_prevue', 'state', 'lu'
        ])
      }, {
        'api-key': apiKey
      });

      return response.records || [];
    } catch (error: any) {
      console.error('❌ Erreur récupération notifications grossesse:', error);
      return [];
    }
  }

  /**
   * 📊 Calculer les statistiques du profil
   */
  private calculateStats(
    patiente: PatienteProfile,
    grossesses: GrossesseComplete[],
    notifications: Notification[]
  ): ProfileStats {
    const allConsultations = grossesses.flatMap(g => g.consultations);
    const allBilans = grossesses.flatMap(g => g.bilans);
    
    // Trouver la prochaine consultation
    const futureConsultations = allConsultations
      .filter(c => c.prochaine_consultation && new Date(c.prochaine_consultation) > new Date())
      .sort((a, b) => new Date(a.prochaine_consultation!).getTime() - new Date(b.prochaine_consultation!).getTime());
    
    // Trouver le prochain bilan
    const futureBilans = allBilans
      .filter(b => b.prochain_bilan && new Date(b.prochain_bilan) > new Date())
      .sort((a, b) => new Date(a.prochain_bilan!).getTime() - new Date(b.prochain_bilan!).getTime());
    
    // Dernière consultation
    const sortedConsultations = allConsultations
      .sort((a, b) => new Date(b.date_consultation).getTime() - new Date(a.date_consultation).getTime());
    
    // Dernier bilan
    const sortedBilans = allBilans
      .sort((a, b) => new Date(b.date_bilan).getTime() - new Date(a.date_bilan).getTime());

    return {
      total_grossesses: patiente.nombre_grossesses,
      grossesse_en_cours: patiente.est_enceinte,
      total_consultations: allConsultations.length,
      total_bilans: allBilans.length,
      prochaine_consultation: futureConsultations[0]?.prochaine_consultation,
      prochain_bilan: futureBilans[0]?.prochain_bilan,
      notifications_non_lues: notifications.filter(n => !n.lu).length,      alertes_actives: notifications.filter(n => 
        n.state === 'active' && 
        (n.priorite === 'haute' || n.priorite === 'critique')
      ).length,
      derniere_consultation: sortedConsultations[0]?.date_consultation,
      dernier_bilan: sortedBilans[0]?.date_bilan
    };
  }

  /**
   * 💾 Sauvegarder le profil en cache
   */
  private async cacheProfile(patienteId: number, profile: CompleteProfile): Promise<void> {
    try {
      const cacheData = {
        patienteId,
        profile,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(
        `${this.CACHE_KEY}_${patienteId}`,
        JSON.stringify(cacheData)
      );
      console.log('✅ Profil mis en cache');
    } catch (error) {
      console.error('❌ Erreur mise en cache:', error);
    }
  }

  /**
   * 📥 Récupérer le profil depuis le cache
   */
  private async getCachedProfile(patienteId: number): Promise<CompleteProfile | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.CACHE_KEY}_${patienteId}`);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const age = Date.now() - cacheData.timestamp;

      if (age > this.CACHE_DURATION) {
        console.log('⏰ Cache expiré');
        await this.clearCache(patienteId);
        return null;
      }

      return cacheData.profile;
    } catch (error) {
      console.error('❌ Erreur lecture cache:', error);
      return null;
    }
  }

  /**
   * 🗑️ Vider le cache
   */
  async clearCache(patienteId?: number): Promise<void> {
    try {
      if (patienteId) {
        await AsyncStorage.removeItem(`${this.CACHE_KEY}_${patienteId}`);
      } else {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_KEY));
        await AsyncStorage.multiRemove(cacheKeys);
      }
      console.log('✅ Cache vidé');
    } catch (error) {
      console.error('❌ Erreur vidage cache:', error);
    }
  }

  /**
   * 🔄 Rafraîchir le profil
   */
  async refreshProfile(patienteId: number, apiKey: string): Promise<CompleteProfile> {
    await this.clearCache(patienteId);
    return this.getCompleteProfile(patienteId, apiKey, true);
  }

  /**
   * 🤰 Récupérer uniquement la grossesse actuelle avec détails
   */
  async getCurrentGrossesse(patienteId: number, apiKey: string): Promise<GrossesseComplete | null> {
    try {
      const grossesses = await this.getGrossessesWithDetails(patienteId, apiKey);
      return grossesses.find(g => g.grossesse.state === 'en_cours') || null;
    } catch (error: any) {
      console.error('❌ Erreur récupération grossesse actuelle:', error);
      return null;
    }
  }

  /**
   * 📊 Récupérer uniquement les statistiques
   */
  async getStats(patienteId: number, apiKey: string): Promise<ProfileStats> {
    try {
      const profile = await this.getCompleteProfile(patienteId, apiKey);
      return profile.stats;
    } catch (error: any) {
      console.error('❌ Erreur récupération stats:', error);
      throw error;
    }
  }

  /**
   * 🔔 Récupérer uniquement les notifications non lues
   */
  async getUnreadNotifications(patienteId: number, apiKey: string): Promise<Notification[]> {
    try {
      const notifications = await this.getNotifications(patienteId, apiKey);
      return notifications.filter(n => !n.lu);
    } catch (error: any) {
      console.error('❌ Erreur récupération notifications non lues:', error);
      return [];
    }
  }

  /**
   * ✅ Marquer une notification comme lue
   */
  async markNotificationAsRead(notificationId: number, apiKey: string): Promise<boolean> {
    try {
      await apiService.put('/send_request', {
        lu: true,
        date_lecture: new Date().toISOString(),
        state: 'lue'
      }, {
        'api-key': apiKey,
        model: 'salamet.notification',
        Id: notificationId
      });
      
      console.log('✅ Notification marquée comme lue');
      return true;
    } catch (error: any) {
      console.error('❌ Erreur marquage notification:', error);
      return false;
    }
  }

  /**
   * 📅 Récupérer les prochains rendez-vous
   */
  async getUpcomingAppointments(patienteId: number, apiKey: string): Promise<{
    consultations: Consultation[];
    bilans: BilanPrenatal[];
  }> {
    try {
      const profile = await this.getCompleteProfile(patienteId, apiKey);
      const now = new Date();

      const upcomingConsultations = profile.grossesses
        .flatMap(g => g.consultations)
        .filter(c => c.prochaine_consultation && new Date(c.prochaine_consultation) > now)
        .sort((a, b) => 
          new Date(a.prochaine_consultation!).getTime() - 
          new Date(b.prochaine_consultation!).getTime()
        );

      const upcomingBilans = profile.grossesses
        .flatMap(g => g.bilans)
        .filter(b => b.prochain_bilan && new Date(b.prochain_bilan) > now)
        .sort((a, b) => 
          new Date(a.prochain_bilan!).getTime() - 
          new Date(b.prochain_bilan!).getTime()
        );

      return {
        consultations: upcomingConsultations,
        bilans: upcomingBilans
      };
    } catch (error: any) {
      console.error('❌ Erreur récupération rendez-vous:', error);
      return { consultations: [], bilans: [] };
    }
  }

  /**
   * 🚨 Récupérer les alertes actives
   */
  async getActiveAlerts(patienteId: number, apiKey: string): Promise<{
    consultations: Consultation[];
    bilans: BilanPrenatal[];
    notifications: Notification[];
  }> {
    try {
      const profile = await this.getCompleteProfile(patienteId, apiKey);

      const alertConsultations = profile.grossesses
        .flatMap(g => g.consultations)
        .filter(c => c.niveau_alerte === 'rouge' || c.urgence_detectee);

      const alertBilans = profile.grossesses
        .flatMap(g => g.bilans)
        .filter(b => b.alerte_active || b.niveau_alerte === 'urgence');

      const alertNotifications = profile.notifications
        .filter(n => 
          n.state === 'active' && 
          (n.priorite === 'haute' || n.priorite === 'critique')
        );

      return {
        consultations: alertConsultations,
        bilans: alertBilans,
        notifications: alertNotifications
      };
    } catch (error: any) {
      console.error('❌ Erreur récupération alertes:', error);
      return { consultations: [], bilans: [], notifications: [] };
    }
  }

  /**
   * 📈 Récupérer l'historique des consultations
   */
  async getConsultationHistory(
    patienteId: number, 
    apiKey: string,
    limit?: number
  ): Promise<Consultation[]> {
    try {
      const profile = await this.getCompleteProfile(patienteId, apiKey);
      const consultations = profile.grossesses
        .flatMap(g => g.consultations)
        .sort((a, b) => 
          new Date(b.date_consultation).getTime() - 
          new Date(a.date_consultation).getTime()
        );

      return limit ? consultations.slice(0, limit) : consultations;
    } catch (error: any) {
      console.error('❌ Erreur récupération historique consultations:', error);
      return [];
    }
  }

  /**
   * 🧪 Récupérer l'historique des bilans
   */
  async getBilanHistory(
    patienteId: number, 
    apiKey: string,
    limit?: number
  ): Promise<BilanPrenatal[]> {
    try {
      const profile = await this.getCompleteProfile(patienteId, apiKey);
      const bilans = profile.grossesses
        .flatMap(g => g.bilans)
        .sort((a, b) => 
          new Date(b.date_bilan).getTime() - 
          new Date(a.date_bilan).getTime()
        );

      return limit ? bilans.slice(0, limit) : bilans;
    } catch (error: any) {
      console.error('❌ Erreur récupération historique bilans:', error);
      return [];
    }
  }

  /**
   * 📊 Récupérer les données pour le graphique de poids
   */
  async getWeightData(patienteId: number, apiKey: string): Promise<{
    date: string;
    poids: number;
    terme?: number;
  }[]> {
    try {
      const consultations = await this.getConsultationHistory(patienteId, apiKey);
      
      return consultations
        .filter(c => c.poids_actuel)
        .map(c => ({
          date: c.date_consultation,
          poids: c.poids_actuel!,
          terme: c.terme_grossesse
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error: any) {
      console.error('❌ Erreur récupération données poids:', error);
      return [];
    }
  }

  /**
   * 📊 Récupérer les données pour le graphique de tension
   */
  async getTensionData(patienteId: number, apiKey: string): Promise<{
    date: string;
    systolique: number;
    diastolique: number;
    terme?: number;
  }[]> {
    try {
      const consultations = await this.getConsultationHistory(patienteId, apiKey);
      
      return consultations
        .filter(c => c.tension_arterielle_systolique && c.tension_arterielle_diastolique)
        .map(c => ({
          date: c.date_consultation,
          systolique: c.tension_arterielle_systolique!,
          diastolique: c.tension_arterielle_diastolique!,
          terme: c.terme_grossesse
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error: any) {
      console.error('❌ Erreur récupération données tension:', error);
      return [];
    }
  }
}

export default new ProfileService();

