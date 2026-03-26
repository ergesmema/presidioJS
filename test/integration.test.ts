import { describe, it, expect } from 'vitest';
import { AnalyzerEngine } from '../src/analyzer/analyzer-engine.js';
import { AnonymizerEngine } from '../src/anonymizer/anonymizer-engine.js';

describe('Integration: Analyze + Anonymize', () => {
  const analyzer = new AnalyzerEngine();
  const anonymizer = new AnonymizerEngine();

  it('full pipeline: detect and anonymize PII', async () => {
    const text =
      'Contact john@example.com or call 212-555-1234. SSN: 123-45-6789';
    const results = await analyzer.analyze(text);

    expect(results.length).toBeGreaterThanOrEqual(3);

    const anon = await anonymizer.anonymize(text, results);
    expect(anon.text).not.toContain('john@example.com');
    expect(anon.text).not.toContain('123-45-6789');
    expect(anon.text).toContain('<EMAIL_ADDRESS>');
    expect(anon.text).toContain('<US_SSN>');
  });

  it('full pipeline with custom operators', async () => {
    const text = 'My email is test@test.com and SSN is 123-45-6789';
    const results = await analyzer.analyze(text);

    const anon = await anonymizer.anonymize(text, results, {
      EMAIL_ADDRESS: { type: 'mask', params: { charsToMask: 5, maskingChar: 'X' } },
      US_SSN: { type: 'replace', params: { newValue: '***-**-****' } },
    });

    expect(anon.text).toContain('XXXXX');
    expect(anon.text).toContain('***-**-****');
  });

  it('ad-hoc recognizer', async () => {
    const text = 'My employee ID is EMP-12345';
    const results = await analyzer.analyze(text, {
      adHocRecognizers: [
        {
          name: 'EmployeeIdRecognizer',
          supportedLanguage: 'en',
          supportedEntities: ['EMPLOYEE_ID'],
          patterns: [{ name: 'emp_id', regex: 'EMP-\\d{5}', score: 1.0 }],
        },
      ],
    });

    expect(results.some((r) => r.entityType === 'EMPLOYEE_ID')).toBe(true);
  });
});
