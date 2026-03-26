import type { Operator } from '../../types.js';

export class ReplaceOperator implements Operator {
  operatorName = 'replace';

  operate(text: string, params: Record<string, unknown>): string {
    const newValue = params.newValue as string | undefined;
    const entityType = params.entityType as string | undefined;
    return newValue ?? `<${entityType ?? 'REDACTED'}>`;
  }
}
