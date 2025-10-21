/**
 * ⚙️ Configuration Odoo
 */
export const ODOO_CONFIG = {
  BASE_URL: 'https://salamet.bizup.tn',
  DATABASE: 'salamet',
  TIMEOUT: 30000, // 30 secondes
  
  ENDPOINTS: {
    CONNECT: '/odoo_connect',
    SEND_REQUEST: '/send_request',
  },

  STORAGE_KEYS: {
    API_KEY: 'odoo_api_key',
    USERNAME: 'odoo_username',
    PASSWORD: 'odoo_password',
  },

  // Modèles Odoo
  MODELS: {
    USERS: 'res.users',
    PARTNERS: 'res.partner',
    PRODUCTS: 'product.product',
    SALES_ORDERS: 'sale.order',
    INVOICES: 'account.move',
  },
};

/**
 * 📝 Logger Odoo
 */
export const odooLogger = {
  log: (message: string, ...args: any[]) => {
    console.log(`🔵 [Odoo] ${message}`, ...args);
  },

  success: (message: string, ...args: any[]) => {
    console.log(`✅ [Odoo] ${message}`, ...args);
  },

  error: (message: string, ...args: any[]) => {
    console.error(`❌ [Odoo] ${message}`, ...args);
  },

  warn: (message: string, ...args: any[]) => {
    console.warn(`⚠️  [Odoo] ${message}`, ...args);
  },

  debug: (message: string, ...args: any[]) => {
    if (__DEV__) {
      console.log(`🔍 [Odoo Debug] ${message}`, ...args);
    }
  },
};
