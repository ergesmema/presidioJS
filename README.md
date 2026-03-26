# PresidioJS

Browser-native PII detection and anonymization, inspired by [Microsoft Presidio](https://github.com/microsoft/presidio). Runs **100% client-side** — no data ever leaves the user's device.

**[Live Demo](https://ergesmema.github.io/presidioJS/examples/browser-demo.html)**

## What it does

- Detects personally identifiable information (PII) in text using NER (Named Entity Recognition) via [Transformers.js](https://github.com/huggingface/transformers.js) + ONNX Runtime Web
- Pattern-based detection via regex for structured entities (IBANs, phone numbers, emails, credit cards, etc.)
- Swiss/German/French-specific recognizers (AHV numbers, CHE-UIDs, European dates, Swiss phone formats)
- Anonymizes detected entities with unique ID mappings (`<PERSON_1>`, `<LOCATION_2>`) for later deanonymization
- Deanonymize mode: paste an LLM response containing anonymized IDs and restore original values

## Quick Start

```typescript
import { AnalyzerEngine, AnonymizerEngine } from 'presidio-js';
import { TransformersNlpEngine } from 'presidio-js/nlp';

// NER-powered detection (~67 MB model, runs in browser via WebAssembly)
const nlpEngine = new TransformersNlpEngine({ quantized: true });
const analyzer = new AnalyzerEngine({ nlpEngine });

const results = await analyzer.analyze(
  'Alischer Usmanow, geboren am 09.09.1953, IBAN CH93 0076 2011 6238 5295 7'
);

// Anonymize
const anonymizer = new AnonymizerEngine();
const { text } = await anonymizer.anonymize(originalText, results);
// → "<PERSON_1>, geboren am <DATE_TIME_1>, IBAN <IBAN_CODE_1>"
```

## Supported Entity Types

| Category | Entities |
|---|---|
| People & Organizations | `PERSON`, `ORGANIZATION`, `LOCATION`, `NATIONALITY` |
| Dates & Contact | `DATE_TIME`, `PHONE_NUMBER`, `EMAIL_ADDRESS` |
| Financial | `CREDIT_CARD`, `IBAN_CODE`, `CRYPTO` |
| Identity Documents | `US_SSN`, `US_ITIN`, `US_PASSPORT` |
| Swiss/European | `CH_AHV`, `CH_UID`, European date formats, Swiss/German/French phone numbers |
| Network | `IP_ADDRESS`, `URL` |

## Architecture

```
AnalyzerEngine
  ├── RecognizerRegistry
  │     ├── PatternRecognizers (regex: email, IBAN, AHV, etc.)
  │     └── TransformersNerRecognizer (PERSON, LOCATION, ORG via distilbert-NER)
  ├── NlpEngine
  │     ├── TransformersNlpEngine (Transformers.js + ONNX Runtime Web)
  │     └── NullNlpEngine (regex-only mode)
  └── ContextAwareEnhancer (boosts scores from surrounding keywords)

AnonymizerEngine
  └── Operators: replace, redact, mask, hash (WebCrypto), encrypt (AES-GCM), keep
```

## Install

```bash
git clone https://github.com/ergesmema/presidioJS.git
cd presidioJS
npm install
npm run build
```

## Development

```bash
npm install
npm run build    # Build with tsup
npm test         # Run tests with vitest
```

## License

MIT
