import type { Operator } from '../../types.js';

export class HashOperator implements Operator {
  operatorName = 'hash';

  async operate(text: string, params: Record<string, unknown>): Promise<string> {
    const algorithm = (params.hashType as string) ?? 'SHA-256';

    if (typeof globalThis.crypto?.subtle?.digest === 'function') {
      const data = new TextEncoder().encode(text);
      const hashBuffer = await crypto.subtle.digest(algorithm, data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback: simple hash for environments without WebCrypto
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}
