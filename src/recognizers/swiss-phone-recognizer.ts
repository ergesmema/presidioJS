import { PatternRecognizer } from '../analyzer/pattern-recognizer.js';

/**
 * Swiss and European phone number formats.
 * +41 XX XXX XX XX, 0XX XXX XX XX, +49/+33 variants.
 */
export class SwissPhoneRecognizer extends PatternRecognizer {
  constructor() {
    super({
      name: 'SwissPhoneRecognizer',
      supportedEntities: ['PHONE_NUMBER'],
      patterns: [
        {
          name: 'swiss_intl',
          regex: '\\+41\\s?\\d{2}\\s?\\d{3}\\s?\\d{2}\\s?\\d{2}\\b',
          score: 0.9,
        },
        {
          name: 'swiss_local',
          regex: '\\b0\\d{2}\\s?\\d{3}\\s?\\d{2}\\s?\\d{2}\\b',
          score: 0.6,
        },
        {
          name: 'german_intl',
          regex: '\\+49\\s?\\d{2,5}[\\s/]\\d{3,8}(?:[\\s-]\\d{1,5})?\\b',
          score: 0.85,
        },
        {
          name: 'french_intl',
          regex: '\\+33\\s?\\d\\s?\\d{2}\\s?\\d{2}\\s?\\d{2}\\s?\\d{2}\\b',
          score: 0.85,
        },
        {
          name: 'french_local',
          regex: '\\b0[1-9]\\s?\\d{2}\\s?\\d{2}\\s?\\d{2}\\s?\\d{2}\\b',
          score: 0.5,
        },
      ],
      context: [
        'tel', 'telefon', 'phone', 'téléphone', 'anruf', 'appel',
        'erreichbar', 'kontakt', 'contact', 'fax', 'mobil', 'mobile',
      ],
    });
  }
}
