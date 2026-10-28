export const environment = {
  production: true,
  supabaseUrl: 'https://vurjengmqgudzibnfulo.supabase.co',
  supabaseKey: 'sb_publishable_TMXWo5xOfWDPWnEfBu8rjA_P651hV3d',
  supabase: {
    url: 'https://vurjengmqgudzibnfulo.supabase.co',
    anonKey: 'sb_publishable_TMXWo5xOfWDPWnEfBu8rjA_P651hV3d',
  },
  pos: {
    defaultCurrency: 'AED',
    defaultTaxRate: 0.05, // 5% UAE standard VAT
    locale: 'en-AE',
    allowNegativeStockDefault: false,
    invoicePrefixDefault: 'INV',
    // Active tenant context. These must be UUIDs matching the seeded/production
    // database rows; non-UUID values make every tenant-scoped query return zero rows.
    defaultBusinessId: 'b0000000-0000-0000-0000-000000000001',
    defaultStoreId: 's0000000-0000-0000-0000-000000000001',
    defaultBusinessName: 'AeroPOS Cafe LLC',
    defaultStoreName: 'Downtown Dubai Mall Flagship',
    defaultStoreAddress: 'Ground Floor, Unit G-142, Dubai Mall, Downtown Dubai',
    defaultTerminalId: 'TERM-01',
    defaultTaxNumber: '100234891200003',
    // Catalog paging ceiling per request (PostgREST default max-rows is 1000).
    catalogPageSize: 500,
  },
};
