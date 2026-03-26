import { describe, it, expect } from 'vitest';
import { AnonymizerEngine } from '../src/anonymizer/anonymizer-engine.js';
import type { RecognizerResult } from '../src/types.js';

const makeResult = (
  entityType: string,
  start: number,
  end: number,
  score = 1.0,
): RecognizerResult => ({
  entityType,
  start,
  end,
  score,
  recognizerName: 'test',
});

describe('AnonymizerEngine', () => {
  const engine = new AnonymizerEngine();

  it('replaces with entity type by default', async () => {
    const text = 'My email is john@example.com';
    const results = [makeResult('EMAIL_ADDRESS', 12, 28)];
    const anon = await engine.anonymize(text, results);
    expect(anon.text).toBe('My email is <EMAIL_ADDRESS>');
  });

  it('redacts entity', async () => {
    const text = 'My SSN is 123-45-6789';
    const results = [makeResult('US_SSN', 10, 21)];
    const anon = await engine.anonymize(text, results, {
      US_SSN: { type: 'redact' },
    });
    expect(anon.text).toBe('My SSN is ');
  });

  it('masks entity', async () => {
    const text = 'Card: 4532015112830366';
    const results = [makeResult('CREDIT_CARD', 6, 22)];
    const anon = await engine.anonymize(text, results, {
      CREDIT_CARD: { type: 'mask', params: { charsToMask: 12, maskingChar: '*' } },
    });
    expect(anon.text).toBe('Card: ************0366');
  });

  it('keeps entity with keep operator', async () => {
    const text = 'Name: John';
    const results = [makeResult('PERSON', 6, 10)];
    const anon = await engine.anonymize(text, results, {
      PERSON: { type: 'keep' },
    });
    expect(anon.text).toBe('Name: John');
  });

  it('hashes entity', async () => {
    const text = 'SSN: 123-45-6789';
    const results = [makeResult('US_SSN', 5, 16)];
    const anon = await engine.anonymize(text, results, {
      US_SSN: { type: 'hash' },
    });
    expect(anon.text).toMatch(/^SSN: [0-9a-f]+$/);
  });

  it('replaces with custom value', async () => {
    const text = 'Hi John';
    const results = [makeResult('PERSON', 3, 7)];
    const anon = await engine.anonymize(text, results, {
      PERSON: { type: 'replace', params: { newValue: '[REDACTED]' } },
    });
    expect(anon.text).toBe('Hi [REDACTED]');
  });

  it('handles multiple entities right-to-left', async () => {
    const text = 'john@a.com and 123-45-6789';
    const results = [
      makeResult('EMAIL_ADDRESS', 0, 10),
      makeResult('US_SSN', 15, 26),
    ];
    const anon = await engine.anonymize(text, results);
    expect(anon.text).toBe('<EMAIL_ADDRESS> and <US_SSN>');
  });

  it('uses DEFAULT operator config', async () => {
    const text = 'john@a.com';
    const results = [makeResult('EMAIL_ADDRESS', 0, 10)];
    const anon = await engine.anonymize(text, results, {
      DEFAULT: { type: 'redact' },
    });
    expect(anon.text).toBe('');
  });
});
