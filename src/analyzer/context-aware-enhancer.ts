import type { RecognizerResult, NlpArtifacts } from '../types.js';
import { EntityRecognizer } from './entity-recognizer.js';

const SUFFIXES = ['ing', 'ed', 'ly', 'er', 'est', 'tion', 'sion', 'ment', 'ness', 's'];

function simpleStem(word: string): string {
  const lower = word.toLowerCase();
  for (const suffix of SUFFIXES) {
    if (lower.endsWith(suffix) && lower.length > suffix.length + 2) {
      return lower.slice(0, -suffix.length);
    }
  }
  return lower;
}

export class ContextAwareEnhancer {
  private readonly contextWindowSize: number;
  private readonly contextBoost: number;

  constructor(opts?: { contextWindowSize?: number; contextBoost?: number }) {
    this.contextWindowSize = opts?.contextWindowSize ?? 5;
    this.contextBoost = opts?.contextBoost ?? 0.35;
  }

  enhance(
    results: RecognizerResult[],
    recognizers: EntityRecognizer[],
    nlpArtifacts: NlpArtifacts,
    text: string,
  ): RecognizerResult[] {
    const recognizerMap = new Map<string, EntityRecognizer>();
    for (const r of recognizers) {
      recognizerMap.set(r.name, r);
    }

    return results.map((result) => {
      const recognizer = recognizerMap.get(result.recognizerName);
      if (!recognizer || recognizer.context.length === 0) return result;

      const contextWords = recognizer.context.map(simpleStem);
      const surroundingTokens = this.getSurroundingTokens(
        result,
        nlpArtifacts,
      );

      for (const token of surroundingTokens) {
        const stemmed = simpleStem(token);
        if (contextWords.some((cw) => stemmed.includes(cw) || cw.includes(stemmed))) {
          const boosted = Math.min(result.score + this.contextBoost, 1.0);
          return {
            ...result,
            score: boosted,
            analysisExplanation: result.analysisExplanation
              ? {
                  ...result.analysisExplanation,
                  score: boosted,
                  scoreContextImprovement: boosted - result.score,
                  supportiveContextWord: token,
                }
              : undefined,
          };
        }
      }

      return result;
    });
  }

  private getSurroundingTokens(
    result: RecognizerResult,
    artifacts: NlpArtifacts,
  ): string[] {
    const tokens: string[] = [];
    for (let i = 0; i < artifacts.tokens.length; i++) {
      const span = artifacts.tokenSpans[i];
      if (!span) continue;
      // Check if token is within window of the result
      const distance = Math.min(
        Math.abs(span.start - result.end),
        Math.abs(span.end - result.start),
      );
      if (span.end <= result.start || span.start >= result.end) {
        // Token is outside the result span
        if (distance <= 50) {
          // ~5 words worth of characters
          tokens.push(artifacts.tokens[i]);
        }
      }
    }
    return tokens;
  }
}
