import { describe, it, expect } from 'vitest';
import { CreditCardRecognizer } from '../src/recognizers/credit-card-recognizer.js';
import { EmailRecognizer } from '../src/recognizers/email-recognizer.js';
import { PhoneRecognizer } from '../src/recognizers/phone-recognizer.js';
import { SsnRecognizer } from '../src/recognizers/ssn-recognizer.js';
import { UrlRecognizer } from '../src/recognizers/url-recognizer.js';
import { IpRecognizer } from '../src/recognizers/ip-recognizer.js';
import { IbanRecognizer } from '../src/recognizers/iban-recognizer.js';
import { CryptoRecognizer } from '../src/recognizers/crypto-recognizer.js';
import { DateRecognizer } from '../src/recognizers/date-recognizer.js';
import { UsItinRecognizer } from '../src/recognizers/us-itin-recognizer.js';
import { emptyArtifacts } from '../src/nlp/nlp-artifacts.js';

const artifacts = emptyArtifacts('en');

describe('CreditCardRecognizer', () => {
  const r = new CreditCardRecognizer();

  it('detects valid Visa card', () => {
    const results = r.analyze('My card is 4532015112830366', [], artifacts);
    expect(results.length).toBe(1);
    expect(results[0].entityType).toBe('CREDIT_CARD');
  });

  it('detects card with dashes', () => {
    const results = r.analyze('CC: 4532-0151-1283-0366', [], artifacts);
    expect(results.length).toBe(1);
  });

  it('rejects invalid Luhn', () => {
    const results = r.analyze('Not a card: 1234567890123456', [], artifacts);
    expect(results.length).toBe(0);
  });
});

describe('EmailRecognizer', () => {
  const r = new EmailRecognizer();

  it('detects email', () => {
    const results = r.analyze('Email me at john@example.com', [], artifacts);
    expect(results.length).toBe(1);
    expect(results[0].entityType).toBe('EMAIL_ADDRESS');
    expect(results[0].start).toBe(12);
  });

  it('detects multiple emails', () => {
    const results = r.analyze('a@b.com and c@d.org', [], artifacts);
    expect(results.length).toBe(2);
  });
});

describe('PhoneRecognizer', () => {
  const r = new PhoneRecognizer();

  it('detects US phone', () => {
    const results = r.analyze('Call 212-555-1234', [], artifacts);
    expect(results.length).toBe(1);
    expect(results[0].entityType).toBe('PHONE_NUMBER');
  });

  it('detects phone with parens', () => {
    const results = r.analyze('(212) 555-1234', [], artifacts);
    expect(results.length).toBe(1);
  });

  it('detects international', () => {
    const results = r.analyze('Call +44 20 7946 0958', [], artifacts);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe('SsnRecognizer', () => {
  const r = new SsnRecognizer();

  it('detects SSN with dashes', () => {
    const results = r.analyze('SSN: 123-45-6789', [], artifacts);
    expect(results.length).toBe(1);
    expect(results[0].entityType).toBe('US_SSN');
  });

  it('rejects invalid area 000', () => {
    const results = r.analyze('000-45-6789', [], artifacts);
    expect(results.length).toBe(0);
  });

  it('rejects invalid area 666', () => {
    const results = r.analyze('666-45-6789', [], artifacts);
    expect(results.length).toBe(0);
  });
});

describe('UrlRecognizer', () => {
  const r = new UrlRecognizer();

  it('detects https URL', () => {
    const results = r.analyze('Visit https://example.com/path', [], artifacts);
    expect(results.length).toBe(1);
    expect(results[0].entityType).toBe('URL');
    expect(results[0].score).toBeGreaterThanOrEqual(0.85);
  });

  it('detects www URL', () => {
    const results = r.analyze('Go to www.example.com', [], artifacts);
    expect(results.length).toBe(1);
  });
});

describe('IpRecognizer', () => {
  const r = new IpRecognizer();

  it('detects IPv4', () => {
    const results = r.analyze('Server at 192.168.1.1', [], artifacts);
    expect(results.length).toBe(1);
    expect(results[0].entityType).toBe('IP_ADDRESS');
  });

  it('rejects invalid octets', () => {
    const results = r.analyze('Not IP: 999.999.999.999', [], artifacts);
    expect(results.length).toBe(0);
  });
});

describe('IbanRecognizer', () => {
  const r = new IbanRecognizer();

  it('detects valid GB IBAN', () => {
    const results = r.analyze('IBAN: GB29 NWBK 6016 1331 9268 19', [], artifacts);
    expect(results.length).toBe(1);
    expect(results[0].entityType).toBe('IBAN_CODE');
  });

  it('rejects invalid checksum', () => {
    const results = r.analyze('IBAN: GB00 NWBK 6016 1331 9268 19', [], artifacts);
    expect(results.length).toBe(0);
  });
});

describe('CryptoRecognizer', () => {
  const r = new CryptoRecognizer();

  it('detects Ethereum address', () => {
    const results = r.analyze(
      'Send to 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD68',
      [],
      artifacts,
    );
    expect(results.length).toBe(1);
    expect(results[0].entityType).toBe('CRYPTO');
  });
});

describe('DateRecognizer', () => {
  const r = new DateRecognizer();

  it('detects ISO date', () => {
    const results = r.analyze('Born on 1990-01-15', [], artifacts);
    expect(results.length).toBe(1);
    expect(results[0].entityType).toBe('DATE_TIME');
  });

  it('detects text date', () => {
    const results = r.analyze('Born January 15, 1990', [], artifacts);
    expect(results.length).toBe(1);
  });
});

describe('UsItinRecognizer', () => {
  const r = new UsItinRecognizer();

  it('detects ITIN with dashes', () => {
    const results = r.analyze('ITIN: 912-70-1234', [], artifacts);
    expect(results.length).toBe(1);
    expect(results[0].entityType).toBe('US_ITIN');
  });
});
