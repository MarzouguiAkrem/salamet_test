// hooks/useNotifications.ts
import { useEffect, useState } from 'react';
import { notificationService } from '../services/notificationService';

export interface Notification {
  id: string;
  titre: string;
  message: string;
  dateCreation: string;
  patienteId?: string;
  patiente?: {
    nom: string;
    prenom: string;
  };
  type: 'info' | 'warning' | 'error' | 'success';
  lu: boolean;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationService.getAll();
      setNotifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des notifications');
      console.error('Erreur notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const addNotification = async (notificationData: Omit<Notification, 'id' | 'dateCreation'>) => {
    try {
      const newNotification = await notificationService.create(notificationData);
      setNotifications(prev => [newNotification, ...prev]);
      return newNotification;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      throw err;
    }
  };

  const updateNotification = async (id: string, notificationData: Partial<Notification>) => {
    try {
      const updatedNotification = await notificationService.update(id, notificationData);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id ? updatedNotification : notification
        )
      );
      return updatedNotification;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
      throw err;
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await notificationService.delete(id);
      setNotifications(prev => prev.filter(notification => notification.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      throw err;
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await updateNotification(id, { lu: true });
    } catch (err) {
      console.error('Erreur lors du marquage comme lu:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return {
    notifications,
    loading,
    error,
    fetchNotifications,
    addNotification,
    updateNotification,
    deleteNotification,
    markAsRead,
  };
};
