// services/api/bilanService.ts
import { apiClient } from './client';
import { BilanPrenatal } from './types';

export const bilanService = {
  // Récupérer les bilans des patientes assignées
  getBilansAssignes: async (): Promise<BilanPrenatal[]> => {
    const response = await apiClient.get('/salamet/bilans/assignes');
    return response.data;
  },

  // Récupérer les bilans d'une patiente
  getBilansPatiente: async (patienteId: number): Promise<BilanPrenatal[]> => {
    const response = await apiClient.get(`/salamet/bilans/patiente/${patienteId}`);
    return response.data;
  },

  // Créer un nouveau bilan
  createBilan: async (data: Partial<BilanPrenatal>): Promise<BilanPrenatal> => {
    const response = await apiClient.post('/salamet/bilans', data);
    return response.data;
  },

  // Mettre à jour un bilan
  updateBilan: async (id: number, data: Partial<BilanPrenatal>): Promise<BilanPrenatal> => {
    const response = await apiClient.put(`/salamet/bilans/${id}`, data);
    return response.data;
  }
};
