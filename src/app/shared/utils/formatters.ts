/**
 * Pure formatting and parsing utilities for financial, regulatory, and POS domain data.
 * Can be used in components, services, repositories, and print drivers without template dependencies.
 */

/**
 * Formats a monetary amount into standard UAE POS display string (e.g., "1,250.00 AED").
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency = 'AED',
  position: 'suffix' | 'prefix' = 'suffix'
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    amount = 0;
  }

  const formattedNum = Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (position === 'prefix') {
    return `${currency} ${formattedNum}`;
  }

  return `${formattedNum} ${currency}`;
}

/**
 * Formats an amount using accounting notation (negative values enclosed in parentheses).
 * e.g., "(25.00 AED)" for refunds or deficits.
 */
export function formatAccounting(amount: number, currency = 'AED'): string {
  if (isNaN(amount)) amount = 0;

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (isNegative) {
    return `(${absAmount} ${currency})`;
  }

  return `${absAmount} ${currency}`;
}

/**
 * Parses user input currency string (removing symbols, commas, spaces) into a clean float.
 */
export function parseCurrency(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  if (typeof input === 'number') return isNaN(input) ? 0 : input;

  const cleaned = String(input).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formats a 15-digit UAE TRN into standard readable grouping: "100-2348-9230-0003".
 */
export function formatTrn(trn: string | null | undefined): string {
  if (!trn) return '-';
  const clean = trn.replace(/[^0-9]/g, '');
  if (clean.length !== 15) return trn;

  return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7, 11)}-${clean.slice(11, 15)}`;
}

/**
 * Formats phone numbers into international UAE standard: "+971 50 123 4567".
 */
export function formatUaePhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  let clean = phone.replace(/[^0-9+]/g, '');

  if (clean.startsWith('00971')) {
    clean = '+' + clean.slice(2);
  } else if (clean.startsWith('05') && clean.length === 10) {
    clean = '+971' + clean.slice(1);
  } else if (!clean.startsWith('+971') && clean.length === 9) {
    clean = '+971' + clean;
  }

  if (clean.startsWith('+971') && clean.length === 13) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 6)} ${clean.slice(6, 9)} ${clean.slice(9)}`;
  }

  return phone;
}

/**
 * Extracts initials from a cashier or customer full name (e.g. "Kasun Backer" -> "KB").
 */
export function formatInitials(name: string | null | undefined): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Formats an invoice number using prefix, date, and sequential identifier.
 * e.g., "INV-20261028-0412"
 */
export function formatInvoiceNumber(prefix = 'INV', sequence: number, date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');
  return `${prefix}-${y}${m}${d}-${seq}`;
}

/**
 * Formats a Date instance into standard thermal receipt timestamp.
 * e.g., "28/10/2026 18:15"
 */
export function formatDateReceipt(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${mins}`;
}

/**
 * Sanitizes search input to prevent regex injection or excessive whitespace.
 */
export function sanitizeSearchTerm(term: string | null | undefined): string {
  if (!term) return '';
  return term.trim().replace(/[^\w\s-]/gi, '').toLowerCase();
}

/**
 * Encodes string to UTF-8 Byte Array for TLV processing.
 */
function toUtf8ByteArray(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  const utf8 = unescape(encodeURIComponent(str));
  const arr = new Uint8Array(utf8.length);
  for (let i = 0; i < utf8.length; i++) {
    arr[i] = utf8.charCodeAt(i);
  }
  return arr;
}

/**
 * Generates an FTA/ZATCA compliant Tag-Length-Value (TLV) Base64 QR Payload
 * for electronic fiscal receipts:
 * Tag 1: Seller's Name
 * Tag 2: TRN
 * Tag 3: Invoice Timestamp
 * Tag 4: Invoice Total (with VAT)
 * Tag 5: Total VAT Amount
 */
export function generateFtaQrCodePayload(
  sellerName: string,
  trn: string,
  timestamp: string,
  invoiceTotal: number,
  vatAmount: number
): string {
  const tags: Array<{ tag: number; value: string }> = [
    { tag: 1, value: sellerName },
    { tag: 2, value: trn },
    { tag: 3, value: timestamp },
    { tag: 4, value: Number(invoiceTotal).toFixed(2) },
    { tag: 5, value: Number(vatAmount).toFixed(2) },
  ];

  const buffers: Uint8Array[] = [];

  for (const t of tags) {
    const valBytes = toUtf8ByteArray(t.value);
    const tagBuffer = new Uint8Array(2 + valBytes.length);
    tagBuffer[0] = t.tag;
    tagBuffer[1] = valBytes.length;
    tagBuffer.set(valBytes, 2);
    buffers.push(tagBuffer);
  }

  // Calculate total length
  const totalLength = buffers.reduce((acc, curr) => acc + curr.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    combined.set(buf, offset);
    offset += buf.length;
  }

  // Convert to Base64
  let binary = '';
  for (let i = 0; i < combined.byteLength; i++) {
    binary += String.fromCharCode(combined[i]);
  }

  return typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(combined).toString('base64');
}
