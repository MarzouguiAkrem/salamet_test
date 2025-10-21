/**
 * ⚙️ Configuration de l'application
 */

export const API_CONFIG = {
  BASE_URL: 'https://salamet.bizup.tn',
  DATABASE: 'salamet',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

export const STORAGE_KEYS = {
  USERNAME: 'username',
  PASSWORD: 'password',
  API_KEY: 'api_key',
  USER_DATA: 'user_data',
  USER_ROLE: 'user_role',
  LAST_LOGIN: 'last_login',
};

export const ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
  },
  TABS: {
    DASHBOARD: '/(tabs)/dashboard',
    PATIENTS: '/(tabs)/patients',
    PROFILE: '/(tabs)/profile',
  },
};

export const USER_ROLES = {
  MEDECIN_SENIOR: 'medecin_senior',
  MEDECIN_RESIDENT: 'medecin_resident',
  PATIENTE: 'patiente',
  ADMIN: 'admin',
} as const;
