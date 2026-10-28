export const environment = {
  production: false,
  supabase: {
    url: 'https://your-development-project.supabase.co',
    anonKey: 'your-development-anon-key',
  },
  pos: {
    defaultCurrency: 'AED',
    defaultTaxRate: 0.05, // 5% UAE standard VAT
    locale: 'en-AE',
    allowNegativeStockDefault: false,
    invoicePrefixDefault: 'INV-DEV',
  },
};
