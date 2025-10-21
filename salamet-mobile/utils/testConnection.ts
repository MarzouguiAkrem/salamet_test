import { ODOO_CONFIG, odooLogger } from '../config/odoo';

/**
 * 🧪 Tester la connexion au serveur Odoo
 */
export async function testOdooConnection() {
  console.log('\n🧪 ========================================');
  console.log('🧪 TEST DE CONNEXION ODOO');
  console.log('🧪 ========================================');
  console.log('📍 URL:', ODOO_CONFIG.BASE_URL);
  console.log('📍 Database:', ODOO_CONFIG.DATABASE);
  console.log('🧪 ========================================\n');

  // Test 1: Ping serveur
  try {
    console.log('1️⃣ Test ping serveur...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const startTime = Date.now();
    const response = await fetch(ODOO_CONFIG.BASE_URL, {
      method: 'GET',
      signal: controller.signal,
    });
    const duration = Date.now() - startTime;

    clearTimeout(timeoutId);
    console.log(`✅ Serveur accessible (${duration}ms)`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Headers:`, response.headers);
  } catch (error: any) {
    console.error('❌ Serveur non accessible:', error.message);
    if (error.name === 'AbortError') {
      console.error('   Cause: Timeout (>10s)');
    }
    return false;
  }

  // Test 2: Endpoint database list
  try {
    console.log('\n2️⃣ Test endpoint /web/database/list...');
        const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const startTime = Date.now();
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
      signal: controller.signal,
    });
    const duration = Date.now() - startTime;

    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`❌ Erreur HTTP ${response.status}`);
      return false;
    }

    const data = await response.json();
    console.log(`✅ Endpoint accessible (${duration}ms)`);
    console.log('   Bases disponibles:', data.result);
    
    // Vérifier si notre base existe
    if (data.result && Array.isArray(data.result)) {
      const dbExists = data.result.includes(ODOO_CONFIG.DATABASE);
      if (dbExists) {
        console.log(`✅ Base "${ODOO_CONFIG.DATABASE}" trouvée`);
      } else {
        console.warn(`⚠️  Base "${ODOO_CONFIG.DATABASE}" non trouvée`);
        console.log('   Bases disponibles:', data.result);
      }
    }
  } catch (error: any) {
    console.error('❌ Endpoint /web/database/list non accessible:', error.message);
    if (error.name === 'AbortError') {
      console.error('   Cause: Timeout (>15s)');
    }
    return false;
  }

  // Test 3: Endpoint authenticate (avec credentials invalides pour tester)
  try {
    console.log('\n3️⃣ Test endpoint /api/authenticate...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const startTime = Date.now();
    const response = await fetch(`${ODOO_CONFIG.BASE_URL}/api/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        params: {
          db: ODOO_CONFIG.DATABASE,
          login: 'test_invalid_user',
          password: 'test_invalid_pass',
        },
      }),
      signal: controller.signal,
    });
    const duration = Date.now() - startTime;

    clearTimeout(timeoutId);
    
    console.log(`✅ Endpoint /api/authenticate accessible (${duration}ms)`);
    console.log(`   Status: ${response.status}`);
    
    const data = await response.json();
    console.log('   Réponse:', JSON.stringify(data, null, 2));
    
    // C'est normal d'avoir une erreur ici car on utilise des credentials invalides
    if (data.error) {
      console.log('✅ Endpoint fonctionne (erreur attendue avec credentials invalides)');
    }
  } catch (error: any) {
    console.error('❌ Endpoint /api/authenticate non accessible:', error.message);
    if (error.name === 'AbortError') {
      console.error('   Cause: Timeout (>15s)');
    }
    return false;
  }

  console.log('\n🧪 ========================================');
  console.log('✅ TOUS LES TESTS PASSÉS !');
  console.log('🧪 ========================================\n');
  return true;
}

/**
 * 🔍 Tester l'authentification avec de vrais credentials
 */
export async function testAuthentication(username: string, password: string) {
  console.log('\n🔐 ========================================');
  console.log('🔐 TEST AUTHENTIFICATION');
  console.log('🔐 ========================================');
  console.log('📍 Username:', username);
  console.log('📍 Database:', ODOO_CONFIG.DATABASE);
  console.log('🔐 ========================================\n');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const startTime = Date.now();
    const response = await fetch(`${ODOO_CONFIG.BASE_URL}/api/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        params: {
          db: ODOO_CONFIG.DATABASE,
          login: username,
          password: password,
        },
      }),
      signal: controller.signal,
    });
    const duration = Date.now() - startTime;

    clearTimeout(timeoutId);

    console.log(`⏱️  Durée de la requête: ${duration}ms`);
    console.log(`📊 Status HTTP: ${response.status}`);

    if (!response.ok) {
      console.error(`❌ Erreur HTTP ${response.status}: ${response.statusText}`);
      return false;
    }

    const data = await response.json();
    console.log('📦 Réponse complète:', JSON.stringify(data, null, 2));

    if (data.error) {
      console.error('❌ Erreur Odoo:', data.error);
      return false;
    }

    if (data.result) {
      console.log('✅ Authentification réussie !');
      console.log('📊 Résultat:', data.result);
      return true;
    }

    console.error('❌ Réponse inattendue');
    return false;
  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    if (error.name === 'AbortError') {
      console.error('   Cause: Timeout (>30s)');
    }
    return false;
  } finally {
    console.log('\n🔐 ========================================\n');
  }
}

