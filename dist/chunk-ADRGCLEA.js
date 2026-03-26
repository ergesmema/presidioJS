// src/nlp/null-nlp-engine.ts
var NullNlpEngine = class {
  async process(text, language) {
    const tokens = [];
    const tokenSpans = [];
    const regex = /\S+/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      tokens.push(match[0]);
      tokenSpans.push({ start: match.index, end: match.index + match[0].length });
    }
    return { entities: [], tokens, tokenSpans, language };
  }
  isLoaded() {
    return true;
  }
};

// src/nlp/transformers-nlp-engine.ts
var TransformersNlpEngine = class {
  pipeline = null;
  tokenizer = null;
  loading = null;
  modelId;
  quantized;
  device;
  constructor(opts = {}) {
    this.modelId = opts.modelId ?? "Xenova/distilbert-base-multilingual-cased-ner-hrl";
    this.quantized = opts.quantized ?? true;
    this.device = opts.device ?? "wasm";
  }
  async load() {
    if (this.pipeline) return;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const transformers = await import('@huggingface/transformers');
      this.pipeline = await transformers.pipeline("token-classification", this.modelId, {
        quantized: this.quantized,
        device: this.device
      });
      this.tokenizer = this.pipeline.tokenizer;
    })();
    return this.loading;
  }
  async process(text, language) {
    await this.load();
    const MAX_CHARS = 1500;
    const OVERLAP_CHARS = 200;
    let allEntities = [];
    if (text.length <= MAX_CHARS) {
      const raw = await this.runChunk(text, 0);
      allEntities = this.aggregateBioTags(raw, text);
    } else {
      let offset = 0;
      while (offset < text.length) {
        const end = Math.min(offset + MAX_CHARS, text.length);
        const chunk = text.slice(offset, end);
        const raw = await this.runChunk(chunk, offset);
        const chunkEntities = this.aggregateBioTags(raw, text);
        for (const e of chunkEntities) {
          const dominated = allEntities.some(
            (existing) => existing.start <= e.start && existing.end >= e.end
          );
          if (!dominated) {
            allEntities = allEntities.filter(
              (existing) => !(e.start <= existing.start && e.end >= existing.end)
            );
            allEntities.push(e);
          }
        }
        if (end >= text.length) break;
        offset += MAX_CHARS - OVERLAP_CHARS;
      }
    }
    const tokens = [];
    const tokenSpans = [];
    const tokenRegex = /\S+/g;
    let match;
    while ((match = tokenRegex.exec(text)) !== null) {
      tokens.push(match[0]);
      tokenSpans.push({ start: match.index, end: match.index + match[0].length });
    }
    return { entities: allEntities, tokens, tokenSpans, language };
  }
  async runChunk(chunk, charOffset) {
    const raw = await this.pipeline(chunk, {
      ignore_labels: ["O"]
    });
    let searchFrom = 0;
    return raw.map((r) => {
      if (r.start != null && r.end != null && r.end > 0) {
        searchFrom = r.end;
        return { ...r, start: r.start + charOffset, end: r.end + charOffset };
      }
      let word = r.word.replace(/^##/, "");
      const idx = chunk.indexOf(word, searchFrom);
      if (idx >= 0) {
        searchFrom = idx + word.length;
        return { ...r, start: idx + charOffset, end: idx + word.length + charOffset };
      }
      const lowerChunk = chunk.toLowerCase();
      const lowerIdx = lowerChunk.indexOf(word.toLowerCase(), searchFrom);
      if (lowerIdx >= 0) {
        searchFrom = lowerIdx + word.length;
        return { ...r, start: lowerIdx + charOffset, end: lowerIdx + word.length + charOffset };
      }
      return { ...r, start: searchFrom + charOffset, end: searchFrom + charOffset };
    });
  }
  aggregateBioTags(results, text) {
    const entities = [];
    let current = null;
    for (const r of results) {
      if (r.entity_group) {
        entities.push({
          text: text.slice(r.start, r.end),
          label: r.entity_group,
          start: r.start,
          end: r.end,
          score: r.score
        });
        continue;
      }
      const tag = r.entity;
      const dashIdx = tag.indexOf("-");
      let prefix;
      let label;
      if (dashIdx >= 0 && dashIdx <= 2) {
        prefix = tag.slice(0, dashIdx);
        label = tag.slice(dashIdx + 1);
      } else {
        prefix = "B";
        label = tag;
      }
      if (prefix === "B" || prefix === "S") {
        if (current) {
          entities.push(this.finalizeEntity(current, text));
        }
        current = { label, start: r.start, end: r.end, scores: [r.score] };
      } else if ((prefix === "I" || prefix === "E") && current && current.label === label) {
        current.end = r.end;
        current.scores.push(r.score);
      } else {
        if (current) {
          entities.push(this.finalizeEntity(current, text));
          current = null;
        }
      }
    }
    if (current) {
      entities.push(this.finalizeEntity(current, text));
    }
    return entities;
  }
  finalizeEntity(c, text) {
    const avgScore = c.scores.reduce((a, b) => a + b, 0) / c.scores.length;
    return {
      text: text.slice(c.start, c.end),
      label: c.label,
      start: c.start,
      end: c.end,
      score: avgScore
    };
  }
  isLoaded() {
    return this.pipeline !== null;
  }
};

// src/nlp/llm-nlp-engine.ts
var DEFAULT_ENTITY_TYPES = [
  "PERSON",
  "LOCATION",
  "ORGANIZATION",
  "DATE_TIME",
  "PHONE_NUMBER",
  "EMAIL_ADDRESS",
  "CREDIT_CARD",
  "US_SSN",
  "IBAN_CODE",
  "IP_ADDRESS",
  "URL",
  "PASSPORT",
  "NATIONAL_ID",
  "NATIONALITY"
];
function buildPrompt(text, entityTypes, language) {
  const langPrefix = language.toLowerCase().slice(0, 2);
  let contextInstruction;
  if (langPrefix === "fr") {
    contextInstruction = "The text is in French (possibly mixed with German, as in Swiss federal documents). Pay special attention to French and Swiss-French name formats, patronymics, transliterated names, addresses, IBAN numbers, and European phone numbers.";
  } else if (langPrefix === "de") {
    contextInstruction = "The text is in German (possibly mixed with French, as in Swiss federal documents). Pay special attention to German and Swiss-German name formats, patronymics, transliterated Eastern European names, addresses, IBAN numbers, and European phone numbers.";
  } else {
    contextInstruction = "The text may be in English, French, or German.";
  }
  let example1;
  if (langPrefix === "fr") {
    example1 = [
      "--- Example 1 ---",
      "Text to analyze:",
      '"""',
      "Conform\xE9ment \xE0 l'ordonnance du 25.02.2022, le D\xE9partement f\xE9d\xE9ral de l'\xE9conomie (DEFR) a inscrit M. Gennadi Nikola\xEFevitch Timtchenko, n\xE9 le 09.11.1952, de nationalit\xE9 finlandaise et russe, domicili\xE9 \xE0 Cologny (GE), sur la liste des personnes sanctionn\xE9es. Les avoirs d\xE9tenus aupr\xE8s de la Banque Cantonale de Gen\xE8ve, compte IBAN CH56 0483 5012 3456 7800 9, sont gel\xE9s. Contact: +41 22 310 45 67.",
      '"""',
      "Extracted PII:",
      "DATE_TIME|25.02.2022",
      "ORGANIZATION|D\xE9partement f\xE9d\xE9ral de l'\xE9conomie",
      "ORGANIZATION|DEFR",
      "PERSON|Gennadi Nikola\xEFevitch Timtchenko",
      "DATE_TIME|09.11.1952",
      "NATIONALITY|finlandaise",
      "NATIONALITY|russe",
      "LOCATION|Cologny",
      "ORGANIZATION|Banque Cantonale de Gen\xE8ve",
      "IBAN_CODE|CH56 0483 5012 3456 7800 9",
      "PHONE_NUMBER|+41 22 310 45 67"
    ].join("\n");
  } else if (langPrefix === "de") {
    example1 = [
      "--- Example 1 ---",
      "Text to analyze:",
      '"""',
      "Gest\xFCtzt auf die Verordnung vom 25.02.2022 hat das Staatssekretariat f\xFCr Wirtschaft (SECO) folgende Person in Anhang 8 aufgenommen: Alischer Burchanowitsch Usmanow (Aliase: Alisher Usmanov), geboren am 09.09.1953 in Tschust, Usbekistan, russischer Staatsangeh\xF6riger, Gesch\xE4ftsadresse: Prospekt Vernadskogo 37, Moskau, Russland. Reisepass-Nr. 753890412. Konto IBAN CH93 0076 2011 6238 5295 7 bei der Z\xFCrcher Kantonalbank. Tel. +41 44 123 45 67.",
      '"""',
      "Extracted PII:",
      "DATE_TIME|25.02.2022",
      "ORGANIZATION|Staatssekretariat f\xFCr Wirtschaft",
      "ORGANIZATION|SECO",
      "PERSON|Alischer Burchanowitsch Usmanow",
      "PERSON|Alisher Usmanov",
      "DATE_TIME|09.09.1953",
      "LOCATION|Tschust",
      "LOCATION|Usbekistan",
      "NATIONALITY|russischer",
      "LOCATION|Prospekt Vernadskogo 37, Moskau, Russland",
      "PASSPORT|753890412",
      "IBAN_CODE|CH93 0076 2011 6238 5295 7",
      "ORGANIZATION|Z\xFCrcher Kantonalbank",
      "PHONE_NUMBER|+41 44 123 45 67"
    ].join("\n");
  } else {
    example1 = [
      "--- Example 1 ---",
      "Text to analyze:",
      '"""',
      "The State Secretariat for Economic Affairs (SECO) has designated Viktor Vekselberg (aliases: Viktor F. Vekselberg), born 14 April 1957, Russian national, as a sanctioned person under Annex 8. Address: Renova Group, Z\xFCrich, Switzerland. Passport No. 723456789. Account IBAN CH93 0076 2011 6238 5295 7 at UBS AG. Contact: +41 44 123 45 67, info@renova.ch.",
      '"""',
      "Extracted PII:",
      "ORGANIZATION|State Secretariat for Economic Affairs",
      "ORGANIZATION|SECO",
      "PERSON|Viktor Vekselberg",
      "PERSON|Viktor F. Vekselberg",
      "DATE_TIME|14 April 1957",
      "NATIONALITY|Russian",
      "ORGANIZATION|Renova Group",
      "LOCATION|Z\xFCrich, Switzerland",
      "PASSPORT|723456789",
      "IBAN_CODE|CH93 0076 2011 6238 5295 7",
      "ORGANIZATION|UBS AG",
      "PHONE_NUMBER|+41 44 123 45 67",
      "EMAIL_ADDRESS|info@renova.ch"
    ].join("\n");
  }
  const example2 = [
    "--- Example 2 ---",
    "Text to analyze:",
    '"""',
    langPrefix === "fr" ? "Les mesures de gel des avoirs s'appliquent conform\xE9ment \xE0 l'art. 15a al. 2 de la loi sur les embargos (LEmb; RS 946.231)." : langPrefix === "de" ? "Die Massnahmen zur Sperrung von Verm\xF6genswerten gelten gem\xE4ss Art. 15a Abs. 2 des Embargogesetzes (EmbG; SR 946.231)." : "Asset freezing measures apply pursuant to Art. 15a para. 2 of the Embargo Act (EmbA; SR 946.231).",
    '"""',
    "Extracted PII:",
    "NONE"
  ].join("\n");
  return [
    "You are an expert compliance and sanctions screening system used by a government sanctions office. Your task is to extract all Personally Identifiable Information (PII) and entity references from the given text.",
    "",
    contextInstruction,
    "",
    "You must identify entities of the following types:",
    entityTypes.join(", "),
    "",
    "Extraction guidelines:",
    '- PERSON: Full names including patronymics (e.g. "Alischer Burchanowitsch Usmanow"). Also extract each alias or alternate spelling as a separate PERSON entry.',
    '- ORGANIZATION: Company names, government bodies, banks, abbreviations (e.g. "SECO"). Extract both the full name and the abbreviation as separate entries if both appear.',
    "- LOCATION: Cities, countries, full addresses. For multi-part addresses, extract the full address as one entity.",
    '- DATE_TIME: All dates in any format (DD.MM.YYYY, "14. M\xE4rz 2022", year-only like "1953").',
    "- IBAN_CODE: Full IBAN numbers including spaces.",
    "- PASSPORT: Passport numbers, Reisepass-Nr., num\xE9ro de passeport.",
    "- NATIONAL_ID: National ID numbers, AHV/AVS numbers, Swiss UID (CHE-xxx.xxx.xxx).",
    '- NATIONALITY: Nationality references (e.g. "russischer Staatsangeh\xF6riger", "de nationalit\xE9 russe", "Russian").',
    "- Do NOT extract legal article references (Art. 2 Abs. 1), law names, or SR/RS numbers as entities.",
    '- Do NOT extract generic words like "Person", "Anhang", "Liste" unless they are part of a named entity.',
    "",
    "Output format:",
    "Return each extracted entity on a new line using exactly this format: TYPE|EXACT_TEXT",
    "",
    "Rules:",
    "1. TYPE must be one of the exact types listed above.",
    "2. EXACT_TEXT must be a verbatim substring copied character-for-character from the input text.",
    "3. Do not include any other text, conversational filler, markdown formatting, or numbering.",
    "4. If no PII is found, output exactly: NONE",
    "",
    example1,
    "",
    example2,
    "",
    "--- Real Task ---",
    "Text to analyze:",
    '"""',
    text,
    '"""',
    "Extracted PII:"
  ].join("\n");
}
function parseResponse(response, text, entityTypes) {
  const entities = [];
  const typeSet = new Set(entityTypes);
  const sanitizedResponse = response.replace(/```[a-zA-Z]*\n?/g, "").replace(/```/g, "");
  const lines = sanitizedResponse.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "NONE") continue;
    const pipeIdx = trimmed.indexOf("|");
    if (pipeIdx < 0) continue;
    const type = trimmed.slice(0, pipeIdx).trim();
    const extractedText = trimmed.slice(pipeIdx + 1).trim();
    if (!typeSet.has(type) || !extractedText) continue;
    let searchFrom = 0;
    while (true) {
      const idx = text.indexOf(extractedText, searchFrom);
      if (idx < 0) break;
      const alreadyFound = entities.some(
        (e) => e.start === idx && e.end === idx + extractedText.length && e.label === type
      );
      if (!alreadyFound) {
        entities.push({
          text: extractedText,
          label: type,
          start: idx,
          end: idx + extractedText.length,
          score: 0.85
        });
      }
      searchFrom = idx + 1;
    }
  }
  return entities;
}
var LlmNlpEngine = class {
  generate;
  entityTypes;
  constructor(opts) {
    this.generate = opts.generate;
    this.entityTypes = opts.entityTypes ?? DEFAULT_ENTITY_TYPES;
  }
  async process(text, language) {
    const prompt = buildPrompt(text, this.entityTypes, language);
    const messages = [
      {
        role: "system",
        content: "You are a strict automated PII extraction tool used by a government sanctions office. You only output structured data in the exact requested format. You must catch every person name, alias, organization, location, date, financial identifier, and document number. Do not converse or add explanations."
      },
      { role: "user", content: prompt }
    ];
    const generated = await this.generate(messages);
    const entities = parseResponse(generated, text, this.entityTypes);
    const tokens = [];
    const tokenSpans = [];
    const tokenRegex = /\S+/g;
    let match;
    while ((match = tokenRegex.exec(text)) !== null) {
      tokens.push(match[0]);
      tokenSpans.push({
        start: match.index,
        end: match.index + match[0].length
      });
    }
    return { entities, tokens, tokenSpans, language };
  }
  isLoaded() {
    return true;
  }
};

export { LlmNlpEngine, NullNlpEngine, TransformersNlpEngine };
//# sourceMappingURL=chunk-ADRGCLEA.js.map
//# sourceMappingURL=chunk-ADRGCLEA.js.map