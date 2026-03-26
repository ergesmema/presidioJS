import { N as NlpArtifacts, R as RecognizerResult, a as NlpEngine, A as AnalyzeOptions, P as Pattern, b as AnalysisExplanation } from './types-Dmy557o8.js';
export { c as AnonymizerResult, d as AnonymizerResultItem, E as EntityRecognizerConfig, e as NlpEntity, O as Operator, f as OperatorConfig } from './types-Dmy557o8.js';
export { L as LlmNlpEngine, a as LlmNlpEngineOpts, N as NullNlpEngine, T as TransformersNlpEngine, b as TransformersNlpEngineOpts } from './llm-nlp-engine-1pZJZwwp.js';
export { AnonymizerEngine, EncryptOperator, HashOperator, KeepOperator, MaskOperator, RedactOperator, ReplaceOperator } from './anonymizer.js';

declare abstract class EntityRecognizer {
    readonly name: string;
    readonly supportedEntities: string[];
    readonly supportedLanguage: string;
    readonly context: string[];
    constructor(opts: {
        name: string;
        supportedEntities: string[];
        supportedLanguage?: string;
        context?: string[];
    });
    abstract analyze(text: string, entities: string[], nlpArtifacts: NlpArtifacts): RecognizerResult[];
    getSuportedEntities(): string[];
}

declare class RecognizerRegistry {
    private recognizers;
    addRecognizer(recognizer: EntityRecognizer): void;
    removeRecognizer(name: string): void;
    getRecognizers(language: string, entities?: string[]): EntityRecognizer[];
    getSupportedEntities(language: string): string[];
    loadPredefinedRecognizers(nlpEngine?: NlpEngine): void;
    static withAllRecognizers(nlpEngine?: NlpEngine): RecognizerRegistry;
    static withPatternRecognizers(): RecognizerRegistry;
}

interface AnalyzerEngineOpts {
    registry?: RecognizerRegistry;
    nlpEngine?: NlpEngine;
    defaultScoreThreshold?: number;
}
declare class AnalyzerEngine {
    private readonly registry;
    private readonly nlpEngine;
    private readonly enhancer;
    private readonly defaultScoreThreshold;
    constructor(opts?: AnalyzerEngineOpts);
    analyze(text: string, opts?: AnalyzeOptions): Promise<RecognizerResult[]>;
    getSupportedEntities(language?: string): string[];
}

interface PatternRecognizerOpts {
    name: string;
    supportedEntities: string[];
    patterns?: Pattern[];
    denyList?: string[];
    denyListScore?: number;
    supportedLanguage?: string;
    context?: string[];
}
declare class PatternRecognizer extends EntityRecognizer {
    readonly patterns: Pattern[];
    readonly denyList: string[];
    readonly denyListScore: number;
    constructor(opts: PatternRecognizerOpts);
    analyze(text: string, entities: string[], _nlpArtifacts: NlpArtifacts): RecognizerResult[];
    /**
     * Override to validate a match. Return true to boost score, false to reject, null to keep as-is.
     */
    validateResult(_matchText: string, _start: number, _end: number, _fullText: string): boolean | null;
}

declare class ContextAwareEnhancer {
    private readonly contextWindowSize;
    private readonly contextBoost;
    constructor(opts?: {
        contextWindowSize?: number;
        contextBoost?: number;
    });
    enhance(results: RecognizerResult[], recognizers: EntityRecognizer[], nlpArtifacts: NlpArtifacts, text: string): RecognizerResult[];
    private getSurroundingTokens;
}

declare function createResult(entityType: string, start: number, end: number, score: number, recognizerName: string, analysisExplanation?: AnalysisExplanation): RecognizerResult;

declare class CreditCardRecognizer extends PatternRecognizer {
    constructor();
    validateResult(matchText: string): boolean | null;
}

declare class EmailRecognizer extends PatternRecognizer {
    constructor();
}

declare class PhoneRecognizer extends PatternRecognizer {
    constructor();
    validateResult(matchText: string): boolean | null;
}

declare class SsnRecognizer extends PatternRecognizer {
    constructor();
    validateResult(matchText: string): boolean | null;
}

declare class UrlRecognizer extends PatternRecognizer {
    constructor();
    validateResult(matchText: string): boolean | null;
}

declare class IpRecognizer extends PatternRecognizer {
    constructor();
}

declare class IbanRecognizer extends PatternRecognizer {
    constructor();
    validateResult(matchText: string): boolean | null;
}

declare class CryptoRecognizer extends PatternRecognizer {
    constructor();
}

declare class DateRecognizer extends PatternRecognizer {
    constructor();
}

declare class UsBankRecognizer extends PatternRecognizer {
    constructor();
}

declare class UsItinRecognizer extends PatternRecognizer {
    constructor();
}

declare class UsPassportRecognizer extends PatternRecognizer {
    constructor();
}

declare class TransformersNerRecognizer extends EntityRecognizer {
    constructor();
    analyze(_text: string, entities: string[], nlpArtifacts: NlpArtifacts): RecognizerResult[];
}

/**
 * Swiss AHV/AVS number (social security): 756.XXXX.XXXX.XX
 * Always starts with 756, 13 digits total, last digit is EAN-13 check digit.
 */
declare class AhvRecognizer extends PatternRecognizer {
    constructor();
    validateResult(matchText: string): boolean | null;
}

/**
 * Swiss company UID (Unternehmens-Identifikationsnummer): CHE-XXX.XXX.XXX
 * Used in sanctions to identify Swiss-registered companies.
 */
declare class SwissUidRecognizer extends PatternRecognizer {
    constructor();
}

/**
 * European date formats commonly found in Swiss/German/French documents.
 * DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY, and partial forms.
 */
declare class EuDateRecognizer extends PatternRecognizer {
    constructor();
}

/**
 * Swiss and European phone number formats.
 * +41 XX XXX XX XX, 0XX XXX XX XX, +49/+33 variants.
 */
declare class SwissPhoneRecognizer extends PatternRecognizer {
    constructor();
}

export { AhvRecognizer, AnalysisExplanation, AnalyzeOptions, AnalyzerEngine, type AnalyzerEngineOpts, ContextAwareEnhancer, CreditCardRecognizer, CryptoRecognizer, DateRecognizer, EmailRecognizer, EntityRecognizer, EuDateRecognizer, IbanRecognizer, IpRecognizer, NlpArtifacts, NlpEngine, Pattern, PatternRecognizer, type PatternRecognizerOpts, PhoneRecognizer, RecognizerRegistry, RecognizerResult, SsnRecognizer, SwissPhoneRecognizer, SwissUidRecognizer, TransformersNerRecognizer, UrlRecognizer, UsBankRecognizer, UsItinRecognizer, UsPassportRecognizer, createResult };
