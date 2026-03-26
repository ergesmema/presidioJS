import type { Operator } from '../../types.js';

export class MaskOperator implements Operator {
  operatorName = 'mask';

  operate(text: string, params: Record<string, unknown>): string {
    const maskingChar = (params.maskingChar as string) ?? '*';
    const charsToMask = (params.charsToMask as number) ?? text.length;
    const fromEnd = (params.fromEnd as boolean) ?? false;

    const count = Math.min(charsToMask, text.length);

    if (fromEnd) {
      return text.slice(0, text.length - count) + maskingChar.repeat(count);
    }
    return maskingChar.repeat(count) + text.slice(count);
  }
}
