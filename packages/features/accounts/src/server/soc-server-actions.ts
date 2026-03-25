'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  CreateIncidentInputSchema,
  ListAlertsInputSchema,
  ListIncidentsInputSchema,
  UpdateIncidentInputSchema,
} from '../schema/soc';
import type {
  CreateIncidentInput,
  ListAlertsInput,
  ListIncidentsInput,
  UpdateIncidentInput,
} from '../schema/soc';

// ─── Domain types ────────────────────────────────────────────────────────────

export interface SecurityIncident {
  id: string;
  account_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status:
    | 'detected'
    | 'investigating'
    | 'contained'
    | 'eradicating'
    | 'recovering'
    | 'resolved'
    | 'closed';
  category: string;
  mitre_tactics: string[];
  mitre_techniques: string[];
  affected_systems: string[];
  assigned_to: string | null;
  resolved_at: string | null;
  sla_deadline: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  account_id: string;
  client_id: string | null;
  incident_id: string | null;
  title: string;
  description: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status:
    | 'open'
    | 'acknowledged'
    | 'investigating'
    | 'resolved'
    | 'false_positive'
    | 'suppressed';
  source: string | null;
  created_at: string;
  updated_at: string;
}

export type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

// ─── Minimal schema overrides ─────────────────────────────────────────────────
//
// These local schema type overrides allow queries to compile before
// database.types.ts is regenerated with the SOC migration applied.
// Remove once typegen has been re-run against the updated schema.

type SocSchema = {
  public: {
    Tables: {
      security_incidents: {
        Row: SecurityIncident;
        Insert: Omit<
          SecurityIncident,
          'id' | 'status' | 'created_at' | 'updated_at'
        > &
          Partial<
            Pick<SecurityIncident, 'id' | 'status' | 'created_at' | 'updated_at'>
          >;
        Update: Partial<Omit<SecurityIncident, 'id' | 'account_id'>>;
        Relationships: [];
      };
      alerts: {
        Row: Alert;
        Insert: Omit<Alert, 'id' | 'status' | 'created_at' | 'updated_at'> &
          Partial<Pick<Alert, 'id' | 'status' | 'created_at' | 'updated_at'>>;
        Update: Partial<Omit<Alert, 'id' | 'account_id'>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// ─── Incidents ────────────────────────────────────────────────────────────────

/**
 * @name createIncident
 * @description Insert a new security incident scoped to the given account.
 * RLS on the `security_incidents` table enforces that only authenticated
 * members of the account may perform this operation.
 */
export async function createIncident(
  input: CreateIncidentInput,
): Promise<ActionResult<SecurityIncident>> {
  try {
    const validated = CreateIncidentInputSchema.parse(input);
    const supabase = getSupabaseServerClient<SocSchema>();

    const { data, error } = await supabase
      .from('security_incidents')
      .insert({
        account_id: validated.account_id,
        client_id: validated.client_id ?? null,
        title: validated.title,
        description: validated.description ?? null,
        severity: validated.severity,
        category: validated.category,
        mitre_tactics: validated.mitre_tactics,
        mitre_techniques: validated.mitre_techniques,
        affected_systems: validated.affected_systems,
        sla_deadline: validated.sla_deadline ?? null,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as SecurityIncident, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * @name listIncidents
 * @description Return a paginated list of security incidents for the given
 * account. Results are ordered by creation date descending. Optionally filter
 * by status, severity, or client.
 */
export async function listIncidents(
  input: ListIncidentsInput,
): Promise<ActionResult<{ data: SecurityIncident[]; count: number }>> {
  try {
    const validated = ListIncidentsInputSchema.parse(input);
    const supabase = getSupabaseServerClient<SocSchema>();

    const from = (validated.page - 1) * validated.limit;
    const to = from + validated.limit - 1;

    let query = supabase
      .from('security_incidents')
      .select('*', { count: 'exact' })
      .eq('account_id', validated.account_id)
      .range(from, to)
      .order('created_at', { ascending: false });

    if (validated.status) {
      query = query.eq('status', validated.status);
    }

    if (validated.severity) {
      query = query.eq('severity', validated.severity);
    }

    if (validated.client_id) {
      query = query.eq('client_id', validated.client_id);
    }

    const { data, error, count } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return {
      data: {
        data: (data ?? []) as SecurityIncident[],
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
 * @name updateIncident
 * @description Update an existing security incident. Only non-undefined fields
 * are written. RLS enforces that the caller must be a member of the account
 * that owns the incident.
 */
export async function updateIncident(
  input: UpdateIncidentInput,
): Promise<ActionResult<SecurityIncident>> {
  try {
    const validated = UpdateIncidentInputSchema.parse(input);
    const { id, ...updates } = validated;

    // Strip undefined fields so Supabase does not overwrite columns with NULL.
    const updatePayload = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );

    const supabase = getSupabaseServerClient<SocSchema>();

    const { data, error } = await supabase
      .from('security_incidents')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as SecurityIncident, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

/**
 * @name listAlerts
 * @description Return a paginated list of alerts for the given account.
 * Results are ordered by creation date descending. Optionally filter by
 * status or severity.
 */
export async function listAlerts(
  input: ListAlertsInput,
): Promise<ActionResult<{ data: Alert[]; count: number }>> {
  try {
    const validated = ListAlertsInputSchema.parse(input);
    const supabase = getSupabaseServerClient<SocSchema>();

    const from = (validated.page - 1) * validated.limit;
    const to = from + validated.limit - 1;

    let query = supabase
      .from('alerts')
      .select('*', { count: 'exact' })
      .eq('account_id', validated.account_id)
      .range(from, to)
      .order('created_at', { ascending: false });

    if (validated.status) {
      query = query.eq('status', validated.status);
    }

    if (validated.severity) {
      query = query.eq('severity', validated.severity);
    }

    const { data, error, count } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return {
      data: {
        data: (data ?? []) as Alert[],
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
 * @name acknowledgeAlert
 * @description Mark an alert as acknowledged. RLS enforces that the caller
 * must be an authenticated member of the account that owns the alert.
 */
export async function acknowledgeAlert(
  alertId: string,
): Promise<ActionResult<Alert>> {
  try {
    const supabase = getSupabaseServerClient<SocSchema>();

    const { data, error } = await supabase
      .from('alerts')
      .update({ status: 'acknowledged' })
      .eq('id', alertId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Alert, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * @name getIncidentStats
 * @description Return high-level SOC statistics for the given account using
 * parallel count queries to minimise latency.
 *
 * - open: total incidents not yet resolved or closed
 * - critical: open incidents with severity = 'critical'
 * - resolved_today: incidents resolved within the current calendar day (UTC)
 * - alerts_open: alerts in status 'open'
 */
export async function getIncidentStats(accountId: string): Promise<
  ActionResult<{
    open: number;
    critical: number;
    resolved_today: number;
    alerts_open: number;
  }>
> {
  try {
    const supabase = getSupabaseServerClient<SocSchema>();

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [openResult, criticalResult, resolvedTodayResult, alertsOpenResult] =
      await Promise.all([
        // Open incidents (anything not resolved or closed)
        supabase
          .from('security_incidents')
          .select('id', { count: 'exact', head: true })
          .eq('account_id', accountId)
          .not('status', 'in', '("resolved","closed")'),

        // Critical open incidents
        supabase
          .from('security_incidents')
          .select('id', { count: 'exact', head: true })
          .eq('account_id', accountId)
          .eq('severity', 'critical')
          .not('status', 'in', '("resolved","closed")'),

        // Incidents resolved today
        supabase
          .from('security_incidents')
          .select('id', { count: 'exact', head: true })
          .eq('account_id', accountId)
          .eq('status', 'resolved')
          .gte('resolved_at', todayStart.toISOString()),

        // Open alerts
        supabase
          .from('alerts')
          .select('id', { count: 'exact', head: true })
          .eq('account_id', accountId)
          .eq('status', 'open'),
      ]);

    // Surface the first error encountered, if any.
    const firstError =
      openResult.error ??
      criticalResult.error ??
      resolvedTodayResult.error ??
      alertsOpenResult.error;

    if (firstError) {
      return { data: null, error: firstError.message };
    }

    return {
      data: {
        open: openResult.count ?? 0,
        critical: criticalResult.count ?? 0,
        resolved_today: resolvedTodayResult.count ?? 0,
        alerts_open: alertsOpenResult.count ?? 0,
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
