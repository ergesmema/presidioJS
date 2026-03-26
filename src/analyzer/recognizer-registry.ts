import { EntityRecognizer } from './entity-recognizer.js';
import { PatternRecognizer } from './pattern-recognizer.js';
import { CreditCardRecognizer } from '../recognizers/credit-card-recognizer.js';
import { EmailRecognizer } from '../recognizers/email-recognizer.js';
import { PhoneRecognizer } from '../recognizers/phone-recognizer.js';
import { SsnRecognizer } from '../recognizers/ssn-recognizer.js';
import { UrlRecognizer } from '../recognizers/url-recognizer.js';
import { IpRecognizer } from '../recognizers/ip-recognizer.js';
import { IbanRecognizer } from '../recognizers/iban-recognizer.js';
import { CryptoRecognizer } from '../recognizers/crypto-recognizer.js';
import { DateRecognizer } from '../recognizers/date-recognizer.js';
import { UsBankRecognizer } from '../recognizers/us-bank-recognizer.js';
import { UsItinRecognizer } from '../recognizers/us-itin-recognizer.js';
import { UsPassportRecognizer } from '../recognizers/us-passport-recognizer.js';
import { TransformersNerRecognizer } from '../recognizers/transformers-ner-recognizer.js';
import { AhvRecognizer } from '../recognizers/ahv-recognizer.js';
import { SwissUidRecognizer } from '../recognizers/swiss-uid-recognizer.js';
import { EuDateRecognizer } from '../recognizers/eu-date-recognizer.js';
import { SwissPhoneRecognizer } from '../recognizers/swiss-phone-recognizer.js';
import type { NlpEngine } from '../types.js';

export class RecognizerRegistry {
  private recognizers: EntityRecognizer[] = [];

  addRecognizer(recognizer: EntityRecognizer): void {
    this.recognizers.push(recognizer);
  }

  removeRecognizer(name: string): void {
    this.recognizers = this.recognizers.filter((r) => r.name !== name);
  }

  getRecognizers(language: string, entities?: string[]): EntityRecognizer[] {
    return this.recognizers.filter((r) => {
      if (r.supportedLanguage !== language && r.supportedLanguage !== 'any') return false;
      if (entities && entities.length > 0) {
        return r.supportedEntities.some((e) => entities.includes(e));
      }
      return true;
    });
  }

  getSupportedEntities(language: string): string[] {
    const entities = new Set<string>();
    for (const r of this.getRecognizers(language)) {
      for (const e of r.supportedEntities) entities.add(e);
    }
    return [...entities];
  }

  loadPredefinedRecognizers(nlpEngine?: NlpEngine): void {
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
      new SwissPhoneRecognizer(),
    );

    if (nlpEngine && nlpEngine.constructor.name !== 'NullNlpEngine') {
      this.recognizers.push(new TransformersNerRecognizer());
    }
  }

  static withAllRecognizers(nlpEngine?: NlpEngine): RecognizerRegistry {
    const registry = new RecognizerRegistry();
    registry.loadPredefinedRecognizers(nlpEngine);
    return registry;
  }

  static withPatternRecognizers(): RecognizerRegistry {
    const registry = new RecognizerRegistry();
    registry.loadPredefinedRecognizers();
    return registry;
  }
}
