import { NullNlpEngine } from './chunk-ADRGCLEA.js';
export { LlmNlpEngine, NullNlpEngine, TransformersNlpEngine } from './chunk-ADRGCLEA.js';
export { AnonymizerEngine, EncryptOperator, HashOperator, KeepOperator, MaskOperator, RedactOperator, ReplaceOperator } from './chunk-G5LTOJJD.js';

// src/analyzer/entity-recognizer.ts
var EntityRecognizer = class {
  name;
  supportedEntities;
  supportedLanguage;
  context;
  constructor(opts) {
    this.name = opts.name;
    this.supportedEntities = opts.supportedEntities;
    this.supportedLanguage = opts.supportedLanguage ?? "any";
    this.context = opts.context ?? [];
  }
  getSuportedEntities() {
    return this.supportedEntities;
  }
};

// src/analyzer/recognizer-result.ts
function createResult(entityType, start, end, score, recognizerName, analysisExplanation) {
  return { entityType, start, end, score, recognizerName, analysisExplanation };
}

// src/analyzer/pattern-recognizer.ts
var PatternRecognizer = class extends EntityRecognizer {
  patterns;
  denyList;
  denyListScore;
  constructor(opts) {
    super(opts);
    this.patterns = opts.patterns ?? [];
    this.denyList = opts.denyList ?? [];
    this.denyListScore = opts.denyListScore ?? 1;
  }
  analyze(text, entities, _nlpArtifacts) {
    const results = [];
    for (const pattern of this.patterns) {
      const regex = new RegExp(pattern.regex, "gi");
      let match;
      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        let score = pattern.score;
        const validated = this.validateResult(match[0], start, end, text);
        if (validated === false) continue;
        if (validated === true) score = Math.max(score, 0.85);
        results.push(
          createResult(
            this.supportedEntities[0],
            start,
            end,
            score,
            this.name,
            {
              recognizer: this.name,
              patternName: pattern.name,
              patternLength: pattern.regex.length,
              originalScore: pattern.score,
              score,
              scoreContextImprovement: 0,
              validationResult: validated ?? void 0
            }
          )
        );
      }
    }
    if (this.denyList.length > 0) {
      const denyPattern = this.denyList.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
      const regex = new RegExp(`\\b(?:${denyPattern})\\b`, "gi");
      let match;
      while ((match = regex.exec(text)) !== null) {
        results.push(
          createResult(
            this.supportedEntities[0],
            match.index,
            match.index + match[0].length,
            this.denyListScore,
            this.name
          )
        );
      }
    }
    return results;
  }
  /**
   * Override to validate a match. Return true to boost score, false to reject, null to keep as-is.
   */
  validateResult(_matchText, _start, _end, _fullText) {
    return null;
  }
};

// src/utils/luhn.ts
function luhnCheck(num) {
  const digits = num.replace(/\D/g, "");
  if (digits.length === 0) return false;
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

// src/recognizers/credit-card-recognizer.ts
var CreditCardRecognizer = class extends PatternRecognizer {
  constructor() {
    super({
      name: "CreditCardRecognizer",
      supportedEntities: ["CREDIT_CARD"],
      patterns: [
        { name: "credit_card", regex: "\\b(?:\\d[ -]*?){13,19}\\b", score: 0.5 }
      ],
      context: [
        "credit",
        "card",
        "visa",
        "mastercard",
        "amex",
        "american express",
        "discover",
        "diners",
        "jcb",
        "cc",
        "debit",
        "payment"
      ]
    });
  }
  validateResult(matchText) {
    const digits = matchText.replace(/\D/g, "");
    if (digits.length < 12 || digits.length > 19) return false;
    return luhnCheck(digits) ? true : false;
  }
};

// src/recognizers/email-recognizer.ts
var EmailRecognizer = class extends PatternRecognizer {
  constructor() {
    super({
      name: "EmailRecognizer",
      supportedEntities: ["EMAIL_ADDRESS"],
      patterns: [
        {
          name: "email",
          regex: "\\b[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}\\b",
          score: 1
        }
      ],
      context: ["email", "e-mail", "mail", "address"]
    });
  }
};

// src/recognizers/phone-recognizer.ts
var PhoneRecognizer = class extends PatternRecognizer {
  constructor() {
    super({
      name: "PhoneRecognizer",
      supportedEntities: ["PHONE_NUMBER"],
      patterns: [
        {
          name: "phone_us",
          regex: "(?:\\+?1[\\s.-]?)?\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}",
          score: 0.5
        },
        {
          name: "phone_intl",
          regex: "\\+\\d{1,3}[\\s.-]?\\d{1,4}[\\s.-]?\\d{1,4}[\\s.-]?\\d{1,9}",
          score: 0.5
        }
      ],
      context: [
        "phone",
        "telephone",
        "tel",
        "call",
        "mobile",
        "cell",
        "fax",
        "contact",
        "number"
      ]
    });
  }
  validateResult(matchText) {
    const digits = matchText.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 16) return false;
    if (/^0{7,}$/.test(digits)) return false;
    return null;
  }
};

// src/recognizers/ssn-recognizer.ts
var SsnRecognizer = class extends PatternRecognizer {
  constructor() {
    super({
      name: "UsSsnRecognizer",
      supportedEntities: ["US_SSN"],
      patterns: [
        {
          name: "ssn_with_dashes",
          regex: "\\b\\d{3}-\\d{2}-\\d{4}\\b",
          score: 0.85
        },
        {
          name: "ssn_no_dashes",
          regex: "\\b\\d{9}\\b",
          score: 0.3
        }
      ],
      context: [
        "social",
        "security",
        "ssn",
        "social security number",
        "taxpayer",
        "tax",
        "tin"
      ]
    });
  }
  validateResult(matchText) {
    const digits = matchText.replace(/\D/g, "");
    if (digits.length !== 9) return false;
    const area = parseInt(digits.slice(0, 3), 10);
    const group = parseInt(digits.slice(3, 5), 10);
    const serial = parseInt(digits.slice(5, 9), 10);
    if (area === 0 || area === 666 || area >= 900) return false;
    if (group === 0) return false;
    if (serial === 0) return false;
    return null;
  }
};

// src/recognizers/url-recognizer.ts
var UrlRecognizer = class extends PatternRecognizer {
  constructor() {
    super({
      name: "UrlRecognizer",
      supportedEntities: ["URL"],
      patterns: [
        {
          name: "url",
          regex: "(?:https?://|www\\.)[\\w\\-]+(?:\\.[\\w\\-]+)+(?:/[\\w\\-.~:/?#\\[\\]@!$&'()*+,;=%]*)?",
          score: 0.5
        }
      ],
      context: ["url", "website", "link", "site", "href", "http"]
    });
  }
  validateResult(matchText) {
    if (matchText.startsWith("http://") || matchText.startsWith("https://")) {
      return true;
    }
    return null;
  }
};

// src/recognizers/ip-recognizer.ts
var IpRecognizer = class extends PatternRecognizer {
  constructor() {
    super({
      name: "IpRecognizer",
      supportedEntities: ["IP_ADDRESS"],
      patterns: [
        {
          name: "ipv4",
          regex: "\\b(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b",
          score: 0.6
        },
        {
          name: "ipv6",
          regex: "\\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\\b",
          score: 0.6
        }
      ],
      context: ["ip", "address", "ipv4", "ipv6", "network", "host"]
    });
  }
};

// src/recognizers/iban-recognizer.ts
var IBAN_LENGTHS = {
  AL: 28,
  AD: 24,
  AT: 20,
  AZ: 28,
  BH: 22,
  BY: 28,
  BE: 16,
  BA: 20,
  BR: 29,
  BG: 22,
  CR: 22,
  HR: 21,
  CY: 28,
  CZ: 24,
  DK: 18,
  DO: 28,
  EG: 29,
  SV: 28,
  EE: 20,
  FO: 18,
  FI: 18,
  FR: 27,
  GE: 22,
  DE: 22,
  GI: 23,
  GR: 27,
  GL: 18,
  GT: 28,
  HU: 28,
  IS: 26,
  IQ: 23,
  IE: 22,
  IL: 23,
  IT: 27,
  JO: 30,
  KZ: 20,
  XK: 20,
  KW: 30,
  LV: 21,
  LB: 28,
  LI: 21,
  LT: 20,
  LU: 20,
  MT: 31,
  MR: 27,
  MU: 30,
  MC: 27,
  MD: 24,
  ME: 22,
  NL: 18,
  MK: 19,
  NO: 15,
  PK: 24,
  PS: 29,
  PL: 28,
  PT: 25,
  QA: 29,
  RO: 24,
  LC: 32,
  SM: 27,
  SA: 24,
  RS: 22,
  SC: 31,
  SK: 24,
  SI: 19,
  ES: 24,
  SE: 24,
  CH: 21,
  TL: 23,
  TN: 24,
  TR: 26,
  UA: 29,
  AE: 23,
  GB: 22,
  VA: 22,
  VG: 24
};
function validateIban(iban) {
  const cleaned = iban.replace(/\s/g, "").toUpperCase();
  const country = cleaned.slice(0, 2);
  if (IBAN_LENGTHS[country] && cleaned.length !== IBAN_LENGTHS[country]) return false;
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  let numStr = "";
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      numStr += (code - 55).toString();
    } else {
      numStr += ch;
    }
  }
  let remainder = 0;
  for (let i = 0; i < numStr.length; i++) {
    remainder = (remainder * 10 + parseInt(numStr[i], 10)) % 97;
  }
  return remainder === 1;
}
var IbanRecognizer = class extends PatternRecognizer {
  constructor() {
    super({
      name: "IbanRecognizer",
      supportedEntities: ["IBAN_CODE"],
      patterns: [
        {
          name: "iban",
          regex: "\\b[A-Z]{2}\\d{2}[\\s]?[A-Za-z0-9]{4}(?:[\\s]?[A-Za-z0-9]{4}){2,7}(?:[\\s]?[A-Za-z0-9]{1,4})?\\b",
          score: 0.5
        }
      ],
      context: ["iban", "bank", "account", "swift", "bic", "international"]
    });
  }
  validateResult(matchText) {
    return validateIban(matchText) ? true : false;
  }
};

// src/recognizers/crypto-recognizer.ts
var CryptoRecognizer = class extends PatternRecognizer {
  constructor() {
    super({
      name: "CryptoRecognizer",
      supportedEntities: ["CRYPTO"],
      patterns: [
        {
          name: "bitcoin",
          regex: "\\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\\b",
          score: 0.5
        },
        {
          name: "bitcoin_bech32",
          regex: "\\bbc1[ac-hj-np-zAC-HJ-NP-Z02-9]{11,71}\\b",
          score: 0.5
        },
        {
          name: "ethereum",
          regex: "\\b0x[0-9a-fA-F]{40}\\b",
          score: 0.5
        }
      ],
      context: ["bitcoin", "btc", "ethereum", "eth", "crypto", "wallet", "address"]
    });
  }
};

// src/recognizers/date-recognizer.ts
var DateRecognizer = class extends PatternRecognizer {
  constructor() {
    super({
      name: "DateRecognizer",
      supportedEntities: ["DATE_TIME"],
      patterns: [
        {
          name: "date_iso",
          regex: "\\b\\d{4}-\\d{2}-\\d{2}\\b",
          score: 0.6
        },
        {
          name: "date_us",
          regex: "\\b(?:0?[1-9]|1[0-2])/(?:0?[1-9]|[12]\\d|3[01])/(?:\\d{2}|\\d{4})\\b",
          score: 0.5
        },
        {
          name: "date_eu",
          regex: "\\b(?:0?[1-9]|[12]\\d|3[01])\\.(?:0?[1-9]|1[0-2])\\.(?:\\d{2}|\\d{4})\\b",
          score: 0.5
        },
        {
          name: "date_text",
          regex: "\\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s*\\d{2,4}\\b",
          score: 0.6
        }
      ],
      context: ["date", "born", "birthday", "dob", "birth"]
    });
  }
};

// src/recognizers/us-bank-recognizer.ts
var UsBankRecognizer = class extends PatternRecognizer {
  constructor() {
    super({
      name: "UsBankRecognizer",
      supportedEntities: ["US_BANK_NUMBER"],
      patterns: [
        {
          name: "us_bank_number",
          regex: "\\b\\d{8,17}\\b",
          score: 0.05
        }
      ],
      context: [
        "bank",
        "account",
        "routing",
        "checking",
        "savings",
        "account number",
        "acct"
      ]
    });
  }
};

// src/recognizers/us-itin-recognizer.ts
var UsItinRecognizer = class extends PatternRecognizer {
  constructor() {
    super({
      name: "UsItinRecognizer",
      supportedEntities: ["US_ITIN"],
      patterns: [
        {
          name: "itin_dashes",
          regex: "\\b9\\d{2}-[7-9]\\d-\\d{4}\\b",
          score: 0.85
        },
        {
          name: "itin_no_dashes",
          regex: "\\b9\\d{2}[7-9]\\d{5}\\b",
          score: 0.3
        }
      ],
      context: ["itin", "tax", "taxpayer", "individual", "identification"]
    });
  }
};

// src/recognizers/us-passport-recognizer.ts
var UsPassportRecognizer = class extends PatternRecognizer {
  constructor() {
    super({
      name: "UsPassportRecognizer",
      supportedEntities: ["US_PASSPORT"],
      patterns: [
        {
          name: "us_passport",
          regex: "\\b[A-Z]?\\d{8,9}\\b",
          score: 0.1
        }
      ],
      context: ["passport", "travel", "document", "us passport"]
    });
  }
};

// src/recognizers/transformers-ner-recognizer.ts
var LABEL_MAP = {
  PER: "PERSON",
  LOC: "LOCATION",
  ORG: "ORGANIZATION",
  MISC: "NRP"
};
var TransformersNerRecognizer = class extends EntityRecognizer {
  constructor() {
    super({
      name: "TransformersNerRecognizer",
      supportedEntities: [
        "PERSON",
        "LOCATION",
        "ORGANIZATION",
        "NRP",
        "DATE_TIME",
        "PHONE_NUMBER",
        "EMAIL_ADDRESS",
        "CREDIT_CARD",
        "US_SSN",
        "IBAN_CODE",
        "IP_ADDRESS",
        "URL",
        "CRYPTO",
        "US_PASSPORT",
        "US_ITIN",
        "US_BANK_NUMBER"
      ]
    });
  }
  analyze(_text, entities, nlpArtifacts) {
    const results = [];
    for (const entity of nlpArtifacts.entities) {
      const mapped = LABEL_MAP[entity.label] ?? entity.label;
      if (entities.length > 0 && !entities.includes(mapped)) continue;
      results.push(
        createResult(mapped, entity.start, entity.end, entity.score, this.name)
      );
    }
    return results;
  }
};

// src/recognizers/ahv-recognizer.ts
var AhvRecognizer = class extends PatternRecognizer {
  constructor() {
    super({
      name: "AhvRecognizer",
      supportedEntities: ["CH_AHV"],
      patterns: [
        {
          name: "ahv_dotted",
          regex: "\\b756\\.\\d{4}\\.\\d{4}\\.\\d{2}\\b",
          score: 0.9
        },
        {
          name: "ahv_no_dots",
          regex: "\\b756\\d{10}\\b",
          score: 0.4
        }
      ],
      context: [
        "ahv",
        "avs",
        "sozialversicherung",
        "assurance",
        "sociale",
        "versichertennummer",
        "num\xE9ro",
        "assur\xE9"
      ]
    });
  }
  validateResult(matchText) {
    const digits = matchText.replace(/\D/g, "");
    if (digits.length !== 13) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(digits[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - sum % 10) % 10;
    return check === parseInt(digits[12], 10) ? null : false;
  }
};

// src/recognizers/swiss-uid-recognizer.ts
var SwissUidRecognizer = class extends PatternRecognizer {
  constructor() {
    super({
      name: "SwissUidRecognizer",
      supportedEntities: ["CH_UID"],
      patterns: [
        {
          name: "uid_dotted",
          regex: "\\bCHE-?\\d{3}\\.\\d{3}\\.\\d{3}\\b",
          score: 0.95
        },
        {
          name: "uid_no_dots",
          regex: "\\bCHE-?\\d{9}\\b",
          score: 0.7
        }
      ],
      context: [
        "uid",
        "handelsregister",
        "registre",
        "commerce",
        "unternehmens",
        "identifikationsnummer",
        "firma",
        "soci\xE9t\xE9",
        "company"
      ]
    });
  }
};

// src/recognizers/eu-date-recognizer.ts
var EuDateRecognizer = class extends PatternRecognizer {
  constructor() {
    super({
      name: "EuDateRecognizer",
      supportedEntities: ["DATE_TIME"],
      patterns: [
        {
          name: "eu_date_full",
          regex: "\\b(?:0?[1-9]|[12]\\d|3[01])[\\./\\-](?:0?[1-9]|1[0-2])[\\./\\-](?:19|20)\\d{2}\\b",
          score: 0.8
        },
        {
          name: "german_date_written",
          regex: "\\b(?:0?[1-9]|[12]\\d|3[01])\\.\\s*(?:Januar|Februar|M\xE4rz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\\s+(?:19|20)\\d{2}\\b",
          score: 0.9
        },
        {
          name: "french_date_written",
          regex: "\\b(?:0?[1-9]|[12]\\d|3[01])\\s+(?:janvier|f\xE9vrier|mars|avril|mai|juin|juillet|ao\xFBt|septembre|octobre|novembre|d\xE9cembre)\\s+(?:19|20)\\d{2}\\b",
          score: 0.9
        }
      ],
      context: [
        "geboren",
        "geburtsdatum",
        "datum",
        "date",
        "n\xE9",
        "n\xE9e",
        "naissance",
        "gelistet",
        "verf\xFCgung",
        "d\xE9cision"
      ]
    });
  }
};

// src/recognizers/swiss-phone-recognizer.ts
var SwissPhoneRecognizer = class extends PatternRecognizer {
  constructor() {
    super({
      name: "SwissPhoneRecognizer",
      supportedEntities: ["PHONE_NUMBER"],
      patterns: [
        {
          name: "swiss_intl",
          regex: "\\+41\\s?\\d{2}\\s?\\d{3}\\s?\\d{2}\\s?\\d{2}\\b",
          score: 0.9
        },
        {
          name: "swiss_local",
          regex: "\\b0\\d{2}\\s?\\d{3}\\s?\\d{2}\\s?\\d{2}\\b",
          score: 0.6
        },
        {
          name: "german_intl",
          regex: "\\+49\\s?\\d{2,5}[\\s/]\\d{3,8}(?:[\\s-]\\d{1,5})?\\b",
          score: 0.85
        },
        {
          name: "french_intl",
          regex: "\\+33\\s?\\d\\s?\\d{2}\\s?\\d{2}\\s?\\d{2}\\s?\\d{2}\\b",
          score: 0.85
        },
        {
          name: "french_local",
          regex: "\\b0[1-9]\\s?\\d{2}\\s?\\d{2}\\s?\\d{2}\\s?\\d{2}\\b",
          score: 0.5
        }
      ],
      context: [
        "tel",
        "telefon",
        "phone",
        "t\xE9l\xE9phone",
        "anruf",
        "appel",
        "erreichbar",
        "kontakt",
        "contact",
        "fax",
        "mobil",
        "mobile"
      ]
    });
  }
};

// src/analyzer/recognizer-registry.ts
var RecognizerRegistry = class _RecognizerRegistry {
  recognizers = [];
  addRecognizer(recognizer) {
    this.recognizers.push(recognizer);
  }
  removeRecognizer(name) {
    this.recognizers = this.recognizers.filter((r) => r.name !== name);
  }
  getRecognizers(language, entities) {
    return this.recognizers.filter((r) => {
      if (r.supportedLanguage !== language && r.supportedLanguage !== "any") return false;
      if (entities && entities.length > 0) {
        return r.supportedEntities.some((e) => entities.includes(e));
      }
      return true;
    });
  }
  getSupportedEntities(language) {
    const entities = /* @__PURE__ */ new Set();
    for (const r of this.getRecognizers(language)) {
      for (const e of r.supportedEntities) entities.add(e);
    }
    return [...entities];
  }
  loadPredefinedRecognizers(nlpEngine) {
    this.recognizers.push(
      new CreditCardRecognizer(),
      new EmailRecognizer(),
      new PhoneRecognizer(),
      new SsnRecognizer(),
      new UrlRecognizer(),
      new IpRecognizer(),
      new IbanRecognizer(),
      new CryptoRecognizer(),
      new DateRecognizer(),
      new UsBankRecognizer(),
      new UsItinRecognizer(),
      new UsPassportRecognizer(),
      new AhvRecognizer(),
      new SwissUidRecognizer(),
      new EuDateRecognizer(),
      new SwissPhoneRecognizer()
    );
    if (nlpEngine && nlpEngine.constructor.name !== "NullNlpEngine") {
      this.recognizers.push(new TransformersNerRecognizer());
    }
  }
  static withAllRecognizers(nlpEngine) {
    const registry = new _RecognizerRegistry();
    registry.loadPredefinedRecognizers(nlpEngine);
    return registry;
  }
  static withPatternRecognizers() {
    const registry = new _RecognizerRegistry();
    registry.loadPredefinedRecognizers();
    return registry;
  }
};

// src/analyzer/context-aware-enhancer.ts
var SUFFIXES = ["ing", "ed", "ly", "er", "est", "tion", "sion", "ment", "ness", "s"];
function simpleStem(word) {
  const lower = word.toLowerCase();
  for (const suffix of SUFFIXES) {
    if (lower.endsWith(suffix) && lower.length > suffix.length + 2) {
      return lower.slice(0, -suffix.length);
    }
  }
  return lower;
}
var ContextAwareEnhancer = class {
  contextWindowSize;
  contextBoost;
  constructor(opts) {
    this.contextWindowSize = opts?.contextWindowSize ?? 5;
    this.contextBoost = opts?.contextBoost ?? 0.35;
  }
  enhance(results, recognizers, nlpArtifacts, text) {
    const recognizerMap = /* @__PURE__ */ new Map();
    for (const r of recognizers) {
      recognizerMap.set(r.name, r);
    }
    return results.map((result) => {
      const recognizer = recognizerMap.get(result.recognizerName);
      if (!recognizer || recognizer.context.length === 0) return result;
      const contextWords = recognizer.context.map(simpleStem);
      const surroundingTokens = this.getSurroundingTokens(
        result,
        nlpArtifacts
      );
      for (const token of surroundingTokens) {
        const stemmed = simpleStem(token);
        if (contextWords.some((cw) => stemmed.includes(cw) || cw.includes(stemmed))) {
          const boosted = Math.min(result.score + this.contextBoost, 1);
          return {
            ...result,
            score: boosted,
            analysisExplanation: result.analysisExplanation ? {
              ...result.analysisExplanation,
              score: boosted,
              scoreContextImprovement: boosted - result.score,
              supportiveContextWord: token
            } : void 0
          };
        }
      }
      return result;
    });
  }
  getSurroundingTokens(result, artifacts) {
    const tokens = [];
    for (let i = 0; i < artifacts.tokens.length; i++) {
      const span = artifacts.tokenSpans[i];
      if (!span) continue;
      const distance = Math.min(
        Math.abs(span.start - result.end),
        Math.abs(span.end - result.start)
      );
      if (span.end <= result.start || span.start >= result.end) {
        if (distance <= 50) {
          tokens.push(artifacts.tokens[i]);
        }
      }
    }
    return tokens;
  }
};

// src/utils/conflict-resolution.ts
function resolveConflicts(results) {
  if (results.length <= 1) return results;
  const sorted = [...results].sort((a, b) => a.start - b.start || b.end - a.end);
  const resolved = [];
  for (const current of sorted) {
    const last = resolved[resolved.length - 1];
    if (!last || current.start >= last.end) {
      resolved.push(current);
    } else {
      if (current.score > last.score) {
        resolved[resolved.length - 1] = current;
      } else if (current.score === last.score && current.entityType === last.entityType) {
        resolved[resolved.length - 1] = {
          ...last,
          end: Math.max(last.end, current.end)
        };
      }
    }
  }
  return resolved;
}
function filterByThreshold(results, threshold) {
  return results.filter((r) => r.score >= threshold);
}
function filterByAllowList(results, text, allowList) {
  if (allowList.length === 0) return results;
  const allowSet = new Set(allowList.map((s) => s.toLowerCase()));
  return results.filter((r) => {
    const matched = text.slice(r.start, r.end).toLowerCase();
    return !allowSet.has(matched);
  });
}

// src/analyzer/analyzer-engine.ts
var AnalyzerEngine = class {
  registry;
  nlpEngine;
  enhancer;
  defaultScoreThreshold;
  constructor(opts = {}) {
    this.nlpEngine = opts.nlpEngine ?? new NullNlpEngine();
    this.registry = opts.registry ?? RecognizerRegistry.withAllRecognizers(this.nlpEngine);
    this.enhancer = new ContextAwareEnhancer();
    this.defaultScoreThreshold = opts.defaultScoreThreshold ?? 0;
  }
  async analyze(text, opts = {}) {
    const language = opts.language ?? "en";
    const threshold = opts.scoreThreshold ?? this.defaultScoreThreshold;
    if (opts.adHocRecognizers) {
      for (const config of opts.adHocRecognizers) {
        this.registry.addRecognizer(
          new PatternRecognizer({
            name: config.name,
            supportedEntities: config.supportedEntities,
            patterns: config.patterns,
            denyList: config.denyList,
            supportedLanguage: config.supportedLanguage,
            context: config.context
          })
        );
      }
    }
    const recognizers = this.registry.getRecognizers(language, opts.entities);
    if (recognizers.length === 0) return [];
    const nlpArtifacts = await this.nlpEngine.process(text, language);
    let results = [];
    for (const recognizer of recognizers) {
      const recognized = recognizer.analyze(text, opts.entities ?? [], nlpArtifacts);
      results.push(...recognized);
    }
    results = this.enhancer.enhance(results, recognizers, nlpArtifacts, text);
    results = filterByThreshold(results, threshold);
    if (opts.allowList) {
      results = filterByAllowList(results, text, opts.allowList);
    }
    results = resolveConflicts(results);
    return results;
  }
  getSupportedEntities(language) {
    return this.registry.getSupportedEntities(language ?? "en");
  }
};

export { AhvRecognizer, AnalyzerEngine, ContextAwareEnhancer, CreditCardRecognizer, CryptoRecognizer, DateRecognizer, EmailRecognizer, EntityRecognizer, EuDateRecognizer, IbanRecognizer, IpRecognizer, PatternRecognizer, PhoneRecognizer, RecognizerRegistry, SsnRecognizer, SwissPhoneRecognizer, SwissUidRecognizer, TransformersNerRecognizer, UrlRecognizer, UsBankRecognizer, UsItinRecognizer, UsPassportRecognizer, createResult };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map