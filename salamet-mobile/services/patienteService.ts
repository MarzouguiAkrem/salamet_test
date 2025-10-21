import apiService from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MODEL = 'salamet.patiente';

export const patienteService = {
  /**
   * Récupérer toutes les patientes avec filtrage
   */
  async getAll(domain: any[] = []): Promise<any[]> {
    try {
      const apiKey = await AsyncStorage.getItem('api_key');
      if (!apiKey) throw new Error('API key non disponible');

      const response = await apiService.get('/send_request', {
        model: MODEL,
        domain: JSON.stringify(domain),
        fields: JSON.stringify([
          'id', 'name', 'nom_complet', 'date_naissance', 'age',
          'telephone', 'email', 'adresse', 'groupe_sanguin',
          'poids', 'taille', 'imc',
          'gestite', 'parite', 'avortements',
          'est_enceinte', 'grossesse_actuelle_id',
          'nombre_grossesses', 'nombre_accouchements',
          'niveau_risque_global', 'score_risque',
          'medecin_ids'
        ])
      }, {
        'api-key': apiKey
      });

      return response.records || [];
    } catch (error) {
      console.error('❌ Erreur getAll patientes:', error);
      throw error;
    }
  },

  /**
   * Récupérer une patiente par ID
   */
  async getById(id: number): Promise<any> {
    try {
      const apiKey = await AsyncStorage.getItem('api_key');
      if (!apiKey) throw new Error('API key non disponible');

      const response = await apiService.get('/send_request', {
        model: MODEL,
        Id: id,
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
    } catch (error) {
      console.error(`❌ Erreur getById patiente ${id}:`, error);
      throw error;
    }
  },

  /**
   * Rechercher des patientes
   */
  async search(query: string, baseDomain: any[] = []): Promise<any[]> {
    try {
      const apiKey = await AsyncStorage.getItem('api_key');
      if (!apiKey) throw new Error('API key non disponible');

      // Construire le domaine de recherche
      let searchDomain: any[];
      
      if (baseDomain.length > 0) {
        searchDomain = [
          '&',
          ...baseDomain,
          '|', '|',
          ['name', 'ilike', query],
          ['nom_complet', 'ilike', query],
          ['telephone', 'ilike', query]
        ];
      } else {
        searchDomain = [
          '|', '|',
          ['name', 'ilike', query],
          ['nom_complet', 'ilike', query],
          ['telephone', 'ilike', query]
        ];
      }

      const response = await apiService.get('/send_request', {
        model: MODEL,
        domain: JSON.stringify(searchDomain),
        fields: JSON.stringify([
          'id', 'name', 'nom_complet', 'telephone', 'age',
          'est_enceinte', 'niveau_risque_global'
        ])
      }, {
        'api-key': apiKey
      });

      return response.records || [];
    } catch (error) {
      console.error('❌ Erreur search patientes:', error);
      throw error;
    }
  },

  /**
   * Créer une patiente
   */
  async create(data: any): Promise<any> {
    try {
      const apiKey = await AsyncStorage.getItem('api_key');
      if (!apiKey) throw new Error('API key non disponible');

      const response = await apiService.post('/send_request', {
        fields: Object.keys(data),
        values: data
      }, {
        'api-key': apiKey,
        model: MODEL
      });

      if (response['New resource'] && response['New resource'].length > 0) {
        return response['New resource'][0];
      }
      throw new Error('Erreur lors de la création');
    } catch (error) {
      console.error('❌ Erreur create patiente:', error);
      throw error;
    }
  },

  /**
   * Mettre à jour une patiente
   */
  async update(id: number, data: any): Promise<any> {
    try {
      const apiKey = await AsyncStorage.getItem('api_key');
      if (!apiKey) throw new Error('API key non disponible');

      const response = await apiService.put('/send_request', {
        values: data
      }, {
        'api-key': apiKey,
        model: MODEL,
        Id: id
      });

      if (response['Updated resource'] && response['Updated resource'].length > 0) {
        return response['Updated resource'][0];
      }
      throw new Error('Erreur lors de la mise à jour');
    } catch (error) {
      console.error(`❌ Erreur update patiente ${id}:`, error);
      throw error;
    }
  },
};

export default patienteService;
