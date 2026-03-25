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
  RegistrarResponse,
  TLDPricing,
  WHOISInfo,
} from '../../types';
import { BaseRegistrar } from './base';

/**
 * Cloudflare Registrar API Types
 */
interface CloudflareApiResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
  result: T;
  result_info?: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
}

interface CloudflareDomain {
  id: string;
  name: string;
  status: string;
  paused: boolean;
  type: string;
  development_mode: number;
  name_servers: string[];
  created_on: string;
  modified_on: string;
  activated_on: string;
  account: {
    id: string;
    name: string;
  };
}

interface CloudflareDNSRecord {
  id: string;
  zone_id: string;
  zone_name: string;
  name: string;
  type: string;
  content: string;
  proxiable: boolean;
  proxied: boolean;
  ttl: number;
  locked: boolean;
  priority?: number;
  created_on: string;
  modified_on: string;
}

/**
 * Cloudflare Registrar Implementation
 * @see https://developers.cloudflare.com/api/
 */
export class CloudflareRegistrar extends BaseRegistrar {
  private readonly baseUrl = 'https://api.cloudflare.com/client/v4';

  get provider(): string {
    return 'cloudflare';
  }

  isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.accountId);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<CloudflareApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    const data = (await response.json()) as CloudflareApiResponse<T>;

    if (!response.ok || !data.success) {
      const error = data.errors[0];
      throw new Error(error?.message ?? 'Cloudflare API error');
    }

    return data;
  }

  private mapDomain(cf: CloudflareDomain): Domain {
    return {
      id: cf.id,
      name: cf.name.split('.')[0] ?? cf.name,
      tld: cf.name.split('.').slice(1).join('.'),
      status: this.mapDomainStatus(cf.status),
      registrar: 'cloudflare',
      createdAt: new Date(cf.created_on),
      expiresAt: new Date(cf.modified_on), // Cloudflare doesn't expose expiry directly for zones
      autoRenew: true,
      locked: 'locked',
      whoisPrivacy: true,
      nameservers: cf.name_servers,
      userId: cf.account.id,
      accountId: cf.account.id,
      registrarDomainId: cf.id,
      lastUpdated: new Date(cf.modified_on),
    };
  }

  private mapDomainStatus(
    cfStatus: string,
  ): Domain['status'] {
    const statusMap: Record<string, Domain['status']> = {
      active: 'active',
      pending: 'pending',
      initializing: 'pending',
      moved: 'transferring',
      deleted: 'expired',
      deactivated: 'suspended',
    };
    return statusMap[cfStatus] ?? 'pending';
  }

  private mapDNSRecord(cf: CloudflareDNSRecord, domainId: string): DNSRecord {
    return {
      id: cf.id,
      domainId,
      type: cf.type as DNSRecord['type'],
      name: cf.name,
      content: cf.content,
      ttl: cf.ttl,
      priority: cf.priority,
      proxied: cf.proxied,
      createdAt: new Date(cf.created_on),
      updatedAt: new Date(cf.modified_on),
    };
  }

  // ============================================================================
  // Domain Availability & Pricing
  // ============================================================================

  async checkAvailability(
    domain: string,
  ): Promise<RegistrarResponse<DomainAvailability>> {
    try {
      // Cloudflare Registrar API for domain availability
      const response = await this.request<{
        available: boolean;
        premium: boolean;
        pricing?: { price: number; currency: string };
      }>(
        `/accounts/${this.config.accountId}/registrar/domains/${domain}/availability`,
      );

      const { name: _name, tld } = this.parseDomain(domain);

      return this.success({
        domain,
        tld,
        available: response.result.available,
        status: response.result.premium
          ? 'premium'
          : response.result.available
            ? 'available'
            : 'unavailable',
        price: response.result.pricing
          ? {
              registration: response.result.pricing.price,
              renewal: response.result.pricing.price,
              transfer: response.result.pricing.price,
              currency: response.result.pricing.currency,
            }
          : undefined,
        premium: response.result.premium,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('AVAILABILITY_CHECK_FAILED', message);
    }
  }

  async checkBulkAvailability(
    domains: string[],
  ): Promise<RegistrarResponse<DomainAvailability[]>> {
    try {
      const results = await Promise.all(
        domains.map((domain) => this.checkAvailability(domain)),
      );

      const availabilities: DomainAvailability[] = [];
      for (const result of results) {
        if (result.success && result.data) {
          availabilities.push(result.data);
        }
      }

      return this.success(availabilities);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('BULK_AVAILABILITY_FAILED', message);
    }
  }

  async getTLDPricing(): Promise<RegistrarResponse<TLDPricing[]>> {
    try {
      const response = await this.request<
        Array<{
          tld: string;
          registration_price: number;
          renewal_price: number;
          transfer_price: number;
          currency: string;
        }>
      >(`/accounts/${this.config.accountId}/registrar/pricing`);

      const pricing: TLDPricing[] = response.result.map((item) => ({
        tld: item.tld,
        price: {
          registration: item.registration_price,
          renewal: item.renewal_price,
          transfer: item.transfer_price,
          currency: item.currency,
        },
      }));

      return this.success(pricing);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('PRICING_FETCH_FAILED', message);
    }
  }

  async getSuggestions(
    query: string,
    tlds?: string[],
  ): Promise<RegistrarResponse<DomainAvailability[]>> {
    // Cloudflare doesn't have a native suggestions API
    // Generate suggestions by checking common TLDs
    const defaultTlds = tlds ?? ['com', 'net', 'org', 'io', 'co', 'dev'];
    const suggestions = defaultTlds.map((tld) => `${query}.${tld}`);

    return this.checkBulkAvailability(suggestions);
  }

  // ============================================================================
  // Domain Registration & Management
  // ============================================================================

  async registerDomain(
    registration: DomainRegistration,
  ): Promise<RegistrarResponse<Domain>> {
    try {
      const response = await this.request<CloudflareDomain>(
        `/accounts/${this.config.accountId}/registrar/domains`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: registration.domain,
            auto_renew: registration.autoRenew,
            privacy: registration.whoisPrivacy,
            years: registration.years,
            contacts: {
              registrant: registration.contact,
              admin: registration.contact,
              tech: registration.contact,
              billing: registration.contact,
            },
          }),
        },
      );

      return this.success(this.mapDomain(response.result));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('REGISTRATION_FAILED', message);
    }
  }

  async transferDomain(
    transfer: DomainTransfer,
  ): Promise<RegistrarResponse<Domain>> {
    try {
      const response = await this.request<CloudflareDomain>(
        `/accounts/${this.config.accountId}/registrar/domains/${transfer.domain}/transfer`,
        {
          method: 'POST',
          body: JSON.stringify({
            auth_code: transfer.authCode,
            auto_renew: transfer.autoRenew,
            privacy: transfer.whoisPrivacy,
            contacts: {
              registrant: transfer.contact,
              admin: transfer.contact,
              tech: transfer.contact,
              billing: transfer.contact,
            },
          }),
        },
      );

      return this.success(this.mapDomain(response.result));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('TRANSFER_FAILED', message);
    }
  }

  async renewDomain(
    renewal: DomainRenewal,
    registrarDomainId: string,
  ): Promise<RegistrarResponse<Domain>> {
    try {
      const response = await this.request<CloudflareDomain>(
        `/accounts/${this.config.accountId}/registrar/domains/${registrarDomainId}/renew`,
        {
          method: 'POST',
          body: JSON.stringify({
            years: renewal.years,
          }),
        },
      );

      return this.success(this.mapDomain(response.result));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('RENEWAL_FAILED', message);
    }
  }

  async getDomain(
    registrarDomainId: string,
  ): Promise<RegistrarResponse<Domain>> {
    try {
      const response = await this.request<CloudflareDomain>(
        `/zones/${registrarDomainId}`,
      );

      return this.success(this.mapDomain(response.result));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('DOMAIN_FETCH_FAILED', message);
    }
  }

  async listDomains(): Promise<RegistrarResponse<Domain[]>> {
    try {
      const response = await this.request<CloudflareDomain[]>(
        `/zones?account.id=${this.config.accountId}`,
      );

      const domains = response.result.map((cf) => this.mapDomain(cf));
      return this.success(domains);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('LIST_DOMAINS_FAILED', message);
    }
  }

  async updateDomain(
    registrarDomainId: string,
    updates: Partial<{
      autoRenew: boolean;
      locked: boolean;
      whoisPrivacy: boolean;
    }>,
  ): Promise<RegistrarResponse<Domain>> {
    try {
      const body: Record<string, unknown> = {};
      if (updates.autoRenew !== undefined) body.auto_renew = updates.autoRenew;
      if (updates.whoisPrivacy !== undefined) body.privacy = updates.whoisPrivacy;
      if (updates.locked !== undefined) body.locked = updates.locked;

      const response = await this.request<CloudflareDomain>(
        `/accounts/${this.config.accountId}/registrar/domains/${registrarDomainId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
      );

      return this.success(this.mapDomain(response.result));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('UPDATE_DOMAIN_FAILED', message);
    }
  }

  async deleteDomain(
    registrarDomainId: string,
  ): Promise<RegistrarResponse<boolean>> {
    try {
      await this.request(`/zones/${registrarDomainId}`, {
        method: 'DELETE',
      });

      return this.success(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('DELETE_DOMAIN_FAILED', message);
    }
  }

  // ============================================================================
  // Nameservers
  // ============================================================================

  async getNameservers(
    registrarDomainId: string,
  ): Promise<RegistrarResponse<string[]>> {
    try {
      const response = await this.request<CloudflareDomain>(
        `/zones/${registrarDomainId}`,
      );

      return this.success(response.result.name_servers);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('NAMESERVERS_FETCH_FAILED', message);
    }
  }

  async updateNameservers(
    registrarDomainId: string,
    nameservers: string[],
  ): Promise<RegistrarResponse<string[]>> {
    try {
      // For Cloudflare-managed domains, nameservers are managed automatically
      // This is a no-op for Cloudflare zones but kept for interface consistency
      return this.success(nameservers);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('NAMESERVERS_UPDATE_FAILED', message);
    }
  }

  // ============================================================================
  // Contacts
  // ============================================================================

  async getContacts(
    registrarDomainId: string,
  ): Promise<RegistrarResponse<DomainContact>> {
    try {
      const response = await this.request<{
        registrant: DomainContact;
      }>(
        `/accounts/${this.config.accountId}/registrar/domains/${registrarDomainId}`,
      );

      return this.success(response.result.registrant);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('CONTACTS_FETCH_FAILED', message);
    }
  }

  async updateContacts(
    registrarDomainId: string,
    contact: DomainContact,
  ): Promise<RegistrarResponse<DomainContact>> {
    try {
      await this.request(
        `/accounts/${this.config.accountId}/registrar/domains/${registrarDomainId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            contacts: {
              registrant: contact,
              admin: contact,
              tech: contact,
              billing: contact,
            },
          }),
        },
      );

      return this.success(contact);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('CONTACTS_UPDATE_FAILED', message);
    }
  }

  // ============================================================================
  // WHOIS
  // ============================================================================

  async getWHOIS(domain: string): Promise<RegistrarResponse<WHOISInfo>> {
    // Cloudflare doesn't expose raw WHOIS data through their API
    // Return basic information from the domain record
    try {
      const domainResult = await this.getDomain(domain);
      if (!domainResult.success || !domainResult.data) {
        return this.error('WHOIS_FETCH_FAILED', 'Domain not found');
      }

      const d = domainResult.data;
      return this.success({
        domain: `${d.name}.${d.tld}`,
        registrar: 'Cloudflare, Inc.',
        createdDate: d.createdAt,
        updatedDate: d.lastUpdated,
        expiresDate: d.expiresAt,
        status: [d.status],
        nameservers: d.nameservers,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('WHOIS_FETCH_FAILED', message);
    }
  }

  async setWHOISPrivacy(
    registrarDomainId: string,
    enabled: boolean,
  ): Promise<RegistrarResponse<boolean>> {
    try {
      await this.request(
        `/accounts/${this.config.accountId}/registrar/domains/${registrarDomainId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ privacy: enabled }),
        },
      );

      return this.success(enabled);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('WHOIS_PRIVACY_UPDATE_FAILED', message);
    }
  }

  // ============================================================================
  // DNS Management
  // ============================================================================

  async getDNSZone(
    registrarDomainId: string,
  ): Promise<RegistrarResponse<DNSZone>> {
    try {
      const [zoneResponse, recordsResponse] = await Promise.all([
        this.request<CloudflareDomain>(`/zones/${registrarDomainId}`),
        this.request<CloudflareDNSRecord[]>(
          `/zones/${registrarDomainId}/dns_records`,
        ),
      ]);

      const zone: DNSZone = {
        id: zoneResponse.result.id,
        domainId: registrarDomainId,
        domain: zoneResponse.result.name,
        status: zoneResponse.result.status === 'active' ? 'active' : 'pending',
        nameservers: zoneResponse.result.name_servers,
        records: recordsResponse.result.map((r) =>
          this.mapDNSRecord(r, registrarDomainId),
        ),
      };

      return this.success(zone);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('DNS_ZONE_FETCH_FAILED', message);
    }
  }

  async listDNSRecords(
    registrarDomainId: string,
  ): Promise<RegistrarResponse<DNSRecord[]>> {
    try {
      const response = await this.request<CloudflareDNSRecord[]>(
        `/zones/${registrarDomainId}/dns_records`,
      );

      const records = response.result.map((r) =>
        this.mapDNSRecord(r, registrarDomainId),
      );

      return this.success(records);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('DNS_RECORDS_FETCH_FAILED', message);
    }
  }

  async createDNSRecord(
    registrarDomainId: string,
    record: DNSRecordCreate,
  ): Promise<RegistrarResponse<DNSRecord>> {
    try {
      const response = await this.request<CloudflareDNSRecord>(
        `/zones/${registrarDomainId}/dns_records`,
        {
          method: 'POST',
          body: JSON.stringify({
            type: record.type,
            name: record.name,
            content: record.content,
            ttl: record.ttl,
            priority: record.priority,
            proxied: record.proxied ?? false,
          }),
        },
      );

      return this.success(this.mapDNSRecord(response.result, registrarDomainId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('DNS_RECORD_CREATE_FAILED', message);
    }
  }

  async updateDNSRecord(
    registrarDomainId: string,
    recordId: string,
    record: DNSRecordUpdate,
  ): Promise<RegistrarResponse<DNSRecord>> {
    try {
      const body: Record<string, unknown> = {};
      if (record.type) body.type = record.type;
      if (record.name) body.name = record.name;
      if (record.content) body.content = record.content;
      if (record.ttl) body.ttl = record.ttl;
      if (record.priority !== undefined) body.priority = record.priority;
      if (record.proxied !== undefined) body.proxied = record.proxied;

      const response = await this.request<CloudflareDNSRecord>(
        `/zones/${registrarDomainId}/dns_records/${recordId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
      );

      return this.success(this.mapDNSRecord(response.result, registrarDomainId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('DNS_RECORD_UPDATE_FAILED', message);
    }
  }

  async deleteDNSRecord(
    registrarDomainId: string,
    recordId: string,
  ): Promise<RegistrarResponse<boolean>> {
    try {
      await this.request(
        `/zones/${registrarDomainId}/dns_records/${recordId}`,
        {
          method: 'DELETE',
        },
      );

      return this.success(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('DNS_RECORD_DELETE_FAILED', message);
    }
  }

  async importDNSRecords(
    registrarDomainId: string,
    records: DNSRecordCreate[],
  ): Promise<RegistrarResponse<DNSRecord[]>> {
    try {
      const results = await Promise.all(
        records.map((record) =>
          this.createDNSRecord(registrarDomainId, record),
        ),
      );

      const created: DNSRecord[] = [];
      for (const result of results) {
        if (result.success && result.data) {
          created.push(result.data);
        }
      }

      return this.success(created);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('DNS_IMPORT_FAILED', message);
    }
  }

  async exportDNSRecords(
    registrarDomainId: string,
  ): Promise<RegistrarResponse<DNSRecord[]>> {
    return this.listDNSRecords(registrarDomainId);
  }

  // ============================================================================
  // Lock Management
  // ============================================================================

  async lockDomain(
    registrarDomainId: string,
  ): Promise<RegistrarResponse<boolean>> {
    try {
      await this.request(
        `/accounts/${this.config.accountId}/registrar/domains/${registrarDomainId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ locked: true }),
        },
      );

      return this.success(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('LOCK_DOMAIN_FAILED', message);
    }
  }

  async unlockDomain(
    registrarDomainId: string,
  ): Promise<RegistrarResponse<boolean>> {
    try {
      await this.request(
        `/accounts/${this.config.accountId}/registrar/domains/${registrarDomainId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ locked: false }),
        },
      );

      return this.success(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('UNLOCK_DOMAIN_FAILED', message);
    }
  }

  async getAuthCode(
    registrarDomainId: string,
  ): Promise<RegistrarResponse<string>> {
    try {
      const response = await this.request<{ auth_code: string }>(
        `/accounts/${this.config.accountId}/registrar/domains/${registrarDomainId}/auth_code`,
      );

      return this.success(response.result.auth_code);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.error('AUTH_CODE_FETCH_FAILED', message);
    }
  }
}
