'use server';

import { z } from 'zod';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import type { InvoiceStatus } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InvoiceSummary {
  id: string;
  account_id: string;
  client_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  period: 'monthly' | 'quarterly' | 'annual' | 'one_time';
  total: number;
  currency: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface InvoiceStats {
  total_outstanding: number;
  overdue_count: number;
  paid_this_month: number;
  draft_count: number;
}

export type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export type InvoiceListResult = {
  data: InvoiceSummary[];
  count: number;
};

// ---------------------------------------------------------------------------
// Minimal local schema override for the `invoices` table so queries compile
// before database.types.ts has been regenerated with the billing migration.
// ---------------------------------------------------------------------------

type InvoicesSchema = {
  public: {
    Tables: {
      invoices: {
        Row: {
          id: string;
          account_id: string;
          client_id: string | null;
          invoice_number: string;
          status: string;
          period: string;
          subtotal: number;
          tax_amount: number;
          total: number;
          currency: string;
          due_date: string | null;
          paid_at: string | null;
          sent_at: string | null;
          notes: string | null;
          stripe_invoice_id: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<{
          id: string;
          account_id: string;
          client_id: string | null;
          invoice_number: string;
          status: string;
          period: string;
          subtotal: number;
          tax_amount: number;
          total: number;
          currency: string;
          due_date: string | null;
          paid_at: string | null;
          sent_at: string | null;
          notes: string | null;
          stripe_invoice_id: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        }>;
        Update: Partial<{
          status: string;
          paid_at: string | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const InvoiceStatusSchema = z.enum([
  'draft',
  'pending',
  'sent',
  'paid',
  'overdue',
  'cancelled',
  'refunded',
]);

const ListInvoicesInputSchema = z.object({
  account_id: z.string().uuid(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  status: InvoiceStatusSchema.optional(),
  client_id: z.string().uuid().optional(),
});

type ListInvoicesInput = z.infer<typeof ListInvoicesInputSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map a raw DB row to InvoiceSummary, asserting the shape we need.
 */
function mapToSummary(row: InvoicesSchema['public']['Tables']['invoices']['Row']): InvoiceSummary {
  return {
    id: row.id,
    account_id: row.account_id,
    client_id: row.client_id,
    invoice_number: row.invoice_number,
    status: row.status as InvoiceStatus,
    period: row.period as InvoiceSummary['period'],
    total: row.total,
    currency: row.currency,
    due_date: row.due_date,
    paid_at: row.paid_at,
    created_at: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

/**
 * @name listInvoices
 * @description Return a paginated list of invoices scoped to the given account.
 * Optionally filter by status and/or client_id. Results are ordered by
 * created_at descending.
 */
export async function listInvoices(
  input: ListInvoicesInput,
): Promise<ActionResult<InvoiceListResult>> {
  try {
    const validated = ListInvoicesInputSchema.parse(input);
    const supabase = getSupabaseServerClient<InvoicesSchema>();

    const from = (validated.page - 1) * validated.limit;
    const to = from + validated.limit - 1;

    let query = supabase
      .from('invoices')
      .select(
        'id, account_id, client_id, invoice_number, status, period, total, currency, due_date, paid_at, created_at',
        { count: 'exact' },
      )
      .eq('account_id', validated.account_id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (validated.status !== undefined) {
      query = query.eq('status', validated.status);
    }

    if (validated.client_id !== undefined) {
      query = query.eq('client_id', validated.client_id);
    }

    const { data, error, count } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return {
      data: {
        data: (data ?? []).map((row) =>
          mapToSummary(row as InvoicesSchema['public']['Tables']['invoices']['Row']),
        ),
        count: count ?? 0,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * @name getInvoiceStats
 * @description Return aggregated billing statistics for the given account:
 * - total_outstanding: sum of totals for pending / sent / overdue invoices
 * - overdue_count: number of overdue invoices
 * - paid_this_month: sum of totals for invoices paid in the current calendar month
 * - draft_count: number of draft invoices
 */
export async function getInvoiceStats(
  accountId: string,
): Promise<ActionResult<InvoiceStats>> {
  try {
    const supabase = getSupabaseServerClient<InvoicesSchema>();

    // Query 1: outstanding (pending + sent + overdue)
    const outstandingPromise = supabase
      .from('invoices')
      .select('total')
      .eq('account_id', accountId)
      .in('status', ['pending', 'sent', 'overdue']);

    // Query 2: overdue count
    const overduePromise = supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('status', 'overdue');

    // Query 3: paid this month
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const paidThisMonthPromise = supabase
      .from('invoices')
      .select('total')
      .eq('account_id', accountId)
      .eq('status', 'paid')
      .gte('paid_at', firstOfMonth);

    // Query 4: draft count
    const draftPromise = supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('status', 'draft');

    const [outstanding, overdue, paidThisMonth, draft] = await Promise.all([
      outstandingPromise,
      overduePromise,
      paidThisMonthPromise,
      draftPromise,
    ]);

    if (outstanding.error) {
      return { data: null, error: outstanding.error.message };
    }
    if (overdue.error) {
      return { data: null, error: overdue.error.message };
    }
    if (paidThisMonth.error) {
      return { data: null, error: paidThisMonth.error.message };
    }
    if (draft.error) {
      return { data: null, error: draft.error.message };
    }

    const total_outstanding = (outstanding.data ?? []).reduce(
      (sum, row) => sum + (row.total ?? 0),
      0,
    );

    const paid_this_month = (paidThisMonth.data ?? []).reduce(
      (sum, row) => sum + (row.total ?? 0),
      0,
    );

    return {
      data: {
        total_outstanding,
        overdue_count: overdue.count ?? 0,
        paid_this_month,
        draft_count: draft.count ?? 0,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * @name updateInvoiceStatus
 * @description Transition an invoice to a new status. Sets paid_at when the
 * target status is 'paid'. RLS enforces the caller must own the account that
 * holds the invoice.
 */
export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus,
): Promise<ActionResult<InvoiceSummary>> {
  try {
    const validatedStatus = InvoiceStatusSchema.parse(status);
    const supabase = getSupabaseServerClient<InvoicesSchema>();

    const updatePayload: InvoicesSchema['public']['Tables']['invoices']['Update'] = {
      status: validatedStatus,
      updated_at: new Date().toISOString(),
    };

    if (validatedStatus === 'paid') {
      updatePayload.paid_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updatePayload)
      .eq('id', invoiceId)
      .select(
        'id, account_id, client_id, invoice_number, status, period, total, currency, due_date, paid_at, created_at',
      )
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return {
      data: mapToSummary(data as InvoicesSchema['public']['Tables']['invoices']['Row']),
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
