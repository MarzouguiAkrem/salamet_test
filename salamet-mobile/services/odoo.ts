import AsyncStorage from '@react-native-async-storage/async-storage';
import { ODOO_CONFIG, odooLogger } from '../config/odoo';
import { fetchWithTimeout, createTimeoutSignal } from '../utils/timeout';
import {
  OdooAuthResponse,
  OdooSearchReadResponse,
  SendRequestPayload,
} from '../types';

/**
 * 🌐 Service API Odoo
 */
class OdooApiService {
  private baseUrl: string;
  private database: string;
  private apiKey: string | null = null;

  constructor() {
    this.baseUrl = ODOO_CONFIG.BASE_URL;
    this.database = ODOO_CONFIG.DATABASE;
    this.loadApiKey();
  }

  /**
   * 🔑 Charger l'API key depuis le storage
   */
  private async loadApiKey() {
    try {
      this.apiKey = await AsyncStorage.getItem(ODOO_CONFIG.STORAGE_KEYS.API_KEY);
    } catch (error) {
      odooLogger.error('Erreur chargement API key:', error);
    }
  }

  /**
   * 🔐 Authentification
   */
  async authenticate(username: string, password: string): Promise<OdooAuthResponse> {
    try {
      odooLogger.log('Authentification:', { username, database: this.database });

      // ✅ UTILISER fetchWithTimeout au lieu de AbortSignal.timeout
      const response = await fetchWithTimeout(
        `${this.baseUrl}/api/authenticate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            params: {
              db: this.database,
              login: username,
              password: password,
            },
          }),
        },
        ODOO_CONFIG.TIMEOUT
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.data?.message || 'Erreur d\'authentification');
      }

      const result = data.result;

      if (result.Status !== 'Success') {
        throw new Error('Identifiants incorrects');
      }

      this.apiKey = result['api-key'];
      await AsyncStorage.setItem(ODOO_CONFIG.STORAGE_KEYS.API_KEY, this.apiKey!);

      odooLogger.success('Authentification réussie');
      return result;
    } catch (error: any) {
      odooLogger.error('Erreur authentification:', error);
      
      if (error.message === 'Délai d\'attente dépassé') {
        throw new Error('Délai d\'attente dépassé. Vérifiez votre connexion.');
      }
      
      throw new Error(error.message || 'Erreur de connexion au serveur');
    }
  }

  /**
   * 📤 Envoyer une requête générique
   */
  async sendRequest(payload: SendRequestPayload): Promise<any> {
    try {
      // Récupérer l'API key si pas en mémoire
      if (!this.apiKey) {
        this.apiKey = await AsyncStorage.getItem(ODOO_CONFIG.STORAGE_KEYS.API_KEY);
        if (!this.apiKey) {
          throw new Error('Non authentifié');
        }
      }

      odooLogger.request(payload.method, payload.model, payload.args);

      // ✅ UTILISER fetchWithTimeout
      const response = await fetchWithTimeout(
        `${this.baseUrl}/api/call`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.apiKey,
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            params: {
              model: payload.model,
              method: payload.method,
              args: payload.args,
              kwargs: payload.kwargs || {},
            },
          }),
        },
        ODOO_CONFIG.TIMEOUT
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Token expiré, nettoyer
          this.apiKey = null;
          await AsyncStorage.removeItem(ODOO_CONFIG.STORAGE_KEYS.API_KEY);
          throw new Error('Session expirée, veuillez vous reconnecter');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        odooLogger.error('Erreur serveur:', data.error);
        throw new Error(data.error.data?.message || 'Erreur serveur');
      }

      odooLogger.response(payload.method, payload.model);
      return data.result;
    } catch (error: any) {
      odooLogger.error('Erreur requête:', error);
      
      if (error.message === 'Délai d\'attente dépassé') {
        throw new Error('Délai d\'attente dépassé');
      }
      
      throw error;
    }
  }

  /**
   * 🔍 Search & Read
   */
  async searchRead<T = any>(
    model: string,
    domain: any[] = [],
    fields: string[] = [],
    limit?: number,
    offset?: number,
    order?: string
  ): Promise<OdooSearchReadResponse<T>> {
    try {
      const payload: SendRequestPayload = {
        model,
        method: 'search_read',
        args: [],
        kwargs: {
          domain,
          fields,
          limit: limit || ODOO_CONFIG.DEFAULT_LIMIT,
          offset,
          order,
        },
      };

      const result = await this.sendRequest(payload);

      return {
        records: result || [],
        length: result?.length || 0,
      };
    } catch (error) {
      odooLogger.error(`Erreur search_read ${model}:`, error);
      throw error;
    }
  }

  /**
   * 📝 Create
   */
  async create(model: string, values: any): Promise<number> {
    try {
      odooLogger.log(`Création ${model}:`, values);

      const payload: SendRequestPayload = {
        model,
        method: 'create',
        args: [values],
        kwargs: {},
      };

      const result = await this.sendRequest(payload);
      odooLogger.success(`${model} créé, ID:`, result);
      return result;
    } catch (error) {
      odooLogger.error(`Erreur création ${model}:`, error);
      throw error;
    }
  }

  /**
   * ✏️ Write (Update)
   */
  async write(model: string, ids: number[], values: any): Promise<boolean> {
    try {
      odooLogger.log(`Mise à jour ${model}:`, { ids, values });

      const payload: SendRequestPayload = {
        model,
        method: 'write',
        args: [ids, values],
        kwargs: {},
      };

      const result = await this.sendRequest(payload);
      odooLogger.success(`${model} mis à jour`);
      return result;
    } catch (error) {
      odooLogger.error(`Erreur mise à jour ${model}:`, error);
      throw error;
    }
  }

  /**
   * 🗑️ Unlink (Delete)
   */
  async unlink(model: string, ids: number[]): Promise<boolean> {
    try {
      odooLogger.log(`Suppression ${model}:`, ids);

      const payload: SendRequestPayload = {
        model,
        method: 'unlink',
        args: [ids],
        kwargs: {},
      };

      const result = await this.sendRequest(payload);
      odooLogger.success(`${model} supprimé`);
      return result;
    } catch (error) {
      odooLogger.error(`Erreur suppression ${model}:`, error);
      throw error;
    }
  }

  /**
   * 🔢 Search Count
   */
  async searchCount(model: string, domain: any[] = []): Promise<number> {
    try {
      const payload: SendRequestPayload = {
        model,
        method: 'search_count',
        args: [domain],
        kwargs: {},
      };

      const result = await this.sendRequest(payload);
      return result || 0;
    } catch (error) {
      odooLogger.error(`Erreur search_count ${model}:`, error);
      throw error;
    }
  }

  /**
   * 📖 Read
   */
  async read<T = any>(
    model: string,
    ids: number[],
    fields: string[] = []
  ): Promise<T[]> {
    try {
      const payload: SendRequestPayload = {
        model,
        method: 'read',
        args: [ids],
        kwargs: {
          fields,
        },
      };

      const result = await this.sendRequest(payload);
      return result || [];
    } catch (error) {
      odooLogger.error(`Erreur read ${model}:`, error);
      throw error;
    }
  }

  /**
   * 🔍 Search (retourne uniquement les IDs)
   */
  async search(
    model: string,
    domain: any[] = [],
    limit?: number,
    offset?: number,
    order?: string
  ): Promise<number[]> {
    try { 
              const payload: SendRequestPayload = {
        model,
        method: 'search',
        args: [domain],
        kwargs: {
          limit: limit || ODOO_CONFIG.DEFAULT_LIMIT,
          offset,
          order,
        },
      };

      const result = await this.sendRequest(payload);
      return result || [];
    } catch (error) {
      odooLogger.error(`Erreur search ${model}:`, error);
      throw error;
    }
  }

  /**
   * 🔄 Appeler une méthode personnalisée
   */
  async callMethod(
    model: string,
    method: string,
    args: any[] = [],
    kwargs: any = {}
  ): Promise<any> {
    try {
      const payload: SendRequestPayload = {
        model,
        method,
        args,
        kwargs,
      };

      return await this.sendRequest(payload);
    } catch (error) {
      odooLogger.error(`Erreur méthode ${method}:`, error);
      throw error;
    }
  }

  /**
   * 🧹 Nettoyer l'API key
   */
  async clearApiKey(): Promise<void> {
    this.apiKey = null;
    await AsyncStorage.removeItem(ODOO_CONFIG.STORAGE_KEYS.API_KEY);
    odooLogger.log('API key nettoyée');
  }

  /**
   * ⚙️ Changer la configuration
   */
  setConfig(baseUrl?: string, database?: string) {
    if (baseUrl) {
      this.baseUrl = baseUrl;
      odooLogger.log('Base URL mise à jour:', baseUrl);
    }
    if (database) {
      this.database = database;
      odooLogger.log('Database mise à jour:', database);
    }
  }

  /**
   * 📊 Obtenir la configuration actuelle
   */
  getConfig() {
    return {
      baseUrl: this.baseUrl,
      database: this.database,
      hasApiKey: !!this.apiKey,
    };
  }

  /**
   * 🏥 Test de connexion au serveur
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      odooLogger.log('Test de connexion...');

      // ✅ UTILISER fetchWithTimeout
      const response = await fetchWithTimeout(
        `${this.baseUrl}/web/database/list`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'call',
            params: {},
          }),
        },
        5000 // 5 secondes pour le test
      );

      if (response.ok) {
        odooLogger.success('Connexion réussie');
        return {
          success: true,
          message: 'Connexion au serveur réussie',
        };
      } else {
        return {
          success: false,
          message: `Erreur HTTP ${response.status}`,
        };
      }
    } catch (error: any) {
      odooLogger.error('Erreur test connexion:', error);
      return {
        success: false,
        message: error.message || 'Impossible de se connecter au serveur',
      };
    }
  }

  /**
   * 📊 Obtenir les statistiques de l'API
   */
  getStats() {
    return {
      baseUrl: this.baseUrl,
      database: this.database,
      authenticated: !!this.apiKey,
      timeout: ODOO_CONFIG.TIMEOUT,
      retryAttempts: ODOO_CONFIG.RETRY_ATTEMPTS,
    };
  }
}

// Export de l'instance singleton
export const odooApi = new OdooApiService();
export default odooApi;

