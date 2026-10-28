import { Pipe, PipeTransform } from '@angular/core';

/**
 * TruncatePipe
 * Truncates long strings (product titles, SKU descriptions, TRN addresses)
 * with customizable length, word boundary preservation, and ellipsis suffix.
 *
 * @example
 * {{ 'Truffle Chicken Panini with Garlic Aioli' | truncate:20 }}
 * Output: "Truffle Chicken Pani..."
 *
 * {{ 'Truffle Chicken Panini with Garlic Aioli' | truncate:20:true }}
 * Output: "Truffle Chicken..."
 *
 * {{ 'Dubai Mall Branch, Ground Floor' | truncate:15:false:'…' }}
 * Output: "Dubai Mall Bran…"
 */
@Pipe({
  name: 'truncate',
  standalone: true,
})
export class TruncatePipe implements PipeTransform {
  transform(
    value: string | null | undefined,
    limit: number = 30,
    completeWords: boolean = false,
    ellipsis: string = '...'
  ): string {
    if (!value) {
      return '';
    }

    const str = String(value).trim();
    if (str.length <= limit) {
      return str;
    }

    if (completeWords) {
      // Find the last space before limit
      const sub = str.slice(0, limit);
      const lastSpaceIndex = sub.lastIndexOf(' ');
      if (lastSpaceIndex > 0) {
        return `${sub.slice(0, lastSpaceIndex).trimEnd()}${ellipsis}`;
      }
    }

    return `${str.slice(0, limit).trimEnd()}${ellipsis}`;
  }
}
