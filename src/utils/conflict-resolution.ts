import type { RecognizerResult } from '../types.js';

export function resolveConflicts(results: RecognizerResult[]): RecognizerResult[] {
  if (results.length <= 1) return results;

  const sorted = [...results].sort((a, b) => a.start - b.start || b.end - a.end);
  const resolved: RecognizerResult[] = [];

  for (const current of sorted) {
    const last = resolved[resolved.length - 1];
    if (!last || current.start >= last.end) {
      resolved.push(current);
    } else {
      // Overlapping: keep higher score
      if (current.score > last.score) {
        resolved[resolved.length - 1] = current;
      } else if (
        current.score === last.score &&
        current.entityType === last.entityType
      ) {
        // Same type, same score: merge spans
        resolved[resolved.length - 1] = {
          ...last,
          end: Math.max(last.end, current.end),
        };
      }
      // Otherwise keep existing (higher or equal score, different type)
    }
  }

  return resolved;
}

export function filterByThreshold(
  results: RecognizerResult[],
  threshold: number,
): RecognizerResult[] {
  return results.filter((r) => r.score >= threshold);
}

export function filterByAllowList(
  results: RecognizerResult[],
  text: string,
  allowList: string[],
): RecognizerResult[] {
  if (allowList.length === 0) return results;
  const allowSet = new Set(allowList.map((s) => s.toLowerCase()));
  return results.filter((r) => {
    const matched = text.slice(r.start, r.end).toLowerCase();
    return !allowSet.has(matched);
  });
}
