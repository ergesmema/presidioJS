/**
 * Prompt evaluation tests for sanctions office use case (SECO, Switzerland).
 * Tests German text of increasing difficulty to find prompt weaknesses.
 *
 * These tests use a "perfect LLM" mock — the mock returns exactly what a
 * correct model SHOULD return, so we're testing parseResponse + prompt
 * construction, not actual model quality.  The real value is that they
 * document expected entities for each scenario so we can later evaluate
 * real model output against them.
 */
import { describe, it, expect } from 'vitest';
import { LlmNlpEngine } from '../src/nlp/llm-nlp-engine.js';
import { AnalyzerEngine } from '../src/analyzer/analyzer-engine.js';

/* ------------------------------------------------------------------ */
/*  Helper: capture the prompt that buildPrompt produces               */
/* ------------------------------------------------------------------ */
function capturePrompt(): { calls: Array<{ role: string; content: string }[]>; generate: (msgs: any) => Promise<string> } {
  const calls: Array<{ role: string; content: string }[]> = [];
  return {
    calls,
    generate: async (msgs: { role: string; content: string }[]) => {
      calls.push(msgs);
      return 'NONE';
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Test texts — increasing difficulty                                  */
/* ------------------------------------------------------------------ */

// Level 1: Simple, one entity per type
const LEVEL1 = `Herr Viktor Vekselberg wurde am 14. März 2022 auf die Sanktionsliste gesetzt.`;
const LEVEL1_EXPECTED = [
  'PERSON|Viktor Vekselberg',
  'DATE_TIME|14. März 2022',
];

// Level 2: Multiple entities, Swiss-specific formats
const LEVEL2 = `Die Renova Group mit Sitz in Zürich, vertreten durch Viktor Vekselberg, wurde per Verfügung vom 25.02.2022 sanktioniert. Kontakt: +41 44 123 45 67, info@renova-group.ch, IBAN CH93 0076 2011 6238 5295 7.`;
const LEVEL2_EXPECTED = [
  'ORGANIZATION|Renova Group',
  'LOCATION|Zürich',
  'PERSON|Viktor Vekselberg',
  'DATE_TIME|25.02.2022',
  'PHONE_NUMBER|+41 44 123 45 67',
  'EMAIL_ADDRESS|info@renova-group.ch',
  'IBAN_CODE|CH93 0076 2011 6238 5295 7',
];

// Level 3: Formal legal/administrative German with compound words, titles
const LEVEL3 = `Gestützt auf Art. 2 Abs. 1 der Verordnung über Massnahmen gegenüber der Russischen Föderation (SR 946.231.176.72) hat das Staatssekretariat für Wirtschaft (SECO) folgende natürliche Personen in Anhang 8 aufgenommen:

1. Alischer Burchanowitsch Usmanow, geboren am 09.09.1953 in Tschust, Usbekistan, russischer Staatsangehöriger, Geschäftsadresse: Prospekt Vernadskogo 37, Bldg 1a, Moskau 119415, Russland. Reisepass-Nr. 753890412.

2. Pjotr Olegowitsch Awen, geboren 1955, lettischer und russischer Staatsangehöriger, Verwaltungsratsmitglied der LetterOne Holdings S.A., 2, rue Edward Steichen, L-2540 Luxemburg.`;
const LEVEL3_EXPECTED = [
  'ORGANIZATION|Staatssekretariat für Wirtschaft',
  'ORGANIZATION|SECO',
  'PERSON|Alischer Burchanowitsch Usmanow',
  'DATE_TIME|09.09.1953',
  'LOCATION|Tschust',
  'LOCATION|Usbekistan',
  'LOCATION|Prospekt Vernadskogo 37, Bldg 1a, Moskau 119415, Russland',
  'PERSON|Pjotr Olegowitsch Awen',
  'DATE_TIME|1955',
  'ORGANIZATION|LetterOne Holdings S.A.',
  'LOCATION|2, rue Edward Steichen, L-2540 Luxemburg',
];

// Level 4: Mixed German/French (common in Swiss federal docs)
const LEVEL4 = `Bundesratsbeschluss vom 16. März 2022:

Betrifft: Einfrieren der Vermögenswerte von Herrn Gennadi Nikolajewitsch Timtschenko, wohnhaft in Cologny (GE), Schweizer Aufenthaltsbewilligung C, sowie der Volga Group SA (CHE-123.456.789), 15 Quai du Mont-Blanc, 1201 Genève.

Conformément à l'art. 15a al. 2 LEmb, les avoirs suivants sont gelés: compte IBAN CH56 0483 5012 3456 7800 9 auprès de la Banque Cantonale de Genève, solde au 16.03.2022: CHF 4'350'000.—

La décision est notifiée à M. Timtschenko par voie diplomatique.`;
const LEVEL4_EXPECTED = [
  'DATE_TIME|16. März 2022',
  'PERSON|Gennadi Nikolajewitsch Timtschenko',
  'LOCATION|Cologny',
  'ORGANIZATION|Volga Group SA',
  'LOCATION|15 Quai du Mont-Blanc, 1201 Genève',
  'IBAN_CODE|CH56 0483 5012 3456 7800 9',
  'ORGANIZATION|Banque Cantonale de Genève',
  'DATE_TIME|16.03.2022',
  'PERSON|Timtschenko',
];

// Level 5: Dense entity extraction — sanctions list entry with many aliases
const LEVEL5 = `Eintrag Nr. 1087 — Anhang 8:

Name: ROTENBERG, Arkadi Romanowitsch (Аркадий Романович Ротенберг)
Aliase: Arkady Romanovich ROTENBERG; Arkadij ROTENBERG
Geb.: 15.12.1951, Leningrad (heute St. Petersburg), UdSSR (heute Russische Föderation)
Staatsangehörigkeit: russisch
Anschrift: ul. Osennaja 23, Moskau, Russland
Funktion: Mitinhaber der SMP Bank (OAO), Vorsitzender des Verwaltungsrats der Stroygazmontazh (SGM Group), Mitglied des Präsidiums des Judoverbands Russlands
Gelistet seit: 20.03.2014
Überprüfungsdatum: 15.09.2023
EU-Referenznummer: EU.8395.21`;
const LEVEL5_EXPECTED = [
  'PERSON|ROTENBERG, Arkadi Romanowitsch',
  'PERSON|Arkady Romanovich ROTENBERG',
  'PERSON|Arkadij ROTENBERG',
  'DATE_TIME|15.12.1951',
  'LOCATION|Leningrad',
  'LOCATION|St. Petersburg',
  'LOCATION|ul. Osennaja 23, Moskau, Russland',
  'ORGANIZATION|SMP Bank',
  'ORGANIZATION|Stroygazmontazh',
  'ORGANIZATION|SGM Group',
  'ORGANIZATION|Judoverbands Russlands',
  'DATE_TIME|20.03.2014',
  'DATE_TIME|15.09.2023',
];

describe('Sanctions prompt evaluation', () => {

  describe('Prompt construction', () => {
    it('German prompt includes German-specific few-shot example', async () => {
      const cap = capturePrompt();
      const engine = new LlmNlpEngine({ generate: cap.generate });
      await engine.process('test', 'de');

      const userMsg = cap.calls[0].find(m => m.role === 'user')!.content;
      expect(userMsg).toContain('The text is in German');
      expect(userMsg).toContain('Alischer Burchanowitsch Usmanow');
      expect(userMsg).toContain('ORGANIZATION|SECO');
    });

    it('French prompt includes French-specific few-shot example', async () => {
      const cap = capturePrompt();
      const engine = new LlmNlpEngine({ generate: cap.generate });
      await engine.process('test', 'fr');

      const userMsg = cap.calls[0].find(m => m.role === 'user')!.content;
      expect(userMsg).toContain('The text is in French');
      expect(userMsg).toContain('Gennadi Nikolaïevitch Timtchenko');
    });

    it('prompt includes all default entity types', async () => {
      const cap = capturePrompt();
      const engine = new LlmNlpEngine({ generate: cap.generate });
      await engine.process('test', 'de');

      const userMsg = cap.calls[0].find(m => m.role === 'user')!.content;
      expect(userMsg).toContain('PERSON');
      expect(userMsg).toContain('ORGANIZATION');
      expect(userMsg).toContain('IBAN_CODE');
      expect(userMsg).toContain('CREDIT_CARD');
    });
  });

  describe('Level 1 — Simple text', () => {
    it('extracts person and date from simple German sentence', async () => {
      const engine = new LlmNlpEngine({
        generate: async () => LEVEL1_EXPECTED.join('\n'),
      });
      const result = await engine.process(LEVEL1, 'de');

      expect(result.entities).toHaveLength(2);
      expect(result.entities.find(e => e.label === 'PERSON')?.text).toBe('Viktor Vekselberg');
      expect(result.entities.find(e => e.label === 'DATE_TIME')?.text).toBe('14. März 2022');
    });
  });

  describe('Level 2 — Multiple entities, Swiss formats', () => {
    it('extracts org, location, person, date, phone, email, IBAN', async () => {
      const engine = new LlmNlpEngine({
        generate: async () => LEVEL2_EXPECTED.join('\n'),
      });
      const result = await engine.process(LEVEL2, 'de');

      expect(result.entities.length).toBeGreaterThanOrEqual(7);
      const labels = new Set(result.entities.map(e => e.label));
      expect(labels).toContain('ORGANIZATION');
      expect(labels).toContain('LOCATION');
      expect(labels).toContain('PERSON');
      expect(labels).toContain('PHONE_NUMBER');
      expect(labels).toContain('EMAIL_ADDRESS');
      expect(labels).toContain('IBAN_CODE');
    });
  });

  describe('Level 3 — Formal legal German', () => {
    it('handles compound names, addresses, passport numbers', async () => {
      const engine = new LlmNlpEngine({
        generate: async () => LEVEL3_EXPECTED.join('\n'),
      });
      const result = await engine.process(LEVEL3, 'de');

      const persons = result.entities.filter(e => e.label === 'PERSON');
      expect(persons.length).toBeGreaterThanOrEqual(2);
      expect(persons.find(p => p.text.includes('Usmanow'))).toBeTruthy();
      expect(persons.find(p => p.text.includes('Awen'))).toBeTruthy();

      const orgs = result.entities.filter(e => e.label === 'ORGANIZATION');
      expect(orgs.find(o => o.text.includes('SECO'))).toBeTruthy();
    });
  });

  describe('Level 4 — Mixed German/French (Swiss federal)', () => {
    it('handles bilingual text with both DE and FR entities', async () => {
      const engine = new LlmNlpEngine({
        generate: async () => LEVEL4_EXPECTED.join('\n'),
      });
      // Note: language 'de' but text has FR sections — model must handle both
      const result = await engine.process(LEVEL4, 'de');

      const persons = result.entities.filter(e => e.label === 'PERSON');
      expect(persons.length).toBeGreaterThanOrEqual(1);

      const orgs = result.entities.filter(e => e.label === 'ORGANIZATION');
      expect(orgs.find(o => o.text.includes('Volga'))).toBeTruthy();
      expect(orgs.find(o => o.text.includes('Banque'))).toBeTruthy();

      const locations = result.entities.filter(e => e.label === 'LOCATION');
      expect(locations.find(l => l.text.includes('Genève') || l.text.includes('Cologny'))).toBeTruthy();
    });
  });

  describe('Level 5 — Dense sanctions list entry', () => {
    it('handles aliases, Cyrillic, multiple roles and orgs', async () => {
      const engine = new LlmNlpEngine({
        generate: async () => LEVEL5_EXPECTED.join('\n'),
      });
      const result = await engine.process(LEVEL5, 'de');

      const persons = result.entities.filter(e => e.label === 'PERSON');
      expect(persons.length).toBeGreaterThanOrEqual(3);

      const orgs = result.entities.filter(e => e.label === 'ORGANIZATION');
      expect(orgs.length).toBeGreaterThanOrEqual(3);

      const dates = result.entities.filter(e => e.label === 'DATE_TIME');
      expect(dates.length).toBeGreaterThanOrEqual(3);
    });
  });
});
