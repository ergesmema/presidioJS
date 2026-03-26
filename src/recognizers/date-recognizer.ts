import { PatternRecognizer } from '../analyzer/pattern-recognizer.js';

export class DateRecognizer extends PatternRecognizer {
  constructor() {
    super({
      name: 'DateRecognizer',
      supportedEntities: ['DATE_TIME'],
      patterns: [
        {
          name: 'date_iso',
          regex: '\\b\\d{4}-\\d{2}-\\d{2}\\b',
          score: 0.6,
        },
        {
          name: 'date_us',
          regex: '\\b(?:0?[1-9]|1[0-2])/(?:0?[1-9]|[12]\\d|3[01])/(?:\\d{2}|\\d{4})\\b',
          score: 0.5,
        },
        {
          name: 'date_eu',
          regex: '\\b(?:0?[1-9]|[12]\\d|3[01])\\.(?:0?[1-9]|1[0-2])\\.(?:\\d{2}|\\d{4})\\b',
          score: 0.5,
        },
        {
          name: 'date_text',
          regex: '\\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s*\\d{2,4}\\b',
          score: 0.6,
        },
      ],
      context: ['date', 'born', 'birthday', 'dob', 'birth'],
    });
  }
}
