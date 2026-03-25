'use server';

import { z } from 'zod';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

// ---------------------------------------------------------------------------
// DB-aligned enums (match public.ticket_status / public.ticket_priority)
// ---------------------------------------------------------------------------

export type TicketStatus = 'open' | 'pending' | 'on_hold' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

// ---------------------------------------------------------------------------
// Shared result wrapper
// ---------------------------------------------------------------------------

export type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

// ---------------------------------------------------------------------------
// Public surface types
// ---------------------------------------------------------------------------

export interface TicketSummary {
  id: string;
  account_id: string;
  client_id: string | null;
  department_id: string | null;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  submitter_id: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  sla_deadline: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  author_id: string | null;
  body: string;
  is_internal: boolean;
  attachments: unknown[];
  created_at: string;
  updated_at: string;
}

export type TicketWithReplies = TicketSummary & { replies: TicketReply[] };

export interface TicketStats {
  open: number;
  pending: number;
  high_priority: number;
  resolved_today: number;
}

export interface TicketListResult {
  data: TicketSummary[];
  count: number;
}

// ---------------------------------------------------------------------------
// Zod input schemas
// ---------------------------------------------------------------------------

const TicketStatusSchema = z.enum([
  'open',
  'pending',
  'on_hold',
  'resolved',
  'closed',
] as const);

const TicketPrioritySchema = z.enum([
  'low',
  'medium',
  'high',
  'urgent',
] as const);

const CreateTicketInputSchema = z.object({
  account_id: z.string().uuid(),
  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject must be less than 200 characters'),
  priority: TicketPrioritySchema.optional().default('medium'),
  department_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const ListTicketsInputSchema = z.object({
  account_id: z.string().uuid(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: TicketStatusSchema.optional(),
  priority: TicketPrioritySchema.optional(),
  assigned_to: z.string().uuid().optional(),
});

const ReplyBodySchema = z.object({
  body: z
    .string()
    .min(1, 'Reply cannot be empty')
    .max(10000, 'Reply must be less than 10 000 characters'),
  is_internal: z.boolean().optional().default(false),
});

// ---------------------------------------------------------------------------
// Local schema overlay — keeps queries type-safe before typegen is re-run
// ---------------------------------------------------------------------------

type SupportSchema = {
  public: {
    Tables: {
      support_tickets: {
        Row: TicketSummary;
        Insert: Omit<
          TicketSummary,
          'id' | 'status' | 'priority' | 'created_at' | 'updated_at' | 'resolved_at' | 'closed_at' | 'sla_deadline'
        > &
          Partial<
            Pick<
              TicketSummary,
              'id' | 'status' | 'priority' | 'created_at' | 'updated_at' | 'resolved_at' | 'closed_at' | 'sla_deadline'
            >
          >;
        Update: Partial<Omit<TicketSummary, 'id' | 'account_id'>>;
        Relationships: [];
      };
      ticket_replies: {
        Row: TicketReply;
        Insert: Omit<TicketReply, 'id' | 'created_at' | 'updated_at' | 'attachments'> &
          Partial<Pick<TicketReply, 'id' | 'created_at' | 'updated_at' | 'attachments'>>;
        Update: Partial<Omit<TicketReply, 'id' | 'ticket_id'>>;
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
// Helpers
// ---------------------------------------------------------------------------

function unknownToError(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error';
}

// ---------------------------------------------------------------------------
// createTicket
// ---------------------------------------------------------------------------

/**
 * @name createTicket
 * @description Insert a new support ticket scoped to the given account.
 * RLS on support_tickets enforces authenticated account membership.
 */
export async function createTicket(input: {
  account_id: string;
  subject: string;
  priority?: TicketPriority;
  department_id?: string;
  client_id?: string;
  metadata?: Record<string, unknown>;
}): Promise<ActionResult<TicketSummary>> {
  try {
    const validated = CreateTicketInputSchema.parse(input);
    const supabase = getSupabaseServerClient<SupportSchema>();

    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        account_id: validated.account_id,
        subject: validated.subject,
        priority: validated.priority,
        department_id: validated.department_id ?? null,
        client_id: validated.client_id ?? null,
        metadata: validated.metadata ?? {},
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as TicketSummary, error: null };
  } catch (err) {
    return { data: null, error: unknownToError(err) };
  }
}

// ---------------------------------------------------------------------------
// listTickets
// ---------------------------------------------------------------------------

/**
 * @name listTickets
 * @description Return a paginated list of tickets for the given account.
 * Optionally filter by status, priority, or assigned agent.
 */
export async function listTickets(input: {
  account_id: string;
  page?: number;
  limit?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: string;
}): Promise<ActionResult<TicketListResult>> {
  try {
    const validated = ListTicketsInputSchema.parse(input);
    const supabase = getSupabaseServerClient<SupportSchema>();

    const from = (validated.page - 1) * validated.limit;
    const to = from + validated.limit - 1;

    let query = supabase
      .from('support_tickets')
      .select('*', { count: 'exact' })
      .eq('account_id', validated.account_id)
      .range(from, to)
      .order('created_at', { ascending: false });

    if (validated.status) {
      query = query.eq('status', validated.status);
    }

    if (validated.priority) {
      query = query.eq('priority', validated.priority);
    }

    if (validated.assigned_to) {
      query = query.eq('assigned_to', validated.assigned_to);
    }

    const { data, error, count } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return {
      data: {
        data: (data ?? []) as TicketSummary[],
        count: count ?? 0,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: unknownToError(err) };
  }
}

// ---------------------------------------------------------------------------
// getTicket
// ---------------------------------------------------------------------------

/**
 * @name getTicket
 * @description Fetch a single ticket by ID along with all its replies.
 * RLS on ticket_replies delegates access to the parent ticket's account membership.
 */
export async function getTicket(
  ticketId: string,
): Promise<ActionResult<TicketWithReplies>> {
  try {
    const id = z.string().uuid().parse(ticketId);
    const supabase = getSupabaseServerClient<SupportSchema>();

    const [ticketResult, repliesResult] = await Promise.all([
      supabase.from('support_tickets').select('*').eq('id', id).single(),
      supabase
        .from('ticket_replies')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true }),
    ]);

    if (ticketResult.error) {
      return { data: null, error: ticketResult.error.message };
    }

    if (repliesResult.error) {
      return { data: null, error: repliesResult.error.message };
    }

    const ticket = ticketResult.data as TicketSummary;
    const replies = (repliesResult.data ?? []) as TicketReply[];

    return { data: { ...ticket, replies }, error: null };
  } catch (err) {
    return { data: null, error: unknownToError(err) };
  }
}

// ---------------------------------------------------------------------------
// replyToTicket
// ---------------------------------------------------------------------------

/**
 * @name replyToTicket
 * @description Append a reply (or internal note) to a ticket.
 * If the ticket is currently 'open', its status is transitioned to 'pending'
 * so agents know a response is awaiting review.
 */
export async function replyToTicket(
  ticketId: string,
  body: string,
  isInternal = false,
): Promise<ActionResult<TicketReply>> {
  try {
    const id = z.string().uuid().parse(ticketId);
    const { body: validatedBody, is_internal } = ReplyBodySchema.parse({
      body,
      is_internal: isInternal,
    });

    const supabase = getSupabaseServerClient<SupportSchema>();

    // Insert the reply first.
    const { data: replyData, error: replyError } = await supabase
      .from('ticket_replies')
      .insert({
        ticket_id: id,
        body: validatedBody,
        is_internal: is_internal,
      })
      .select()
      .single();

    if (replyError) {
      return { data: null, error: replyError.message };
    }

    // Transition 'open' → 'pending' after a reply is posted.
    const { error: ticketError } = await supabase
      .from('support_tickets')
      .update({ status: 'pending' } as Partial<Omit<TicketSummary, 'id' | 'account_id'>>)
      .eq('id', id)
      .eq('status', 'open');

    if (ticketError) {
      // Non-fatal: the reply was saved, but we couldn't update status.
      // Surface as a warning but still return the reply data.
      console.warn(
        `[replyToTicket] Failed to transition ticket ${id} to pending: ${ticketError.message}`,
      );
    }

    return { data: replyData as TicketReply, error: null };
  } catch (err) {
    return { data: null, error: unknownToError(err) };
  }
}

// ---------------------------------------------------------------------------
// updateTicketStatus
// ---------------------------------------------------------------------------

/**
 * @name updateTicketStatus
 * @description Update the status of a ticket.
 * Automatically sets resolved_at/closed_at timestamps when transitioning to
 * 'resolved' or 'closed'.
 */
export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
): Promise<ActionResult<TicketSummary>> {
  try {
    const id = z.string().uuid().parse(ticketId);
    TicketStatusSchema.parse(status);

    const supabase = getSupabaseServerClient<SupportSchema>();

    const now = new Date().toISOString();
    const updatePayload: Partial<Omit<TicketSummary, 'id' | 'account_id'>> = {
      status,
      ...(status === 'resolved' ? { resolved_at: now } : {}),
      ...(status === 'closed' ? { closed_at: now } : {}),
    };

    const { data, error } = await supabase
      .from('support_tickets')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as TicketSummary, error: null };
  } catch (err) {
    return { data: null, error: unknownToError(err) };
  }
}

// ---------------------------------------------------------------------------
// getTicketStats
// ---------------------------------------------------------------------------

/**
 * @name getTicketStats
 * @description Return a counts summary for the dashboard overview widget.
 * Runs four targeted count queries in parallel for performance.
 */
export async function getTicketStats(
  accountId: string,
): Promise<ActionResult<TicketStats>> {
  try {
    const id = z.string().uuid().parse(accountId);
    const supabase = getSupabaseServerClient<SupportSchema>();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [openResult, pendingResult, highPriorityResult, resolvedTodayResult] =
      await Promise.all([
        supabase
          .from('support_tickets')
          .select('id', { count: 'exact', head: true })
          .eq('account_id', id)
          .eq('status', 'open'),
        supabase
          .from('support_tickets')
          .select('id', { count: 'exact', head: true })
          .eq('account_id', id)
          .eq('status', 'pending'),
        supabase
          .from('support_tickets')
          .select('id', { count: 'exact', head: true })
          .eq('account_id', id)
          .in('priority', ['high', 'urgent'])
          .in('status', ['open', 'pending', 'on_hold']),
        supabase
          .from('support_tickets')
          .select('id', { count: 'exact', head: true })
          .eq('account_id', id)
          .eq('status', 'resolved')
          .gte('resolved_at', todayStart.toISOString()),
      ]);

    const firstError =
      openResult.error ??
      pendingResult.error ??
      highPriorityResult.error ??
      resolvedTodayResult.error;

    if (firstError) {
      return { data: null, error: firstError.message };
    }

    return {
      data: {
        open: openResult.count ?? 0,
        pending: pendingResult.count ?? 0,
        high_priority: highPriorityResult.count ?? 0,
        resolved_today: resolvedTodayResult.count ?? 0,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: unknownToError(err) };
  }
}
