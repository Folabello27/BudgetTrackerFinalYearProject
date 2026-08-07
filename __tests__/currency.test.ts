import { convertAmountToCurrency } from '../lib/currency';

describe('convertAmountToCurrency', () => {
  it('multiplies the amount by the provided exchange rate', () => {
    expect(convertAmountToCurrency(100, 780)).toBe(78000);
    expect(convertAmountToCurrency(42.5, 1.27)).toBeCloseTo(53.98, 2);
  });
});
