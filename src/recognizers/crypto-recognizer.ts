import { PatternRecognizer } from '../analyzer/pattern-recognizer.js';

export class CryptoRecognizer extends PatternRecognizer {
  constructor() {
    super({
      name: 'CryptoRecognizer',
      supportedEntities: ['CRYPTO'],
      patterns: [
        {
          name: 'bitcoin',
          regex: '\\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\\b',
          score: 0.5,
        },
        {
          name: 'bitcoin_bech32',
          regex: '\\bbc1[ac-hj-np-zAC-HJ-NP-Z02-9]{11,71}\\b',
          score: 0.5,
        },
        {
          name: 'ethereum',
          regex: '\\b0x[0-9a-fA-F]{40}\\b',
          score: 0.5,
        },
      ],
      context: ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'wallet', 'address'],
    });
  }
}
