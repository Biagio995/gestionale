export interface VatValidationResult {
  valid: boolean;
  normalized: string | null;
  countryCode: string;
  vatNumber: string;
  checksumValid: boolean;
}

const VAT_IT_REGEX = /^(?:IT)?\s*([0-9]{11})$/i;
const TAX_CODE_PERSON_REGEX = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/i;
const SDI_CODE_REGEX = /^[A-Z0-9]{7}$/i;
const PEC_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function normalizeItalianVat(value: string): string | null {
  const compact = value.replace(/\s/g, '').toUpperCase();
  const match = compact.match(/^(?:IT)?([0-9]{11})$/);
  if (!match) return null;
  return `IT${match[1]}`;
}

export function isValidItalianVatChecksum(vatDigits: string): boolean {
  if (!/^[0-9]{11}$/.test(vatDigits)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const digit = Number(vatDigits[i]);
    if (i % 2 === 0) {
      sum += digit;
    } else {
      const doubled = digit * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(vatDigits[10]);
}

export function validateItalianVat(value: string): VatValidationResult {
  const compact = value.replace(/\s/g, '').toUpperCase();
  const match = compact.match(VAT_IT_REGEX);
  if (!match) {
    return {
      valid: false,
      normalized: null,
      countryCode: 'IT',
      vatNumber: compact.replace(/^IT/, ''),
      checksumValid: false,
    };
  }
  const digits = match[1]!;
  const checksumValid = isValidItalianVatChecksum(digits);
  return {
    valid: checksumValid,
    normalized: checksumValid ? `IT${digits}` : null,
    countryCode: 'IT',
    vatNumber: digits,
    checksumValid,
  };
}

export function validateItalianTaxCode(value: string): boolean {
  const compact = value.replace(/\s/g, '').toUpperCase();
  if (/^[0-9]{11}$/.test(compact)) {
    return isValidItalianVatChecksum(compact);
  }
  return TAX_CODE_PERSON_REGEX.test(compact);
}

export function validateSdiCode(value: string): boolean {
  return SDI_CODE_REGEX.test(value.trim().toUpperCase());
}

export function validatePecEmail(value: string): boolean {
  return PEC_REGEX.test(value.trim());
}
