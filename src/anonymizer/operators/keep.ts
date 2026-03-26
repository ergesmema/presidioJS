import type { Operator } from '../../types.js';

export class KeepOperator implements Operator {
  operatorName = 'keep';

  operate(text: string, _params: Record<string, unknown>): string {
    return text;
  }
}
