import { z } from 'zod';

/**
 * Ticket status enum
 */
export const TicketStatusSchema = z.enum([
  'open',
  'answered',
  'customer-reply',
  'closed',
]);

/**
 * Ticket priority enum
 */
export const TicketPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

/**
 * Schema for creating a new ticket
 */
export const CreateTicketSchema = z.object({
  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject must be less than 200 characters'),
  content: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(10000, 'Message must be less than 10000 characters'),
  priority: TicketPrioritySchema.optional().default('medium'),
  department_id: z.string().uuid().optional(),
});

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;

/**
 * Schema for updating a ticket
 */
export const UpdateTicketSchema = z.object({
  ticket_id: z.string().uuid(),
  status: TicketStatusSchema.optional(),
  priority: TicketPrioritySchema.optional(),
  department_id: z.string().uuid().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});

export type UpdateTicketInput = z.infer<typeof UpdateTicketSchema>;

/**
 * Schema for creating a ticket reply
 */
export const CreateReplySchema = z.object({
  ticket_id: z.string().uuid(),
  content: z
    .string()
    .min(1, 'Reply cannot be empty')
    .max(10000, 'Reply must be less than 10000 characters'),
  is_internal_note: z.boolean().optional().default(false),
});

export type CreateReplyInput = z.infer<typeof CreateReplySchema>;

/**
 * Schema for ticket list filters
 */
export const TicketFiltersSchema = z.object({
  status: z.union([TicketStatusSchema, z.array(TicketStatusSchema)]).optional(),
  priority: z
    .union([TicketPrioritySchema, z.array(TicketPrioritySchema)])
    .optional(),
  department_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

export type TicketFiltersInput = z.infer<typeof TicketFiltersSchema>;

/**
 * Schema for pagination
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort_by: z
    .enum(['created_at', 'updated_at', 'priority', 'status', 'subject'])
    .optional()
    .default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

/**
 * Schema for department creation
 */
export const CreateDepartmentSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500).nullable().optional(),
  email: z.string().email().nullable().optional(),
});

export type CreateDepartmentInput = z.infer<typeof CreateDepartmentSchema>;

/**
 * Schema for department update
 */
export const UpdateDepartmentSchema = z.object({
  department_id: z.string().uuid(),
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  email: z.string().email().nullable().optional(),
  is_active: z.boolean().optional(),
});

export type UpdateDepartmentInput = z.infer<typeof UpdateDepartmentSchema>;

/**
 * Schema for canned response creation
 */
export const CreateCannedResponseSchema = z.object({
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title must be less than 200 characters'),
  content: z
    .string()
    .min(1, 'Content cannot be empty')
    .max(10000, 'Content must be less than 10000 characters'),
  department_id: z.string().uuid().nullable().optional(),
});

export type CreateCannedResponseInput = z.infer<
  typeof CreateCannedResponseSchema
>;

/**
 * Schema for canned response update
 */
export const UpdateCannedResponseSchema = z.object({
  canned_response_id: z.string().uuid(),
  title: z.string().min(2).max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
  department_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
});

export type UpdateCannedResponseInput = z.infer<
  typeof UpdateCannedResponseSchema
>;

/**
 * Schema for close ticket action
 */
export const CloseTicketSchema = z.object({
  ticket_id: z.string().uuid(),
  resolution_note: z.string().max(1000).optional(),
});

export type CloseTicketInput = z.infer<typeof CloseTicketSchema>;

/**
 * Schema for assign ticket action
 */
export const AssignTicketSchema = z.object({
  ticket_id: z.string().uuid(),
  assigned_to: z.string().uuid().nullable(),
});

export type AssignTicketInput = z.infer<typeof AssignTicketSchema>;

/**
 * Schema for transfer ticket to department
 */
export const TransferTicketSchema = z.object({
  ticket_id: z.string().uuid(),
  department_id: z.string().uuid(),
  note: z.string().max(500).optional(),
});

export type TransferTicketInput = z.infer<typeof TransferTicketSchema>;
