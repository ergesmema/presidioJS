import type { RecognizerResult, NlpArtifacts } from '../types.js';

export abstract class EntityRecognizer {
  readonly name: string;
  readonly supportedEntities: string[];
  readonly supportedLanguage: string;
  readonly context: string[];

  constructor(opts: {
    name: string;
    supportedEntities: string[];
    supportedLanguage?: string;
    context?: string[];
  }) {
    this.name = opts.name;
    this.supportedEntities = opts.supportedEntities;
    this.supportedLanguage = opts.supportedLanguage ?? 'any';
    this.context = opts.context ?? [];
  }

  abstract analyze(
    text: string,
    entities: string[],
    nlpArtifacts: NlpArtifacts,
  ): RecognizerResult[];

  getSuportedEntities(): string[] {
    return this.supportedEntities;
  }
}
