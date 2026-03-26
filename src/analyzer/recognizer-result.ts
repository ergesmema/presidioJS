import type { RecognizerResult, AnalysisExplanation } from '../types.js';

export function createResult(
  entityType: string,
  start: number,
  end: number,
  score: number,
  recognizerName: string,
  analysisExplanation?: AnalysisExplanation,
): RecognizerResult {
  return { entityType, start, end, score, recognizerName, analysisExplanation };
}
