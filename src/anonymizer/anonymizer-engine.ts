import type {
  Operator,
  OperatorConfig,
  RecognizerResult,
  AnonymizerResult,
  AnonymizerResultItem,
} from '../types.js';
import { ReplaceOperator } from './operators/replace.js';
import { RedactOperator } from './operators/redact.js';
import { MaskOperator } from './operators/mask.js';
import { HashOperator } from './operators/hash.js';
import { EncryptOperator } from './operators/encrypt.js';
import { KeepOperator } from './operators/keep.js';

export class AnonymizerEngine {
  private operators: Map<string, Operator>;

  constructor() {
    this.operators = new Map();
    const defaults: Operator[] = [
      new ReplaceOperator(),
      new RedactOperator(),
      new MaskOperator(),
      new HashOperator(),
      new EncryptOperator(),
      new KeepOperator(),
    ];
    for (const op of defaults) {
      this.operators.set(op.operatorName, op);
    }
  }

  addOperator(operator: Operator): void {
    this.operators.set(operator.operatorName, operator);
  }

  async anonymize(
    text: string,
    analyzerResults: RecognizerResult[],
    operatorConfigs?: Record<string, OperatorConfig>,
  ): Promise<AnonymizerResult> {
    // Sort results by start position descending (right-to-left)
    const sorted = [...analyzerResults].sort((a, b) => b.start - a.start);
    let result = text;
    const items: AnonymizerResultItem[] = [];

    for (const ar of sorted) {
      const config = operatorConfigs?.[ar.entityType] ??
        operatorConfigs?.['DEFAULT'] ?? { type: 'replace' };
      const operator = this.operators.get(config.type);
      if (!operator) {
        throw new Error(`Unknown operator: ${config.type}`);
      }

      const original = result.slice(ar.start, ar.end);
      const params: Record<string, unknown> = {
        ...(config.params ?? {}),
        entityType: ar.entityType,
      };

      const replacement = await operator.operate(original, params);
      result = result.slice(0, ar.start) + replacement + result.slice(ar.end);

      items.push({
        start: ar.start,
        end: ar.start + replacement.length,
        entityType: ar.entityType,
        operator: config.type,
        text: replacement,
      });
    }

    return { text: result, items: items.reverse() };
  }
}
