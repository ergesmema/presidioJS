'use strict';

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

// src/anonymizer/operators/replace.ts
var ReplaceOperator = class {
  operatorName = "replace";
  operate(text, params) {
    const newValue = params.newValue;
    const entityType = params.entityType;
    return newValue ?? `<${entityType ?? "REDACTED"}>`;
  }
};

// src/anonymizer/operators/redact.ts
var RedactOperator = class {
  operatorName = "redact";
  operate(_text, _params) {
    return "";
  }
};

// src/anonymizer/operators/mask.ts
var MaskOperator = class {
  operatorName = "mask";
  operate(text, params) {
    const maskingChar = params.maskingChar ?? "*";
    const charsToMask = params.charsToMask ?? text.length;
    const fromEnd = params.fromEnd ?? false;
    const count = Math.min(charsToMask, text.length);
    if (fromEnd) {
      return text.slice(0, text.length - count) + maskingChar.repeat(count);
    }
    return maskingChar.repeat(count) + text.slice(count);
  }
};

// src/anonymizer/operators/hash.ts
var HashOperator = class {
  operatorName = "hash";
  async operate(text, params) {
    const algorithm = params.hashType ?? "SHA-256";
    if (typeof globalThis.crypto?.subtle?.digest === "function") {
      const data = new TextEncoder().encode(text);
      const hashBuffer = await crypto.subtle.digest(algorithm, data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char | 0;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }
};

// src/anonymizer/operators/encrypt.ts
var EncryptOperator = class {
  operatorName = "encrypt";
  async operate(text, params) {
    const keyHex = params.key;
    if (!keyHex) throw new Error('EncryptOperator requires a "key" parameter');
    const keyBytes = hexToBytes(keyHex);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes.buffer,
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(text);
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      data.buffer
    );
    const ivHex = bytesToHex(iv);
    const ctHex = bytesToHex(new Uint8Array(encrypted));
    return `${ivHex}:${ctHex}`;
  }
};
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// src/anonymizer/operators/keep.ts
var KeepOperator = class {
  operatorName = "keep";
  operate(text, _params) {
    return text;
  }
};

// src/anonymizer/anonymizer-engine.ts
var AnonymizerEngine = class {
  operators;
  constructor() {
    this.operators = /* @__PURE__ */ new Map();
    const defaults = [
      new ReplaceOperator(),
      new RedactOperator(),
      new MaskOperator(),
      new HashOperator(),
      new EncryptOperator(),
      new KeepOperator()
    ];
    for (const op of defaults) {
      this.operators.set(op.operatorName, op);
    }
  }
  addOperator(operator) {
    this.operators.set(operator.operatorName, operator);
  }
  async anonymize(text, analyzerResults, operatorConfigs) {
    const sorted = [...analyzerResults].sort((a, b) => b.start - a.start);
    let result = text;
    const items = [];
    for (const ar of sorted) {
      const config = operatorConfigs?.[ar.entityType] ?? operatorConfigs?.["DEFAULT"] ?? { type: "replace" };
      const operator = this.operators.get(config.type);
      if (!operator) {
        throw new Error(`Unknown operator: ${config.type}`);
      }
      const original = result.slice(ar.start, ar.end);
      const params = {
        ...config.params ?? {},
        entityType: ar.entityType
      };
      const replacement = await operator.operate(original, params);
      result = result.slice(0, ar.start) + replacement + result.slice(ar.end);
      items.push({
        start: ar.start,
        end: ar.start + replacement.length,
        entityType: ar.entityType,
        operator: config.type,
        text: replacement
      });
    }
    return { text: result, items: items.reverse() };
  }
};

exports.AhvRecognizer = AhvRecognizer;
exports.AnalyzerEngine = AnalyzerEngine;
exports.AnonymizerEngine = AnonymizerEngine;
exports.ContextAwareEnhancer = ContextAwareEnhancer;
exports.CreditCardRecognizer = CreditCardRecognizer;
exports.CryptoRecognizer = CryptoRecognizer;
exports.DateRecognizer = DateRecognizer;
exports.EmailRecognizer = EmailRecognizer;
exports.EncryptOperator = EncryptOperator;
exports.EntityRecognizer = EntityRecognizer;
exports.EuDateRecognizer = EuDateRecognizer;
exports.HashOperator = HashOperator;
exports.IbanRecognizer = IbanRecognizer;
exports.IpRecognizer = IpRecognizer;
exports.KeepOperator = KeepOperator;
exports.LlmNlpEngine = LlmNlpEngine;
exports.MaskOperator = MaskOperator;
exports.NullNlpEngine = NullNlpEngine;
exports.PatternRecognizer = PatternRecognizer;
exports.PhoneRecognizer = PhoneRecognizer;
exports.RecognizerRegistry = RecognizerRegistry;
exports.RedactOperator = RedactOperator;
exports.ReplaceOperator = ReplaceOperator;
exports.SsnRecognizer = SsnRecognizer;
exports.SwissPhoneRecognizer = SwissPhoneRecognizer;
exports.SwissUidRecognizer = SwissUidRecognizer;
exports.TransformersNerRecognizer = TransformersNerRecognizer;
exports.TransformersNlpEngine = TransformersNlpEngine;
exports.UrlRecognizer = UrlRecognizer;
exports.UsBankRecognizer = UsBankRecognizer;
exports.UsItinRecognizer = UsItinRecognizer;
exports.UsPassportRecognizer = UsPassportRecognizer;
exports.createResult = createResult;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map