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

export { AnonymizerEngine, EncryptOperator, HashOperator, KeepOperator, MaskOperator, RedactOperator, ReplaceOperator };
//# sourceMappingURL=chunk-G5LTOJJD.js.map
//# sourceMappingURL=chunk-G5LTOJJD.js.map