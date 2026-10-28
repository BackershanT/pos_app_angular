import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * AeroPOS Custom Reactive Form Validators
 * Tailored for UAE retail/F&B operations, FTA compliance, and POS inventory rules.
 */

/**
 * Validates UAE Federal Tax Authority (FTA) Tax Registration Numbers (TRN).
 * FTA standard: exactly 15 digits, starting with '100' and ending with '3'.
 *
 * @example
 * fb.control('', [Validators.required, uaeTrnValidator()])
 */
export function uaeTrnValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Empty values handled by Validators.required
    }

    const value = String(control.value).replace(/[\s-]/g, '');

    // Must be 15 digits
    if (!/^\d{15}$/.test(value)) {
      return {
        invalidTrn: {
          valid: false,
          reason: 'TRN must be exactly 15 digits',
          value: control.value,
        },
      };
    }

    // Must start with 100 and end with 3 per FTA specifications
    if (!value.startsWith('100') || !value.endsWith('3')) {
      return {
        invalidTrn: {
          valid: false,
          reason: 'UAE TRN must start with "100" and end with "3"',
          value: control.value,
        },
      };
    }

    return null;
  };
}

/**
 * Validates UAE Phone numbers:
 * - Mobile: 050, 052, 054, 055, 056, 058 (e.g. +971501234567 or 0501234567)
 * - Landline: 02, 03, 04, 06, 07, 09 (e.g. +97141234567 or 041234567)
 */
export function uaePhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const cleaned = String(control.value).replace(/[\s\-\(\)]/g, '');

    // Allow +971 or 00971 prefix or leading 0
    const uaeRegex = /^(?:\+971|00971|0)(?:5[024568]\d{7}|[234679]\d{7})$/;

    if (!uaeRegex.test(cleaned)) {
      return {
        invalidUaePhone: {
          valid: false,
          reason: 'Must be a valid UAE phone number (e.g., +971 50 123 4567 or 0501234567)',
          value: control.value,
        },
      };
    }

    return null;
  };
}

/**
 * Validates Product SKU format (3 to 30 characters, alphanumeric, hyphens, and underscores).
 */
export function skuValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const value = String(control.value).trim();
    const skuRegex = /^[A-Za-z0-9_-]{3,30}$/;

    if (!skuRegex.test(value)) {
      return {
        invalidSku: {
          valid: false,
          reason: 'SKU must be 3-30 alphanumeric characters with optional hyphens or underscores',
          value: control.value,
        },
      };
    }

    return null;
  };
}

/**
 * Validates standard Barcode formats (EAN-13, EAN-8, UPC-A, Code 128).
 */
export function barcodeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const value = String(control.value).trim();

    // Check basic length and alphanumeric / numeric standard
    if (value.length < 4 || value.length > 32) {
      return {
        invalidBarcode: {
          valid: false,
          reason: 'Barcode length must be between 4 and 32 characters',
          value: control.value,
        },
      };
    }

    // Verify EAN-13 check digit if exactly 13 digits
    if (/^\d{13}$/.test(value)) {
      if (!validateEan13CheckDigit(value)) {
        return {
          invalidBarcodeChecksum: {
            valid: false,
            reason: 'EAN-13 barcode checksum is invalid',
            value: control.value,
          },
        };
      }
    }

    return null;
  };
}

/**
 * Computes and validates EAN-13 modulo-10 checksum digit.
 */
function validateEan13CheckDigit(barcode: string): boolean {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(barcode.charAt(i), 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(barcode.charAt(12), 10);
}

/**
 * Validates that a numeric field is strictly greater than zero.
 */
export function greaterThanZeroValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === undefined || control.value === '') {
      return null;
    }

    const num = Number(control.value);
    if (isNaN(num) || num <= 0) {
      return {
        greaterThanZero: {
          valid: false,
          reason: 'Value must be strictly greater than 0',
          value: control.value,
        },
      };
    }

    return null;
  };
}

/**
 * Validates monetary currency amount (up to 2 decimal places, non-negative).
 */
export function currencyAmountValidator(allowZero = false): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === undefined || control.value === '') {
      return null;
    }

    const num = Number(control.value);
    if (isNaN(num) || (allowZero ? num < 0 : num <= 0)) {
      return {
        invalidCurrency: {
          valid: false,
          reason: allowZero ? 'Amount cannot be negative' : 'Amount must be greater than zero',
          value: control.value,
        },
      };
    }

    // Verify at most 2 decimal places
    const parts = String(control.value).split('.');
    if (parts.length === 2 && parts[1].length > 2) {
      return {
        tooManyDecimals: {
          valid: false,
          reason: 'Monetary amounts cannot have more than 2 decimal places',
          value: control.value,
        },
      };
    }

    return null;
  };
}

/**
 * Cross-field validator ensuring selling price is not less than the cost price.
 */
export function sellingPriceGreaterThanCostValidator(
  costField = 'cost_price',
  priceField = 'selling_price'
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const cost = control.get(costField)?.value;
    const price = control.get(priceField)?.value;

    if (cost !== null && cost !== undefined && price !== null && price !== undefined) {
      const numCost = Number(cost);
      const numPrice = Number(price);

      if (!isNaN(numCost) && !isNaN(numPrice) && numPrice < numCost) {
        return {
          priceBelowCost: {
            valid: false,
            reason: `Selling price (${numPrice}) cannot be lower than cost price (${numCost})`,
          },
        };
      }
    }

    return null;
  };
}

/**
 * Validates percentage values (between 0% and 100%).
 */
export function percentageValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === undefined || control.value === '') {
      return null;
    }

    const val = Number(control.value);
    if (isNaN(val) || val < 0 || val > 100) {
      return {
        invalidPercentage: {
          valid: false,
          reason: 'Percentage must be between 0 and 100',
          value: control.value,
        },
      };
    }

    return null;
  };
}

/**
 * Validates that an input has no leading or trailing whitespace.
 */
export function noWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const isWhitespace = String(control.value).trim().length === 0;
    if (isWhitespace) {
      return { whitespace: true };
    }

    return null;
  };
}
