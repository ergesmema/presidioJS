import { PatternRecognizer } from '../analyzer/pattern-recognizer.js';

export class UsItinRecognizer extends PatternRecognizer {
  constructor() {
    super({
      name: 'UsItinRecognizer',
      supportedEntities: ['US_ITIN'],
      patterns: [
        {
          name: 'itin_dashes',
          regex: '\\b9\\d{2}-[7-9]\\d-\\d{4}\\b',
          score: 0.85,
        },
        {
          name: 'itin_no_dashes',
          regex: '\\b9\\d{2}[7-9]\\d{5}\\b',
          score: 0.3,
        },
      ],
      context: ['itin', 'tax', 'taxpayer', 'individual', 'identification'],
    });
  }
}
