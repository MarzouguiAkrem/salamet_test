import apiService from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MODEL = 'salamet.grossesse';

export const grossesseService = {
  /**
   * Récupérer toutes les grossesses avec filtrage
   */
  async getAll(domain: any[] = []): Promise<any[]> {
    try {
      const apiKey = await AsyncStorage.getItem('api_key');
      if (!apiKey) throw new Error('API key non disponible');

      const response = await apiService.get('/send_request', {
        model: MODEL,
        domain: JSON.stringify(domain),
        fields: JSON.stringify([
          'id', 'name', 'patiente_id',
          'ddr', 'date_debut', 'date_prevue_accouchement',
          'tag_semaines', 'tag_jours', 'tag_display', 'tag',
          'state', 'niveau_risque', 'score_risque',
          'type_pathologie_principale', 'pathologies_associees', 'nombre_pathologies',
          'pathologie_diabete', 'pathologie_hta', 'pathologie_preeclampsie', 'pathologie_rciu',
          'traitement_grossesse', 'details_traitement',
          'nombre_consultations', 'nombre_bilans', 'derniere_consultation',
          'poids_avant_grossesse', 'taille', 'imc_initial',
          'medecin_referent_id', 'medecin_ids',
          'observations'
        ])
      }, {
        'api-key': apiKey
      });

      return response.records || [];
    } catch (error) {
      console.error('❌ Erreur getAll grossesses:', error);
      throw error;
    }
  },

  /**
   * Récupérer une grossesse par ID
   */
  async getById(id: number): Promise<any> {
    try {
      const apiKey = await AsyncStorage.getItem('api_key');
      if (!apiKey) throw new Error('API key non disponible');

      const response = await apiService.get('/send_request', {
        model: MODEL,
        Id: id,
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

      if (response.records && response.records.length > 0) {
        return response.records[0];
      }
      throw new Error('Grossesse non trouvée');
    } catch (error) {
      console.error(`❌ Erreur getById grossesse ${id}:`, error);
      throw error;
    }
  },

  /**
   * Créer une grossesse
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
      console.error('❌ Erreur create grossesse:', error);
      throw error;
    }
  },

  /**
   * Mettre à jour une grossesse
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
      console.error(`❌ Erreur update grossesse ${id}:`, error);
      throw error;
    }
  },
};

export default grossesseService;
