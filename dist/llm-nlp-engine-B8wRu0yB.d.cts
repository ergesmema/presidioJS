import { a as NlpEngine, N as NlpArtifacts } from './types-Dmy557o8.cjs';

declare class NullNlpEngine implements NlpEngine {
    process(text: string, language: string): Promise<NlpArtifacts>;
    isLoaded(): boolean;
}

interface TransformersNlpEngineOpts {
    modelId?: string;
    quantized?: boolean;
    device?: 'cpu' | 'webgpu' | 'wasm';
}
declare class TransformersNlpEngine implements NlpEngine {
    private pipeline;
    private tokenizer;
    private loading;
    private readonly modelId;
    private readonly quantized;
    private readonly device;
    constructor(opts?: TransformersNlpEngineOpts);
    private load;
    process(text: string, language: string): Promise<NlpArtifacts>;
    private runChunk;
    private aggregateBioTags;
    private finalizeEntity;
    isLoaded(): boolean;
}

type GenerateFn = (messages: Array<{
    role: string;
    content: string;
}>) => Promise<string>;
interface LlmNlpEngineOpts {
    generate: GenerateFn;
    maxNewTokens?: number;
    entityTypes?: string[];
}
declare class LlmNlpEngine implements NlpEngine {
    private readonly generate;
    private readonly entityTypes;
    constructor(opts: LlmNlpEngineOpts);
    process(text: string, language: string): Promise<NlpArtifacts>;
    isLoaded(): boolean;
}

export { LlmNlpEngine as L, NullNlpEngine as N, TransformersNlpEngine as T, type LlmNlpEngineOpts as a, type TransformersNlpEngineOpts as b };
