# Test Fixtures

This directory contains pre-generated license key fixtures for use in unit and integration tests.

## Usage

```typescript
import { STARTER_KEY, EXPIRED_KEY, TEST_SECRET } from '../test-fixtures/keys';
import { validateLicense } from '../src/validate';

const result = validateLicense(STARTER_KEY, TEST_SECRET);
// result.valid === true

const expired = validateLicense(EXPIRED_KEY, TEST_SECRET);
// expired.valid === false, expired.error === 'License key has expired'
```

## Available Keys

| Export | Tier | Seats | Endpoints | Expires | Notes |
|---|---|---|---|---|---|
| `STARTER_KEY` | starter | 5 | 10 | 2027-01-01 | Valid |
| `PROFESSIONAL_KEY` | professional | 25 | 100 | 2027-01-01 | Valid |
| `ENTERPRISE_KEY` | enterprise | 100 | 500 | 2027-01-01 | Valid |
| `SOVEREIGN_KEY` | sovereign | 1000 | 10000 | 2027-01-01 | Valid |
| `EXPIRED_KEY` | starter | 5 | 10 | 2020-01-01 | Expired |

## Test Secret

`TEST_SECRET = 'test-secret-do-not-use-in-production'`

All keys are signed with this secret. Never use it outside of tests.

Keys are generated at module load time by calling `generateLicense()`, so they always reflect the canonical encoding logic. If you change the generate/validate format, re-running tests will immediately surface any mismatch.
