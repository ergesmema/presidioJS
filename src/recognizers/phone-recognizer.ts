import { PatternRecognizer } from '../analyzer/pattern-recognizer.js';

export class PhoneRecognizer extends PatternRecognizer {
  constructor() {
    super({
      name: 'PhoneRecognizer',
      supportedEntities: ['PHONE_NUMBER'],
      patterns: [
        {
          name: 'phone_us',
          regex: '(?:\\+?1[\\s.-]?)?\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}',
          score: 0.5,
        },
        {
          name: 'phone_intl',
          regex: '\\+\\d{1,3}[\\s.-]?\\d{1,4}[\\s.-]?\\d{1,4}[\\s.-]?\\d{1,9}',
          score: 0.5,
        },
      ],
      context: [
        'phone', 'telephone', 'tel', 'call', 'mobile', 'cell',
        'fax', 'contact', 'number',
      ],
    });
  }

  override validateResult(matchText: string): boolean | null {
    const digits = matchText.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 16) return false;
    if (/^0{7,}$/.test(digits)) return false;
    return null;
  }
}
