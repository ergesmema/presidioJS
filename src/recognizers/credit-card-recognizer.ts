import { PatternRecognizer } from '../analyzer/pattern-recognizer.js';
import { luhnCheck } from '../utils/luhn.js';

export class CreditCardRecognizer extends PatternRecognizer {
  constructor() {
    super({
      name: 'CreditCardRecognizer',
      supportedEntities: ['CREDIT_CARD'],
      patterns: [
        { name: 'credit_card', regex: '\\b(?:\\d[ -]*?){13,19}\\b', score: 0.5 },
      ],
      context: [
        'credit', 'card', 'visa', 'mastercard', 'amex', 'american express',
        'discover', 'diners', 'jcb', 'cc', 'debit', 'payment',
      ],
    });
  }

  override validateResult(matchText: string): boolean | null {
    const digits = matchText.replace(/\D/g, '');
    if (digits.length < 12 || digits.length > 19) return false;
    return luhnCheck(digits) ? true : false;
  }
}
