import { useState, useEffect } from 'react';

export interface Accouchement {
  id: string;
  patienteId: string;
  patiente?: {
    nom: string;
    prenom: string;
  };
  dateAccouchement: string;
  heureAccouchement: string;
  typeAccouchement: string;
  dureeeTravail: string;
  complications: string;
  poidsNaissance: string;
  tailleNaissance: string;
  scoreApgar: string;
  observations: string;
}

export function useAccouchements() {
  const [accouchements, setAccouchements] = useState<Accouchement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccouchements = async () => {
      try {
        // Simuler un appel API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockAccouchements: Accouchement[] = [
          {
            id: '1',
            patienteId: '1',
            patiente: { nom: 'Dubois', prenom: 'Claire' },
            dateAccouchement: new Date().toISOString(),
            heureAccouchement: '14:30',
            typeAccouchement: 'Voie basse',
            dureeeTravail: '6h45',
            complications: 'Aucune',
            poidsNaissance: '3200',
            tailleNaissance: '50',
            scoreApgar: '9/10',
            observations: 'Accouchement normal'
          }
        ];
        
        setAccouchements(mockAccouchements);
      } catch (err) {
        setError('Erreur lors du chargement des accouchements');
      } finally {
        setLoading(false);
      }
    };

    fetchAccouchements();
  }, []);

  return { accouchements, loading, error };
}
