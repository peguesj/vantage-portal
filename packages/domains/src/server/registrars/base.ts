import 'server-only';

import type {
  Domain,
  DomainAvailability,
  DomainContact,
  DomainRegistration,
  DomainRenewal,
  DomainTransfer,
  DNSRecord,
  DNSRecordCreate,
  DNSRecordUpdate,
  DNSZone,
  RegistrarConfig,
  RegistrarResponse,
  TLDPricing,
  WHOISInfo,
} from '../../types';

/**
 * Abstract base class for domain registrar integrations
 * Implement this interface to add support for new registrars
 */
export abstract class BaseRegistrar {
  protected config: RegistrarConfig;

  constructor(config: RegistrarConfig) {
    this.config = config;
  }

  /**
   * Get the registrar provider name
   */
  abstract get provider(): string;

  /**
   * Check if the registrar is properly configured
   */
  abstract isConfigured(): boolean;

  // ============================================================================
  // Domain Availability & Pricing
  // ============================================================================

  /**
   * Check if a domain is available for registration
   */
  abstract checkAvailability(
    domain: string,
  ): Promise<RegistrarResponse<DomainAvailability>>;

  /**
   * Check availability for multiple domains
   */
  abstract checkBulkAvailability(
    domains: string[],
  ): Promise<RegistrarResponse<DomainAvailability[]>>;

  /**
   * Get pricing for available TLDs
   */
  abstract getTLDPricing(): Promise<RegistrarResponse<TLDPricing[]>>;

  /**
   * Get suggestions for alternative domains
   */
  abstract getSuggestions(
    query: string,
    tlds?: string[],
  ): Promise<RegistrarResponse<DomainAvailability[]>>;

  // ============================================================================
  // Domain Registration & Management
  // ============================================================================

  /**
   * Register a new domain
   */
  abstract registerDomain(
    registration: DomainRegistration,
  ): Promise<RegistrarResponse<Domain>>;

  /**
   * Initiate a domain transfer
   */
  abstract transferDomain(
    transfer: DomainTransfer,
  ): Promise<RegistrarResponse<Domain>>;

  /**
   * Renew a domain
   */
  abstract renewDomain(
    renewal: DomainRenewal,
    registrarDomainId: string,
  ): Promise<RegistrarResponse<Domain>>;

  /**
   * Get domain details from registrar
   */
  abstract getDomain(
    registrarDomainId: string,
  ): Promise<RegistrarResponse<Domain>>;

  /**
   * List all domains in the account
   */
  abstract listDomains(): Promise<RegistrarResponse<Domain[]>>;

  /**
   * Update domain settings
   */
  abstract updateDomain(
    registrarDomainId: string,
    updates: Partial<{
      autoRenew: boolean;
      locked: boolean;
      whoisPrivacy: boolean;
    }>,
  ): Promise<RegistrarResponse<Domain>>;

  /**
   * Delete/cancel a domain (if supported)
   */
  abstract deleteDomain(
    registrarDomainId: string,
  ): Promise<RegistrarResponse<boolean>>;

  // ============================================================================
  // Nameservers
  // ============================================================================

  /**
   * Get current nameservers for a domain
   */
  abstract getNameservers(
    registrarDomainId: string,
  ): Promise<RegistrarResponse<string[]>>;

  /**
   * Update nameservers for a domain
   */
  abstract updateNameservers(
    registrarDomainId: string,
    nameservers: string[],
  ): Promise<RegistrarResponse<string[]>>;

  // ============================================================================
  // Contacts
  // ============================================================================

  /**
   * Get domain contacts
   */
  abstract getContacts(
    registrarDomainId: string,
  ): Promise<RegistrarResponse<DomainContact>>;

  /**
   * Update domain contacts
   */
  abstract updateContacts(
    registrarDomainId: string,
    contact: DomainContact,
  ): Promise<RegistrarResponse<DomainContact>>;

  // ============================================================================
  // WHOIS
  // ============================================================================

  /**
   * Get WHOIS information for a domain
   */
  abstract getWHOIS(domain: string): Promise<RegistrarResponse<WHOISInfo>>;

  /**
   * Enable/disable WHOIS privacy
   */
  abstract setWHOISPrivacy(
    registrarDomainId: string,
    enabled: boolean,
  ): Promise<RegistrarResponse<boolean>>;

  // ============================================================================
  // DNS Management
  // ============================================================================

  /**
   * Get DNS zone for a domain
   */
  abstract getDNSZone(
    registrarDomainId: string,
  ): Promise<RegistrarResponse<DNSZone>>;

  /**
   * List DNS records for a domain
   */
  abstract listDNSRecords(
    registrarDomainId: string,
  ): Promise<RegistrarResponse<DNSRecord[]>>;

  /**
   * Create a DNS record
   */
  abstract createDNSRecord(
    registrarDomainId: string,
    record: DNSRecordCreate,
  ): Promise<RegistrarResponse<DNSRecord>>;

  /**
   * Update a DNS record
   */
  abstract updateDNSRecord(
    registrarDomainId: string,
    recordId: string,
    record: DNSRecordUpdate,
  ): Promise<RegistrarResponse<DNSRecord>>;

  /**
   * Delete a DNS record
   */
  abstract deleteDNSRecord(
    registrarDomainId: string,
    recordId: string,
  ): Promise<RegistrarResponse<boolean>>;

  /**
   * Import DNS records in bulk
   */
  abstract importDNSRecords(
    registrarDomainId: string,
    records: DNSRecordCreate[],
  ): Promise<RegistrarResponse<DNSRecord[]>>;

  /**
   * Export DNS records
   */
  abstract exportDNSRecords(
    registrarDomainId: string,
  ): Promise<RegistrarResponse<DNSRecord[]>>;

  // ============================================================================
  // Lock Management
  // ============================================================================

  /**
   * Lock a domain to prevent transfers
   */
  abstract lockDomain(
    registrarDomainId: string,
  ): Promise<RegistrarResponse<boolean>>;

  /**
   * Unlock a domain to allow transfers
   */
  abstract unlockDomain(
    registrarDomainId: string,
  ): Promise<RegistrarResponse<boolean>>;

  /**
   * Get the auth code for domain transfer
   */
  abstract getAuthCode(
    registrarDomainId: string,
  ): Promise<RegistrarResponse<string>>;

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Parse a full domain into name and TLD
   */
  protected parseDomain(domain: string): { name: string; tld: string } {
    const parts = domain.toLowerCase().split('.');
    const tld = parts.pop() ?? '';
    const name = parts.join('.');
    return { name, tld };
  }

  /**
   * Create a success response
   */
  protected success<T>(data: T): RegistrarResponse<T> {
    return { success: true, data };
  }

  /**
   * Create an error response
   */
  protected error<T>(
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ): RegistrarResponse<T> {
    return {
      success: false,
      error: { code, message, details },
    };
  }
}

/**
 * Factory function to create registrar instance
 */
export function createRegistrar(config: RegistrarConfig): BaseRegistrar {
  switch (config.provider) {
    case 'cloudflare': {
      // Dynamic import to avoid loading all registrar implementations
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { CloudflareRegistrar } = require('./cloudflare');
      return new CloudflareRegistrar(config) as BaseRegistrar;
    }
    case 'mock': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { MockRegistrar } = require('./mock');
      return new MockRegistrar(config) as BaseRegistrar;
    }
    default:
      throw new Error(`Unsupported registrar provider: ${config.provider}`);
  }
}
