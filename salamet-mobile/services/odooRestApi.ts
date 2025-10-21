import AsyncStorage from '@react-native-async-storage/async-storage';
import { ODOO_CONFIG, odooLogger } from '../config/odoo';

/**
 * 🔧 Types
 */
interface AuthResponse {
  Status: string;
  User: string;
  'api-key': string;
}

interface OdooRecord {
  id: number;
  [key: string]: any;
}

interface SendRequestResponse {
  records?: OdooRecord[];
  'New resource'?: OdooRecord[];
  'Updated resource'?: OdooRecord[];
  'Resource deleted'?: OdooRecord[];
  error?: string;
}

/**
 * ⏱️ Fetch avec timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Délai d\'attente dépassé');
    }
    throw error;
  }
}

/**
 * 🌐 Service REST API Odoo
 */
class OdooRestApiService {
  private baseUrl: string;
  private database: string;
  private apiKey: string | null = null;
  private username: string | null = null;
  private password: string | null = null;

  constructor() {
    this.baseUrl = ODOO_CONFIG.BASE_URL;
    this.database = ODOO_CONFIG.DATABASE;
  }

  /**
   * 🔐 Authentification et génération de l'API Key
   */
  async authenticate(username: string, password: string): Promise<string> {
    try {
      odooLogger.log('🔐 Authentification REST API...');
      odooLogger.debug('Credentials', { username, database: this.database });

      let response: Response | null = null;
      let method = '';
      let lastError = '';

      // MÉTHODE 1: GET avec paramètres dans l'URL
      try {
        method = 'GET avec URL';
        const url = `${this.baseUrl}/odoo_connect?db=${this.database}&login=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
        
        odooLogger.log('📤 Tentative:', method);

        response = await fetchWithTimeout(
          url,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          },
          ODOO_CONFIG.TIMEOUT
        );

        if (response.ok) {
          try {
            const data: AuthResponse = await response.json();
            odooLogger.log('📦 Données reçues:', data);

            if (data.Status === 'auth successful' && data['api-key']) {
              this.apiKey = data['api-key'];
              this.username = username;
              this.password = password;

              await AsyncStorage.setItem(ODOO_CONFIG.STORAGE_KEYS.API_KEY, this.apiKey);
              await AsyncStorage.setItem(ODOO_CONFIG.STORAGE_KEYS.USERNAME, username);
              await AsyncStorage.setItem(ODOO_CONFIG.STORAGE_KEYS.PASSWORD, password);

              odooLogger.success(`✅ Authentification réussie (${method})`);
              odooLogger.log('User:', data.User);
              odooLogger.log('API Key:', this.apiKey);

              return this.apiKey;
            } else {
              lastError = `${method} - Réponse invalide: ${JSON.stringify(data)}`;
              odooLogger.warn(lastError);
            }
          } catch (jsonError: any) {
            const text = await response.text();
            lastError = `${method} - Erreur parsing JSON: ${jsonError.message}`;
            odooLogger.warn(lastError);
            odooLogger.warn('Texte brut:', text.substring(0, 200));
          }
        } else {
          const text = await response.text();
          lastError = `${method} - HTTP ${response.status}: ${text.substring(0, 100)}`;
          odooLogger.warn(lastError);
        }
      } catch (error: any) {
        lastError = `${method} - ${error.message}`;
        odooLogger.warn(`⚠️  ${method} échoué:`, error.message);
      }

      // MÉTHODE 2: GET avec headers (CELLE QUI FONCTIONNE)
      try {
        method = 'GET avec headers';
        const url = `${this.baseUrl}/odoo_connect`;
        
        odooLogger.log('📤 Tentative:', method);

        response = await fetchWithTimeout(
          url,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'db': this.database,
              'login': username,
              'password': password,
            },
          },
          ODOO_CONFIG.TIMEOUT
        );

        if (response.ok) {
          // ⬇️ NE PAS VÉRIFIER LE CONTENT-TYPE
          // Le serveur Odoo renvoie text/html mais c'est du JSON valide
          
          try {
            const data: AuthResponse = await response.json();
            odooLogger.log('📦 Données reçues:', data);

            if (data.Status === 'auth successful' && data['api-key']) {
              this.apiKey = data['api-key'];
              this.username = username;
              this.password = password;

              await AsyncStorage.setItem(ODOO_CONFIG.STORAGE_KEYS.API_KEY, this.apiKey);
              await AsyncStorage.setItem(ODOO_CONFIG.STORAGE_KEYS.USERNAME, username);
              await AsyncStorage.setItem(ODOO_CONFIG.STORAGE_KEYS.PASSWORD, password);

              odooLogger.success(`✅ Authentification réussie (${method})`);
              odooLogger.log('User:', data.User);
              odooLogger.log('API Key:', this.apiKey);

              return this.apiKey;
            } else {
              lastError = `${method} - Réponse invalide: ${JSON.stringify(data)}`;
              odooLogger.warn(lastError);
            }
          } catch (jsonError: any) {
            const text = await response.text();
            lastError = `${method} - Erreur parsing JSON: ${jsonError.message}`;
            odooLogger.warn(lastError);
            odooLogger.warn('Texte brut:', text.substring(0, 200));
          }
        } else {
          const text = await response.text();
          lastError = `${method} - HTTP ${response.status}: ${text.substring(0, 100)}`;
          odooLogger.warn(lastError);
        }
      } catch (error: any) {
        lastError = `${method} - ${error.message}`;
        odooLogger.warn(`⚠️  ${method} échoué:`, error.message);
      }

      // MÉTHODE 3: POST avec body JSON
      try {
        method = 'POST avec body';
        const url = `${this.baseUrl}/odoo_connect`;
        
        odooLogger.log('📤 Tentative:', method);

        response = await fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              db: this.database,
              login: username,
              password: password,
            }),
          },
          ODOO_CONFIG.TIMEOUT
        );

        if (response.ok) {
          try {
            const data: AuthResponse = await response.json();
            odooLogger.log('📦 Données reçues:', data);

            if (data.Status === 'auth successful' && data['api-key']) {
              this.apiKey = data['api-key'];
              this.username = username;
              this.password = password;

              await AsyncStorage.setItem(ODOO_CONFIG.STORAGE_KEYS.API_KEY, this.apiKey);
              await AsyncStorage.setItem(ODOO_CONFIG.STORAGE_KEYS.USERNAME, username);
              await AsyncStorage.setItem(ODOO_CONFIG.STORAGE_KEYS.PASSWORD, password);

              odooLogger.success(`✅ Authentification réussie (${method})`);
              odooLogger.log('User:', data.User);
              odooLogger.log('API Key:', this.apiKey);

              return this.apiKey;
            } else {
              lastError = `${method} - Réponse invalide: ${JSON.stringify(data)}`;
              odooLogger.warn(lastError);
            }
          } catch (jsonError: any) {
            const text = await response.text();
            lastError = `${method} - Erreur parsing JSON: ${jsonError.message}`;
            odooLogger.warn(lastError);
            odooLogger.warn('Texte brut:', text.substring(0, 200));
          }
        } else {
          const text = await response.text();
          lastError = `${method} - HTTP ${response.status}: ${text.substring(0, 100)}`;
          odooLogger.warn(lastError);
        }
      } catch (error: any) {
        lastError = `${method} - ${error.message}`;
        odooLogger.warn(`⚠️  ${method} échoué:`, error.message);
      }

      // MÉTHODE 4: POST avec headers
      try {
        method = 'POST avec headers';
        const url = `${this.baseUrl}/odoo_connect`;
        
        odooLogger.log('📤 Tentative:', method);

        response = await fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'db': this.database,
              'login': username,
              'password': password,
            },
          },
          ODOO_CONFIG.TIMEOUT
        );

        if (response.ok) {
          try {
            const data: AuthResponse = await response.json();
            odooLogger.log('📦 Données reçues:', data);

            if (data.Status === 'auth successful' && data['api-key']) {
              this.apiKey = data['api-key'];
              this.username = username;
              this.password = password;

              await AsyncStorage.setItem(ODOO_CONFIG.STORAGE_KEYS.API_KEY, this.apiKey);
              await AsyncStorage.setItem(ODOO_CONFIG.STORAGE_KEYS.USERNAME, username);
              await AsyncStorage.setItem(ODOO_CONFIG.STORAGE_KEYS.PASSWORD, password);

              odooLogger.success(`✅ Authentification réussie (${method})`);
              odooLogger.log('User:', data.User);
              odooLogger.log('API Key:', this.apiKey);

              return this.apiKey;
            } else {
              lastError = `${method} - Réponse invalide: ${JSON.stringify(data)}`;
              odooLogger.warn(lastError);
            }
          } catch (jsonError: any) {
            const text = await response.text();
            lastError = `${method} - Erreur parsing JSON: ${jsonError.message}`;
            odooLogger.warn(lastError);
            odooLogger.warn('Texte brut:', text.substring(0, 200));
          }
        } else {
          const text = await response.text();
          lastError = `${method} - HTTP ${response.status}: ${text.substring(0, 100)}`;
          odooLogger.warn(lastError);
        }
      } catch (error: any) {
        lastError = `${method} - ${error.message}`;
        odooLogger.warn(`⚠️  ${method} échoué:`, error.message);
      }

      // Toutes les méthodes ont échoué
      odooLogger.error('❌ Toutes les méthodes ont échoué');
      odooLogger.error('Dernière erreur:', lastError);

      throw new Error(
        `Impossible de se connecter au serveur Odoo.\n\n` +
        `Dernière erreur: ${lastError}\n\n` +
        `Vérifiez:\n` +
        `1. L'URL du serveur: ${this.baseUrl}\n` +
        `2. Le nom de la base de données: ${this.database}\n` +
        `3. Vos identifiants (email/mot de passe)\n` +
        `4. Que le module REST API est installé\n` +
        `5. Votre connexion Internet`
      );
    } catch (error: any) {
      odooLogger.error('❌ Erreur authentification:', error);
      
      if (error.message === 'Délai d\'attente dépassé') {
        throw new Error('Délai d\'attente dépassé. Vérifiez votre connexion Internet.');
      }
      
      throw error;
    }
  }

  /**
   * 📥 Charger l'API Key depuis le stockage
   */
  async loadApiKey(): Promise<boolean> {
    try {
      const apiKey = await AsyncStorage.getItem(ODOO_CONFIG.STORAGE_KEYS.API_KEY);
      const username = await AsyncStorage.getItem(ODOO_CONFIG.STORAGE_KEYS.USERNAME);
      const password = await AsyncStorage.getItem(ODOO_CONFIG.STORAGE_KEYS.PASSWORD);

      if (apiKey && username) {
        this.apiKey = apiKey;
        this.username = username;
        this.password = password;
        odooLogger.log('✅ API Key chargée depuis le stockage');
        return true;
      }

      odooLogger.warn('⚠️ Aucune API Key trouvée');
      return false;
    } catch (error) {
      odooLogger.error('❌ Erreur chargement API Key:', error);
      return false;
    }
  }

  /**
   * 🗑️ Nettoyer l'API Key
   */
  async clearApiKey(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ODOO_CONFIG.STORAGE_KEYS.API_KEY);
      await AsyncStorage.removeItem(ODOO_CONFIG.STORAGE_KEYS.USERNAME);
      await AsyncStorage.removeItem(ODOO_CONFIG.STORAGE_KEYS.PASSWORD);
      this.apiKey = null;
      this.username = null;
      this.password = null;
      odooLogger.log('✅ API Key nettoyée');
    } catch (error) {
      odooLogger.error('❌ Erreur nettoyage API Key:', error);
      throw error;
    }
  }

  /**
   * ✅ Vérifier si authentifié
   */
  isAuthenticated(): boolean {
    return !!this.apiKey;
  }

  /**
   * 👤 Récupérer le nom d'utilisateur
   */
  getUsername(): string | null {
    return this.username;
  }

  /**
   * 📤 Envoyer une requête à l'API
   */
  private async sendRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    model: string,
    id?: number,
    fields?: string[],
    values?: any
  ): Promise<SendRequestResponse> {
    if (!this.apiKey || !this.username || !this.password) {
      throw new Error('Non authentifié. Veuillez vous connecter.');
    }

    try {
      let url = `${this.baseUrl}/send_request?model=${model}`;
      if (id) {
        url += `&Id=${id}`;
      }

      const body: any = {};
      if (fields) {
        body.fields = fields;
      }
      if (values) {
        body.values = values;
      }

      odooLogger.log(`📤 ${method} ${model}${id ? ` (ID: ${id})` : ''}`);
      odooLogger.debug('Body', body);

      const response = await fetchWithTimeout(
        url,
        {
          method,
          headers: {
            'Content-Type': 'application/json',
            'db': this.database,
            'login': this.username,
            'password': this.password,
            'api-key': this.apiKey,
          },
          body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
        },
        ODOO_CONFIG.TIMEOUT
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const data: SendRequestResponse = await response.json();
      odooLogger.success(`✅ ${method} réussi`);
      odooLogger.debug('Réponse', data);

      return data;
    } catch (error: any) {
      odooLogger.error(`❌ Erreur ${method}:`, error);
      throw error;
    }
  }

  /**
   * 📥 GET - Récupérer des enregistrements
   */
  async get(model: string, id?: number, fields?: string[]): Promise<OdooRecord[]> {
    const response = await this.sendRequest('GET', model, id, fields);
    return response.records || [];
  }

  /**
   * ➕ POST - Créer un enregistrement
   */
  async create(model: string, values: any, fields?: string[]): Promise<OdooRecord> {
    const response = await this.sendRequest('POST', model, undefined, fields, values);
    const newRecords = response['New resource'];
    if (!newRecords || newRecords.length === 0) {
      throw new Error('Aucun enregistrement créé');
    }
    return newRecords[0];
  }

  /**
   * ✏️ PUT - Mettre à jour un enregistrement
   */
  async update(model: string, id: number, values: any, fields?: string[]): Promise<OdooRecord> {
    const response = await this.sendRequest('PUT', model, id, fields, values);
    const updatedRecords = response['Updated resource'];
    if (!updatedRecords || updatedRecords.length === 0) {
      throw new Error('Aucun enregistrement mis à jour');
    }
    return updatedRecords[0];
  }

  /**
   * 🗑️ DELETE - Supprimer un enregistrement
   */
  async delete(model: string, id: number): Promise<OdooRecord> {
    const response = await this.sendRequest('DELETE', model, id);
    const deletedRecords = response['Resource deleted'];
    if (!deletedRecords || deletedRecords.length === 0) {
      throw new Error('Aucun enregistrement supprimé');
    }
    return deletedRecords[0];
  }

  /**
   * 🏥 Tester la connexion
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      odooLogger.log('🏥 Test de connexion...');

      const response = await fetchWithTimeout(
        `${this.baseUrl}/web/database/list`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        },
        ODOO_CONFIG.TIMEOUT
      );

      if (response.ok) {
        odooLogger.success('✅ Serveur Odoo accessible');
        return {
          success: true,
          message: 'Serveur Odoo accessible',
        };
      } else {
        odooLogger.warn('⚠️ Serveur répond mais erreur:', response.status);
        return {
          success: false,
          message: `Serveur répond avec le code ${response.status}`,
        };
      }
    } catch (error: any) {
      odooLogger.error('❌ Erreur connexion:', error);
      return {
        success: false,
        message: error.message || 'Impossible de se connecter au serveur',
      };
    }
  }
}

export const odooRestApi = new OdooRestApiService();
export default odooRestApi;


          
