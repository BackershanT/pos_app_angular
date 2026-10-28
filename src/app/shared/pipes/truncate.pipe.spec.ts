import { describe, it, expect } from 'vitest';
import { TruncatePipe } from './truncate.pipe';

describe('TruncatePipe', () => {
  const pipe = new TruncatePipe();

  it('should not truncate string shorter than limit', () => {
    expect(pipe.transform('Short Text', 20)).toBe('Short Text');
  });

  it('should truncate string longer than limit with ellipsis', () => {
    expect(pipe.transform('Truffle Chicken Panini with Garlic Aioli', 15)).toBe('Truffle Chicken...');
  });

  it('should preserve complete word boundaries when completeWords is true', () => {
    const result = pipe.transform('Truffle Chicken Panini with Garlic Aioli', 20, true);
    expect(result).toBe('Truffle Chicken...');
  });

  it('should handle null and empty string returning empty string', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });
});
