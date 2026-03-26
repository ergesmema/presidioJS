import type { NlpEngine, NlpArtifacts, NlpEntity } from '../types.js';

export type GenerateFn = (
  messages: Array<{ role: string; content: string }>,
) => Promise<string>;

export interface LlmNlpEngineOpts {
  generate: GenerateFn;
  maxNewTokens?: number;
  entityTypes?: string[];
}

const DEFAULT_ENTITY_TYPES = [
  'PERSON', 'LOCATION', 'ORGANIZATION', 'DATE_TIME',
  'PHONE_NUMBER', 'EMAIL_ADDRESS', 'CREDIT_CARD',
  'US_SSN', 'IBAN_CODE', 'IP_ADDRESS', 'URL',
  'PASSPORT', 'NATIONAL_ID', 'NATIONALITY',
];

function buildPrompt(text: string, entityTypes: string[], language: string): string {
  const langPrefix = language.toLowerCase().slice(0, 2);

  // 1. Language and domain context
  let contextInstruction: string;
  if (langPrefix === 'fr') {
    contextInstruction = 'The text is in French (possibly mixed with German, as in Swiss federal documents). Pay special attention to French and Swiss-French name formats, patronymics, transliterated names, addresses, IBAN numbers, and European phone numbers.';
  } else if (langPrefix === 'de') {
    contextInstruction = 'The text is in German (possibly mixed with French, as in Swiss federal documents). Pay special attention to German and Swiss-German name formats, patronymics, transliterated Eastern European names, addresses, IBAN numbers, and European phone numbers.';
  } else {
    contextInstruction = 'The text may be in English, French, or German.';
  }

  // 2. Domain-specific few-shot examples (sanctions / compliance)
  let example1: string;
  if (langPrefix === 'fr') {
    example1 = [
      '--- Example 1 ---',
      'Text to analyze:',
      '"""',
      'Conformément à l\'ordonnance du 25.02.2022, le Département fédéral de l\'économie (DEFR) a inscrit M. Gennadi Nikolaïevitch Timtchenko, né le 09.11.1952, de nationalité finlandaise et russe, domicilié à Cologny (GE), sur la liste des personnes sanctionnées. Les avoirs détenus auprès de la Banque Cantonale de Genève, compte IBAN CH56 0483 5012 3456 7800 9, sont gelés. Contact: +41 22 310 45 67.',
      '"""',
      'Extracted PII:',
      'DATE_TIME|25.02.2022',
      'ORGANIZATION|Département fédéral de l\'économie',
      'ORGANIZATION|DEFR',
      'PERSON|Gennadi Nikolaïevitch Timtchenko',
      'DATE_TIME|09.11.1952',
      'NATIONALITY|finlandaise',
      'NATIONALITY|russe',
      'LOCATION|Cologny',
      'ORGANIZATION|Banque Cantonale de Genève',
      'IBAN_CODE|CH56 0483 5012 3456 7800 9',
      'PHONE_NUMBER|+41 22 310 45 67',
    ].join('\n');
  } else if (langPrefix === 'de') {
    example1 = [
      '--- Example 1 ---',
      'Text to analyze:',
      '"""',
      'Gestützt auf die Verordnung vom 25.02.2022 hat das Staatssekretariat für Wirtschaft (SECO) folgende Person in Anhang 8 aufgenommen: Alischer Burchanowitsch Usmanow (Aliase: Alisher Usmanov), geboren am 09.09.1953 in Tschust, Usbekistan, russischer Staatsangehöriger, Geschäftsadresse: Prospekt Vernadskogo 37, Moskau, Russland. Reisepass-Nr. 753890412. Konto IBAN CH93 0076 2011 6238 5295 7 bei der Zürcher Kantonalbank. Tel. +41 44 123 45 67.',
      '"""',
      'Extracted PII:',
      'DATE_TIME|25.02.2022',
      'ORGANIZATION|Staatssekretariat für Wirtschaft',
      'ORGANIZATION|SECO',
      'PERSON|Alischer Burchanowitsch Usmanow',
      'PERSON|Alisher Usmanov',
      'DATE_TIME|09.09.1953',
      'LOCATION|Tschust',
      'LOCATION|Usbekistan',
      'NATIONALITY|russischer',
      'LOCATION|Prospekt Vernadskogo 37, Moskau, Russland',
      'PASSPORT|753890412',
      'IBAN_CODE|CH93 0076 2011 6238 5295 7',
      'ORGANIZATION|Zürcher Kantonalbank',
      'PHONE_NUMBER|+41 44 123 45 67',
    ].join('\n');
  } else {
    example1 = [
      '--- Example 1 ---',
      'Text to analyze:',
      '"""',
      'The State Secretariat for Economic Affairs (SECO) has designated Viktor Vekselberg (aliases: Viktor F. Vekselberg), born 14 April 1957, Russian national, as a sanctioned person under Annex 8. Address: Renova Group, Zürich, Switzerland. Passport No. 723456789. Account IBAN CH93 0076 2011 6238 5295 7 at UBS AG. Contact: +41 44 123 45 67, info@renova.ch.',
      '"""',
      'Extracted PII:',
      'ORGANIZATION|State Secretariat for Economic Affairs',
      'ORGANIZATION|SECO',
      'PERSON|Viktor Vekselberg',
      'PERSON|Viktor F. Vekselberg',
      'DATE_TIME|14 April 1957',
      'NATIONALITY|Russian',
      'ORGANIZATION|Renova Group',
      'LOCATION|Zürich, Switzerland',
      'PASSPORT|723456789',
      'IBAN_CODE|CH93 0076 2011 6238 5295 7',
      'ORGANIZATION|UBS AG',
      'PHONE_NUMBER|+41 44 123 45 67',
      'EMAIL_ADDRESS|info@renova.ch',
    ].join('\n');
  }

  // Example 2: No PII (prevents false positives on legal boilerplate)
  const example2 = [
    '--- Example 2 ---',
    'Text to analyze:',
    '"""',
    langPrefix === 'fr' ? 'Les mesures de gel des avoirs s\'appliquent conformément à l\'art. 15a al. 2 de la loi sur les embargos (LEmb; RS 946.231).' :
    langPrefix === 'de' ? 'Die Massnahmen zur Sperrung von Vermögenswerten gelten gemäss Art. 15a Abs. 2 des Embargogesetzes (EmbG; SR 946.231).' :
    'Asset freezing measures apply pursuant to Art. 15a para. 2 of the Embargo Act (EmbA; SR 946.231).',
    '"""',
    'Extracted PII:',
    'NONE',
  ].join('\n');

  return [
    'You are an expert compliance and sanctions screening system used by a government sanctions office. Your task is to extract all Personally Identifiable Information (PII) and entity references from the given text.',
    '',
    contextInstruction,
    '',
    'You must identify entities of the following types:',
    entityTypes.join(', '),
    '',
    'Extraction guidelines:',
    '- PERSON: Full names including patronymics (e.g. "Alischer Burchanowitsch Usmanow"). Also extract each alias or alternate spelling as a separate PERSON entry.',
    '- ORGANIZATION: Company names, government bodies, banks, abbreviations (e.g. "SECO"). Extract both the full name and the abbreviation as separate entries if both appear.',
    '- LOCATION: Cities, countries, full addresses. For multi-part addresses, extract the full address as one entity.',
    '- DATE_TIME: All dates in any format (DD.MM.YYYY, "14. März 2022", year-only like "1953").',
    '- IBAN_CODE: Full IBAN numbers including spaces.',
    '- PASSPORT: Passport numbers, Reisepass-Nr., numéro de passeport.',
    '- NATIONAL_ID: National ID numbers, AHV/AVS numbers, Swiss UID (CHE-xxx.xxx.xxx).',
    '- NATIONALITY: Nationality references (e.g. "russischer Staatsangehöriger", "de nationalité russe", "Russian").',
    '- Do NOT extract legal article references (Art. 2 Abs. 1), law names, or SR/RS numbers as entities.',
    '- Do NOT extract generic words like "Person", "Anhang", "Liste" unless they are part of a named entity.',
    '',
    'Output format:',
    'Return each extracted entity on a new line using exactly this format: TYPE|EXACT_TEXT',
    '',
    'Rules:',
    '1. TYPE must be one of the exact types listed above.',
    '2. EXACT_TEXT must be a verbatim substring copied character-for-character from the input text.',
    '3. Do not include any other text, conversational filler, markdown formatting, or numbering.',
    '4. If no PII is found, output exactly: NONE',
    '',
    example1,
    '',
    example2,
    '',
    '--- Real Task ---',
    'Text to analyze:',
    '"""',
    text,
    '"""',
    'Extracted PII:',
  ].join('\n');
}

function parseResponse(
  response: string,
  text: string,
  entityTypes: string[],
): NlpEntity[] {
  const entities: NlpEntity[] = [];
  const typeSet = new Set(entityTypes);
  
  // Sanitize: Small models sometimes wrap their output in markdown blockquotes
  const sanitizedResponse = response.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '');
  const lines = sanitizedResponse.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === 'NONE') continue;

    const pipeIdx = trimmed.indexOf('|');
    if (pipeIdx < 0) continue;

    const type = trimmed.slice(0, pipeIdx).trim();
    const extractedText = trimmed.slice(pipeIdx + 1).trim();

    if (!typeSet.has(type) || !extractedText) continue;

    let searchFrom = 0;
    while (true) {
      const idx = text.indexOf(extractedText, searchFrom);
      if (idx < 0) break;

      const alreadyFound = entities.some(
        (e) =>
          e.start === idx &&
          e.end === idx + extractedText.length &&
          e.label === type,
      );
      if (!alreadyFound) {
        entities.push({
          text: extractedText,
          label: type,
          start: idx,
          end: idx + extractedText.length,
          score: 0.85,
        });
      }
      searchFrom = idx + 1;
    }
  }

  return entities;
}

export class LlmNlpEngine implements NlpEngine {
  private readonly generate: GenerateFn;
  private readonly entityTypes: string[];

  constructor(opts: LlmNlpEngineOpts) {
    this.generate = opts.generate;
    this.entityTypes = opts.entityTypes ?? DEFAULT_ENTITY_TYPES;
  }

  async process(text: string, language: string): Promise<NlpArtifacts> {
    // Pass the language down to the prompt builder
    const prompt = buildPrompt(text, this.entityTypes, language);
    const messages = [
      {
        role: 'system',
        content:
          'You are a strict automated PII extraction tool used by a government sanctions office. You only output structured data in the exact requested format. You must catch every person name, alias, organization, location, date, financial identifier, and document number. Do not converse or add explanations.',
      },
      { role: 'user', content: prompt },
    ];

    const generated = await this.generate(messages);
    const entities = parseResponse(generated, text, this.entityTypes);

    const tokens: string[] = [];
    const tokenSpans: Array<{ start: number; end: number }> = [];
    const tokenRegex = /\S+/g;
    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(text)) !== null) {
      tokens.push(match[0]);
      tokenSpans.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return { entities, tokens, tokenSpans, language };
  }

  isLoaded(): boolean {
    return true;
  }
}