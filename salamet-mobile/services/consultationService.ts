// services/api/consultationService.ts
//import { apiClient } from './client';
import { Consultation } from './types';

export const consultationService = {
  // Récupérer les consultations des patientes assignées
  getConsultationsAssignees: async (): Promise<Consultation[]> => {
    const response = await apiClient.get('/salamet/consultations/assignees');
    return response.data;
  },

  // Récupérer les consultations d'une patiente
  getConsultationsPatiente: async (patienteId: number): Promise<Consultation[]> => {
    const response = await apiClient.get(`/salamet/consultations/patiente/${patienteId}`);
    return response.data;
  },

  // Récupérer les consultations d'une grossesse
  getConsultationsGrossesse: async (grossesseId: number): Promise<Consultation[]> => {
    const response = await apiClient.get(`/salamet/consultations/grossesse/${grossesseId}`);
    return response.data;
  },

  // Créer une nouvelle consultation
  createConsultation: async (data: Partial<Consultation>): Promise<Consultation> => {
    const response = await apiClient.post('/salamet/consultations', data);
    return response.data;
  },

  // Mettre à jour une consultation
  updateConsultation: async (id: number, data: Partial<Consultation>): Promise<Consultation> => {
    const response = await apiClient.put(`/salamet/consultations/${id}`, data);
    return response.data;
  }
};
