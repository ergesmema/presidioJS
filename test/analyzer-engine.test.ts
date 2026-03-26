import { describe, it, expect } from 'vitest';
import { AnalyzerEngine } from '../src/analyzer/analyzer-engine.js';

describe('AnalyzerEngine', () => {
  const engine = new AnalyzerEngine();

  it('detects email in text', async () => {
    const results = await engine.analyze('Contact john@example.com');
    expect(results.some((r) => r.entityType === 'EMAIL_ADDRESS')).toBe(true);
  });

  it('detects SSN in text', async () => {
    const results = await engine.analyze('My SSN is 123-45-6789');
    expect(results.some((r) => r.entityType === 'US_SSN')).toBe(true);
  });

  it('detects multiple entity types', async () => {
    const results = await engine.analyze(
      'Email john@example.com, SSN 123-45-6789, IP 192.168.1.1',
    );
    const types = new Set(results.map((r) => r.entityType));
    expect(types.has('EMAIL_ADDRESS')).toBe(true);
    expect(types.has('US_SSN')).toBe(true);
    expect(types.has('IP_ADDRESS')).toBe(true);
  });

  it('filters by entity type', async () => {
    const results = await engine.analyze('Email john@example.com, SSN 123-45-6789', {
      entities: ['EMAIL_ADDRESS'],
    });
    expect(results.every((r) => r.entityType === 'EMAIL_ADDRESS')).toBe(true);
  });

  it('filters by score threshold', async () => {
    const results = await engine.analyze('Email john@example.com', {
      scoreThreshold: 0.9,
    });
    expect(results.every((r) => r.score >= 0.9)).toBe(true);
  });

  it('filters by allow list', async () => {
    const results = await engine.analyze('Email john@example.com', {
      allowList: ['john@example.com'],
    });
    expect(results.length).toBe(0);
  });

  it('returns supported entities', () => {
    const entities = engine.getSupportedEntities();
    expect(entities).toContain('EMAIL_ADDRESS');
    expect(entities).toContain('CREDIT_CARD');
    expect(entities).toContain('US_SSN');
  });
});
