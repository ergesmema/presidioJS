import type { NlpEngine, RecognizerResult, AnalyzeOptions } from '../types.js';
import { RecognizerRegistry } from './recognizer-registry.js';
import { NullNlpEngine } from '../nlp/null-nlp-engine.js';
import { ContextAwareEnhancer } from './context-aware-enhancer.js';
import { PatternRecognizer } from './pattern-recognizer.js';
import {
  resolveConflicts,
  filterByThreshold,
  filterByAllowList,
} from '../utils/conflict-resolution.js';

export interface AnalyzerEngineOpts {
  registry?: RecognizerRegistry;
  nlpEngine?: NlpEngine;
  defaultScoreThreshold?: number;
}

export class AnalyzerEngine {
  private readonly registry: RecognizerRegistry;
  private readonly nlpEngine: NlpEngine;
  private readonly enhancer: ContextAwareEnhancer;
  private readonly defaultScoreThreshold: number;

  constructor(opts: AnalyzerEngineOpts = {}) {
    this.nlpEngine = opts.nlpEngine ?? new NullNlpEngine();
    this.registry =
      opts.registry ?? RecognizerRegistry.withAllRecognizers(this.nlpEngine);
    this.enhancer = new ContextAwareEnhancer();
    this.defaultScoreThreshold = opts.defaultScoreThreshold ?? 0.0;
  }

  async analyze(text: string, opts: AnalyzeOptions = {}): Promise<RecognizerResult[]> {
    const language = opts.language ?? 'en';
    const threshold = opts.scoreThreshold ?? this.defaultScoreThreshold;

    // Build ad-hoc recognizers
    if (opts.adHocRecognizers) {
      for (const config of opts.adHocRecognizers) {
        this.registry.addRecognizer(
          new PatternRecognizer({
            name: config.name,
            supportedEntities: config.supportedEntities,
            patterns: config.patterns,
            denyList: config.denyList,
            supportedLanguage: config.supportedLanguage,
            context: config.context,
          }),
        );
      }
    }

    const recognizers = this.registry.getRecognizers(language, opts.entities);
    if (recognizers.length === 0) return [];

    // Run NLP engine
    const nlpArtifacts = await this.nlpEngine.process(text, language);

    // Run all recognizers
    let results: RecognizerResult[] = [];
    for (const recognizer of recognizers) {
      const recognized = recognizer.analyze(text, opts.entities ?? [], nlpArtifacts);
      results.push(...recognized);
    }

    // Context enhancement
    results = this.enhancer.enhance(results, recognizers, nlpArtifacts, text);

    // Filter
    results = filterByThreshold(results, threshold);
    if (opts.allowList) {
      results = filterByAllowList(results, text, opts.allowList);
    }

    // Resolve conflicts
    results = resolveConflicts(results);

    return results;
  }

  getSupportedEntities(language?: string): string[] {
    return this.registry.getSupportedEntities(language ?? 'en');
  }
}
