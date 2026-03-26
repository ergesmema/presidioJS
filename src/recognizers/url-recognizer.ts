import { PatternRecognizer } from '../analyzer/pattern-recognizer.js';

export class UrlRecognizer extends PatternRecognizer {
  constructor() {
    super({
      name: 'UrlRecognizer',
      supportedEntities: ['URL'],
      patterns: [
        {
          name: 'url',
          regex: '(?:https?://|www\\.)[\\w\\-]+(?:\\.[\\w\\-]+)+(?:/[\\w\\-.~:/?#\\[\\]@!$&\'()*+,;=%]*)?',
          score: 0.5,
        },
      ],
      context: ['url', 'website', 'link', 'site', 'href', 'http'],
    });
  }

  override validateResult(matchText: string): boolean | null {
    if (matchText.startsWith('http://') || matchText.startsWith('https://')) {
      return true;
    }
    return null;
  }
}
