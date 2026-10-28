import { Pipe, PipeTransform } from '@angular/core';

export type DateFormatPreset =
  | 'receipt'
  | 'short'
  | 'medium'
  | 'long'
  | 'time'
  | 'dateOnly'
  | 'relative';

/**
 * DateFormatPipe
 * Formats timestamps, ISO strings, and Date instances into consistent POS and audit formats.
 *
 * @example
 * {{ order.created_at | dateFormat:'receipt' }}
 * Output: "28/10/2026, 06:15 PM"
 *
 * {{ movement.timestamp | dateFormat:'relative' }}
 * Output: "12 mins ago"
 *
 * {{ sale.date | dateFormat:'medium' }}
 * Output: "Oct 28, 2026, 06:15 PM"
 */
@Pipe({
  name: 'dateFormat',
  standalone: true,
})
export class DateFormatPipe implements PipeTransform {
  transform(
    value: string | number | Date | null | undefined,
    format: DateFormatPreset | string = 'medium',
    fallback: string = '-'
  ): string {
    if (!value) {
      return fallback;
    }

    const date = this.parseDate(value);
    if (!date || isNaN(date.getTime())) {
      return fallback;
    }

    switch (format) {
      case 'receipt':
        return this.formatReceipt(date);
      case 'short':
        return this.formatShort(date);
      case 'time':
        return this.formatTime(date);
      case 'dateOnly':
        return this.formatDateOnly(date);
      case 'medium':
        return this.formatMedium(date);
      case 'long':
        return this.formatLong(date);
      case 'relative':
        return this.formatRelative(date);
      default:
        return this.formatMedium(date);
    }
  }

  private parseDate(val: string | number | Date): Date | null {
    if (val instanceof Date) {
      return val;
    }
    if (typeof val === 'number') {
      return new Date(val);
    }
    if (typeof val === 'string') {
      const parsed = new Date(val);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }

  private formatReceipt(d: Date): string {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const time = this.formatTime(d);
    return `${day}/${month}/${year}, ${time}`;
  }

  private formatShort(d: Date): string {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private formatDateOnly(d: Date): string {
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private formatTime(d: Date): string {
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  private formatMedium(d: Date): string {
    const datePart = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timePart = this.formatTime(d);
    return `${datePart}, ${timePart}`;
  }

  private formatLong(d: Date): string {
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }

  private formatRelative(d: Date): string {
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 30) {
      return 'Just now';
    }
    if (diffMin < 60) {
      return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
    }
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }
    if (diffDays === 1) {
      return 'Yesterday';
    }
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }

    return this.formatShort(d);
  }
}
