import { ODOO_CONFIG } from '../config/odoo';

interface TestResult {
  success: boolean;
  apiKey?: string;
  method?: string;
}

/**
 * 🧪 Tester l'authentification Odoo REST API
 */
export async function testOdooConnect(
  username: string,
  password: string
): Promise<TestResult> {
  console.log('\n🧪 ========================================');
  console.log('🧪 TEST ODOO REST API - AUTHENTICATION');
  console.log('🧪 ========================================');
  console.log('📍 URL:', ODOO_CONFIG.BASE_URL);
  console.log('📍 Database:', ODOO_CONFIG.DATABASE);
  console.log('📍 Username:', username);
  console.log('🧪 ========================================');

  // ESSAI 1: GET avec paramètres dans l'URL
  try {
    console.log('\n📤 Tentative 1: GET avec paramètres URL');
    const url = `${ODOO_CONFIG.BASE_URL}/odoo_connect?db=${ODOO_CONFIG.DATABASE}&login=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    console.log('📤 URL:', url.replace(password, '***'));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    const duration = Date.now() - startTime;

    clearTimeout(timeoutId);

    console.log(`⏱️  Durée: ${duration}ms`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`📊 OK: ${response.ok}`);

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      console.log('📋 Content-Type:', contentType);

      try {
        const data = await response.json();
        console.log('📦 Réponse:', JSON.stringify(data, null, 2));

        if (data.Status === 'auth successful' && data['api-key']) {
          console.log('\n✅ ========================================');
          console.log('✅ AUTHENTIFICATION RÉUSSIE (GET URL) !');
          console.log('✅ ========================================');
          console.log('👤 User:', data.User);
          console.log('🔑 API Key:', data['api-key']);
          console.log('✅ ========================================\n');
          return { success: true, apiKey: data['api-key'], method: 'GET URL' };
        }
      } catch (jsonError: any) {
        console.error('❌ Erreur parsing JSON:', jsonError.message);
        const text = await response.text();
        console.error('❌ Texte brut:', text.substring(0, 200));
      }
    } else {
      const text = await response.text();
      console.error('❌ GET URL échoué:', text.substring(0, 200));
    }
  } catch (error: any) {
    console.error('❌ Erreur GET URL:', error.message);
  }

  // ESSAI 2: GET avec headers
  try {
    console.log('\n📤 Tentative 2: GET avec headers');
    const url = `${ODOO_CONFIG.BASE_URL}/odoo_connect`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'db': ODOO_CONFIG.DATABASE,
        'login': username,
        'password': password,
      },
      signal: controller.signal,
    });
    const duration = Date.now() - startTime;

    clearTimeout(timeoutId);

    console.log(`⏱️  Durée: ${duration}ms`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`📊 OK: ${response.ok}`);

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      console.log('📋 Content-Type:', contentType);

      // ⬇️ ESSAYER DE PARSER LE JSON MÊME SI LE CONTENT-TYPE EST INCORRECT
      try {
        const data = await response.json();
        console.log('📦 Réponse:', JSON.stringify(data, null, 2));

        if (data.Status === 'auth successful' && data['api-key']) {
          console.log('\n✅ ========================================');
          console.log('✅ AUTHENTIFICATION RÉUSSIE (GET headers) !');
          console.log('✅ ========================================');
          console.log('👤 User:', data.User);
          console.log('🔑 API Key:', data['api-key']);
          console.log('✅ ========================================\n');
          return { success: true, apiKey: data['api-key'], method: 'GET headers' };
        } else {
          console.error('❌ Réponse invalide:', data);
        }
      } catch (jsonError: any) {
        console.error('❌ Erreur parsing JSON:', jsonError.message);
        const text = await response.text();
        console.error('❌ Texte brut:', text.substring(0, 200));
      }
    } else {
      const text = await response.text();
      console.error('❌ GET headers échoué:', text.substring(0, 200));
    }
  } catch (error: any) {
    console.error('❌ Erreur GET headers:', error.message);
  }

  // ESSAI 3: POST avec body JSON
  try {
    console.log('\n📤 Tentative 3: POST avec body JSON');
    const url = `${ODOO_CONFIG.BASE_URL}/odoo_connect`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        db: ODOO_CONFIG.DATABASE,
        login: username,
        password: password,
      }),
      signal: controller.signal,
    });
    const duration = Date.now() - startTime;

    clearTimeout(timeoutId);

    console.log(`⏱️  Durée: ${duration}ms`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`📊 OK: ${response.ok}`);

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      console.log('📋 Content-Type:', contentType);

      try {
        const data = await response.json();
        console.log('📦 Réponse:', JSON.stringify(data, null, 2));

        if (data.Status === 'auth successful' && data['api-key']) {
          console.log('\n✅ ========================================');
          console.log('✅ AUTHENTIFICATION RÉUSSIE (POST body) !');
          console.log('✅ ========================================');
          console.log('👤 User:', data.User);
          console.log('🔑 API Key:', data['api-key']);
          console.log('✅ ========================================\n');
          return { success: true, apiKey: data['api-key'], method: 'POST body' };
        }
      } catch (jsonError: any) {
        console.error('❌ Erreur parsing JSON:', jsonError.message);
        const text = await response.text();
        console.error('❌ Texte brut:', text.substring(0, 200));
      }
    } else {
      const text = await response.text();
      console.error('❌ POST body échoué:', text.substring(0, 200));
    }
  } catch (error: any) {
    console.error('❌ Erreur POST body:', error.message);
  }

  // ESSAI 4: POST avec headers
  try {
    console.log('\n📤 Tentative 4: POST avec headers');
    const url = `${ODOO_CONFIG.BASE_URL}/odoo_connect`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'db': ODOO_CONFIG.DATABASE,
        'login': username,
        'password': password,
      },
      signal: controller.signal,
    });
    const duration = Date.now() - startTime;

    clearTimeout(timeoutId);

    console.log(`⏱️  Durée: ${duration}ms`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`📊 OK: ${response.ok}`);

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      console.log('📋 Content-Type:', contentType);

      try {
        const data = await response.json();
        console.log('📦 Réponse:', JSON.stringify(data, null, 2));

        if (data.Status === 'auth successful' && data['api-key']) {
          console.log('\n✅ ========================================');
          console.log('✅ AUTHENTIFICATION RÉUSSIE (POST headers) !');
          console.log('✅ ========================================');
          console.log('👤 User:', data.User);
          console.log('🔑 API Key:', data['api-key']);
          console.log('✅ ========================================\n');
          return { success: true, apiKey: data['api-key'], method: 'POST headers' };
        }
      } catch (jsonError: any) {
        console.error('❌ Erreur parsing JSON:', jsonError.message);
        const text = await response.text();
        console.error('❌ Texte brut:', text.substring(0, 200));
      }
    } else {
      const text = await response.text();
      console.error('❌ POST headers échoué:', text.substring(0, 200));
    }
  } catch (error: any) {
    console.error('❌ Erreur POST headers:', error.message);
  }

  console.log('\n❌ ========================================');
  console.log('❌ TOUTES LES TENTATIVES ONT ÉCHOUÉ');
  console.log('❌ ========================================\n');

  return { success: false };
}

/**
 * 🧪 Tester l'envoi de requêtes avec l'API Key
 */
export async function testSendRequest(apiKey: string, username: string, password: string): Promise<boolean> {
  console.log('\n🧪 ========================================');
  console.log('🧪 TEST SEND_REQUEST');
  console.log('🧪 ========================================');

  try {
    console.log('📤 Test GET res.users...');
    const url = `${ODOO_CONFIG.BASE_URL}/send_request?model=res.users`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'db': ODOO_CONFIG.DATABASE,
        'login': username,
        'password': password,
        'api-key': apiKey,
      },
      body: JSON.stringify({
        fields: ['id', 'name', 'login', 'email'],
      }),
      signal: controller.signal,
    });
    const duration = Date.now() - startTime;

    clearTimeout(timeoutId);

    console.log(`⏱️  Durée: ${duration}ms`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`📊 OK: ${response.ok}`);

    if (response.ok) {
      const data = await response.json();
      console.log('📦 Réponse:', JSON.stringify(data, null, 2));

      if (data.records && data.records.length > 0) {
        console.log('\n✅ ========================================');
        console.log('✅ SEND_REQUEST RÉUSSI !');
        console.log('✅ ========================================');
        console.log('👤 Utilisateur:', data.records[0]);
        console.log('✅ ========================================\n');
        return true;
      } else {
        console.error('❌ Aucun enregistrement retourné');
      }
    } else {
      const text = await response.text();
      console.error('❌ send_request échoué:', text.substring(0, 200));
    }
  } catch (error: any) {
    console.error('❌ Erreur send_request:', error.message);
  }

  return false;
}

/**
 * 🧪 Test complet de l'API REST
 */
export async function testCompleteRestApi(
  username: string,
  password: string
): Promise<TestResult> {
  console.log('\n🚀 ========================================');
  console.log('🚀 DÉMARRAGE DES TESTS COMPLETS');
  console.log('🚀 ========================================\n');

  // Test 1: Authentification
  const authResult = await testOdooConnect(username, password);

  if (!authResult.success || !authResult.apiKey) {
    console.log('\n❌ ========================================');
    console.log('❌ ÉCHEC: Authentification impossible');
    console.log('❌ ========================================\n');
    return { success: false };
  }

  // Test 2: Envoi de requêtes
  const sendRequestSuccess = await testSendRequest(
    authResult.apiKey,
    username,
    password
  );

  if (!sendRequestSuccess) {
    console.log('\n⚠️  ========================================');
    console.log('⚠️  AVERTISSEMENT: send_request a échoué');
    console.log('⚠️  Mais l\'authentification fonctionne');
    console.log('⚠️  ========================================\n');
    return {
      success: true,
      apiKey: authResult.apiKey,
      method: authResult.method,
    };
  }

  console.log('\n✅ ========================================');
  console.log('✅ TOUS LES TESTS RÉUSSIS ! 🎉');
  console.log('✅ ========================================');
  console.log('✅ Méthode:', authResult.method);
  console.log('✅ API Key:', authResult.apiKey);
  console.log('✅ ========================================\n');

  return {
    success: true,
    apiKey: authResult.apiKey,
    method: authResult.method,
  };
}

/**
 * 🔍 Découvrir les endpoints disponibles
 */
export async function discoverOdooEndpoints(
  username: string,
  password: string
): Promise<Array<{ endpoint: string; method: string; status: number; ok: boolean }>> {
  console.log('\n🔍 ========================================');
  console.log('🔍 DÉCOUVERTE DES ENDPOINTS');
  console.log('🔍 ========================================\n');

  const endpoints = [
    { path: '/odoo_connect', method: 'GET' },
    { path: '/odoo_connect', method: 'POST' },
    { path: '/send_request', method: 'GET' },
    { path: '/send_request', method: 'POST' },
    { path: '/api/v1/auth', method: 'POST' },
    { path: '/api/auth', method: 'POST' },
    { path: '/rest/auth', method: 'POST' },
    { path: '/web/session/authenticate', method: 'POST' },
  ];

  const results = [];

  for (const endpoint of endpoints) {
    try {
      console.log(`🔍 Test ${endpoint.method} ${endpoint.path}...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const url = `${ODOO_CONFIG.BASE_URL}${endpoint.path}`;
      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'db': ODOO_CONFIG.DATABASE,
          'login': username,
          'password': password,
        },
        signal: controller.signal,
      };

      if (endpoint.method === 'POST') {
        options.body = JSON.stringify({
          db: ODOO_CONFIG.DATABASE,
          login: username,
          password: password,
        });
      }

      const response = await fetch(url, options);
      clearTimeout(timeoutId);

      console.log(`   Status: ${response.status} ${response.ok ? '✅' : '❌'}`);

      results.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        status: response.status,
        ok: response.ok,
      });

      // Si on trouve un endpoint qui fonctionne, afficher la réponse
      if (response.ok || response.status === 401 || response.status === 403) {
        try {
          const data = await response.json();
          console.log('   Réponse:', JSON.stringify(data, null, 2));
        } catch {
          const text = await response.text();
          console.log('   Réponse (texte):', text.substring(0, 100));
        }
      }
    } catch (error: any) {
      console.log(`   Erreur: ${error.message}`);
      results.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        status: 0,
        ok: false,
      });
    }
  }

  console.log('\n🔍 ========================================');
  console.log('🔍 RÉSULTATS DE LA DÉCOUVERTE');
  console.log('🔍 ========================================');

  const workingEndpoints = results.filter(r => r.ok || r.status === 401 || r.status === 403);
  
  if (workingEndpoints.length > 0) {
    console.log('\n✅ Endpoints accessibles:');
    workingEndpoints.forEach(e => {
      console.log(`   ${e.method} ${e.endpoint} (${e.status})`);
    });
  } else {
    console.log('\n❌ Aucun endpoint accessible trouvé');
  }

  console.log('\n🔍 ========================================\n');

  return results;
}

