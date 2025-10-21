import { ODOO_CONFIG } from '../config/odoo';

/**
 * 🔍 Découvrir les endpoints disponibles
 */
export async function discoverOdooEndpoints(username: string, password: string) {
  console.log('\n🔍 ========================================');
  console.log('🔍 DÉCOUVERTE DES ENDPOINTS ODOO');
  console.log('🔍 ========================================');
  console.log('📍 URL:', ODOO_CONFIG.BASE_URL);
  console.log('📍 Database:', ODOO_CONFIG.DATABASE);
  console.log('🔍 ========================================\n');

  const endpoints = [
    // Endpoints possibles pour l'authentification
    { path: '/odoo_connect', method: 'POST', description: 'Auth (Cybrosys v1)' },
    { path: '/api/auth', method: 'POST', description: 'Auth (Cybrosys v2)' },
    { path: '/api/authenticate', method: 'POST', description: 'Auth (Alternative)' },
    { path: '/web/session/authenticate', method: 'POST', description: 'Auth (Odoo standard)' },
    
    // Endpoints possibles pour les requêtes
    { path: '/send_request', method: 'GET', description: 'Request (Cybrosys)' },
    { path: '/api/call', method: 'POST', description: 'Call (Alternative)' },
  ];

  const results: any[] = [];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n📍 Test: ${endpoint.method} ${endpoint.path}`);
      console.log(`   Description: ${endpoint.description}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const headers: any = {
        'Content-Type': 'application/json',
      };

      // Essayer différentes façons de passer les credentials
      let body: any = null;

      if (endpoint.path.includes('authenticate') || endpoint.path.includes('auth') || endpoint.path.includes('connect')) {
        // Méthode 1: Headers
        headers['db'] = ODOO_CONFIG.DATABASE;
        headers['login'] = username;
        headers['password'] = password;

        // Méthode 2: Body JSON-RPC
        body = JSON.stringify({
          jsonrpc: '2.0',
          params: {
            db: ODOO_CONFIG.DATABASE,
            login: username,
            password: password,
          },
        });
      }

      const startTime = Date.now();
      const response = await fetch(`${ODOO_CONFIG.BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers,
        body: endpoint.method !== 'GET' ? body : undefined,
        signal: controller.signal,
      });
      const duration = Date.now() - startTime;

      clearTimeout(timeoutId);

      console.log(`   ⏱️  Durée: ${duration}ms`);
      console.log(`   📊 Status: ${response.status}`);
      console.log(`   📊 OK: ${response.ok}`);

      let responseText = '';
      let responseData: any = null;

      try {
        responseText = await response.text();
        
        // Essayer de parser en JSON
        try {
          responseData = JSON.parse(responseText);
          console.log(`   📦 JSON:`, JSON.stringify(responseData, null, 2).substring(0, 200));
        } catch {
          console.log(`   📦 Text:`, responseText.substring(0, 200));
        }
      } catch (error) {
        console.log(`   ⚠️  Impossible de lire la réponse`);
      }

      results.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        status: response.status,
        ok: response.ok,
        duration,
        response: responseData || responseText.substring(0, 100),
      });

      if (response.ok) {
        console.log(`   ✅ Endpoint accessible !`);
      } else if (response.status === 401 || response.status === 403) {
        console.log(`   🔐 Endpoint existe (erreur d'authentification)`);
      } else if (response.status === 404) {
        console.log(`   ❌ Endpoint non trouvé`);
      } else if (response.status === 405) {
        console.log(`   ⚠️  Méthode non autorisée`);
      }
    } catch (error: any) {
      console.log(`   ❌ Erreur: ${error.message}`);
      results.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        error: error.message,
      });
    }
  }

  console.log('\n🔍 ========================================');
  console.log('📊 RÉSUMÉ DES TESTS');
  console.log('🔍 ========================================\n');

  results.forEach((result) => {
    const status = result.ok ? '✅' : result.status === 401 || result.status === 403 ? '🔐' : '❌';
    console.log(`${status} ${result.method} ${result.endpoint} - Status: ${result.status || 'Error'}`);
  });

  console.log('\n🔍 ========================================\n');

  return results;
}

/**
 * 🧪 Tester un endpoint spécifique avec différentes méthodes
 */
export async function testEndpointMethods(
  endpoint: string,
  username: string,
  password: string
) {
  console.log(`\n🧪 Test de ${endpoint} avec différentes méthodes...\n`);

  const methods = ['GET', 'POST', 'PUT', 'PATCH'];

  for (const method of methods) {
    try {
      console.log(`📍 ${method} ${endpoint}`);

      const headers: any = {
        'Content-Type': 'application/json',
        'db': ODOO_CONFIG.DATABASE,
        'login': username,
        'password': password,
      };

      const body = method !== 'GET' ? JSON.stringify({
        jsonrpc: '2.0',
        params: {
          db: ODOO_CONFIG.DATABASE,
          login: username,
          password: password,
        },
      }) : undefined;

      const response = await fetch(`${ODOO_CONFIG.BASE_URL}${endpoint}`, {
        method,
        headers,
        body,
      });

      console.log(`   Status: ${response.status} - ${response.ok ? '✅' : '❌'}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`   Réponse:`, JSON.stringify(data, null, 2).substring(0, 200));
      }
    } catch (error: any) {
      console.log(`   Erreur: ${error.message}`);
    }
  }
}

/**
 * 🔍 Vérifier la version du module REST API
 */
export async function checkRestApiVersion() {
  console.log('\n🔍 Vérification de la version du module REST API...\n');

  try {
    // Essayer d'accéder à la page d'information du module
    const response = await fetch(`${ODOO_CONFIG.BASE_URL}/web/database/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {},
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Serveur Odoo accessible');
      console.log('📊 Bases disponibles:', data.result);
    }
  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
  }
}
