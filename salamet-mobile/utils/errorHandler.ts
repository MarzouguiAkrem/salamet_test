/**
 * 🚨 Utilitaire de gestion des erreurs
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthError extends AppError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Erreur réseau') {
    super(message, 'NETWORK_ERROR', 0);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

/**
 * 🔍 Analyser et formater les erreurs
 */
export function parseError(error: any): AppError {
  // Erreur réseau
  if (error.message?.includes('Network') || error.code === 'ECONNREFUSED') {
    return new NetworkError('Impossible de se connecter au serveur');
  }

  // Erreur d'authentification
  if (
    error.message?.includes('wrong login credentials') ||
    error.message?.includes('authentification')
  ) {
    return new AuthError('Identifiants incorrects');
  }

  // Erreur de validation
  if (error.message?.includes('requis') || error.message?.includes('invalide')) {
    return new ValidationError(error.message);
  }

  // Erreur générique
  return new AppError(
    error.message || 'Une erreur est survenue',
    error.code,
    error.statusCode
  );
}

/**
 * 📝 Logger les erreurs
 */
export function logError(error: any, context?: string): void {
  const timestamp = new Date().toISOString();
  const contextStr = context ? `[${context}]` : '';

  console.error(`❌ ${timestamp} ${contextStr}`, {
    name: error.name,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    stack: error.stack,
  });
}
