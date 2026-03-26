import { PatternRecognizer } from '../analyzer/pattern-recognizer.js';

/**
 * Swiss company UID (Unternehmens-Identifikationsnummer): CHE-XXX.XXX.XXX
 * Used in sanctions to identify Swiss-registered companies.
 */
export class SwissUidRecognizer extends PatternRecognizer {
  constructor() {
    super({
      name: 'SwissUidRecognizer',
      supportedEntities: ['CH_UID'],
      patterns: [
        {
          name: 'uid_dotted',
          regex: '\\bCHE-?\\d{3}\\.\\d{3}\\.\\d{3}\\b',
          score: 0.95,
        },
        {
          name: 'uid_no_dots',
          regex: '\\bCHE-?\\d{9}\\b',
          score: 0.7,
        },
      ],
      context: [
        'uid', 'handelsregister', 'registre', 'commerce', 'unternehmens',
        'identifikationsnummer', 'firma', 'société', 'company',
      ],
    });
  }
}
