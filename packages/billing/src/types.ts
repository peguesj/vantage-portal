import type Stripe from 'stripe';

// Invoice status enum
export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'sent'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'refunded';

// Payment status enum
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded';

// Subscription status enum
export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'cancelled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'paused';

// Currency type
export type Currency = 'usd' | 'eur' | 'gbp' | 'cad' | 'aud';

// Invoice line item
export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
}

// Invoice type
export interface Invoice {
  id: string;
  invoiceNumber: string;
  accountId: string;
  customerId?: string;
  stripeInvoiceId?: string;
  status: InvoiceStatus;
  currency: Currency;
  subtotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  lineItems: InvoiceLineItem[];
  notes?: string;
  dueDate: Date;
  issuedDate: Date;
  paidDate?: Date;
  customerEmail?: string;
  customerName?: string;
  customerAddress?: CustomerAddress;
  createdAt: Date;
  updatedAt: Date;
}

// Customer address
export interface CustomerAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

// Create invoice input
export interface CreateInvoiceInput {
  accountId: string;
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  customerAddress?: CustomerAddress;
  currency?: Currency;
  lineItems: Omit<InvoiceLineItem, 'id' | 'amount' | 'taxAmount'>[];
  notes?: string;
  dueDate: Date;
  taxRate?: number;
}

// Update invoice input
export interface UpdateInvoiceInput {
  id: string;
  status?: InvoiceStatus;
  lineItems?: Omit<InvoiceLineItem, 'id' | 'amount' | 'taxAmount'>[];
  notes?: string;
  dueDate?: Date;
  customerEmail?: string;
  customerName?: string;
  customerAddress?: CustomerAddress;
}

// Payment type
export interface Payment {
  id: string;
  invoiceId?: string;
  accountId: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  paymentMethod?: PaymentMethod;
  failureMessage?: string;
  receiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Payment method type
export interface PaymentMethod {
  id: string;
  stripePaymentMethodId: string;
  type: 'card' | 'bank_account' | 'sepa_debit';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
  createdAt: Date;
}

// Create payment intent input
export interface CreatePaymentIntentInput {
  accountId: string;
  invoiceId?: string;
  amount: number;
  currency?: Currency;
  paymentMethodId?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

// Payment intent response
export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: Currency;
  status: string;
}

// Refund input
export interface RefundInput {
  paymentId: string;
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}

// Subscription type
export interface Subscription {
  id: string;
  accountId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: SubscriptionStatus;
  priceId: string;
  productId: string;
  productName: string;
  quantity: number;
  currency: Currency;
  unitAmount: number;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Webhook event type
export interface WebhookEvent {
  id: string;
  type: string;
  data: Stripe.Event.Data;
  processed: boolean;
  processedAt?: Date;
  error?: string;
  createdAt: Date;
}

// Billing dashboard stats
export interface BillingStats {
  totalRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  averageInvoiceAmount: number;
  recentPayments: Payment[];
  recentInvoices: Invoice[];
}

// Invoice filter options
export interface InvoiceFilterOptions {
  status?: InvoiceStatus | InvoiceStatus[];
  customerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

// Pagination options
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
