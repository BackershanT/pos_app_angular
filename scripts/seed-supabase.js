const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const projectRef = env.SUPABASE_PROJECT_REF || 'vurjengmqgudzibnfulo';
  const supabaseUrl = env.SUPABASE_URL || `https://${projectRef}.supabase.co`;
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  const dbPassword = env.SUPABASE_DB_PASSWORD;
  const sqlFilePath = path.resolve(__dirname, '..', 'supabase', 'seed_dummy_data.sql');

  console.log('====================================================');
  console.log('   AeroPOS UAE - Supabase Dummy Data Seeder');
  console.log('====================================================');
  console.log(`Target Supabase Project: ${projectRef}`);
  console.log(`Supabase URL:            ${supabaseUrl}`);

  const isPasswordProvided = dbPassword && !dbPassword.includes('your-supabase-database-password');

  if (isPasswordProvided) {
    console.log('\n[1/3] Database password detected in .env. Connecting via direct PostgreSQL...');
    const client = new Client({
      host: env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`,
      port: Number(env.SUPABASE_DB_PORT) || 5432,
      database: env.SUPABASE_DB_NAME || 'postgres',
      user: env.SUPABASE_DB_USER || 'postgres',
      password: dbPassword,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      console.log('✓ Successfully connected to Supabase PostgreSQL database.');

      console.log('\n[2/3] Executing supabase/seed_dummy_data.sql...');
      const sql = fs.readFileSync(sqlFilePath, 'utf8');
      await client.query(sql);
      console.log('✓ Schema and dummy data successfully seeded!');

      console.log('\n[3/3] Verifying seeded rows...');
      const catCount = await client.query('SELECT COUNT(*) FROM public.categories;');
      const prodCount = await client.query('SELECT COUNT(*) FROM public.products;');
      const custCount = await client.query('SELECT COUNT(*) FROM public.customers;');
      const invCount = await client.query('SELECT COUNT(*) FROM public.store_inventory;');

      console.log(`✓ Categories:      ${catCount.rows[0].count} rows`);
      console.log(`✓ Products:        ${prodCount.rows[0].count} rows`);
      console.log(`✓ Customers:       ${custCount.rows[0].count} rows`);
      console.log(`✓ Store Inventory: ${invCount.rows[0].count} rows`);

      await client.end();
      console.log('\nDatabase seeding finished successfully!');
      return;
    } catch (err) {
      console.error('Direct connection failed:', err.message);
      console.log('Falling back to Supabase client verification...');
    }
  } else {
    console.log('\n[!] SUPABASE_DB_PASSWORD is not set in .env yet.');
    console.log('    You can run the generated SQL directly in the Supabase Dashboard:');
    console.log(`    👉 https://supabase.com/dashboard/project/${projectRef}/sql/new`);
    console.log(`    File location: ${sqlFilePath}`);
  }

  // Verify status with REST API
  if (publishableKey) {
    console.log('\nChecking Supabase REST API connectivity...');
    const sb = createClient(supabaseUrl, publishableKey);
    const { data: categories, error: catErr } = await sb.from('categories').select('id, name');
    const { data: products, error: prodErr } = await sb.from('products').select('id, name');

    if (catErr || prodErr) {
      console.log('\n[INFO] PostgREST schema cache reports tables not yet found in database.');
      console.log('To activate them immediately:');
      console.log(`1. Open: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
      console.log('2. Paste the contents of supabase/seed_dummy_data.sql and click "Run".');
      console.log('3. All 24 products, 4 categories, and 6 customers will appear in the POS register.');
    } else {
      console.log(`✓ PostgREST live! Found ${categories?.length || 0} categories, ${products?.length || 0} products.`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error during seeding:', err);
  process.exit(1);
});
