import { PatternRecognizer } from '../analyzer/pattern-recognizer.js';

/**
 * European date formats commonly found in Swiss/German/French documents.
 * DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY, and partial forms.
 */
export class EuDateRecognizer extends PatternRecognizer {
  constructor() {
    super({
      name: 'EuDateRecognizer',
      supportedEntities: ['DATE_TIME'],
      patterns: [
        {
          name: 'eu_date_full',
          regex: '\\b(?:0?[1-9]|[12]\\d|3[01])[\\./\\-](?:0?[1-9]|1[0-2])[\\./\\-](?:19|20)\\d{2}\\b',
          score: 0.8,
        },
        {
          name: 'german_date_written',
          regex: '\\b(?:0?[1-9]|[12]\\d|3[01])\\.\\s*(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\\s+(?:19|20)\\d{2}\\b',
          score: 0.9,
        },
        {
          name: 'french_date_written',
          regex: '\\b(?:0?[1-9]|[12]\\d|3[01])\\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\\s+(?:19|20)\\d{2}\\b',
          score: 0.9,
        },
      ],
      context: [
        'geboren', 'geburtsdatum', 'datum', 'date', 'né', 'née',
        'naissance', 'gelistet', 'verfügung', 'décision',
      ],
    });
  }
}
