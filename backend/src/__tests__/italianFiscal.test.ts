import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  isValidItalianVatChecksum,
  normalizeItalianVat,
  validateItalianTaxCode,
  validateItalianVat,
  validateSdiCode,
} from '../utils/italianFiscal.js';

describe('italian fiscal validation', () => {
  test('validates italian VAT checksum', () => {
    assert.equal(isValidItalianVatChecksum('12345678903'), true);
    assert.equal(isValidItalianVatChecksum('12345678901'), false);
  });

  test('normalizes VAT with IT prefix', () => {
    assert.equal(normalizeItalianVat('it 12345678903'), 'IT12345678903');
    assert.equal(normalizeItalianVat('12345678903'), 'IT12345678903');
  });

  test('validateItalianVat returns structured result', () => {
    const valid = validateItalianVat('IT12345678903');
    assert.equal(valid.valid, true);
    assert.equal(valid.normalized, 'IT12345678903');

    const invalid = validateItalianVat('IT12345678901');
    assert.equal(invalid.valid, false);
  });

  test('validates tax code pattern or vat digits', () => {
    assert.equal(validateItalianTaxCode('12345678903'), true);
    assert.equal(validateItalianTaxCode('RSSMRA80A01H501U'), true);
    assert.equal(validateItalianTaxCode('INVALID'), false);
  });

  test('validates SDI code format', () => {
    assert.equal(validateSdiCode('ABCDEF1'), true);
    assert.equal(validateSdiCode('ABC'), false);
  });
});
