import { useState, useEffect, useCallback } from 'react';
import { grossesseService } from '../services/grossesseService';
import { useRoleFilter } from './useRoleFilter';

export const useGrossesses = () => {
  const [grossesses, setGrossesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { 
    getGrossesseFilter, 
    canModify, 
    canCreate,
    canDelete,
    isPatiente, 
    isMedecin 
  } = useRoleFilter();

  /**
   * Charger les grossesses avec filtrage automatique
   */
  const loadGrossesses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const domain = getGrossesseFilter();
      console.log('🔍 Chargement grossesses avec domain:', domain);
      
      const data = await grossesseService.getAll(domain);
      setGrossesses(data);
      
      console.log(`✅ ${data.length} grossesse(s) chargée(s)`);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
      console.error('❌ Erreur loadGrossesses:', err);
    } finally {
      setLoading(false);
    }
  }, [getGrossesseFilter]);

  /**
   * Charger au montage
   */
  useEffect(() => {
    loadGrossesses();
  }, [loadGrossesses]);

  /**
   * Récupérer une grossesse par ID
   */
  const getGrossesseById = async (id: number): Promise<any | null> => {
    try {
      return await grossesseService.getById(id);
    } catch (err: any) {
      console.error('❌ Erreur getGrossesseById:', err);
      return null;
    }
  };

  /**
   * Créer une grossesse
   */
  const createGrossesse = async (data: any): Promise<any> => {
    if (!canCreate()) {
      throw new Error('Vous n\'avez pas la permission de créer une grossesse');
    }

    try {
      const newGrossesse = await grossesseService.create(data);
      setGrossesses(prev => [...prev, newGrossesse]);
      return newGrossesse;
    } catch (err: any) {
      throw err;
    }
  };

  /**
   * Mettre à jour une grossesse
   */
  const updateGrossesse = async (id: number, data: any): Promise<any> => {
    if (!canModify()) {
      throw new Error('Vous n\'avez pas la permission de modifier une grossesse');
    }

    try {
      const updated = await grossesseService.update(id, data);
      setGrossesses(prev => prev.map(g => g.id === id ? updated : g));
      return updated;
    } catch (err: any) {
      throw err;
    }
  };

  return {
    grossesses,
    loading,
    error,
    fetchGrossesses: loadGrossesses, // Alias pour compatibilité
    loadGrossesses,
    getGrossesseById,
    createGrossesse,
    updateGrossesse,
    
    // Permissions
    canModify: canModify(),
    canCreate: canCreate(),
    canDelete: canDelete(),
    isPatiente,
    isMedecin,
    
    // Stats
    totalGrossesses: grossesses.length,
    grossessesEnCours: grossesses.filter(g => g.state === 'en_cours').length,
    grossessesARisque: grossesses.filter(g => 
      g.niveau_risque === 'eleve' || 
      g.niveau_risque === 'tres_eleve'
    ).length,
  };
};
