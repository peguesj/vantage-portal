import { describe, expect, it } from 'vitest';

import {
  EXPIRED_KEY,
  PROFESSIONAL_KEY,
  ENTERPRISE_KEY,
  SOVEREIGN_KEY,
  STARTER_KEY,
  TEST_SECRET,
} from '../test-fixtures/keys.js';
import { FeatureTier } from './types.js';
import { validateLicense } from './validate.js';

describe('validateLicense', () => {
  describe('valid keys', () => {
    it('accepts a valid Starter key', () => {
      const result = validateLicense(STARTER_KEY, TEST_SECRET);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.key).toBeDefined();
      expect(result.key?.feature_tier).toBe(FeatureTier.Starter);
      expect(result.key?.seat_count).toBe(5);
      expect(result.key?.endpoint_count).toBe(10);
      expect(result.key?.tenant_domain).toBe('test-starter.example.com');
    });

    it('accepts a valid Professional key', () => {
      const result = validateLicense(PROFESSIONAL_KEY, TEST_SECRET);

      expect(result.valid).toBe(true);
      expect(result.key?.feature_tier).toBe(FeatureTier.Professional);
      expect(result.key?.seat_count).toBe(25);
      expect(result.key?.endpoint_count).toBe(100);
    });

    it('accepts a valid Enterprise key', () => {
      const result = validateLicense(ENTERPRISE_KEY, TEST_SECRET);

      expect(result.valid).toBe(true);
      expect(result.key?.feature_tier).toBe(FeatureTier.Enterprise);
      expect(result.key?.seat_count).toBe(100);
      expect(result.key?.endpoint_count).toBe(500);
    });

    it('accepts a valid Sovereign key', () => {
      const result = validateLicense(SOVEREIGN_KEY, TEST_SECRET);

      expect(result.valid).toBe(true);
      expect(result.key?.feature_tier).toBe(FeatureTier.Sovereign);
      expect(result.key?.seat_count).toBe(1000);
      expect(result.key?.endpoint_count).toBe(10000);
    });
  });

  describe('expired keys', () => {
    it('rejects an expired key with the correct error message', () => {
      const result = validateLicense(EXPIRED_KEY, TEST_SECRET);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('License key has expired');
      expect(result.key).toBeUndefined();
    });
  });

  describe('invalid signatures', () => {
    it('rejects a key validated against the wrong secret', () => {
      const result = validateLicense(STARTER_KEY, 'wrong-secret');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid license key signature');
      expect(result.key).toBeUndefined();
    });

    it('rejects a key with a tampered payload', () => {
      // Flip one character in the payload portion to corrupt the HMAC
      const tampered = 'A' + STARTER_KEY.slice(1);
      const result = validateLicense(tampered, TEST_SECRET);

      expect(result.valid).toBe(false);
      expect(result.key).toBeUndefined();
    });
  });

  describe('malformed input', () => {
    it('rejects a garbage string', () => {
      const result = validateLicense('garbage', TEST_SECRET);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Malformed license key');
      expect(result.key).toBeUndefined();
    });

    it('rejects an empty string', () => {
      const result = validateLicense('', TEST_SECRET);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Malformed license key');
    });

    it('rejects a key with missing hmac segment', () => {
      // Only a payload, no dot separator
      const payloadOnly = STARTER_KEY.split('.')[0] ?? '';
      const result = validateLicense(payloadOnly, TEST_SECRET);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Malformed license key');
    });
  });
});
