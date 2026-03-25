import { createHmac } from 'node:crypto';

import type { LicenseKey } from './types.js';

/**
 * Encode a string to base64url (URL-safe base64, no padding).
 */
function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate a signed license key string from the given params and HMAC secret.
 *
 * Format: `base64url(payload_json)`.`base64url(hmac_hex)`
 *
 * The payload is the canonical JSON serialisation of the LicenseKey fields.
 * The HMAC is computed over the raw payload JSON using HMAC-SHA256.
 */
export function generateLicense(params: LicenseKey, secret: string): string {
  const payloadJson = JSON.stringify(params);
  const hmacHex = createHmac('sha256', secret)
    .update(payloadJson, 'utf8')
    .digest('hex');

  const encodedPayload = toBase64Url(payloadJson);
  const encodedHmac = toBase64Url(hmacHex);

  return `${encodedPayload}.${encodedHmac}`;
}
