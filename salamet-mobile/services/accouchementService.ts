// services/api/accouchementService.ts
//import { apiClient } from './client';
import { Accouchement } from './types';

export const accouchementService = {
  // Récupérer les accouchements des patientes assignées
  getAccouchementsAssignes: async (): Promise<Accouchement[]> => {
    const response = await apiClient.get('/salamet/accouchements/assignes');
    return response.data;
  },

  // Récupérer les accouchements d'une patiente
  getAccouchementsPatiente: async (patienteId: number): Promise<Accouchement[]> => {
    const response = await apiClient.get(`/salamet/accouchements/patiente/${patienteId}`);
    return response.data;
  },

  // Créer un nouvel accouchement
  createAccouchement: async (data: Partial<Accouchement>): Promise<Accouchement> => {
    const response = await apiClient.post('/salamet/accouchements', data);
    return response.data;
  },

  // Mettre à jour un accouchement
  updateAccouchement: async (id: number, data: Partial<Accouchement>): Promise<Accouchement> => {
    const response = await apiClient.put(`/salamet/accouchements/${id}`, data);
    return response.data;
  },

  // Supprimer un accouchement
  deleteAccouchement: async (id: number): Promise<void> => {
    await apiClient.delete(`/salamet/accouchements/${id}`);
  }
};
