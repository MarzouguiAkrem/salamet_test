import { ODOO_CONFIG } from '../config/odoo';

/**
 * 🔍 Vérifier les endpoints disponibles
 */
export async function checkOdooEndpoints() {
  console.log('\n🔍 ========================================');
  console.log('🔍 VÉRIFICATION DES ENDPOINTS');
  console.log('🔍 ========================================\n');

  const endpoints = [
    '/web/database/list',
    '/api/authenticate',
    '/api/call',
    '/web/session/authenticate',
    '/jsonrpc',
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n📍 Test: ${endpoint}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${ODOO_CONFIG.BASE_URL}${endpoint}`, {
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

      clearTimeout(timeoutId);

      console.log(`   Status: ${response.status}`);
      console.log(`   OK: ${response.ok}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Endpoint accessible`);
        console.log(`   Réponse:`, JSON.stringify(data).substring(0, 100));
      } else {
        console.log(`   ⚠️  Status ${response.status}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Erreur: ${error.message}`);
    }
  }

  console.log('\n🔍 ========================================\n');
}
