import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import apiService from './api';

class AuthService {
  private readonly STORAGE_KEYS = {
    API_KEY: 'apiKey',
    USERNAME: 'username',
    PASSWORD: 'password',
    USER: 'user',
  };

  /**
   * 🔐 Connexion
   */
  async login(email: string, password: string): Promise<User> {
    try {
      console.log('🔐 [AuthService] Début connexion pour:', email);

      // ✅ Étape 1 : Authentification REST API
      const authResponse = await apiService.authenticate(email, password);

      if (authResponse.Status !== 'auth successful') {
        throw new Error('Authentification échouée');
      }

      const apiKey = authResponse['api-key'];
      const userId = authResponse.uid;
      const userName = authResponse.User;

      console.log('✅ [AuthService] API Key obtenue:', apiKey);
      console.log('✅ [AuthService] User ID:', userId);
      console.log('✅ [AuthService] User Name:', userName);

      // ✅ Étape 2 : Déterminer le rôle
      let role: 'medecin' | 'patiente' | 'admin' = 'admin';
      let profileData: any = null;

      // Vérifier si médecin
      try {
        console.log('👨‍⚕️ [AuthService] Vérification rôle médecin...');
        const medecinData = await apiService.checkMedecinRole(userId, apiKey, email, password);
        
        if (medecinData) {
          console.log('✅ [AuthService] Utilisateur identifié comme MÉDECIN');
          role = 'medecin';
          profileData = medecinData;
        }
      } catch (error: any) {
        console.warn('⚠️ [AuthService] Erreur vérification médecin:', error.message);
      }

      // Si pas médecin, vérifier si patiente
      if (role === 'admin') {
        try {
          console.log('🤱 [AuthService] Vérification rôle patiente...');
          const patienteData = await apiService.checkPatienteRole(userId, apiKey, email, password);
          
          if (patienteData) {
            console.log('✅ [AuthService] Utilisateur identifié comme PATIENTE');
            role = 'patiente';
            profileData = patienteData;
          }
        } catch (error: any) {
          console.warn('⚠️ [AuthService] Erreur vérification patiente:', error.message);
        }
      }

      // Si toujours admin
      if (role === 'admin') {
        console.log('👤 [AuthService] Utilisateur identifié comme ADMIN (par défaut)');
      }

      // ✅ Étape 3 : Construire l'objet User
      const user: User = {
        id: userId,
        name: userName || 'Utilisateur',
        email: email,
        role: role,
        apiKey: apiKey,
      };

      // Ajouter les données spécifiques selon le rôle
      if (role === 'medecin' && profileData) {
        user.medecinId = profileData.id;
        user.specialite = profileData.specialite || 'Non spécifié';
        user.grade = profileData.niveau || profileData.grade || 'resident';
        user.telephone = profileData.telephone || '';
      } else if (role === 'patiente' && profileData) {
        user.patienteId = profileData.id;
        user.dateNaissance = profileData.date_naissance || null;
        user.age = profileData.age || null;
        user.telephone = profileData.telephone || '';
        user.estEnceinte = profileData.est_enceinte || false;
        user.niveauRisque = profileData.niveau_risque_global || 'faible';
      }

      console.log('✅ [AuthService] Utilisateur complet:', {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });

      // ✅ Étape 4 : Sauvegarder dans AsyncStorage
      await AsyncStorage.multiSet([
        [this.STORAGE_KEYS.API_KEY, apiKey],
        [this.STORAGE_KEYS.USERNAME, email],
        [this.STORAGE_KEYS.PASSWORD, password],
        [this.STORAGE_KEYS.USER, JSON.stringify(user)],
      ]);

      console.log('💾 [AuthService] Données sauvegardées dans AsyncStorage');

      return user;
    } catch (error: any) {
      console.error('❌ [AuthService] Erreur login:', error.message);
      throw error;
    }
  }

  /**
   * 🚪 Déconnexion
   */
  async logout(): Promise<void> {
    try {
      console.log('🚪 [AuthService] Déconnexion...');

      await AsyncStorage.multiRemove([
        this.STORAGE_KEYS.API_KEY,
        this.STORAGE_KEYS.USERNAME,
        this.STORAGE_KEYS.PASSWORD,
        this.STORAGE_KEYS.USER,
      ]);

      console.log('✅ [AuthService] Déconnexion réussie');
    } catch (error: any) {
      console.error('❌ [AuthService] Erreur logout:', error.message);
      throw error;
    }
  }

  /**
   * ✅ Vérifier si l'utilisateur est authentifié
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const apiKey = await AsyncStorage.getItem(this.STORAGE_KEYS.API_KEY);
      const user = await AsyncStorage.getItem(this.STORAGE_KEYS.USER);

      const isAuth = !!(apiKey && user);
      console.log('🔍 [AuthService] isAuthenticated:', isAuth);

      return isAuth;
    } catch (error: any) {
      console.error('❌ [AuthService] Erreur isAuthenticated:', error.message);
      return false;
    }
  }

  /**
   * 👤 Récupérer l'utilisateur courant
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      console.log('👤 [AuthService] Récupération utilisateur courant...');

      const userJson = await AsyncStorage.getItem(this.STORAGE_KEYS.USER);

      if (!userJson) {
        console.log('❌ [AuthService] Aucun utilisateur trouvé');
        return null;
      }

      const user: User = JSON.parse(userJson);
      console.log('✅ [AuthService] Utilisateur courant:', {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });

      return user;
    } catch (error: any) {
      console.error('❌ [AuthService] Erreur getCurrentUser:', error.message);
      return null;
    }
  }

  /**
   * 🔄 Rafraîchir les données utilisateur
   */
  async refreshUser(): Promise<User | null> {
    try {
      console.log('🔄 [AuthService] Rafraîchissement utilisateur...');

      const [apiKey, username, password] = await AsyncStorage.multiGet([
        this.STORAGE_KEYS.API_KEY,
        this.STORAGE_KEYS.USERNAME,
        this.STORAGE_KEYS.PASSWORD,
      ]);

      if (!apiKey[1] || !username[1] || !password[1]) {
        console.log('❌ [AuthService] Credentials manquants');
        return null;
      }

      // Réauthentifier pour obtenir les données à jour
      const authResponse = await apiService.authenticate(username[1], password[1]);

      if (authResponse.Status !== 'auth successful') {
        console.log('❌ [AuthService] Réauthentification échouée');
        return null;
      }

      const userId = authResponse.uid;
      const userName = authResponse.User;

      // Déterminer le rôle
      let role: 'medecin' | 'patiente' | 'admin' = 'admin';
      let profileData: any = null;

      // Vérifier si médecin
      try {
        const medecinData = await apiService.checkMedecinRole(
          userId,
          apiKey[1],
          username[1],
          password[1]
        );

        if (medecinData) {
          role = 'medecin';
          profileData = medecinData;
        }
      } catch (error: any) {
        console.warn('⚠️ [AuthService] Erreur vérification médecin:', error.message);
      }

      // Si pas médecin, vérifier si patiente
      if (role === 'admin') {
        try {
          const patienteData = await apiService.checkPatienteRole(
            userId,
            apiKey[1],
            username[1],
            password[1]
          );

          if (patienteData) {
            role = 'patiente';
            profileData = patienteData;
          }
        } catch (error: any) {
          console.warn('⚠️ [AuthService] Erreur vérification patiente:', error.message);
        }
      }

      // Construire l'objet User
      const user: User = {
        id: userId,
        name: userName || 'Utilisateur',
        email: username[1],
        role: role,
        apiKey: apiKey[1],
      };

      if (role === 'medecin' && profileData) {
        user.medecinId = profileData.id;
        user.specialite = profileData.specialite || 'Non spécifié';
        user.grade = profileData.niveau || profileData.grade || 'resident';
        user.telephone = profileData.telephone || '';
      } else if (role === 'patiente' && profileData) {
        user.patienteId = profileData.id;
        user.dateNaissance = profileData.date_naissance || null;
        user.age = profileData.age || null;
        user.telephone = profileData.telephone || '';
        user.estEnceinte = profileData.est_enceinte || false;
        user.niveauRisque = profileData.niveau_risque_global || 'faible';
      }

      // Sauvegarder
      await AsyncStorage.setItem(this.STORAGE_KEYS.USER, JSON.stringify(user));

      console.log('✅ [AuthService] Utilisateur rafraîchi:', {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });

      return user;
    } catch (error: any) {
      console.error('❌ [AuthService] Erreur refreshUser:', error.message);
      return null;
    }
  }

  /**
   * 🔑 Récupérer l'API Key
   */
  async getApiKey(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.STORAGE_KEYS.API_KEY);
    } catch (error: any) {
      console.error('❌ [AuthService] Erreur getApiKey:', error.message);
      return null;
    }
  }

  /**
   * 👤 Récupérer les credentials
   */
  async getCredentials(): Promise<{ username: string; password: string; apiKey: string } | null> {
    try {
      const [apiKey, username, password] = await AsyncStorage.multiGet([
        this.STORAGE_KEYS.API_KEY,
        this.STORAGE_KEYS.USERNAME,
        this.STORAGE_KEYS.PASSWORD,
      ]);

      if (!apiKey[1] || !username[1] || !password[1]) {
        return null;
      }

      return {
        apiKey: apiKey[1],
        username: username[1],
        password: password[1],
      };
    } catch (error: any) {
      console.error('❌ [AuthService] Erreur getCredentials:', error.message);
      return null;
    }
  }

  /**
   * 🔄 Mettre à jour le profil utilisateur
   */
  async updateUserProfile(updates: Partial<User>): Promise<User | null> {
    try {
      console.log('🔄 [AuthService] Mise à jour profil utilisateur...');

      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        console.log('❌ [AuthService] Aucun utilisateur courant');
        return null;
      }

      // Fusionner les mises à jour
      const updatedUser: User = {
        ...currentUser,
        ...updates,
      };

      // Sauvegarder
      await AsyncStorage.setItem(this.STORAGE_KEYS.USER, JSON.stringify(updatedUser));

      console.log('✅ [AuthService] Profil mis à jour:', {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      });

      return updatedUser;
    } catch (error: any) {
      console.error('❌ [AuthService] Erreur updateUserProfile:', error.message);
      return null;
    }
  }

  /**
   * 🔍 Vérifier si l'utilisateur a un rôle spécifique
   */
  async hasRole(role: 'medecin' | 'patiente' | 'admin'): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return user?.role === role;
    } catch (error: any) {
      console.error('❌ [AuthService] Erreur hasRole:', error.message);
      return false;
    }
  }

  /**
   * 🔍 Récupérer l'ID du profil (médecin ou patiente)
   */
  async getProfileId(): Promise<number | null> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return null;

      if (user.role === 'medecin') {
        return user.medecinId || null;
      } else if (user.role === 'patiente') {
        return user.patienteId || null;
      }

      return null;
    } catch (error: any) {
      console.error('❌ [AuthService] Erreur getProfileId:', error.message);
      return null;
    }
  }

  /**
   * 🧹 Nettoyer toutes les données (pour debug)
   */
  async clearAll(): Promise<void> {
    try {
      console.log('🧹 [AuthService] Nettoyage de toutes les données...');
      await AsyncStorage.clear();
      console.log('✅ [AuthService] Toutes les données supprimées');
    } catch (error: any) {
      console.error('❌ [AuthService] Erreur clearAll:', error.message);
      throw error;
    }
  }

  /**
   * 📊 Obtenir les statistiques de session
   */
  async getSessionInfo(): Promise<{
    isAuthenticated: boolean;
    user: User | null;
    apiKey: string | null;
    credentials: { username: string; password: string; apiKey: string } | null;
  }> {
    try {
      const isAuthenticated = await this.isAuthenticated();
      const user = await this.getCurrentUser();
      const apiKey = await this.getApiKey();
      const credentials = await this.getCredentials();

      return {
        isAuthenticated,
        user,
        apiKey,
        credentials,
      };
    } catch (error: any) {
      console.error('❌ [AuthService] Erreur getSessionInfo:', error.message);
      return {
        isAuthenticated: false,
        user: null,
        apiKey: null,
        credentials: null,
      };
    }
  }
}

export default new AuthService();

