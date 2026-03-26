import { PatternRecognizer } from '../analyzer/pattern-recognizer.js';

/**
 * Swiss AHV/AVS number (social security): 756.XXXX.XXXX.XX
 * Always starts with 756, 13 digits total, last digit is EAN-13 check digit.
 */
export class AhvRecognizer extends PatternRecognizer {
  constructor() {
    super({
      name: 'AhvRecognizer',
      supportedEntities: ['CH_AHV'],
      patterns: [
        {
          name: 'ahv_dotted',
          regex: '\\b756\\.\\d{4}\\.\\d{4}\\.\\d{2}\\b',
          score: 0.9,
        },
        {
          name: 'ahv_no_dots',
          regex: '\\b756\\d{10}\\b',
          score: 0.4,
        },
      ],
      context: [
        'ahv', 'avs', 'sozialversicherung', 'assurance', 'sociale',
        'versichertennummer', 'numéro', 'assuré',
      ],
    });
  }

  override validateResult(matchText: string): boolean | null {
    const digits = matchText.replace(/\D/g, '');
    if (digits.length !== 13) return false;
    // EAN-13 check digit validation
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(digits[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    return check === parseInt(digits[12], 10) ? null : false;
  }
}
