import { EntityRecognizer } from '../analyzer/entity-recognizer.js';
import { createResult } from '../analyzer/recognizer-result.js';
import type { RecognizerResult, NlpArtifacts } from '../types.js';

const LABEL_MAP: Record<string, string> = {
  PER: 'PERSON',
  LOC: 'LOCATION',
  ORG: 'ORGANIZATION',
  MISC: 'NRP',
};

export class TransformersNerRecognizer extends EntityRecognizer {
  constructor() {
    super({
      name: 'TransformersNerRecognizer',
      supportedEntities: [
        'PERSON', 'LOCATION', 'ORGANIZATION', 'NRP', 'DATE_TIME',
        'PHONE_NUMBER', 'EMAIL_ADDRESS', 'CREDIT_CARD', 'US_SSN',
        'IBAN_CODE', 'IP_ADDRESS', 'URL', 'CRYPTO', 'US_PASSPORT',
        'US_ITIN', 'US_BANK_NUMBER',
      ],
    });
  }

  analyze(
    _text: string,
    entities: string[],
    nlpArtifacts: NlpArtifacts,
  ): RecognizerResult[] {
    const results: RecognizerResult[] = [];

    for (const entity of nlpArtifacts.entities) {
      const mapped = LABEL_MAP[entity.label] ?? entity.label;
      if (entities.length > 0 && !entities.includes(mapped)) continue;

      results.push(
        createResult(mapped, entity.start, entity.end, entity.score, this.name),
      );
    }

    return results;
  }
}
