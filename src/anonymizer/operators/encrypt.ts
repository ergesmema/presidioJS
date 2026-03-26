import type { Operator } from '../../types.js';

export class EncryptOperator implements Operator {
  operatorName = 'encrypt';

  async operate(text: string, params: Record<string, unknown>): Promise<string> {
    const keyHex = params.key as string;
    if (!keyHex) throw new Error('EncryptOperator requires a "key" parameter');

    const keyBytes = hexToBytes(keyHex);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes.buffer as ArrayBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt'] as KeyUsage[],
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(text);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv } as AesGcmParams,
      cryptoKey,
      data.buffer as ArrayBuffer,
    );

    // Return iv:ciphertext as hex
    const ivHex = bytesToHex(iv);
    const ctHex = bytesToHex(new Uint8Array(encrypted));
    return `${ivHex}:${ctHex}`;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
