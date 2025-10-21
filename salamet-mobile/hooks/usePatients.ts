import { useState, useEffect, useCallback } from 'react';
import { patienteService } from '../services/patienteService';
import { useRoleFilter } from './useRoleFilter';

export const usePatients = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { 
    getPatienteFilter, 
    canModify, 
    canCreate,
    canDelete,
    isPatiente, 
    isMedecin 
  } = useRoleFilter();

  /**
   * Charger les patientes avec filtrage automatique
   */
  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const domain = getPatienteFilter();
      console.log('🔍 Chargement patientes avec domain:', domain);
      
      const data = await patienteService.getAll(domain);
      setPatients(data);
      
      console.log(`✅ ${data.length} patiente(s) chargée(s)`);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
      console.error('❌ Erreur loadPatients:', err);
    } finally {
      setLoading(false);
    }
  }, [getPatienteFilter]);

  /**
   * Charger au montage
   */
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  /**
   * Rechercher des patientes
   */
  const searchPatients = async (query: string) => {
    if (!query.trim()) {
      await loadPatients();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const baseDomain = getPatienteFilter();
      const results = await patienteService.search(query, baseDomain);
      setPatients(results);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Récupérer une patiente par ID
   */
  const getPatientById = async (id: number): Promise<any | null> => {
    try {
      return await patienteService.getById(id);
    } catch (err: any) {
      console.error('❌ Erreur getPatientById:', err);
      return null;
    }
  };

  /**
   * Créer une patiente
   */
  const createPatient = async (data: any): Promise<any> => {
    if (!canCreate()) {
      throw new Error('Vous n\'avez pas la permission de créer une patiente');
    }

    try {
      const newPatient = await patienteService.create(data);
      setPatients(prev => [...prev, newPatient]);
      return newPatient;
    } catch (err: any) {
      throw err;
    }
  };

  /**
   * Mettre à jour une patiente
   */
  const updatePatient = async (id: number, data: any): Promise<any> => {
    if (!canModify()) {
      throw new Error('Vous n\'avez pas la permission de modifier une patiente');
    }

    try {
      const updated = await patienteService.update(id, data);
      setPatients(prev => prev.map(p => p.id === id ? updated : p));
      return updated;
    } catch (err: any) {
      throw err;
    }
  };

  return {
    patients,
    loading,
    error,
    loadPatients,
    searchPatients,
    getPatientById,
    createPatient,
    updatePatient,
    
    // Permissions
    canModify: canModify(),
    canCreate: canCreate(),
    canDelete: canDelete(),
    isPatiente,
    isMedecin,
    
    // Stats
    totalPatients: patients.length,
    patientesEnceintes: patients.filter(p => p.est_enceinte).length,
    patientesARisque: patients.filter(p => 
      p.niveau_risque_global === 'eleve' || 
      p.niveau_risque_global === 'tres_eleve'
    ).length,
  };
};
