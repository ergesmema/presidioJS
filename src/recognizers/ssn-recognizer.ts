import { PatternRecognizer } from '../analyzer/pattern-recognizer.js';

export class SsnRecognizer extends PatternRecognizer {
  constructor() {
    super({
      name: 'UsSsnRecognizer',
      supportedEntities: ['US_SSN'],
      patterns: [
        {
          name: 'ssn_with_dashes',
          regex: '\\b\\d{3}-\\d{2}-\\d{4}\\b',
          score: 0.85,
        },
        {
          name: 'ssn_no_dashes',
          regex: '\\b\\d{9}\\b',
          score: 0.3,
        },
      ],
      context: [
        'social', 'security', 'ssn', 'social security number',
        'taxpayer', 'tax', 'tin',
      ],
    });
  }

  override validateResult(matchText: string): boolean | null {
    const digits = matchText.replace(/\D/g, '');
    if (digits.length !== 9) return false;
    const area = parseInt(digits.slice(0, 3), 10);
    const group = parseInt(digits.slice(3, 5), 10);
    const serial = parseInt(digits.slice(5, 9), 10);
    if (area === 0 || area === 666 || area >= 900) return false;
    if (group === 0) return false;
    if (serial === 0) return false;
    return null;
  }
}
