import { z } from 'zod';

// ============================================================================
// Domain Schemas
// ============================================================================

/**
 * Domain name validation pattern
 * Allows valid domain names with standard TLDs
 */
const domainNamePattern = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)$/;
const tldPattern = /^[a-z]{2,63}$/;

export const DomainNameSchema = z
  .string()
  .min(1, 'Domain name is required')
  .max(253, 'Domain name too long')
  .refine(
    (val) => {
      const parts = val.toLowerCase().split('.');
      if (parts.length < 2) return false;
      const name = parts.slice(0, -1).join('.');
      const tld = parts[parts.length - 1];
      return (
        name &&
        tld &&
        name.split('.').every((part) => domainNamePattern.test(part)) &&
        tldPattern.test(tld)
      );
    },
    { message: 'Invalid domain name format' },
  );

export const TLDSchema = z
  .string()
  .min(2)
  .max(63)
  .regex(tldPattern, 'Invalid TLD format');

export const DomainStatusSchema = z.enum([
  'active',
  'pending',
  'expired',
  'suspended',
  'transferring',
  'redemption',
  'pending_delete',
]);

export const DomainLockStatusSchema = z.enum(['locked', 'unlocked']);

// ============================================================================
// Contact Schemas
// ============================================================================

export const DomainContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(64),
  lastName: z.string().min(1, 'Last name is required').max(64),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .min(10, 'Phone number too short')
    .max(20, 'Phone number too long')
    .regex(/^\+?[0-9\s\-().]+$/, 'Invalid phone number format'),
  address1: z.string().min(1, 'Address is required').max(255),
  address2: z.string().max(255).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State/Province is required').max(100),
  postalCode: z.string().min(1, 'Postal code is required').max(20),
  country: z
    .string()
    .length(2, 'Country must be 2-letter ISO code')
    .toUpperCase(),
  organization: z.string().max(255).optional(),
});

// ============================================================================
// Registration Schemas
// ============================================================================

export const DomainRegistrationSchema = z.object({
  domain: DomainNameSchema,
  years: z.number().int().min(1).max(10).default(1),
  autoRenew: z.boolean().default(true),
  whoisPrivacy: z.boolean().default(true),
  nameservers: z.array(z.string().min(1)).min(2).max(6).optional(),
  contact: DomainContactSchema,
});

export const DomainTransferSchema = z.object({
  domain: DomainNameSchema,
  authCode: z.string().min(1, 'Authorization code is required').max(255),
  autoRenew: z.boolean().default(true),
  whoisPrivacy: z.boolean().default(true),
  contact: DomainContactSchema,
});

export const DomainRenewalSchema = z.object({
  domainId: z.string().uuid('Invalid domain ID'),
  years: z.number().int().min(1).max(10).default(1),
});

// ============================================================================
// Domain Search Schemas
// ============================================================================

export const DomainSearchSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query is required')
    .max(253)
    .transform((val) => val.toLowerCase().trim()),
  tlds: z.array(TLDSchema).optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export const AvailabilityStatusSchema = z.enum([
  'available',
  'unavailable',
  'premium',
  'reserved',
]);

// ============================================================================
// DNS Record Schemas
// ============================================================================

export const DNSRecordTypeSchema = z.enum([
  'A',
  'AAAA',
  'CNAME',
  'MX',
  'TXT',
  'NS',
  'SRV',
  'CAA',
  'PTR',
  'SOA',
]);

/**
 * IPv4 address validation
 */
const ipv4Pattern =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/**
 * IPv6 address validation (simplified)
 */
const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$/;

export const DNSRecordCreateSchema = z
  .object({
    type: DNSRecordTypeSchema,
    name: z.string().min(1, 'Record name is required').max(255),
    content: z.string().min(1, 'Record content is required').max(4096),
    ttl: z.number().int().min(60).max(86400).default(3600),
    priority: z.number().int().min(0).max(65535).optional(),
    proxied: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // Validate content based on record type
    switch (data.type) {
      case 'A':
        if (!ipv4Pattern.test(data.content)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid IPv4 address',
            path: ['content'],
          });
        }
        break;
      case 'AAAA':
        if (!ipv6Pattern.test(data.content)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid IPv6 address',
            path: ['content'],
          });
        }
        break;
      case 'MX':
        if (data.priority === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'MX records require a priority',
            path: ['priority'],
          });
        }
        break;
      case 'SRV':
        if (data.priority === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'SRV records require a priority',
            path: ['priority'],
          });
        }
        break;
    }
  });

export const DNSRecordUpdateSchema = z.object({
  id: z.string().min(1, 'Record ID is required'),
  type: DNSRecordTypeSchema.optional(),
  name: z.string().min(1).max(255).optional(),
  content: z.string().min(1).max(4096).optional(),
  ttl: z.number().int().min(60).max(86400).optional(),
  priority: z.number().int().min(0).max(65535).optional(),
  proxied: z.boolean().optional(),
});

export const DNSBulkOperationSchema = z.object({
  domainId: z.string().uuid('Invalid domain ID'),
  records: z.array(DNSRecordCreateSchema).min(1).max(100),
});

// ============================================================================
// Domain Update Schemas
// ============================================================================

export const DomainUpdateSchema = z.object({
  domainId: z.string().uuid('Invalid domain ID'),
  autoRenew: z.boolean().optional(),
  whoisPrivacy: z.boolean().optional(),
  locked: DomainLockStatusSchema.optional(),
  nameservers: z.array(z.string().min(1)).min(2).max(6).optional(),
});

export const NameserverUpdateSchema = z.object({
  domainId: z.string().uuid('Invalid domain ID'),
  nameservers: z.array(z.string().min(1)).min(2).max(6),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type DomainNameInput = z.infer<typeof DomainNameSchema>;
export type DomainContactInput = z.infer<typeof DomainContactSchema>;
export type DomainRegistrationInput = z.infer<typeof DomainRegistrationSchema>;
export type DomainTransferInput = z.infer<typeof DomainTransferSchema>;
export type DomainRenewalInput = z.infer<typeof DomainRenewalSchema>;
export type DomainSearchInput = z.infer<typeof DomainSearchSchema>;
export type DNSRecordCreateInput = z.infer<typeof DNSRecordCreateSchema>;
export type DNSRecordUpdateInput = z.infer<typeof DNSRecordUpdateSchema>;
export type DNSBulkOperationInput = z.infer<typeof DNSBulkOperationSchema>;
export type DomainUpdateInput = z.infer<typeof DomainUpdateSchema>;
export type NameserverUpdateInput = z.infer<typeof NameserverUpdateSchema>;
