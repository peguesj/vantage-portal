import { z } from 'zod';

export const IncidentSeveritySchema = z.enum([
  'critical',
  'high',
  'medium',
  'low',
  'info',
]);

export const IncidentStatusSchema = z.enum([
  'detected',
  'investigating',
  'contained',
  'eradicating',
  'recovering',
  'resolved',
  'closed',
]);

export const IncidentCategorySchema = z.enum([
  'malware',
  'phishing',
  'data_breach',
  'ddos',
  'unauthorized_access',
  'insider_threat',
  'vulnerability',
  'compliance_violation',
  'other',
]);

export const AlertSeveritySchema = z.enum([
  'critical',
  'high',
  'medium',
  'low',
  'info',
]);

export const AlertStatusSchema = z.enum([
  'open',
  'acknowledged',
  'investigating',
  'resolved',
  'false_positive',
  'suppressed',
]);

export const CreateIncidentInputSchema = z.object({
  account_id: z.string().uuid(),
  client_id: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  severity: IncidentSeveritySchema.default('medium'),
  category: IncidentCategorySchema.default('other'),
  mitre_tactics: z.array(z.string()).optional().default([]),
  mitre_techniques: z.array(z.string()).optional().default([]),
  affected_systems: z.array(z.string()).optional().default([]),
  sla_deadline: z.string().datetime().optional(),
});

export const UpdateIncidentInputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  severity: IncidentSeveritySchema.optional(),
  status: IncidentStatusSchema.optional(),
  assigned_to: z.string().uuid().optional(),
  resolved_at: z.string().datetime().optional(),
});

export const ListIncidentsInputSchema = z.object({
  account_id: z.string().uuid(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  status: IncidentStatusSchema.optional(),
  severity: IncidentSeveritySchema.optional(),
  client_id: z.string().uuid().optional(),
});

export const ListAlertsInputSchema = z.object({
  account_id: z.string().uuid(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  status: AlertStatusSchema.optional(),
  severity: AlertSeveritySchema.optional(),
});

export type CreateIncidentInput = z.infer<typeof CreateIncidentInputSchema>;
export type UpdateIncidentInput = z.infer<typeof UpdateIncidentInputSchema>;
export type ListIncidentsInput = z.infer<typeof ListIncidentsInputSchema>;
export type ListAlertsInput = z.infer<typeof ListAlertsInputSchema>;
