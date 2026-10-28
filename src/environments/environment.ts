export const environment = {
  production: true,
  supabase: {
    url: 'https://your-production-project.supabase.co',
    anonKey: 'your-production-anon-key',
  },
  pos: {
    defaultCurrency: 'AED',
    defaultTaxRate: 0.05, // 5% UAE standard VAT
    locale: 'en-AE',
    allowNegativeStockDefault: false,
    invoicePrefixDefault: 'INV',
  },
};
