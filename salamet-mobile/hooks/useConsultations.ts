import { useState, useEffect } from 'react';

export interface Consultation {
  id: string;
  patienteId: string;
  patiente?: {
    nom: string;
    prenom: string;
  };
  dateConsultation: string;
  typeConsultation: string;
  motifConsultation: string;
  examenClinique: string;
  diagnostic: string;
  traitement: string;
  observations: string;
}

export function useConsultations() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        // Simuler un appel API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockConsultations: Consultation[] = [
          {
            id: '1',
            patienteId: '1',
            patiente: { nom: 'Dupont', prenom: 'Marie' },
            dateConsultation: new Date().toISOString(),
            typeConsultation: 'Consultation prénatale',
            motifConsultation: 'Suivi de grossesse',
            examenClinique: 'RAS',
            diagnostic: 'Grossesse normale',
            traitement: 'Acide folique',
            observations: 'Prochain RDV dans 4 semaines'
          }
        ];
        
        setConsultations(mockConsultations);
      } catch (err) {
        setError('Erreur lors du chargement des consultations');
      } finally {
        setLoading(false);
      }
    };

    fetchConsultations();
  }, []);

  return { consultations, loading, error };
}
