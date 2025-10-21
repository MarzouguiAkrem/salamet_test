// services/api/types.ts
export interface Patiente {
  id: number;
  name: string;
  nom_complet: string;
  date_naissance: string;
  age: number;
  profession?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  groupe_sanguin?: string;
  poids?: number;
  taille?: number;
  imc?: number;
  niveau_risque_global: 'faible' | 'moyen' | 'eleve' | 'tres_eleve';
  est_enceinte: boolean;
  medecin_ids: number[];
}

export interface Grossesse {
  id: number;
  name: string;
  patiente_id: number;
  ddr: string;
  tag_display: string;
  tag: number;
  date_prevue_accouchement: string;
  type_pathologie_principale: string;
  niveau_risque: string;
  state: 'en_cours' | 'a_risque' | 'terminee' | 'interrompue';
  medecin_referent_id: number;
  nombre_consultations: number;
  nombre_bilans: number;
}

export interface Accouchement {
  id: number;
  patiente_id: number;
  date_accouchement: string;
  type_accouchement: string;
  terme_accouchement: number;
  poids_naissance: number;
  complications?: string;
}

export interface Consultation {
  id: number;
  patiente_id: number;
  grossesse_id: number;
  date_consultation: string;
  terme_grossesse: number;
  poids_actuel: number;
  tension_arterielle: string;
  observations: string;
  medecin_id: number;
}

export interface BilanPrenatal {
  id: number;
  patiente_id: number;
  grossesse_id: number;
  date_bilan: string;
  type_bilan: string;
  resultats: string;
  interpretation: string;
}

export interface Notification {
  id: number;
  patiente_id: number;
  grossesse_id?: number;
  titre: string;
  message: string;
  type_notification: string;
  date_prevue: string;
  state: 'active' | 'terminee' | 'reportee';
  priorite: 'basse' | 'normale' | 'haute' | 'urgente';
}
