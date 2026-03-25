import 'server-only';

import { nanoid } from 'nanoid';

import { getLogger } from '@kit/shared/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  CreateInvoiceInput,
  Currency,
  Invoice,
  InvoiceFilterOptions,
  InvoiceLineItem,
  InvoiceStatus,
  PaginatedResponse,
  PaginationOptions,
  UpdateInvoiceInput,
} from '../types';
import { getStripeClient } from './stripe';

/**
 * Generate a unique invoice number
 */
export function generateInvoiceNumber(prefix = 'INV'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = nanoid(4).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Calculate line item amount including tax
 */
function calculateLineItemAmount(
  quantity: number,
  unitPrice: number,
  taxRate?: number,
): { amount: number; taxAmount: number } {
  const subtotal = quantity * unitPrice;
  const taxAmount = taxRate ? subtotal * (taxRate / 100) : 0;
  const amount = subtotal + taxAmount;

  return {
    amount: Math.round(amount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
  };
}

/**
 * Calculate invoice totals from line items
 */
function calculateInvoiceTotals(
  lineItems: InvoiceLineItem[],
): { subtotal: number; taxTotal: number; total: number } {
  let subtotal = 0;
  let taxTotal = 0;

  for (const item of lineItems) {
    subtotal += item.quantity * item.unitPrice;
    taxTotal += item.taxAmount ?? 0;
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    total: Math.round((subtotal + taxTotal) * 100) / 100,
  };
}

/**
 * Create invoice service
 */
export function createInvoiceService(client: SupabaseClient) {
  const logger = getLogger();

  return {
    /**
     * Create a new invoice
     */
    async create(input: CreateInvoiceInput): Promise<Invoice> {
      const log = await logger;
      const invoiceNumber = generateInvoiceNumber();

      // Process line items
      const lineItems: InvoiceLineItem[] = input.lineItems.map((item, index) => {
        const { amount, taxAmount } = calculateLineItemAmount(
          item.quantity,
          item.unitPrice,
          item.taxRate ?? input.taxRate,
        );

        return {
          id: `item-${index + 1}`,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount,
          taxRate: item.taxRate ?? input.taxRate,
          taxAmount,
        };
      });

      const { subtotal, taxTotal, total } = calculateInvoiceTotals(lineItems);

      const invoiceData = {
        invoice_number: invoiceNumber,
        account_id: input.accountId,
        customer_id: input.customerId,
        status: 'draft' as InvoiceStatus,
        currency: input.currency ?? 'usd',
        subtotal,
        tax_total: taxTotal,
        total,
        amount_paid: 0,
        amount_due: total,
        line_items: lineItems,
        notes: input.notes,
        due_date: input.dueDate.toISOString(),
        issued_date: new Date().toISOString(),
        customer_email: input.customerEmail,
        customer_name: input.customerName,
        customer_address: input.customerAddress,
      };

      const { data, error } = await client
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single();

      if (error) {
        log.error({ error, input }, 'Failed to create invoice');
        throw new Error(`Failed to create invoice: ${error.message}`);
      }

      log.info({ invoiceId: data.id, invoiceNumber }, 'Invoice created');

      return this.mapToInvoice(data);
    },

    /**
     * Get invoice by ID
     */
    async getById(id: string): Promise<Invoice | null> {
      const { data, error } = await client
        .from('invoices')
        .select()
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to get invoice: ${error.message}`);
      }

      return this.mapToInvoice(data);
    },

    /**
     * Get invoice by invoice number
     */
    async getByNumber(invoiceNumber: string): Promise<Invoice | null> {
      const { data, error } = await client
        .from('invoices')
        .select()
        .eq('invoice_number', invoiceNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to get invoice: ${error.message}`);
      }

      return this.mapToInvoice(data);
    },

    /**
     * Update an invoice
     */
    async update(input: UpdateInvoiceInput): Promise<Invoice> {
      const log = await logger;
      const existing = await this.getById(input.id);

      if (!existing) {
        throw new Error('Invoice not found');
      }

      if (existing.status === 'paid' || existing.status === 'cancelled') {
        throw new Error('Cannot update a paid or cancelled invoice');
      }

      let updateData: Record<string, unknown> = {};

      if (input.lineItems) {
        const lineItems: InvoiceLineItem[] = input.lineItems.map(
          (item, index) => {
            const { amount, taxAmount } = calculateLineItemAmount(
              item.quantity,
              item.unitPrice,
              item.taxRate,
            );

            return {
              id: `item-${index + 1}`,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount,
              taxRate: item.taxRate,
              taxAmount,
            };
          },
        );

        const { subtotal, taxTotal, total } = calculateInvoiceTotals(lineItems);

        updateData = {
          ...updateData,
          line_items: lineItems,
          subtotal,
          tax_total: taxTotal,
          total,
          amount_due: total - existing.amountPaid,
        };
      }

      if (input.status) {
        updateData.status = input.status;

        if (input.status === 'paid') {
          updateData.paid_date = new Date().toISOString();
          updateData.amount_paid = existing.total;
          updateData.amount_due = 0;
        }
      }

      if (input.notes !== undefined) {
        updateData.notes = input.notes;
      }

      if (input.dueDate) {
        updateData.due_date = input.dueDate.toISOString();
      }

      if (input.customerEmail) {
        updateData.customer_email = input.customerEmail;
      }

      if (input.customerName) {
        updateData.customer_name = input.customerName;
      }

      if (input.customerAddress) {
        updateData.customer_address = input.customerAddress;
      }

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await client
        .from('invoices')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        log.error({ error, input }, 'Failed to update invoice');
        throw new Error(`Failed to update invoice: ${error.message}`);
      }

      log.info({ invoiceId: input.id }, 'Invoice updated');

      return this.mapToInvoice(data);
    },

    /**
     * Delete an invoice (only drafts)
     */
    async delete(id: string): Promise<void> {
      const log = await logger;
      const existing = await this.getById(id);

      if (!existing) {
        throw new Error('Invoice not found');
      }

      if (existing.status !== 'draft') {
        throw new Error('Only draft invoices can be deleted');
      }

      const { error } = await client.from('invoices').delete().eq('id', id);

      if (error) {
        log.error({ error, id }, 'Failed to delete invoice');
        throw new Error(`Failed to delete invoice: ${error.message}`);
      }

      log.info({ invoiceId: id }, 'Invoice deleted');
    },

    /**
     * List invoices with filtering and pagination
     */
    async list(
      accountId: string,
      filters?: InvoiceFilterOptions,
      pagination?: PaginationOptions,
    ): Promise<PaginatedResponse<Invoice>> {
      const page = pagination?.page ?? 1;
      const pageSize = pagination?.pageSize ?? 10;
      const offset = (page - 1) * pageSize;

      let query = client
        .from('invoices')
        .select('*', { count: 'exact' })
        .eq('account_id', accountId);

      // Apply filters
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }

      if (filters?.dateFrom) {
        query = query.gte('issued_date', filters.dateFrom.toISOString());
      }

      if (filters?.dateTo) {
        query = query.lte('issued_date', filters.dateTo.toISOString());
      }

      if (filters?.minAmount !== undefined) {
        query = query.gte('total', filters.minAmount);
      }

      if (filters?.maxAmount !== undefined) {
        query = query.lte('total', filters.maxAmount);
      }

      if (filters?.search) {
        query = query.or(
          `invoice_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%`,
        );
      }

      // Apply pagination and ordering
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to list invoices: ${error.message}`);
      }

      const total = count ?? 0;

      return {
        data: (data ?? []).map((item) => this.mapToInvoice(item)),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },

    /**
     * Mark invoice as sent
     */
    async markAsSent(id: string): Promise<Invoice> {
      return this.update({ id, status: 'sent' });
    },

    /**
     * Mark invoice as paid
     */
    async markAsPaid(id: string, paidDate?: Date): Promise<Invoice> {
      const log = await logger;
      const existing = await this.getById(id);

      if (!existing) {
        throw new Error('Invoice not found');
      }

      const { data, error } = await client
        .from('invoices')
        .update({
          status: 'paid',
          paid_date: (paidDate ?? new Date()).toISOString(),
          amount_paid: existing.total,
          amount_due: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        log.error({ error, id }, 'Failed to mark invoice as paid');
        throw new Error(`Failed to mark invoice as paid: ${error.message}`);
      }

      log.info({ invoiceId: id }, 'Invoice marked as paid');

      return this.mapToInvoice(data);
    },

    /**
     * Cancel an invoice
     */
    async cancel(id: string): Promise<Invoice> {
      return this.update({ id, status: 'cancelled' });
    },

    /**
     * Check and update overdue invoices
     */
    async updateOverdueInvoices(accountId: string): Promise<number> {
      const log = await logger;
      const now = new Date();

      const { data, error } = await client
        .from('invoices')
        .update({
          status: 'overdue',
          updated_at: now.toISOString(),
        })
        .eq('account_id', accountId)
        .in('status', ['pending', 'sent'])
        .lt('due_date', now.toISOString())
        .select();

      if (error) {
        log.error({ error }, 'Failed to update overdue invoices');
        throw new Error(`Failed to update overdue invoices: ${error.message}`);
      }

      const count = data?.length ?? 0;

      if (count > 0) {
        log.info({ accountId, count }, 'Updated overdue invoices');
      }

      return count;
    },

    /**
     * Create a Stripe invoice from local invoice
     */
    async syncToStripe(id: string, customerId: string): Promise<Invoice> {
      const log = await logger;
      const stripe = getStripeClient();
      const invoice = await this.getById(id);

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Create Stripe invoice
      const stripeInvoice = await stripe.invoices.create({
        customer: customerId,
        collection_method: 'send_invoice',
        days_until_due: Math.max(
          1,
          Math.ceil(
            (invoice.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          ),
        ),
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        },
      });

      // Add line items
      for (const item of invoice.lineItems) {
        await stripe.invoiceItems.create({
          customer: customerId,
          invoice: stripeInvoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_amount: Math.round(item.unitPrice * 100),
          currency: invoice.currency,
        });
      }

      // Update local invoice with Stripe ID
      const { data, error } = await client
        .from('invoices')
        .update({
          stripe_invoice_id: stripeInvoice.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        log.error({ error, id }, 'Failed to sync invoice to Stripe');
        throw new Error(`Failed to sync invoice to Stripe: ${error.message}`);
      }

      log.info(
        { invoiceId: id, stripeInvoiceId: stripeInvoice.id },
        'Invoice synced to Stripe',
      );

      return this.mapToInvoice(data);
    },

    /**
     * Map database row to Invoice type
     */
    mapToInvoice(data: Record<string, unknown>): Invoice {
      return {
        id: data.id as string,
        invoiceNumber: data.invoice_number as string,
        accountId: data.account_id as string,
        customerId: data.customer_id as string | undefined,
        stripeInvoiceId: data.stripe_invoice_id as string | undefined,
        status: data.status as InvoiceStatus,
        currency: data.currency as Currency,
        subtotal: data.subtotal as number,
        taxTotal: data.tax_total as number,
        total: data.total as number,
        amountPaid: data.amount_paid as number,
        amountDue: data.amount_due as number,
        lineItems: data.line_items as InvoiceLineItem[],
        notes: data.notes as string | undefined,
        dueDate: new Date(data.due_date as string),
        issuedDate: new Date(data.issued_date as string),
        paidDate: data.paid_date
          ? new Date(data.paid_date as string)
          : undefined,
        customerEmail: data.customer_email as string | undefined,
        customerName: data.customer_name as string | undefined,
        customerAddress: data.customer_address as Invoice['customerAddress'],
        createdAt: new Date(data.created_at as string),
        updatedAt: new Date(data.updated_at as string),
      };
    },
  };
}

export type InvoiceService = ReturnType<typeof createInvoiceService>;
