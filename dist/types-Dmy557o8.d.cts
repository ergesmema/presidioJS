interface RecognizerResult {
    entityType: string;
    start: number;
    end: number;
    score: number;
    recognizerName: string;
    analysisExplanation?: AnalysisExplanation;
}
interface AnalysisExplanation {
    recognizer: string;
    patternName?: string;
    patternLength?: number;
    originalScore: number;
    score: number;
    scoreContextImprovement: number;
    supportiveContextWord?: string;
    validationResult?: boolean;
}
interface Pattern {
    name: string;
    regex: string;
    score: number;
}
interface NlpArtifacts {
    entities: NlpEntity[];
    tokens: string[];
    tokenSpans: Array<{
        start: number;
        end: number;
    }>;
    language: string;
}
interface NlpEntity {
    text: string;
    label: string;
    start: number;
    end: number;
    score: number;
}
interface AnalyzeOptions {
    language?: string;
    entities?: string[];
    scoreThreshold?: number;
    allowList?: string[];
    context?: string[];
    adHocRecognizers?: EntityRecognizerConfig[];
}
interface EntityRecognizerConfig {
    name: string;
    supportedLanguage: string;
    supportedEntities: string[];
    patterns?: Pattern[];
    denyList?: string[];
    context?: string[];
}
interface OperatorConfig {
    type: string;
    params?: Record<string, unknown>;
}
interface AnonymizerResult {
    text: string;
    items: AnonymizerResultItem[];
}
interface AnonymizerResultItem {
    start: number;
    end: number;
    entityType: string;
    operator: string;
    text: string;
}
interface Operator {
    operatorName: string;
    operate(text: string, params: Record<string, unknown>): string | Promise<string>;
}
interface NlpEngine {
    process(text: string, language: string): Promise<NlpArtifacts>;
    isLoaded(): boolean;
}

export type { AnalyzeOptions as A, EntityRecognizerConfig as E, NlpArtifacts as N, Operator as O, Pattern as P, RecognizerResult as R, NlpEngine as a, AnalysisExplanation as b, AnonymizerResult as c, AnonymizerResultItem as d, NlpEntity as e, OperatorConfig as f };
