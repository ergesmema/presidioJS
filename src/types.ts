export interface RecognizerResult {
  entityType: string;
  start: number;
  end: number;
  score: number;
  recognizerName: string;
  analysisExplanation?: AnalysisExplanation;
}

export interface AnalysisExplanation {
  recognizer: string;
  patternName?: string;
  patternLength?: number;
  originalScore: number;
  score: number;
  scoreContextImprovement: number;
  supportiveContextWord?: string;
  validationResult?: boolean;
}

export interface Pattern {
  name: string;
  regex: string;
  score: number;
}

export interface NlpArtifacts {
  entities: NlpEntity[];
  tokens: string[];
  tokenSpans: Array<{ start: number; end: number }>;
  language: string;
}

export interface NlpEntity {
  text: string;
  label: string;
  start: number;
  end: number;
  score: number;
}

export interface AnalyzeOptions {
  language?: string;
  entities?: string[];
  scoreThreshold?: number;
  allowList?: string[];
  context?: string[];
  adHocRecognizers?: EntityRecognizerConfig[];
}

export interface EntityRecognizerConfig {
  name: string;
  supportedLanguage: string;
  supportedEntities: string[];
  patterns?: Pattern[];
  denyList?: string[];
  context?: string[];
}

export interface OperatorConfig {
  type: string;
  params?: Record<string, unknown>;
}

export interface AnonymizerResult {
  text: string;
  items: AnonymizerResultItem[];
}

export interface AnonymizerResultItem {
  start: number;
  end: number;
  entityType: string;
  operator: string;
  text: string;
}

export interface Operator {
  operatorName: string;
  operate(text: string, params: Record<string, unknown>): string | Promise<string>;
}

export interface NlpEngine {
  process(text: string, language: string): Promise<NlpArtifacts>;
  isLoaded(): boolean;
}
