import type { NlpArtifacts } from '../types.js';

export function emptyArtifacts(language: string): NlpArtifacts {
  return { entities: [], tokens: [], tokenSpans: [], language };
}
