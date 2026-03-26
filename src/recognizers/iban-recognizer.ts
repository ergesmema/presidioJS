import { PatternRecognizer } from '../analyzer/pattern-recognizer.js';

const IBAN_LENGTHS: Record<string, number> = {
  AL: 28, AD: 24, AT: 20, AZ: 28, BH: 22, BY: 28, BE: 16, BA: 20,
  BR: 29, BG: 22, CR: 22, HR: 21, CY: 28, CZ: 24, DK: 18, DO: 28,
  EG: 29, SV: 28, EE: 20, FO: 18, FI: 18, FR: 27, GE: 22, DE: 22,
  GI: 23, GR: 27, GL: 18, GT: 28, HU: 28, IS: 26, IQ: 23, IE: 22,
  IL: 23, IT: 27, JO: 30, KZ: 20, XK: 20, KW: 30, LV: 21, LB: 28,
  LI: 21, LT: 20, LU: 20, MT: 31, MR: 27, MU: 30, MC: 27, MD: 24,
  ME: 22, NL: 18, MK: 19, NO: 15, PK: 24, PS: 29, PL: 28, PT: 25,
  QA: 29, RO: 24, LC: 32, SM: 27, SA: 24, RS: 22, SC: 31, SK: 24,
  SI: 19, ES: 24, SE: 24, CH: 21, TL: 23, TN: 24, TR: 26, UA: 29,
  AE: 23, GB: 22, VA: 22, VG: 24,
};

function validateIban(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  const country = cleaned.slice(0, 2);
  if (IBAN_LENGTHS[country] && cleaned.length !== IBAN_LENGTHS[country]) return false;
  // MOD 97 check
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  let numStr = '';
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      numStr += (code - 55).toString();
    } else {
      numStr += ch;
    }
  }
  let remainder = 0;
  for (let i = 0; i < numStr.length; i++) {
    remainder = (remainder * 10 + parseInt(numStr[i], 10)) % 97;
  }
  return remainder === 1;
}

export class IbanRecognizer extends PatternRecognizer {
  constructor() {
    super({
      name: 'IbanRecognizer',
      supportedEntities: ['IBAN_CODE'],
      patterns: [
        {
          name: 'iban',
          regex: '\\b[A-Z]{2}\\d{2}[\\s]?[A-Za-z0-9]{4}(?:[\\s]?[A-Za-z0-9]{4}){2,7}(?:[\\s]?[A-Za-z0-9]{1,4})?\\b',
          score: 0.5,
        },
      ],
      context: ['iban', 'bank', 'account', 'swift', 'bic', 'international'],
    });
  }

  override validateResult(matchText: string): boolean | null {
    return validateIban(matchText) ? true : false;
  }
}
