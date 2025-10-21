// services/api/notificationService.ts
//import { apiClient } from './client';
import { Notification } from './types';

export const notificationService = {
  // Récupérer les notifications du médecin
  getNotifications: async (): Promise<Notification[]> => {
    const response = await apiClient.get('/salamet/notifications');
    return response.data;
  },

  // Marquer une notification comme lue
  markAsRead: async (id: number): Promise<void> => {
    await apiClient.post(`/salamet/notifications/${id}/mark-read`);
  },

  // Reporter une notification
  reporterNotification: async (id: number, nouvelleDatePrevue: string): Promise<void> => {
    await apiClient.post(`/salamet/notifications/${id}/reporter`, {
      date_prevue: nouvelleDatePrevue
    });
  },

  // Générer des notifications pour une grossesse
  genererNotifications: async (grossesseId: number): Promise<void> => {
    await apiClient.post(`/salamet/notifications/generer/${grossesseId}`);
  }
};
