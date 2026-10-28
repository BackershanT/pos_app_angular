import { Pipe, PipeTransform } from '@angular/core';

export type CurrencyDisplay = 'code' | 'symbol' | 'none';
export type CurrencyPosition = 'suffix' | 'prefix';

/**
 * CurrencyFormatPipe
 * Standardizes monetary formatting across the POS with UAE Dirham (AED) defaults,
 * decimal precision, thousand separators, and position flexibility.
 *
 * @example
 * {{ 25.5 | currencyFormat }}
 * Output: "25.50 AED"
 *
 * {{ 1450.75 | currencyFormat:'AED':'code':'1.2-2':'prefix' }}
 * Output: "AED 1,450.75"
 *
 * {{ 2500 | currencyFormat:'AED':'none' }}
 * Output: "2,500.00"
 */
@Pipe({
  name: 'currencyFormat',
  standalone: true,
})
export class CurrencyFormatPipe implements PipeTransform {
  /**
   * Transforms a number or numeric string into a formatted currency string.
   *
   * @param value - Amount to format (number or numeric string)
   * @param currencyCode - ISO currency code (default: 'AED')
   * @param display - How to render the currency ('code', 'symbol', or 'none', default: 'code')
   * @param minFractionDigits - Minimum decimal places (default: 2)
   * @param maxFractionDigits - Maximum decimal places (default: 2)
   * @param position - Whether currency label appears as 'suffix' or 'prefix' (default: 'suffix')
   */
  transform(
    value: number | string | null | undefined,
    currencyCode: string = 'AED',
    display: CurrencyDisplay = 'code',
    minFractionDigits: number = 2,
    maxFractionDigits: number = 2,
    position: CurrencyPosition = 'suffix'
  ): string {
    if (value === null || value === undefined || value === '') {
      return this.formatOutput(0, currencyCode, display, minFractionDigits, maxFractionDigits, position);
    }

    const numValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));

    if (isNaN(numValue)) {
      return this.formatOutput(0, currencyCode, display, minFractionDigits, maxFractionDigits, position);
    }

    return this.formatOutput(numValue, currencyCode, display, minFractionDigits, maxFractionDigits, position);
  }

  private formatOutput(
    amount: number,
    currencyCode: string,
    display: CurrencyDisplay,
    minDigits: number,
    maxDigits: number,
    position: CurrencyPosition
  ): string {
    const formattedNumber = amount.toLocaleString('en-US', {
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    });

    if (display === 'none') {
      return formattedNumber;
    }

    const label = currencyCode.toUpperCase();

    if (position === 'prefix') {
      return `${label} ${formattedNumber}`;
    }

    return `${formattedNumber} ${label}`;
  }
}
