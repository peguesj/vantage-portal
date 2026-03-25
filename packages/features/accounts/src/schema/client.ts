import { z } from 'zod';

export const CreateClientInputSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-z0-9-]+$/),
  service_tier: z
    .enum(['starter', 'professional', 'enterprise', 'sovereign'])
    .default('starter'),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const UpdateClientInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  service_tier: z
    .enum(['starter', 'professional', 'enterprise', 'sovereign'])
    .optional(),
  status: z.enum(['active', 'suspended', 'terminated']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const ListClientsInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  account_id: z.string().uuid(),
  status: z.enum(['active', 'suspended', 'terminated']).optional(),
});

export type CreateClientInput = z.infer<typeof CreateClientInputSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientInputSchema>;
export type ListClientsInput = z.infer<typeof ListClientsInputSchema>;
