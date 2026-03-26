import type { Operator } from '../../types.js';

export class RedactOperator implements Operator {
  operatorName = 'redact';

  operate(_text: string, _params: Record<string, unknown>): string {
    return '';
  }
}
