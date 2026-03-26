import { PatternRecognizer } from '../analyzer/pattern-recognizer.js';

export class UsPassportRecognizer extends PatternRecognizer {
  constructor() {
    super({
      name: 'UsPassportRecognizer',
      supportedEntities: ['US_PASSPORT'],
      patterns: [
        {
          name: 'us_passport',
          regex: '\\b[A-Z]?\\d{8,9}\\b',
          score: 0.1,
        },
      ],
      context: ['passport', 'travel', 'document', 'us passport'],
    });
  }
}
