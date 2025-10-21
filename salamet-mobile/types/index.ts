// =================== TYPES DE BASE ===================

export interface User {
  id: number;
  name: string;
  email: string;
  login: string;
  role: 'medecin_senior' | 'medecin_resident' | 'patiente' | 'admin';
  profile?: MedecinProfile | PatienteProfile;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// =================== PROFILS UTILISATEURS ===================

export interface MedecinProfile {
  id: number;
  nom: string;
  prenom: string;
  specialite: string;
  niveau: 'resident' | 'senior';
  user_id: number;
  telephone?: string;
  email?: string;
}

export interface PatienteProfile {
  id: number;
  name: string;
  nom: string;
  prenom: string;
  nom_complet: string;
  date_naissance: string;
  age: number;
  telephone: string;
  email?: string;
  adresse?: string;
  groupe_sanguin?: string;
  poids?: number;
  taille?: number;
  imc?: number;
  user_id: number;

  // Informations conjugales
  nom_mari?: string;
  telephone_mari?: string;

  // Antécédents
  gestite: number;
  parite: number;
  avortements: number;
  antecedents_medicaux?: string;

  // Statut actuel
  est_enceinte: boolean;
  grossesse_actuelle_id?: number;
  nombre_grossesses: number;
  nombre_accouchements: number;

  // Risques
  niveau_risque_global: 'faible' | 'moyen' | 'eleve' | 'tres_eleve';
  score_risque: number;

  // Relations
  medecin_ids?: number[];
}

// =================== GROSSESSE ===================

export interface Grossesse {
  id: number;
  name: string;
  patiente_id: number;

  // Dates
  ddr: string;
  date_debut: string;
  date_prevue_accouchement: string;

  // Terme
  tag_semaines: number;
  tag_jours: number;
  tag_display: string;
  tag: number;

  // État
  state: 'en_cours' | 'a_risque' | 'terminee' | 'interrompue';
  niveau_risque: 'faible' | 'moyen' | 'eleve' | 'tres_eleve';
  score_risque: number;

  // Pathologies
  type_pathologie_principale: string;
  pathologies_associees?: string;
  nombre_pathologies: number;

  pathologie_diabete: boolean;
  pathologie_hta: boolean;
  pathologie_preeclampsie: boolean;
  pathologie_rciu: boolean;

  // Traitement
  traitement_grossesse: boolean;
  details_traitement?: string;
  maturation_pulmonaire: boolean;

  // Suivi
  nombre_consultations: number;
  nombre_bilans: number;
  derniere_consultation?: string;

  // Mesures
  poids_avant_grossesse?: number;
  taille?: number;
  imc_initial?: number;

  // Relations
  medecin_referent_id?: number;
  medecin_ids?: number[];

  observations?: string;
  notes_medicales?: string;
}

// =================== CONSULTATION ===================

export interface Consultation {
  id: number;
  name: string;
  display_name: string;

  patiente_id: number;
  grossesse_id: number;
  medecin_id: number;

  date_consultation: string;
  type_consultation: 'premiere' | 'suivi' | 'urgence' | 'controle' | 'pre_accouchement';
  terme_grossesse?: number;

  motif_consultation: string;

  // Constantes vitales
  poids_actuel?: number;
  prise_poids?: number;
  tension_arterielle_systolique?: number;
  tension_arterielle_diastolique?: number;
  tension_arterielle?: string;
  frequence_cardiaque?: number;
  temperature?: number;

  // Examen obstétrical
  hauteur_uterine?: number;
  presentation_foetale?: 'cephalique' | 'siege' | 'transverse' | 'indeterminee';
  bcf?: number;
  mouvements_actifs_foetus: boolean;
  col_uterus?: string;

  // Examens complémentaires
  proteinurie?: string;
  glycosurie?: string;
  oedemes?: string;

  // Diagnostic et suivi
  observations?: string;
  diagnostic?: string;
  conduite_tenir?: string;
  prescriptions?: string;

  prochaine_consultation?: string;
  urgence_detectee: boolean;
  hospitalisation_necessaire: boolean;
  niveau_alerte: 'vert' | 'orange' | 'rouge';

  state: 'brouillon' | 'validee' | 'annulee';
}

// =================== BILAN PRÉNATAL ===================

export interface BilanPrenatal {
  id: number;
  name: string;

  grossesse_id: number;
  patiente_id: number;
  medecin_id: number;

  date_bilan: string;
  terme_grossesse?: number;
  trimestre: '1' | '2' | '3';
  type_bilan: 'obligatoire' | 'complementaire' | 'urgence' | 'controle';

  state: 'prescrit' | 'en_cours' | 'termine' | 'interprete' | 'alerte';

  // Hématologie
  hemoglobine?: number;
  hematocrite?: number;
  plaquettes?: number;
  leucocytes?: number;

  // Biochimie
  glycemie?: number;
  hgpo?: number;
  hgpo_t0?: number;
  hgpo_t60?: number;
  proteinurie?: string;
  proteinurie_24h?: number;
  creatinine?: number;
  uree?: number;

  // Bilan martial
  fer_serique?: number;
  ferritine?: number;

  // Hormones
  tsh?: number;

  // Sérologies
  toxoplasmose_igg?: string;
  toxoplasmose_igm?: string;
  rubeole_igg?: string;
  cmv_igg?: string;
  cmv_igm?: string;
  hbsag?: string;
  vih?: string;
  syphilis?: string;

  // Dépistage
  depistage_aneuploidies?: string;
  risque_aneuploidies?: string;
  notes_depistage?: string;

  // Résultats
  resultats_normaux: boolean;
  anomalies_detectees?: string;
  interpretation?: string;
  recommandations?: string;

  // Alertes
  alerte: boolean;
  niveau_alerte: 'aucune' | 'surveillance' | 'urgence';
  alerte_active: boolean;

  prochain_bilan?: string;
  notes?: string;

  // Relations
  hematologie_ids?: number[];
  biochimie_ids?: number[];
  serologie_ids?: number[];
  echographie_ids?: number[];
}

// =================== ACCOUCHEMENT ===================

export interface Accouchement {
  id: number;
  name: string;

  patiente_id: number;
  grossesse_id?: number;

  date_accouchement: string;
  terme_accouchement?: string;
  type_accouchement?: 'voie_basse' | 'cesarienne' | 'forceps' | 'ventouse';

  poids_naissance?: number;
  sexe_enfant?: 'masculin' | 'feminin';
  apgar_1min?: number;
  apgar_5min?: number;

  complications?: string;
  observations?: string;
  date_prevue?: string;

  state?: 'prevu' | 'en_cours' | 'termine';
}

// =================== NOTIFICATION ===================

export interface Notification {
  id: number;
  titre: string;
  message: string;

  type_notification: 'rappel_consultation' | 'rappel_bilan' | 'alerte_medicale' | 'urgence' | 'information';
  priorite: 'basse' | 'moyenne' | 'haute' | 'critique';

  grossesse_id?: number;
  patiente_id?: number;
  medecin_id?: number;

  date_prevue: string;
  date_creation: string;
  date_lecture?: string;

  state: 'active' | 'lue' | 'traitee' | 'terminee';
  lu: boolean;

  modele_lie?: string;
  enregistrement_lie?: number;

  action_url?: string;
}

// =================== EXAMENS DÉTAILLÉS ===================

export interface ExamenHematologie {
  id: number;
  bilan_id: number;
  patiente_id: number;
  date_examen: string;

  hemoglobine?: number;
  hematocrite?: number;
  plaquettes?: number;
  leucocytes?: number;

  anomalie_hematologie: 'normal' | 'limite' | 'anormal';
  commentaire_hematologie?: string;
}

export interface ExamenBiochimie {
  id: number;
  bilan_id: number;
  patiente_id: number;
  date_examen: string;

  glycemie?: number;
  hgpo?: number;
  proteinurie?: number;

  anomalie_biochimie: 'normal' | 'limite' | 'anormal';
  commentaire_biochimie?: string;
}

export interface Serologie {
  id: number;
  bilan_id: number;
  patiente_id: number;
  date_examen: string;

  type_serologie: string;
  resultat: 'negatif' | 'positif' | 'douteux' | 'non_fait';
  valeur_numerique?: number;
  unite?: string;
  valeurs_reference?: string;
  interpretation: 'normal' | 'immunise' | 'surveillance' | 'positif';
  commentaire?: string;
}

export interface Echographie {
  id: number;
  bilan_id: number;
    grossesse_id: number;
  date_echo: string;
  terme_echo: number;
  type_echo: 'datation' | 'morphologique' | 'biometrie' | 'doppler' | 'croissance' | 'autre';

  // Biométrie
  lcc?: number;
  cn?: number;
  bip?: number;
  pc?: number;
  pa?: number;
  lf?: number;
  efw?: number;

  presentation?: string;
  morphologie_normale: boolean;
  anomalies_morphologiques?: string;

  liquide_amniotique: 'normal' | 'oligoamnios' | 'polyamnios';
  placenta_position?: string;

  // Doppler
  doppler_realise: boolean;
  doppler_uterine_droite?: number;
  doppler_uterine_gauche?: number;
  notch_uterine?: string;
  doppler_ombilical?: number;
  doppler_cerebrale?: number;
  doppler_cerebroplacentaire?: number;
  doppler_ductus?: string;

  conclusion?: string;
  recommandations?: string;

  alerte: boolean;
  niveau_alerte_echo: 'aucune' | 'surveillance' | 'urgente';
}

// =================== PROFIL COMPLET ===================

export interface CompleteProfile {
  // Informations de base
  patiente: PatienteProfile;

  // Grossesses avec leurs relations
  grossesses: GrossesseComplete[];

  // Grossesse actuelle si existe
  grossesse_actuelle?: GrossesseComplete;

  // Statistiques
  stats: ProfileStats;

  // Notifications récentes
  notifications: Notification[];

  // Dernière mise à jour
  last_updated: string;
}

export interface GrossesseComplete {
  // Données de base de la grossesse
  grossesse: Grossesse;

  // Consultations liées
  consultations: Consultation[];

  // Bilans liés
  bilans: BilanPrenatal[];

  // Accouchement si terminée
  accouchement?: Accouchement;

  // Notifications liées
  notifications: Notification[];
}

export interface ProfileStats {
  total_grossesses: number;
  grossesse_en_cours: boolean;
  total_consultations: number;
  total_bilans: number;
  prochaine_consultation?: string;
  prochain_bilan?: string;
  notifications_non_lues: number;
  alertes_actives: number;
  derniere_consultation?: string;
  dernier_bilan?: string;
}

// =================== RÉPONSES API ===================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  records?: T[];
  message?: string;
  error?: string;
}

export interface OdooApiResponse<T> {
  records: T[];
  length?: number;
}

export interface PaginatedResponse<T> {
  records: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// =================== DASHBOARD ===================

export interface DashboardStats {
  total_patientes: number;
  patientes_enceintes: number;
  consultations_aujourd_hui: number;
  consultations_semaine: number;
  rdv_a_venir: number;
  alertes_actives: number;
  grossesses_a_risque: number;
  accouchements_prevus_mois: number;
}

export interface DashboardData {
  stats: DashboardStats;
  consultations_recentes: Consultation[];
  alertes_recentes: Notification[];
  rdv_prochains: Consultation[];
  patientes_a_risque: PatienteProfile[];
}

// =================== FILTRES ET RECHERCHE ===================

export interface SearchFilters {
  search?: string;
  date_debut?: string;
  date_fin?: string;
  state?: string;
  niveau_risque?: string;
  type?: string;
  medecin_id?: number;
  patiente_id?: number;
  grossesse_id?: number;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
  offset?: number;
}

// =================== FORMULAIRES ===================

export interface GrossesseFormData {
  patiente_id: number;
  ddr: string;
  date_debut?: string;
  poids_avant_grossesse?: number;
  taille?: number;
  type_pathologie_principale?: string;
  pathologies_associees?: string;
  pathologie_diabete?: boolean;
  pathologie_hta?: boolean;
  pathologie_preeclampsie?: boolean;
  pathologie_rciu?: boolean;
  traitement_grossesse?: boolean;
  details_traitement?: string;
  observations?: string;
  medecin_referent_id?: number;
}

export interface ConsultationFormData {
  patiente_id: number;
  grossesse_id: number;
  medecin_id: number;
  date_consultation: string;
  type_consultation: 'premiere' | 'suivi' | 'urgence' | 'controle' | 'pre_accouchement';
  motif_consultation: string;
  poids_actuel?: number;
  tension_arterielle_systolique?: number;
  tension_arterielle_diastolique?: number;
  frequence_cardiaque?: number;
  temperature?: number;
  hauteur_uterine?: number;
  presentation_foetale?: string;
  bcf?: number;
  mouvements_actifs_foetus?: boolean;
  proteinurie?: string;
  glycosurie?: string;
  oedemes?: string;
  observations?: string;
  diagnostic?: string;
  conduite_tenir?: string;
  prescriptions?: string;
  prochaine_consultation?: string;
}

export interface BilanFormData {
  grossesse_id: number;
  patiente_id: number;
  medecin_id: number;
  date_bilan: string;
  trimestre: '1' | '2' | '3';
  type_bilan: 'obligatoire' | 'complementaire' | 'urgence' | 'controle';
  hemoglobine?: number;
  hematocrite?: number;
  plaquettes?: number;
  glycemie?: number;
  hgpo?: number;
  proteinurie?: string;
  toxoplasmose_igg?: string;
  toxoplasmose_igm?: string;
  rubeole_igg?: string;
  hbsag?: string;
  vih?: string;
  syphilis?: string;
  interpretation?: string;
  recommandations?: string;
}

export interface AccouchementFormData {
  patiente_id: number;
  grossesse_id?: number;
  date_accouchement: string;
  type_accouchement?: 'voie_basse' | 'cesarienne' | 'forceps' | 'ventouse';
  poids_naissance?: number;
  sexe_enfant?: 'masculin' | 'feminin';
  apgar_1min?: number;
  apgar_5min?: number;
  complications?: string;
  observations?: string;
}

export interface NotificationFormData {
  titre: string;
  message: string;
  type_notification: 'rappel_consultation' | 'rappel_bilan' | 'alerte_medicale' | 'urgence' | 'information';
  priorite: 'basse' | 'moyenne' | 'haute' | 'critique';
  date_prevue: string;
  patiente_id?: number;
  grossesse_id?: number;
  medecin_id?: number;
}

export interface PatienteFormData {
  nom: string;
  prenom: string;
  date_naissance: string;
  telephone: string;
  email?: string;
  adresse?: string;
  groupe_sanguin?: string;
  poids?: number;
  taille?: number;
  nom_mari?: string;
  telephone_mari?: string;
  gestite?: number;
  parite?: number;
  avortements?: number;
  antecedents_medicaux?: string;
}

// =================== VALIDATION ===================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// =================== STATISTIQUES ===================

export interface StatistiquesGrossesse {
  total: number;
  en_cours: number;
  a_risque: number;
  terminees: number;
  interrompues: number;
  par_niveau_risque: {
    faible: number;
    moyen: number;
    eleve: number;
    tres_eleve: number;
  };
}

export interface StatistiquesConsultations {
  total: number;
  par_type: {
    premiere: number;
    suivi: number;
    urgence: number;
    controle: number;
    pre_accouchement: number;
  };
  par_mois: {
    mois: string;
    count: number;
  }[];
}

export interface StatistiquesBilans {
  total: number;
  par_trimestre: {
    '1': number;
    '2': number;
    '3': number;
  };
  par_type: {
    obligatoire: number;
    complementaire: number;
    urgence: number;
    controle: number;
  };
  avec_alertes: number;
}

export interface StatistiquesAccouchements {
  total: number;
  par_type: {
    voie_basse: number;
    cesarienne: number;
    forceps: number;
    ventouse: number;
  };
  par_mois: {
    mois: string;
    count: number;
  }[];
}

// =================== ALERTES ET RISQUES ===================

export interface Alerte {
  id: number;
  type: 'consultation' | 'bilan' | 'grossesse' | 'urgence';
  niveau: 'info' | 'warning' | 'danger' | 'critical';
  titre: string;
  message: string;
  date_creation: string;
  patiente_id: number;
  grossesse_id?: number;
  consultation_id?: number;
  bilan_id?: number;
  traitee: boolean;
  date_traitement?: string;
}

export interface RisqueEvaluation {
  niveau_risque: 'faible' | 'moyen' | 'eleve' | 'tres_eleve';
  score: number;
  facteurs: {
    nom: string;
    valeur: string;
    poids: number;
  }[];
  recommandations: string[];
}

// =================== EXPORT DE DONNÉES ===================

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  date_debut?: string;
  date_fin?: string;
  include_consultations?: boolean;
  include_bilans?: boolean;
  include_accouchements?: boolean;
}

export interface ExportResult {
  success: boolean;
  file_url?: string;
  file_name?: string;
  error?: string;
}

// =================== PARAMÈTRES ===================

export interface AppSettings {
  notifications_enabled: boolean;
  notification_sound: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: 'fr' | 'ar' | 'en';
  auto_sync: boolean;
  sync_interval: number;
}

export interface UserPreferences {
  dashboard_layout: 'grid' | 'list';
  default_view: 'dashboard' | 'patients' | 'consultations';
    items_per_page: number;
  show_archived: boolean;
  date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  time_format: '12h' | '24h';
}

// =================== ODOO SPÉCIFIQUE ===================

export interface OdooAuthResponse {
  Status: string;
  'api-key': string;
  User: string;
  uid?: number;
}

export interface OdooSearchReadResponse<T = any> {
  records: T[];
  length?: number;
}

export interface OdooMedecinRecord {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  niveau: 'resident' | 'senior';
  specialite?: string;
  user_id: number | [number, string];
}

export interface OdooPatienteRecord {
  id: number;
  name: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  age?: number;
  telephone: string;
  email?: string;
  user_id: number | [number, string];
  est_enceinte: boolean;
  niveau_risque_global: string;
  grossesse_actuelle_id?: number | [number, string];
  nombre_grossesses?: number;
  nombre_accouchements?: number;
}

export interface OdooUserRecord {
  id: number;
  name: string;
  login: string;
  email: string;
  active?: boolean;
}

export interface SendRequestPayload {
  model: string;
  method: string;
  args: any[];
  kwargs: {
    domain?: any[];
    fields?: string[];
    limit?: number;
    offset?: number;
    order?: string;
    context?: any;
  };
}

export interface OdooWritePayload {
  model: string;
  method: 'write';
  args: [number[], any];
  kwargs?: any;
}

export interface OdooCreatePayload {
  model: string;
  method: 'create';
  args: [any];
  kwargs?: any;
}

export interface OdooDeletePayload {
  model: string;
  method: 'unlink';
  args: [number[]];
  kwargs?: any;
}

// =================== NAVIGATION ===================

export interface NavigationParams {
  id?: number;
  patiente_id?: number;
  grossesse_id?: number;
  consultation_id?: number;
  bilan_id?: number;
  accouchement_id?: number;
  notification_id?: number;
  mode?: 'view' | 'edit' | 'add';
}

export interface TabBarIcon {
  name: string;
  color: string;
  focused: boolean;
}

// =================== HOOKS TYPES ===================

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UsePaginationResult<T> {
  items: T[];
  page: number;
  totalPages: number;
  hasMore: boolean;
  loading: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  goToPage: (page: number) => void;
}

export interface UseFormResult<T> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  handleChange: (field: keyof T, value: any) => void;
  handleBlur: (field: keyof T) => void;
  handleSubmit: () => Promise<void>;
  resetForm: () => void;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string) => void;
}

// =================== CONTEXTES ===================

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: User['role']) => boolean;
  canAccess: (roles: User['role'][]) => boolean;
}

export interface DataContextType {
  patientes: PatienteProfile[];
  grossesses: Grossesse[];
  consultations: Consultation[];
  bilans: BilanPrenatal[];
  notifications: Notification[];
  loading: boolean;
  error: Error | null;
  refreshAll: () => Promise<void>;
  refreshPatientes: () => Promise<void>;
  refreshGrossesses: () => Promise<void>;
  refreshConsultations: () => Promise<void>;
  refreshBilans: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

// =================== UTILITAIRES ===================

export interface DateRange {
  start: string;
  end: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  time?: string;
  type: 'consultation' | 'bilan' | 'accouchement' | 'notification';
  patiente_id: number;
  patiente_nom: string;
  color: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

// =================== CONSTANTES TYPES ===================

export type NiveauRisque = 'faible' | 'moyen' | 'eleve' | 'tres_eleve';
export type EtatGrossesse = 'en_cours' | 'a_risque' | 'terminee' | 'interrompue';
export type TypeConsultation = 'premiere' | 'suivi' | 'urgence' | 'controle' | 'pre_accouchement';
export type TypeBilan = 'obligatoire' | 'complementaire' | 'urgence' | 'controle';
export type TypeAccouchement = 'voie_basse' | 'cesarienne' | 'forceps' | 'ventouse';
export type TypeNotification = 'rappel_consultation' | 'rappel_bilan' | 'alerte_medicale' | 'urgence' | 'information';
export type PrioriteNotification = 'basse' | 'moyenne' | 'haute' | 'critique';
export type NiveauAlerte = 'vert' | 'orange' | 'rouge';
export type UserRole = 'medecin_senior' | 'medecin_resident' | 'patiente' | 'admin';

// =================== COULEURS ET STYLES ===================

export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  light: string;
  dark: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  disabled: string;
}

export interface RisqueColors {
  faible: string;
  moyen: string;
  eleve: string;
  tres_eleve: string;
}

// =================== GRAPHIQUES ET VISUALISATION ===================

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

export interface PieChartData {
  label: string;
  value: number;
  color: string;
  percentage?: number;
}

export interface LineChartPoint {
  x: string | number;
  y: number;
  label?: string;
}

// =================== RAPPORTS ===================

export interface RapportConsultation {
  patiente: PatienteProfile;
  grossesse: Grossesse;
  consultation: Consultation;
  bilans_recents: BilanPrenatal[];
  historique_consultations: Consultation[];
  graphiques: {
    poids: LineChartPoint[];
    tension: LineChartPoint[];
    hauteur_uterine: LineChartPoint[];
  };
}

export interface RapportGrossesse {
  patiente: PatienteProfile;
  grossesse: Grossesse;
  consultations: Consultation[];
  bilans: BilanPrenatal[];
  accouchement?: Accouchement;
  statistiques: {
    nombre_consultations: number;
    nombre_bilans: number;
    alertes_total: number;
    niveau_risque_evolution: {
      date: string;
      niveau: NiveauRisque;
    }[];
  };
}

export interface RapportPatiente {
  patiente: PatienteProfile;
  grossesses: GrossesseComplete[];
  statistiques_globales: {
    total_grossesses: number;
    total_consultations: number;
    total_bilans: number;
    total_accouchements: number;
    complications_historique: string[];
  };
}

// =================== SYNCHRONISATION ===================

export interface SyncStatus {
  last_sync: string;
  is_syncing: boolean;
  pending_changes: number;
  sync_errors: SyncError[];
}

export interface SyncError {
  id: string;
  model: string;
  record_id: number;
  operation: 'create' | 'update' | 'delete';
  error_message: string;
  timestamp: string;
}

export interface PendingChange {
  id: string;
  model: string;
  record_id?: number;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  synced: boolean;
}

// =================== CACHE ===================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live en millisecondes
  force?: boolean; // Forcer le rafraîchissement
}

// =================== PERMISSIONS ===================

export interface Permission {
  model: string;
  action: 'read' | 'write' | 'create' | 'unlink';
  allowed: boolean;
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

// =================== LOGS ===================

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  message: string;
  data?: any;
  user_id?: number;
}

// =================== CONFIGURATION ===================

export interface ApiConfig {
  BASE_URL: string;
  DATABASE: string;
  TIMEOUT: number;
  RETRY_ATTEMPTS: number;
  RETRY_DELAY: number;
}

export interface StorageKeys {
  USERNAME: string;
  PASSWORD: string;
  API_KEY: string;
  USER_DATA: string;
  USER_ROLE: string;
  LAST_LOGIN: string;
  SETTINGS: string;
  PREFERENCES: string;
  CACHE_PREFIX: string;
}

export interface Routes {
  AUTH: {
    LOGIN: string;
  };
  TABS: {
    DASHBOARD: string;
    PATIENTS: string;
    CONSULTATIONS: string;
    BILANS: string;
    PROFILE: string;
  };
  FORMS: {
    GROSSESSE_ADD: string;
    GROSSESSE_EDIT: string;
    CONSULTATION_ADD: string;
    CONSULTATION_EDIT: string;
    BILAN_ADD: string;
    BILAN_EDIT: string;
    ACCOUCHEMENT_ADD: string;
        ACCOUCHEMENT_EDIT: string;
    NOTIFICATION_ADD: string;
    NOTIFICATION_EDIT: string;
    PATIENTE_ADD: string;
  };
  DETAILS: {
    PATIENTE: string;
    GROSSESSE: string;
    CONSULTATION: string;
    BILAN: string;
    ACCOUCHEMENT: string;
  };
}

// =================== HELPERS ET UTILITAIRES ===================

export interface FormatOptions {
  locale?: string;
  format?: string;
  timezone?: string;
}

export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  message?: string;
}

export interface ValidationSchema {
  [field: string]: ValidationRule | ValidationRule[];
}

// =================== MÉDIAS ET FICHIERS ===================

export interface FileUpload {
  uri: string;
  name: string;
  type: string;
  size: number;
}

export interface ImageUpload extends FileUpload {
  width?: number;
  height?: number;
}

export interface DocumentUpload extends FileUpload {
  pages?: number;
}

export interface Attachment {
  id: number;
  name: string;
  file_name: string;
  file_size: number;
  mimetype: string;
  url: string;
  res_model: string;
  res_id: number;
  create_date: string;
}

// =================== RECHERCHE AVANCÉE ===================

export interface AdvancedSearchCriteria {
  text?: string;
  fields?: string[];
  date_range?: DateRange;
  filters?: SearchFilters;
  sort?: SortOptions;
  pagination?: PaginationOptions;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  query: string;
  filters_applied: SearchFilters;
}

// =================== NOTIFICATIONS PUSH ===================

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  data?: any;
  badge?: number;
  sound?: string;
  priority?: 'default' | 'high' | 'max';
  channelId?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  badge: boolean;
  channels: {
    consultations: boolean;
    bilans: boolean;
    alertes: boolean;
    urgences: boolean;
  };
}

// =================== GÉOLOCALISATION ===================

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  formatted?: string;
}

// =================== CALENDRIER ===================

export interface CalendarConfig {
  locale: string;
  firstDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  minDate?: string;
  maxDate?: string;
  disabledDates?: string[];
  markedDates?: {
    [date: string]: {
      marked?: boolean;
      dotColor?: string;
      selected?: boolean;
      selectedColor?: string;
      disabled?: boolean;
    };
  };
}

export interface CalendarDay {
  date: string;
  day: number;
  month: number;
  year: number;
  isToday: boolean;
  isWeekend: boolean;
  isDisabled: boolean;
  events: CalendarEvent[];
}

// =================== IMPRESSION ===================

export interface PrintOptions {
  orientation?: 'portrait' | 'landscape';
  paperSize?: 'A4' | 'Letter' | 'Legal';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  header?: string;
  footer?: string;
  pageNumbers?: boolean;
}

export interface PrintDocument {
  title: string;
  content: string;
  options?: PrintOptions;
}

// =================== BACKUP ET RESTAURATION ===================

export interface BackupData {
  version: string;
  timestamp: string;
  user_id: number;
  data: {
    patientes: PatienteProfile[];
    grossesses: Grossesse[];
    consultations: Consultation[];
    bilans: BilanPrenatal[];
    accouchements: Accouchement[];
    notifications: Notification[];
  };
  metadata: {
    total_records: number;
    models: string[];
  };
}

export interface RestoreOptions {
  overwrite?: boolean;
  merge?: boolean;
  skip_existing?: boolean;
}

// =================== ANALYTICS ===================

export interface AnalyticsEvent {
  name: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: string;
  user_id?: number;
}

export interface AnalyticsData {
  page_views: {
    [page: string]: number;
  };
  user_actions: {
    [action: string]: number;
  };
  errors: {
    [error: string]: number;
  };
  performance: {
    avg_load_time: number;
    avg_api_response_time: number;
  };
}

// =================== WEBSOCKET ===================

export interface WebSocketMessage {
  type: 'notification' | 'update' | 'alert' | 'sync';
  data: any;
  timestamp: string;
}

export interface WebSocketConfig {
  url: string;
  reconnect: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

// =================== ERREURS PERSONNALISÉES ===================

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', 401, details);
    this.name = 'AuthError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Erreur réseau', details?: any) {
    super(message, 'NETWORK_ERROR', 0, details);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors?: ValidationError[], details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Ressource non trouvée', details?: any) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}

export class PermissionError extends AppError {
  constructor(message: string = 'Permission refusée', details?: any) {
    super(message, 'PERMISSION_DENIED', 403, details);
    this.name = 'PermissionError';
  }
}

// =================== TYPES UTILITAIRES ===================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type AsyncFunction<T = void> = () => Promise<T>;

export type Callback<T = void> = (data: T) => void;

export type ErrorCallback = (error: Error) => void;

export type SuccessCallback<T = void> = (data: T) => void;

// =================== TYPES DE RÉPONSE STANDARDISÉS ===================

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export type ApiResult<T> = SuccessResponse<T> | ErrorResponse;

// =================== TYPES POUR LES LISTES ===================

export interface ListItem {
  id: number;
  label: string;
  value: any;
  icon?: string;
  color?: string;
  disabled?: boolean;
}

export interface SelectOption extends ListItem {
  selected?: boolean;
}

export interface RadioOption extends ListItem {
  checked?: boolean;
}

export interface CheckboxOption extends ListItem {
  checked?: boolean;
}

// =================== TYPES POUR LES MODALES ===================

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
}

export interface ConfirmModalProps extends ModalProps {
  message: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
}

export interface AlertModalProps extends ModalProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onOk?: () => void;
}

// =================== TYPES POUR LES COMPOSANTS ===================

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  fullWidth?: boolean;
}

export interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  icon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
}
/**
 * 🔌 Types pour l'API Odoo
 */
export interface OdooAuthResponse {
  Status: 'Success' | 'Failed';
  'api-key': string;
  uid: number;
  message?: string;
}

export interface OdooSearchReadResponse<T = any> {
  records: T[];
  length: number;
}

export interface SendRequestPayload {
  model: string;
  method: string;
  args: any[];
  kwargs?: Record<string, any>;
}

export interface OdooError {
  code: number;
  message: string;
  data?: {
    name: string;
    debug: string;
    message: string;
    arguments: any[];
    context: Record<string, any>;
  };
}


export interface CardProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  footer?: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
}

// =================== EXPORT PAR DÉFAUT ===================

export default {
  // Types de base
  User,
  LoginCredentials,
  MedecinProfile,
  PatienteProfile,

  // Modèles principaux
  Grossesse,
  Consultation,
  BilanPrenatal,
  Accouchement,
  Notification,

  // Réponses API
  ApiResponse,
  OdooApiResponse,
  PaginatedResponse,

  // Erreurs
  AppError,
  AuthError,
  NetworkError,
  ValidationError,
  NotFoundError,
  PermissionError,
};



