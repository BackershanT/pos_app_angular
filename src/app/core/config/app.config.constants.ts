/**
 * Application constants and UAE / Regional POS configuration tokens.
 */

export const UAE_TAX_CONSTANTS = {
  DEFAULT_CURRENCY: 'AED',
  STANDARD_VAT_RATE: 0.05, // 5% UAE FTA Standard Rate
  ZERO_VAT_RATE: 0.0,
  SUPPORTED_CURRENCIES: ['AED', 'USD', 'SAR', 'EUR'] as const,
  INVOICE_TYPES: {
    SIMPLIFIED: 'simplified_tax_invoice', // B2C (standard retail POS)
    STANDARD: 'standard_tax_invoice',     // B2B (requires buyer TRN)
    CREDIT_NOTE: 'credit_note',           // Returns / Refunds
  } as const,
};

export const APP_STORAGE_KEYS = {
  ACTIVE_BUSINESS_ID: 'pos_active_business_id',
  ACTIVE_STORE_ID: 'pos_active_store_id',
  AUTH_SESSION: 'pos_auth_session',
  OFFLINE_SALES_QUEUE: 'pos_offline_sales_queue',
};

/**
 * Decoupled UAE E-Invoicing Provider Contract.
 * Integrates with Accredited Service Providers (ASPs) / Peppol without
 * leaking compliance rules into core POS checkout components.
 */
export interface UaeEInvoicePayload {
  invoiceNumber: string;
  issueDateTime: string;
  invoiceType: 'simplified_tax_invoice' | 'standard_tax_invoice' | 'credit_note';
  sellerTrn: string;
  sellerName: string;
  sellerAddress: string;
  buyerTrn?: string;
  buyerName?: string;
  currency: string;
  lineItems: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    vatAmount: number;
    subtotal: number;
    total: number;
  }>;
  totalBeforeTax: number;
  totalVat: number;
  totalAfterTax: number;
}

export interface EInvoicingIntegrationResult {
  success: boolean;
  clearanceStatus: 'cleared' | 'reported' | 'pending' | 'rejected';
  uuid?: string;
  qrCodeData?: string;
  cryptographicStamp?: string;
  errors?: string[];
}
