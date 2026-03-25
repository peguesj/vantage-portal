/**
 * @kit/domains - Type Definitions
 * Domain registration and DNS management types
 */

// ============================================================================
// Domain Types
// ============================================================================

export type DomainStatus =
  | 'active'
  | 'pending'
  | 'expired'
  | 'suspended'
  | 'transferring'
  | 'redemption'
  | 'pending_delete';

export type DomainLockStatus = 'locked' | 'unlocked';

export interface Domain {
  id: string;
  name: string;
  tld: string;
  status: DomainStatus;
  registrar: string;
  createdAt: Date;
  expiresAt: Date;
  autoRenew: boolean;
  locked: DomainLockStatus;
  whoisPrivacy: boolean;
  nameservers: string[];
  userId: string;
  accountId?: string;
  registrarDomainId?: string;
  lastUpdated: Date;
}

export interface DomainRegistration {
  domain: string;
  years: number;
  autoRenew: boolean;
  whoisPrivacy: boolean;
  nameservers?: string[];
  contact: DomainContact;
}

export interface DomainContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  organization?: string;
}

export interface DomainTransfer {
  domain: string;
  authCode: string;
  autoRenew: boolean;
  whoisPrivacy: boolean;
  contact: DomainContact;
}

export interface DomainRenewal {
  domainId: string;
  years: number;
}

// ============================================================================
// Domain Availability Types
// ============================================================================

export type AvailabilityStatus = 'available' | 'unavailable' | 'premium' | 'reserved';

export interface DomainAvailability {
  domain: string;
  tld: string;
  available: boolean;
  status: AvailabilityStatus;
  price?: DomainPrice;
  premium?: boolean;
  premiumPrice?: DomainPrice;
}

export interface DomainPrice {
  registration: number;
  renewal: number;
  transfer: number;
  currency: string;
}

export interface TLDPricing {
  tld: string;
  price: DomainPrice;
  popular?: boolean;
  description?: string;
}

export interface DomainSearchResult {
  query: string;
  suggestions: DomainAvailability[];
  alternatives: DomainAvailability[];
}

// ============================================================================
// DNS Types
// ============================================================================

export type DNSRecordType =
  | 'A'
  | 'AAAA'
  | 'CNAME'
  | 'MX'
  | 'TXT'
  | 'NS'
  | 'SRV'
  | 'CAA'
  | 'PTR'
  | 'SOA';

export interface DNSRecord {
  id: string;
  domainId: string;
  type: DNSRecordType;
  name: string;
  content: string;
  ttl: number;
  priority?: number;
  proxied?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DNSRecordCreate {
  type: DNSRecordType;
  name: string;
  content: string;
  ttl: number;
  priority?: number;
  proxied?: boolean;
}

export interface DNSRecordUpdate {
  id: string;
  type?: DNSRecordType;
  name?: string;
  content?: string;
  ttl?: number;
  priority?: number;
  proxied?: boolean;
}

export interface DNSZone {
  id: string;
  domainId: string;
  domain: string;
  status: 'active' | 'pending' | 'moved' | 'deleted';
  nameservers: string[];
  records: DNSRecord[];
}

export interface DNSPropagationStatus {
  recordId: string;
  type: DNSRecordType;
  name: string;
  propagated: boolean;
  checkedServers: DNSServerCheck[];
  lastChecked: Date;
}

export interface DNSServerCheck {
  server: string;
  location: string;
  propagated: boolean;
  value?: string;
  responseTime: number;
}

// ============================================================================
// WHOIS Types
// ============================================================================

export interface WHOISInfo {
  domain: string;
  registrar: string;
  createdDate: Date;
  updatedDate: Date;
  expiresDate: Date;
  status: string[];
  nameservers: string[];
  registrant?: WHOISContact;
  admin?: WHOISContact;
  tech?: WHOISContact;
}

export interface WHOISContact {
  name?: string;
  organization?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

// ============================================================================
// Registrar Types
// ============================================================================

export type RegistrarProvider = 'cloudflare' | 'namecheap' | 'gandi' | 'mock';

export interface RegistrarConfig {
  provider: RegistrarProvider;
  apiKey?: string;
  apiSecret?: string;
  accountId?: string;
  sandbox?: boolean;
}

export interface RegistrarResponse<T> {
  success: boolean;
  data?: T;
  error?: RegistrarError;
}

export interface RegistrarError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Service Response Types
// ============================================================================

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
}

export interface ServiceError {
  code: string;
  message: string;
  field?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// Event Types
// ============================================================================

export type DomainEventType =
  | 'domain.registered'
  | 'domain.renewed'
  | 'domain.transferred'
  | 'domain.expired'
  | 'domain.deleted'
  | 'domain.locked'
  | 'domain.unlocked'
  | 'dns.record.created'
  | 'dns.record.updated'
  | 'dns.record.deleted';

export interface DomainEvent {
  id: string;
  type: DomainEventType;
  domainId: string;
  userId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
