import { useState, useEffect } from 'react';

export interface Bilan {
  id: string;
  patienteId: string;
  patiente?: {
    nom: string;
    prenom: string;
  };
  dateBilan: string;
  typeBilan: string;
  laboratoire: string;
  resultats: string;
  valeurReference: string;
  interpretation: string;
  observations: string;
}

export function useBilans() {
  const [bilans, setBilans] = useState<Bilan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBilans = async () => {
      try {
        // Simuler un appel API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockBilans: Bilan[] = [
          {
            id: '1',
            patienteId: '1',
            patiente: { nom: 'Martin', prenom: 'Sophie' },
            dateBilan: new Date().toISOString(),
            typeBilan: 'Bilan sanguin',
            laboratoire: 'Laboratoire Central',
            resultats: 'Hémoglobine: 12.5 g/dl',
            valeurReference: '12-16 g/dl',
            interpretation: 'Normal',
            observations: 'RAS'
          }
        ];
        
        setBilans(mockBilans);
      } catch (err) {
        setError('Erreur lors du chargement des bilans');
      } finally {
        setLoading(false);
      }
    };

    fetchBilans();
  }, []);

  return { bilans, loading, error };
}
