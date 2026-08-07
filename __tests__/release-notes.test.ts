import { getReleaseHighlights } from '../lib/release-notes';

describe('getReleaseHighlights', () => {
  it('returns a structured professional release summary', () => {
    const highlights = getReleaseHighlights('1.1.0');

    expect(highlights.version).toBe('1.1.0');
    expect(highlights.title).toContain('Professional');
    expect(highlights.highlights).toEqual(
      expect.arrayContaining([
        expect.stringContaining('CI/CD'),
        expect.stringContaining('architecture'),
      ]),
    );
  });
});
