import { describe, it, expect } from 'vitest';
import { CurrencyFormatPipe } from './currency-format.pipe';

describe('CurrencyFormatPipe', () => {
  const pipe = new CurrencyFormatPipe();

  it('should format numbers with 2 decimals and AED suffix by default', () => {
    expect(pipe.transform(25.5)).toBe('25.50 AED');
    expect(pipe.transform(0)).toBe('0.00 AED');
    expect(pipe.transform(1450)).toBe('1,450.00 AED');
  });

  it('should handle numeric strings correctly', () => {
    expect(pipe.transform('48.3')).toBe('48.30 AED');
  });

  it('should format as prefix when position is specified', () => {
    expect(pipe.transform(100, 'AED', 'code', 2, 2, 'prefix')).toBe('AED 100.00');
  });

  it('should omit currency label when display is none', () => {
    expect(pipe.transform(2500, 'AED', 'none')).toBe('2,500.00');
  });

  it('should handle null or undefined gracefully returning 0.00 AED', () => {
    expect(pipe.transform(null)).toBe('0.00 AED');
    expect(pipe.transform(undefined)).toBe('0.00 AED');
  });
});
