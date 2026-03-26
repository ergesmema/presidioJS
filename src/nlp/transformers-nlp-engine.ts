import type { NlpEngine, NlpArtifacts, NlpEntity } from '../types.js';

export interface TransformersNlpEngineOpts {
  modelId?: string;
  quantized?: boolean;
  device?: 'cpu' | 'webgpu' | 'wasm';
}

interface PipelineToken {
  entity: string;
  score: number;
  index: number;
  word: string;
  start?: number;
  end?: number;
  // aggregated mode fields
  entity_group?: string;
}

export class TransformersNlpEngine implements NlpEngine {
  private pipeline: any = null;
  private tokenizer: any = null;
  private loading: Promise<void> | null = null;
  private readonly modelId: string;
  private readonly quantized: boolean;
  private readonly device: string;

  constructor(opts: TransformersNlpEngineOpts = {}) {
    this.modelId = opts.modelId ?? 'Xenova/distilbert-base-multilingual-cased-ner-hrl';
    this.quantized = opts.quantized ?? true;
    this.device = opts.device ?? 'wasm';
  }

  private async load(): Promise<void> {
    if (this.pipeline) return;
    if (this.loading) return this.loading;

    this.loading = (async () => {
      const transformers = await import('@huggingface/transformers');
      this.pipeline = await (transformers.pipeline as any)('token-classification', this.modelId, {
        quantized: this.quantized,
        device: this.device,
      });
      // Access the tokenizer from the pipeline for offset mapping
      this.tokenizer = this.pipeline.tokenizer;
    })();
    return this.loading;
  }

  async process(text: string, language: string): Promise<NlpArtifacts> {
    await this.load();

    // Split text into chunks that fit the model's token limit (512 tokens).
    // Use a sliding window with overlap to avoid splitting entities at boundaries.
    const MAX_CHARS = 1500; // ~512 tokens ≈ 1500 chars for multilingual text
    const OVERLAP_CHARS = 200;

    let allEntities: NlpEntity[] = [];

    if (text.length <= MAX_CHARS) {
      const raw = await this.runChunk(text, 0);
      allEntities = this.aggregateBioTags(raw, text);
    } else {
      // Process in overlapping chunks
      let offset = 0;
      while (offset < text.length) {
        const end = Math.min(offset + MAX_CHARS, text.length);
        const chunk = text.slice(offset, end);

        const raw = await this.runChunk(chunk, offset);
        const chunkEntities = this.aggregateBioTags(raw, text);

        // Only keep entities that don't overlap with already-found ones
        for (const e of chunkEntities) {
          const dominated = allEntities.some(
            (existing) => existing.start <= e.start && existing.end >= e.end,
          );
          if (!dominated) {
            // Remove any existing entities fully inside this new one
            allEntities = allEntities.filter(
              (existing) => !(e.start <= existing.start && e.end >= existing.end),
            );
            allEntities.push(e);
          }
        }

        if (end >= text.length) break;
        offset += MAX_CHARS - OVERLAP_CHARS;
      }
    }

    // Simple whitespace tokenization for context enhancement
    const tokens: string[] = [];
    const tokenSpans: Array<{ start: number; end: number }> = [];
    const tokenRegex = /\S+/g;
    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(text)) !== null) {
      tokens.push(match[0]);
      tokenSpans.push({ start: match.index, end: match.index + match[0].length });
    }

    return { entities: allEntities, tokens, tokenSpans, language };
  }

  private async runChunk(
    chunk: string,
    charOffset: number,
  ): Promise<Array<PipelineToken & { start: number; end: number }>> {
    const raw: PipelineToken[] = await this.pipeline(chunk, {
      ignore_labels: ['O'],
    });

    let searchFrom = 0;
    return raw.map((r) => {
      if (r.start != null && r.end != null && r.end > 0) {
        searchFrom = r.end;
        return { ...r, start: r.start + charOffset, end: r.end + charOffset };
      }

      let word = r.word.replace(/^##/, '');

      const idx = chunk.indexOf(word, searchFrom);
      if (idx >= 0) {
        searchFrom = idx + word.length;
        return { ...r, start: idx + charOffset, end: idx + word.length + charOffset };
      }

      const lowerChunk = chunk.toLowerCase();
      const lowerIdx = lowerChunk.indexOf(word.toLowerCase(), searchFrom);
      if (lowerIdx >= 0) {
        searchFrom = lowerIdx + word.length;
        return { ...r, start: lowerIdx + charOffset, end: lowerIdx + word.length + charOffset };
      }

      return { ...r, start: searchFrom + charOffset, end: searchFrom + charOffset };
    });
  }

  private aggregateBioTags(
    results: Array<PipelineToken & { start: number; end: number }>,
    text: string,
  ): NlpEntity[] {
    const entities: NlpEntity[] = [];
    let current: { label: string; start: number; end: number; scores: number[] } | null = null;

    for (const r of results) {
      // Handle aggregated output (entity_group)
      if (r.entity_group) {
        entities.push({
          text: text.slice(r.start, r.end),
          label: r.entity_group,
          start: r.start,
          end: r.end,
          score: r.score,
        });
        continue;
      }

      const tag = r.entity;
      const dashIdx = tag.indexOf('-');
      let prefix: string;
      let label: string;
      if (dashIdx >= 0 && dashIdx <= 2) {
        prefix = tag.slice(0, dashIdx);
        label = tag.slice(dashIdx + 1);
      } else {
        prefix = 'B';
        label = tag;
      }

      if (prefix === 'B' || prefix === 'S') {
        if (current) {
          entities.push(this.finalizeEntity(current, text));
        }
        current = { label, start: r.start, end: r.end, scores: [r.score] };
      } else if ((prefix === 'I' || prefix === 'E') && current && current.label === label) {
        current.end = r.end;
        current.scores.push(r.score);
      } else {
        if (current) {
          entities.push(this.finalizeEntity(current, text));
          current = null;
        }
      }
    }

    if (current) {
      entities.push(this.finalizeEntity(current, text));
    }

    return entities;
  }

  private finalizeEntity(
    c: { label: string; start: number; end: number; scores: number[] },
    text: string,
  ): NlpEntity {
    const avgScore = c.scores.reduce((a, b) => a + b, 0) / c.scores.length;
    return {
      text: text.slice(c.start, c.end),
      label: c.label,
      start: c.start,
      end: c.end,
      score: avgScore,
    };
  }

  isLoaded(): boolean {
    return this.pipeline !== null;
  }
}
