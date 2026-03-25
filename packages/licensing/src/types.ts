export enum FeatureTier {
  Starter = 'starter',
  Professional = 'professional',
  Enterprise = 'enterprise',
  Sovereign = 'sovereign',
}

export interface LicenseKey {
  tenant_domain: string;
  seat_count: number;
  endpoint_count: number;
  feature_tier: FeatureTier;
  expires_at: string; // ISO 8601
  issued_at: string; // ISO 8601
  issued_by?: string;
}

export interface LicenseValidationResult {
  valid: boolean;
  key?: LicenseKey;
  error?: string;
}
