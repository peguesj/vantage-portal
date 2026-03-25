/**
 * Pre-generated test license keys for use in unit and integration tests.
 *
 * All keys are signed with TEST_SECRET. Do NOT use this secret in production.
 *
 * Usage:
 *   import { STARTER_KEY, TEST_SECRET } from '../test-fixtures/keys';
 *   const result = validateLicense(STARTER_KEY, TEST_SECRET);
 */

import { generateLicense } from '../src/generate.js';
import { FeatureTier } from '../src/types.js';

export const TEST_SECRET = 'test-secret-do-not-use-in-production';

/** Valid Starter tier — 5 seats, 10 endpoints, expires 2027-01-01 */
export const STARTER_KEY = generateLicense(
  {
    tenant_domain: 'test-starter.example.com',
    seat_count: 5,
    endpoint_count: 10,
    feature_tier: FeatureTier.Starter,
    expires_at: '2027-01-01T00:00:00.000Z',
    issued_at: '2026-01-01T00:00:00.000Z',
    issued_by: 'test-fixture',
  },
  TEST_SECRET,
);

/** Valid Professional tier — 25 seats, 100 endpoints, expires 2027-01-01 */
export const PROFESSIONAL_KEY = generateLicense(
  {
    tenant_domain: 'test-professional.example.com',
    seat_count: 25,
    endpoint_count: 100,
    feature_tier: FeatureTier.Professional,
    expires_at: '2027-01-01T00:00:00.000Z',
    issued_at: '2026-01-01T00:00:00.000Z',
    issued_by: 'test-fixture',
  },
  TEST_SECRET,
);

/** Valid Enterprise tier — 100 seats, 500 endpoints, expires 2027-01-01 */
export const ENTERPRISE_KEY = generateLicense(
  {
    tenant_domain: 'test-enterprise.example.com',
    seat_count: 100,
    endpoint_count: 500,
    feature_tier: FeatureTier.Enterprise,
    expires_at: '2027-01-01T00:00:00.000Z',
    issued_at: '2026-01-01T00:00:00.000Z',
    issued_by: 'test-fixture',
  },
  TEST_SECRET,
);

/** Valid Sovereign tier — 1000 seats, 10000 endpoints, expires 2027-01-01 */
export const SOVEREIGN_KEY = generateLicense(
  {
    tenant_domain: 'test-sovereign.example.com',
    seat_count: 1000,
    endpoint_count: 10000,
    feature_tier: FeatureTier.Sovereign,
    expires_at: '2027-01-01T00:00:00.000Z',
    issued_at: '2026-01-01T00:00:00.000Z',
    issued_by: 'test-fixture',
  },
  TEST_SECRET,
);

/**
 * Structurally valid key but expired (expires_at: 2020-01-01).
 * validateLicense should return valid: false with 'License key has expired'.
 */
export const EXPIRED_KEY = generateLicense(
  {
    tenant_domain: 'test-expired.example.com',
    seat_count: 5,
    endpoint_count: 10,
    feature_tier: FeatureTier.Starter,
    expires_at: '2020-01-01T00:00:00.000Z',
    issued_at: '2019-01-01T00:00:00.000Z',
    issued_by: 'test-fixture',
  },
  TEST_SECRET,
);
