import { O as Operator, R as RecognizerResult, f as OperatorConfig, c as AnonymizerResult } from './types-Dmy557o8.js';

declare class AnonymizerEngine {
    private operators;
    constructor();
    addOperator(operator: Operator): void;
    anonymize(text: string, analyzerResults: RecognizerResult[], operatorConfigs?: Record<string, OperatorConfig>): Promise<AnonymizerResult>;
}

declare class ReplaceOperator implements Operator {
    operatorName: string;
    operate(text: string, params: Record<string, unknown>): string;
}

declare class RedactOperator implements Operator {
    operatorName: string;
    operate(_text: string, _params: Record<string, unknown>): string;
}

declare class MaskOperator implements Operator {
    operatorName: string;
    operate(text: string, params: Record<string, unknown>): string;
}

declare class HashOperator implements Operator {
    operatorName: string;
    operate(text: string, params: Record<string, unknown>): Promise<string>;
}

declare class EncryptOperator implements Operator {
    operatorName: string;
    operate(text: string, params: Record<string, unknown>): Promise<string>;
}

declare class KeepOperator implements Operator {
    operatorName: string;
    operate(text: string, _params: Record<string, unknown>): string;
}

export { AnonymizerEngine, EncryptOperator, HashOperator, KeepOperator, MaskOperator, RedactOperator, ReplaceOperator };
