import axios, { AxiosInstance, AxiosResponse } from 'axios';

const BASE_URL = 'https://salamet.bizup.tn';
const DATABASE = 'salamet';

class ApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    // ✅ Configuration Axios SANS Content-Type par défaut
    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      // ❌ NE PAS mettre de headers par défaut pour les requêtes GET
    });

    // Intercepteurs pour le debug
    this.axiosInstance.interceptors.request.use(
      (config) => {
        console.log('📤 [AXIOS] Requête:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: config.headers,
        });
        return config;
      },
      (error) => {
        console.error('❌ [AXIOS] Erreur requête:', error);
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log('📥 [AXIOS] Réponse:', {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        console.error('❌ [AXIOS] Erreur réponse:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * 🔌 Tester la connexion au serveur
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔌 [API] Test de connexion...');
      const response = await this.axiosInstance.get('/web/database/list');
      console.log('✅ [API] Connexion réussie');
      return response.status === 200;
    } catch (error: any) {
      console.error('❌ [API] Échec de connexion:', error.message);
      return false;
    }
  }

  /**
   * 🔐 Authentification via /odoo_connect (Module Cybrosys)
   * ✅ Format EXACT comme curl
   */
  async authenticate(username: string, password: string): Promise<any> {
    try {
      console.log('\n🔐 ========================================');
      console.log('🔐 [API] AUTHENTIFICATION (Module Cybrosys)');
      console.log('🔐 ========================================');
      console.log('📍 URL:', `${BASE_URL}/odoo_connect`);
      console.log('📍 Database:', DATABASE);
      console.log('📍 Username:', username);

      // ✅ Headers EXACTEMENT comme curl (sans Content-Type)
      const headers = {
        'db': DATABASE,
        'login': username,
        'password': password,
      };

      console.log('📋 Headers:', JSON.stringify(headers, null, 2));

      const startTime = Date.now();

      // ✅ Requête GET sans transformRequest ni transformResponse
      const response: AxiosResponse = await this.axiosInstance.get('/odoo_connect', {
        headers: headers,
        transformRequest: [(data) => data], // Ne pas transformer
        transformResponse: [(data) => {
          // Parser manuellement
          try {
            return JSON.parse(data);
          } catch (e) {
            return data;
          }
        }],
      });

      const duration = Date.now() - startTime;

      console.log('⏱️  Durée:', duration + 'ms');
      console.log('📊 Status:', response.status);
      console.log('📦 Données:', JSON.stringify(response.data, null, 2));

      // Vérifier si c'est une erreur HTML
      if (typeof response.data === 'string') {
        if (response.data.includes('wrong login credentials')) {
          console.error('❌ Identifiants incorrects');
          throw new Error('Identifiants incorrects');
        }
        
        if (response.data.includes('missing parameters')) {
          console.error('❌ Paramètres manquants');
          throw new Error('Paramètres manquants dans la requête');
        }

        console.error('❌ Réponse HTML inattendue:', response.data);
        throw new Error('Réponse invalide du serveur');
      }

      // Vérifier la réponse JSON
      if (response.data && response.data.Status === 'auth successful') {
        console.log('✅ ========================================');
        console.log('✅ AUTHENTIFICATION RÉUSSIE');
        console.log('✅ ========================================');
        console.log('👤 User:', response.data.User);
        console.log('🔑 API Key:', response.data['api-key']);
        console.log('🆔 UID:', response.data.uid);
        console.log('✅ ========================================\n');
        return response.data;
      }

      console.error('❌ Réponse invalide:', response.data);
      throw new Error('Réponse d\'authentification invalide');

    } catch (error: any) {
      console.error('❌ ========================================');
      console.error('❌ ERREUR AUTHENTIFICATION');
      console.error('❌ ========================================');
      console.error('❌ Message:', error.message);
      
      if (error.response) {
        console.error('❌ Status:', error.response.status);
        console.error('❌ Data:', error.response.data);
      }
      
      console.error('❌ ========================================\n');
      throw error;
    }
  }

  /**
   * 📡 Récupérer des données via /send_request (Module Cybrosys)
   */
  async sendRequest(
    model: string,
    apiKey: string,
    username: string,
    password: string,
    id?: number,
    fields?: string[]
  ): Promise<any> {
    try {
      console.log(`📡 [API] send_request: ${model}${id ? ` (ID: ${id})` : ''}`);

      // Construction de l'URL avec les paramètres
      let url = `/send_request?model=${model}`;
      if (id) {
        url += `&Id=${id}`;
      }

      // Headers selon la documentation Cybrosys
      const headers = {
        'db': DATABASE,
        'login': username,
        'password': password,
        'api-key': apiKey,
      };

      console.log('📋 URL:', url);
      console.log('📋 Headers:', headers);

      // ✅ Pour GET, on ne met pas de body
      const response: AxiosResponse = await this.axiosInstance.get(url, {
        headers: headers,
        transformRequest: [(data) => data],
        transformResponse: [(data) => {
          try {
            return JSON.parse(data);
          } catch (e) {
            return data;
          }
        }],
      });

      console.log('✅ [API] send_request réussi');
      return response.data;
    } catch (error: any) {
      console.error('❌ [API] Erreur send_request:', error.message);
      
      if (error.response?.data) {
        console.error('❌ Réponse:', error.response.data);
      }
      
      throw error;
    }
  }

  /**
   * 🆔 Récupérer les données utilisateur
   */
  async getUserData(apiKey: string, username: string, password: string): Promise<any> {
    try {
      console.log('🔍 [API] Récupération données utilisateur:', username);
      return await this.sendRequest('res.users', apiKey, username, password);
    } catch (error: any) {
      console.error('❌ [API] Erreur getUserData:', error.message);
      throw error;
    }
  }

  /**
   * 👨‍⚕️ Vérifier si l'utilisateur est un médecin
   */
  async checkMedecinRole(
    userId: number,
    apiKey: string,
    username: string,
    password: string
  ): Promise<any> {
    try {
      console.log('👨‍⚕️ [API] Vérification rôle médecin pour userId:', userId);

      const response = await this.sendRequest('salamet.medecin', apiKey, username, password);

      if (response && response.records) {
        const medecin = response.records.find((m: any) => {
          const medecinUserId = Array.isArray(m.user_id) ? m.user_id[0] : m.user_id;
          return medecinUserId === userId;
        });

        if (medecin) {
          console.log('✅ [API] Médecin trouvé:', medecin);
        } else {
          console.log('ℹ️ [API] Aucun médecin trouvé pour userId:', userId);
        }

        return medecin || null;
      }

      return null;
    } catch (error: any) {
      console.error('❌ [API] Erreur checkMedecinRole:', error.message);
      throw error;
    }
  }

  /**
   * 🔧 Créer un enregistrement (POST)
   */
  async createRecord(
    model: string,
    apiKey: string,
    username: string,
    password: string,
    values: any
  ): Promise<any> {
    try {
      console.log(`📝 [API] Création enregistrement: ${model}`);

      const url = `/send_request?model=${model}`;

      const headers = {
        'db': DATABASE,
        'login': username,
        'password': password,
        'api-key': apiKey,
        'Content-Type': 'application/json', // ← Pour POST, on met Content-Type
      };

      const data = {
        fields: Object.keys(values),
        values: values,
      };

      console.log('📋 URL:', url);
      console.log('📋 Data:', data);

      const response: AxiosResponse = await this.axiosInstance.post(url, data, {
        headers: headers,
      });

      console.log('✅ [API] Enregistrement créé:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [API] Erreur createRecord:', error.message);
      throw error;
    }
  }

  /**
   * 🔧 Mettre à jour un enregistrement (PUT)
   */
  async updateRecord(
    model: string,
    id: number,
    apiKey: string,
    username: string,
    password: string,
    values: any
  ): Promise<any> {
    try {
      console.log(`✏️ [API] Mise à jour enregistrement: ${model} (ID: ${id})`);

      const url = `/send_request?model=${model}&Id=${id}`;

      const headers = {
        'db': DATABASE,
        'login': username,
        'password': password,
        'api-key': apiKey,
        'Content-Type': 'application/json',
      };

      const data = {
        fields: Object.keys(values),
        values: values,
      };

      console.log('📋 URL:', url);
      console.log('📋 Data:', data);

      const response: AxiosResponse = await this.axiosInstance.put(url, data, {
        headers: headers,
      });

      console.log('✅ [API] Enregistrement mis à jour:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [API] Erreur updateRecord:', error.message);
      throw error;
    }
  }

  /**
   * 🔧 Supprimer un enregistrement (DELETE)
   */
  async deleteRecord(
    model: string,
    id: number,
    apiKey: string,
    username: string,
    password: string
  ): Promise<any> {
    try {
      console.log(`🗑️ [API] Suppression enregistrement: ${model} (ID: ${id})`);

      const url = `/send_request?model=${model}&Id=${id}`;

      const headers = {
        'db': DATABASE,
        'login': username,
        'password': password,
        'api-key': apiKey,
      };

      console.log('📋 URL:', url);

      const response: AxiosResponse = await this.axiosInstance.delete(url, {
        headers: headers,
      });

      console.log('✅ [API] Enregistrement supprimé:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [API] Erreur deleteRecord:', error.message);
      throw error;
    }
  }

  /**
   * 📋 Méthodes génériques (pour compatibilité)
   */
  async get(endpoint: string, params?: any, headers?: any): Promise<any> {
    try {
      const response: AxiosResponse = await this.axiosInstance.get(endpoint, {
        params,
        headers,
      });
      return response.data;
    } catch (error: any) {
      console.error(`❌ [API] Erreur GET ${endpoint}:`, error.message);
      throw error;
    }
  }

  async post(endpoint: string, data?: any, headers?: any): Promise<any> {
    try {
      const response: AxiosResponse = await this.axiosInstance.post(endpoint, data, {
        headers,
      });
      return response.data;
    } catch (error: any) {
      console.error(`❌ [API] Erreur POST ${endpoint}:`, error.message);
      throw error;
    }
  }

  async put(endpoint: string, data?: any, headers?: any): Promise<any> {
    try {
      const response: AxiosResponse = await this.axiosInstance.put(endpoint, data, {
        headers,
      });
      return response.data;
    } catch (error: any) {
      console.error(`❌ [API] Erreur PUT ${endpoint}:`, error.message);
      throw error;
    }
  }

  async delete(endpoint: string, headers?: any): Promise<any> {
    try {
      const response: AxiosResponse = await this.axiosInstance.delete(endpoint, {
        headers,
      });
      return response.data;
    } catch (error: any) {
      console.error(`❌ [API] Erreur DELETE ${endpoint}:`, error.message);
      throw error;
    }
  }
}

export default new ApiService();

