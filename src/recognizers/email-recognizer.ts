import { PatternRecognizer } from '../analyzer/pattern-recognizer.js';

export class EmailRecognizer extends PatternRecognizer {
  constructor() {
    super({
      name: 'EmailRecognizer',
      supportedEntities: ['EMAIL_ADDRESS'],
      patterns: [
        {
          name: 'email',
          regex: '\\b[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}\\b',
          score: 1.0,
        },
      ],
      context: ['email', 'e-mail', 'mail', 'address'],
    });
  }
}
