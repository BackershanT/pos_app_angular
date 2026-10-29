const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const url = env.SUPABASE_URL || `https://${env.SUPABASE_PROJECT_REF}.supabase.co`;
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  const probes = [
    ['purchase_orders total+notes', '/rest/v1/purchase_orders?select=id,total,notes&limit=1'],
    ['purchase_orders timestamps', '/rest/v1/purchase_orders?select=id,ordered_at,expected_at,received_at&limit=1'],
    ['purchase_order count', '/rest/v1/purchase_orders?select=id&limit=1'],
    ['po_items embed products', '/rest/v1/purchase_order_items?select=id,products(name,sku)&limit=1'],
    ['po embed supplier+items', '/rest/v1/purchase_orders?select=id,order_number,suppliers(name,tax_number),purchase_order_items(id,quantity,unit_cost,subtotal,product_id,products(name,sku))&limit=1&order=created_at.desc'],
  ];

  for (const [label, qs] of probes) {
    try {
      const res = await fetch(url + qs, { headers });
      const text = await res.text();
      console.log(`\n### ${label} -> HTTP ${res.status}`);
      console.log(text.slice(0, 700));
    } catch (err) {
      console.log(`\n### ${label} -> FETCH ERROR ${err.message}`);
    }
  }
}

main();
