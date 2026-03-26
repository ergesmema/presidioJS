import { PatternRecognizer } from '../analyzer/pattern-recognizer.js';

export class UsBankRecognizer extends PatternRecognizer {
  constructor() {
    super({
      name: 'UsBankRecognizer',
      supportedEntities: ['US_BANK_NUMBER'],
      patterns: [
        {
          name: 'us_bank_number',
          regex: '\\b\\d{8,17}\\b',
          score: 0.05,
        },
      ],
      context: [
        'bank', 'account', 'routing', 'checking', 'savings',
        'account number', 'acct',
      ],
    });
  }
}
