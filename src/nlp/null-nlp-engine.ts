import type { NlpEngine, NlpArtifacts } from '../types.js';

export class NullNlpEngine implements NlpEngine {
  async process(text: string, language: string): Promise<NlpArtifacts> {
    const tokens: string[] = [];
    const tokenSpans: Array<{ start: number; end: number }> = [];
    const regex = /\S+/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      tokens.push(match[0]);
      tokenSpans.push({ start: match.index, end: match.index + match[0].length });
    }
    return { entities: [], tokens, tokenSpans, language };
  }

  isLoaded(): boolean {
    return true;
  }
}
