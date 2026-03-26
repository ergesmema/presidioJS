import { describe, it, expect } from 'vitest';
import { LlmNlpEngine } from '../src/nlp/llm-nlp-engine.js';
import { AnalyzerEngine } from '../src/analyzer/analyzer-engine.js';

function mockGenerate(response: string) {
  return async () => response;
}

describe('LlmNlpEngine', () => {
  it('parses TYPE|TEXT response format', async () => {
    const engine = new LlmNlpEngine({
      generate: mockGenerate(
        'PERSON|John Smith\nEMAIL_ADDRESS|john@example.com',
      ),
    });

    const artifacts = await engine.process(
      'Contact John Smith at john@example.com',
      'en',
    );

    expect(artifacts.entities).toHaveLength(2);
    expect(artifacts.entities[0]).toMatchObject({
      label: 'PERSON',
      text: 'John Smith',
      start: 8,
      end: 18,
    });
    expect(artifacts.entities[1]).toMatchObject({
      label: 'EMAIL_ADDRESS',
      text: 'john@example.com',
      start: 22,
      end: 38,
    });
  });

  it('ignores invalid lines', async () => {
    const engine = new LlmNlpEngine({
      generate: mockGenerate(
        'PERSON|Jane Doe\nThis is not valid\n\nALSO_INVALID',
      ),
    });

    const artifacts = await engine.process('Hello Jane Doe', 'en');
    expect(artifacts.entities).toHaveLength(1);
    expect(artifacts.entities[0].label).toBe('PERSON');
  });

  it('ignores unknown entity types', async () => {
    const engine = new LlmNlpEngine({
      generate: mockGenerate('PERSON|Alice\nFAVORITE_COLOR|blue'),
    });

    const artifacts = await engine.process('Alice likes blue', 'en');
    expect(artifacts.entities).toHaveLength(1);
  });

  it('handles NONE response', async () => {
    const engine = new LlmNlpEngine({
      generate: mockGenerate('NONE'),
    });

    const artifacts = await engine.process('Nothing to see here', 'en');
    expect(artifacts.entities).toHaveLength(0);
  });

  it('handles text not found in input', async () => {
    const engine = new LlmNlpEngine({
      generate: mockGenerate('PERSON|Bob Johnson'),
    });

    // "Bob Johnson" does not appear in input text
    const artifacts = await engine.process('Hello world', 'en');
    expect(artifacts.entities).toHaveLength(0);
  });

  it('finds multiple occurrences of same text', async () => {
    const engine = new LlmNlpEngine({
      generate: mockGenerate('PERSON|John'),
    });

    const artifacts = await engine.process('John met John at the park', 'en');
    expect(artifacts.entities).toHaveLength(2);
    expect(artifacts.entities[0].start).toBe(0);
    expect(artifacts.entities[1].start).toBe(9);
  });

  it('integrates with AnalyzerEngine', async () => {
    const nlpEngine = new LlmNlpEngine({
      generate: mockGenerate(
        'PERSON|Thomas Müller\nLOCATION|München\nORGANIZATION|Siemens AG',
      ),
    });
    const analyzer = new AnalyzerEngine({ nlpEngine });

    const results = await analyzer.analyze(
      'Thomas Müller arbeitet bei Siemens AG in München',
    );

    const types = results.map((r) => r.entityType);
    expect(types).toContain('PERSON');
    expect(types).toContain('LOCATION');
    expect(types).toContain('ORGANIZATION');
  });

  it('uses custom entity types', async () => {
    const engine = new LlmNlpEngine({
      generate: mockGenerate('EMPLOYEE_ID|EMP-12345'),
      entityTypes: ['EMPLOYEE_ID'],
    });

    const artifacts = await engine.process('ID is EMP-12345', 'en');
    expect(artifacts.entities).toHaveLength(1);
    expect(artifacts.entities[0].label).toBe('EMPLOYEE_ID');
  });

  it('reports isLoaded as true', () => {
    const engine = new LlmNlpEngine({ generate: mockGenerate('NONE') });
    expect(engine.isLoaded()).toBe(true);
  });
});
