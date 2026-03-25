import { z } from 'zod';

// Currency schema
export const CurrencySchema = z.enum(['usd', 'eur', 'gbp', 'cad', 'aud']);

// Invoice status schema
export const InvoiceStatusSchema = z.enum([
  'draft',
  'pending',
  'sent',
  'paid',
  'overdue',
  'cancelled',
  'refunded',
]);

// Payment status schema
export const PaymentStatusSchema = z.enum([
  'pending',
  'processing',
  'succeeded',
  'failed',
  'cancelled',
  'refunded',
]);

// Subscription status schema
export const SubscriptionStatusSchema = z.enum([
  'active',
  'past_due',
  'unpaid',
  'cancelled',
  'incomplete',
  'incomplete_expired',
  'trialing',
  'paused',
]);

// Customer address schema
export const CustomerAddressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(2).max(2, 'Country must be a 2-letter code'),
});

// Invoice line item schema
export const InvoiceLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  taxRate: z.number().min(0).max(100).optional(),
});

// Create invoice schema
export const CreateInvoiceSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  customerId: z.string().uuid('Invalid customer ID').optional(),
  customerEmail: z.string().email('Invalid email').optional(),
  customerName: z.string().min(1).max(200).optional(),
  customerAddress: CustomerAddressSchema.optional(),
  currency: CurrencySchema.default('usd'),
  lineItems: z
    .array(InvoiceLineItemSchema)
    .min(1, 'At least one line item is required'),
  notes: z.string().max(1000).optional(),
  dueDate: z.coerce.date(),
  taxRate: z.number().min(0).max(100).optional(),
});

// Update invoice schema
export const UpdateInvoiceSchema = z.object({
  id: z.string().uuid('Invalid invoice ID'),
  status: InvoiceStatusSchema.optional(),
  lineItems: z.array(InvoiceLineItemSchema).optional(),
  notes: z.string().max(1000).optional(),
  dueDate: z.coerce.date().optional(),
  customerEmail: z.string().email('Invalid email').optional(),
  customerName: z.string().min(1).max(200).optional(),
  customerAddress: CustomerAddressSchema.optional(),
});

// Delete invoice schema
export const DeleteInvoiceSchema = z.object({
  id: z.string().uuid('Invalid invoice ID'),
});

// Create payment intent schema
export const CreatePaymentIntentSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  invoiceId: z.string().uuid('Invalid invoice ID').optional(),
  amount: z.number().int().positive('Amount must be positive'),
  currency: CurrencySchema.default('usd'),
  paymentMethodId: z.string().optional(),
  customerEmail: z.string().email('Invalid email').optional(),
  metadata: z.record(z.string()).optional(),
});

// Confirm payment schema
export const ConfirmPaymentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
});

// Refund schema
export const RefundSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID'),
  amount: z.number().int().positive('Amount must be positive').optional(),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
});

// Add payment method schema
export const AddPaymentMethodSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
  setAsDefault: z.boolean().default(false),
});

// Remove payment method schema
export const RemovePaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
});

// Invoice filter schema
export const InvoiceFilterSchema = z.object({
  status: z
    .union([InvoiceStatusSchema, z.array(InvoiceStatusSchema)])
    .optional(),
  customerId: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  minAmount: z.number().nonnegative().optional(),
  maxAmount: z.number().nonnegative().optional(),
  search: z.string().max(100).optional(),
});

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
});

// Send invoice email schema
export const SendInvoiceEmailSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  recipientEmail: z.string().email('Invalid email').optional(),
  subject: z.string().max(200).optional(),
  message: z.string().max(2000).optional(),
});

// Mark invoice as paid schema
export const MarkInvoicePaidSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  paidDate: z.coerce.date().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// Cancel subscription schema
export const CancelSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid('Invalid subscription ID'),
  cancelImmediately: z.boolean().default(false),
  reason: z.string().max(500).optional(),
});

// Type exports from schemas
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;
export type CreatePaymentIntentInput = z.infer<typeof CreatePaymentIntentSchema>;
export type RefundInput = z.infer<typeof RefundSchema>;
export type InvoiceFilter = z.infer<typeof InvoiceFilterSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
