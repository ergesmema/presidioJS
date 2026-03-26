import { PatternRecognizer } from '../analyzer/pattern-recognizer.js';

export class IpRecognizer extends PatternRecognizer {
  constructor() {
    super({
      name: 'IpRecognizer',
      supportedEntities: ['IP_ADDRESS'],
      patterns: [
        {
          name: 'ipv4',
          regex: '\\b(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b',
          score: 0.6,
        },
        {
          name: 'ipv6',
          regex: '\\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\\b',
          score: 0.6,
        },
      ],
      context: ['ip', 'address', 'ipv4', 'ipv6', 'network', 'host'],
    });
  }
}
