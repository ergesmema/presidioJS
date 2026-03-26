import type { Pattern, RecognizerResult, NlpArtifacts } from '../types.js';
import { EntityRecognizer } from './entity-recognizer.js';
import { createResult } from './recognizer-result.js';

export interface PatternRecognizerOpts {
  name: string;
  supportedEntities: string[];
  patterns?: Pattern[];
  denyList?: string[];
  denyListScore?: number;
  supportedLanguage?: string;
  context?: string[];
}

export class PatternRecognizer extends EntityRecognizer {
  readonly patterns: Pattern[];
  readonly denyList: string[];
  readonly denyListScore: number;

  constructor(opts: PatternRecognizerOpts) {
    super(opts);
    this.patterns = opts.patterns ?? [];
    this.denyList = opts.denyList ?? [];
    this.denyListScore = opts.denyListScore ?? 1.0;
  }

  analyze(
    text: string,
    entities: string[],
    _nlpArtifacts: NlpArtifacts,
  ): RecognizerResult[] {
    const results: RecognizerResult[] = [];

    for (const pattern of this.patterns) {
      const regex = new RegExp(pattern.regex, 'gi');
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        let score = pattern.score;
        const validated = this.validateResult(match[0], start, end, text);
        if (validated === false) continue;
        if (validated === true) score = Math.max(score, 0.85);

        results.push(
          createResult(
            this.supportedEntities[0],
            start,
            end,
            score,
            this.name,
            {
              recognizer: this.name,
              patternName: pattern.name,
              patternLength: pattern.regex.length,
              originalScore: pattern.score,
              score,
              scoreContextImprovement: 0,
              validationResult: validated ?? undefined,
            },
          ),
        );
      }
    }

    if (this.denyList.length > 0) {
      const denyPattern = this.denyList
        .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
      const regex = new RegExp(`\\b(?:${denyPattern})\\b`, 'gi');
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        results.push(
          createResult(
            this.supportedEntities[0],
            match.index,
            match.index + match[0].length,
            this.denyListScore,
            this.name,
          ),
        );
      }
    }

    return results;
  }

  /**
   * Override to validate a match. Return true to boost score, false to reject, null to keep as-is.
   */
  validateResult(
    _matchText: string,
    _start: number,
    _end: number,
    _fullText: string,
  ): boolean | null {
    return null;
  }
}
