import { createHmac, timingSafeEqual } from 'node:crypto';

import type { LicenseKey, LicenseValidationResult } from './types.js';

/**
 * Decode a base64url string back to a UTF-8 string.
 */
function fromBase64Url(encoded: string): string {
  // Re-pad to standard base64, then convert +/-/_ back
  const padded =
    encoded.replace(/-/g, '+').replace(/_/g, '/') +
    '='.repeat((4 - (encoded.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

/**
 * Validate a license key string against the given HMAC secret.
 *
 * Expected format: `base64url(payload_json)`.`base64url(hmac_hex)`
 *
 * Verification steps:
 * 1. Split on `.` — must yield exactly two parts.
 * 2. Decode both parts.
 * 3. Recompute HMAC-SHA256 over the raw payload JSON.
 * 4. Timing-safe compare against the supplied HMAC.
 * 5. Parse payload JSON and check expiry.
 */
export function validateLicense(
  encodedKey: string,
  secret: string,
): LicenseValidationResult {
  // --- Step 1: Split ---
  const dotIndex = encodedKey.indexOf('.');
  if (dotIndex === -1) {
    return { valid: false, error: 'Malformed license key' };
  }

  const encodedPayload = encodedKey.slice(0, dotIndex);
  const encodedHmac = encodedKey.slice(dotIndex + 1);

  if (!encodedPayload || !encodedHmac) {
    return { valid: false, error: 'Malformed license key' };
  }

  // --- Step 2: Decode ---
  let payloadJson: string;
  let suppliedHmacHex: string;

  try {
    payloadJson = fromBase64Url(encodedPayload);
    suppliedHmacHex = fromBase64Url(encodedHmac);
  } catch {
    return { valid: false, error: 'Malformed license key' };
  }

  // --- Step 3: Recompute HMAC ---
  const expectedHmacHex = createHmac('sha256', secret)
    .update(payloadJson, 'utf8')
    .digest('hex');

  // --- Step 4: Timing-safe compare ---
  try {
    const expected = Buffer.from(expectedHmacHex, 'utf8');
    const supplied = Buffer.from(suppliedHmacHex, 'utf8');

    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    ) {
      return { valid: false, error: 'Invalid license key signature' };
    }
  } catch {
    return { valid: false, error: 'Invalid license key signature' };
  }

  // --- Step 5: Parse payload and check expiry ---
  let key: LicenseKey;

  try {
    key = JSON.parse(payloadJson) as LicenseKey;
  } catch {
    return { valid: false, error: 'Malformed license key' };
  }

  const now = new Date();
  const expiresAt = new Date(key.expires_at);

  if (isNaN(expiresAt.getTime())) {
    return { valid: false, error: 'Malformed license key' };
  }

  if (expiresAt < now) {
    return { valid: false, error: 'License key has expired' };
  }

  return { valid: true, key };
}
