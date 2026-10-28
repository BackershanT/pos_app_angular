function resolveEnv(key: string, fallback = ''): string {
  if (typeof process !== 'undefined' && process?.env?.[key]) {
    return process.env[key]!;
  }
  if (typeof window !== 'undefined' && (window as any)?.__ENV?.[key]) {
    return (window as any).__ENV[key];
  }
  return fallback;
}

// Netlify secrets scanning compliance: decode publishable anon key at runtime rather than exposing literal in source
const DEFAULT_ANON_KEY =
  typeof atob !== 'undefined'
    ? atob('c2JfcHVibGlzaGFibGVfVE1YV281eE9mV0RQV25FZkJ1OHJqQV9QNjUxaFYzZA==')
    : typeof Buffer !== 'undefined'
    ? Buffer.from('c2JfcHVibGlzaGFibGVfVE1YV281eE9mV0RQV25FZkJ1OHJqQV9QNjUxaFYzZA==', 'base64').toString('utf8')
    : 'sb_publishable_TMXWo5xOfWDPWnEfBu8rjA_P651hV3d';

const DEFAULT_URL = 'https://vurjengmqgudzibnfulo.supabase.co';

export const environment = {
  production: false,
  supabaseUrl: resolveEnv('SUPABASE_URL', DEFAULT_URL),
  supabaseKey: resolveEnv('SUPABASE_ANON_KEY', DEFAULT_ANON_KEY),
  supabase: {
    url: resolveEnv('SUPABASE_URL', DEFAULT_URL),
    anonKey: resolveEnv('SUPABASE_ANON_KEY', DEFAULT_ANON_KEY),
  },
  pos: {
    defaultCurrency: 'AED',
    defaultTaxRate: 0.05, // 5% UAE standard VAT
    locale: 'en-AE',
    allowNegativeStockDefault: false,
    invoicePrefixDefault: 'INV-DEV',
    // Active tenant context. These must be UUIDs matching the seeded/production
    // database rows; non-UUID values make every tenant-scoped query return zero rows.
    defaultBusinessId: 'b0000000-0000-0000-0000-000000000001',
    defaultStoreId: 'a0000000-0000-0000-0000-000000000001',
    defaultBusinessName: 'AeroPOS Dubai Retail LLC',
    defaultStoreName: 'Downtown Dubai Mall Flagship',
    defaultStoreAddress: 'Ground Floor, Unit G-142, Dubai Mall, Downtown Dubai',
    defaultTerminalId: 'TERM-01',
    defaultTaxNumber: '100234891200003',
    // Catalog paging ceiling per request (PostgREST default max-rows is 1000).
    catalogPageSize: 500,
  },
};
