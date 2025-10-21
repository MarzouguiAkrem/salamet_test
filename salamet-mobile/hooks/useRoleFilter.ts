import { useAuth } from '../contexts/AuthContext';

/**
 * Hook pour générer automatiquement les domaines de filtrage selon le rôle
 */
export const useRoleFilter = () => {
  const { user, isPatiente, isMedecin } = useAuth();

  /**
   * Filtre pour les patientes
   * - Patiente : seulement elle-même
   * - Médecin : ses patientes assignées
   */
  const getPatienteFilter = () => {
    if (isPatiente && user?.profile?.id) {
      return [['id', '=', user.profile.id]];
    } else if (isMedecin && user?.profile?.id) {
      return [['medecin_ids', 'in', [user.profile.id]]];
    }
    return [];
  };

  /**
   * Filtre pour les grossesses
   * - Patiente : seulement ses grossesses
   * - Médecin : grossesses de ses patientes
   */
  const getGrossesseFilter = () => {
    if (isPatiente && user?.profile?.id) {
      return [['patiente_id', '=', user.profile.id]];
    } else if (isMedecin && user?.profile?.id) {
      return [['patiente_id.medecin_ids', 'in', [user.profile.id]]];
    }
    return [];
  };

  /**
   * Filtre pour les consultations
   * - Patiente : seulement ses consultations
   * - Médecin : consultations de ses patientes OU qu'il a faites
   */
  const getConsultationFilter = () => {
    if (isPatiente && user?.profile?.id) {
      return [['patiente_id', '=', user.profile.id]];
    } else if (isMedecin && user?.profile?.id) {
      return [
        '|',
        ['medecin_id', '=', user.profile.id],
        ['grossesse_id.patiente_id.medecin_ids', 'in', [user.profile.id]]
      ];
    }
    return [];
  };

  /**
   * Filtre pour les bilans
   * - Patiente : seulement ses bilans
   * - Médecin : bilans de ses patientes OU qu'il a prescrits
   */
  const getBilanFilter = () => {
    if (isPatiente && user?.profile?.id) {
      return [['patiente_id', '=', user.profile.id]];
    } else if (isMedecin && user?.profile?.id) {
      return [
        '|',
        ['medecin_id', '=', user.profile.id],
        ['grossesse_id.patiente_id.medecin_ids', 'in', [user.profile.id]]
      ];
    }
    return [];
  };

  /**
   * Filtre pour les accouchements
   * - Patiente : seulement ses accouchements
   * - Médecin : accouchements de ses patientes
   */
  const getAccouchementFilter = () => {
    if (isPatiente && user?.profile?.id) {
      return [['patiente_id', '=', user.profile.id]];
    } else if (isMedecin && user?.profile?.id) {
      return [['patiente_id.medecin_ids', 'in', [user.profile.id]]];
    }
    return [];
  };

  /**
   * Filtre pour les notifications
   * - Patiente : seulement ses notifications
   * - Médecin : notifications de ses patientes OU qui lui sont adressées
   */
  const getNotificationFilter = () => {
    if (isPatiente && user?.profile?.id) {
      return [['patiente_id', '=', user.profile.id]];
    } else if (isMedecin && user?.profile?.id) {
      return [
        '|',
        ['medecin_id', '=', user.profile.id],
        ['patiente_id.medecin_ids', 'in', [user.profile.id]]
      ];
    }
    return [];
  };

  /**
   * Vérifier si l'utilisateur peut modifier
   */
  const canModify = (): boolean => {
    return isMedecin; // Seuls les médecins peuvent modifier
  };

  /**
   * Vérifier si l'utilisateur peut créer
   */
  const canCreate = (): boolean => {
    return isMedecin; // Seuls les médecins peuvent créer
  };

  /**
   * Vérifier si l'utilisateur peut supprimer
   */
  const canDelete = (): boolean => {
    return isMedecin; // Seuls les médecins peuvent supprimer
  };

  return {
    // Filtres
    getPatienteFilter,
    getGrossesseFilter,
    getConsultationFilter,
    getBilanFilter,
    getAccouchementFilter,
    getNotificationFilter,
    
    // Permissions
    canModify,
    canCreate,
    canDelete,
    
    // Infos utilisateur
    userId: user?.profile?.id,
    isPatiente,
    isMedecin,
  };
};
