'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  CreateClientInputSchema,
  ListClientsInputSchema,
  UpdateClientInputSchema,
} from '../schema/client';
import type {
  CreateClientInput,
  ListClientsInput,
  UpdateClientInput,
} from '../schema/client';

export interface Client {
  id: string;
  account_id: string;
  name: string;
  slug: string;
  service_tier: 'starter' | 'professional' | 'enterprise' | 'sovereign';
  status: 'active' | 'suspended' | 'terminated';
  metadata: Record<string, unknown>;
  org_path: string | null;
  created_at: string;
  updated_at: string;
}

export type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export type ClientListResult = {
  data: Client[];
  count: number;
};

/**
 * Minimal schema override so queries against the `clients` table compile
 * before `database.types.ts` has been regenerated with the migration applied.
 * Once typegen is re-run this type alias can be removed and the server client
 * used without a generic parameter.
 */
type ClientsSchema = {
  public: {
    Tables: {
      clients: {
        Row: Client;
        Insert: Omit<Client, 'id' | 'status' | 'org_path' | 'created_at' | 'updated_at'> &
          Partial<Pick<Client, 'id' | 'status' | 'org_path' | 'created_at' | 'updated_at'>>;
        Update: Partial<Omit<Client, 'id' | 'account_id'>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/**
 * @name createClient
 * @description Insert a new client record scoped to the given account.
 * RLS on the `clients` table enforces that only authenticated members of the
 * account may perform this operation.
 */
export async function createClient(
  input: CreateClientInput,
  accountId: string,
): Promise<ActionResult<Client>> {
  try {
    const validated = CreateClientInputSchema.parse(input);
    const supabase = getSupabaseServerClient<ClientsSchema>();

    const { data, error } = await supabase
      .from('clients')
      .insert({
        account_id: accountId,
        name: validated.name,
        slug: validated.slug,
        service_tier: validated.service_tier,
        metadata: validated.metadata,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Client, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * @name listClients
 * @description Return a paginated list of clients for the given account.
 * Results are ordered by creation date descending. Optionally filter by status.
 */
export async function listClients(
  input: ListClientsInput,
): Promise<ActionResult<ClientListResult>> {
  try {
    const validated = ListClientsInputSchema.parse(input);
    const supabase = getSupabaseServerClient<ClientsSchema>();

    const from = (validated.page - 1) * validated.limit;
    const to = from + validated.limit - 1;

    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .eq('account_id', validated.account_id)
      .range(from, to)
      .order('created_at', { ascending: false });

    if (validated.status) {
      query = query.eq('status', validated.status);
    }

    const { data, error, count } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return {
      data: {
        data: (data ?? []) as Client[],
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
 * @name updateClient
 * @description Update an existing client record. Only non-undefined fields are
 * written. RLS enforces that the caller must be a member of the account that
 * owns the client.
 */
export async function updateClient(
  input: UpdateClientInput,
): Promise<ActionResult<Client>> {
  try {
    const validated = UpdateClientInputSchema.parse(input);
    const { id, ...updates } = validated;

    // Strip undefined fields so Supabase does not overwrite columns with NULL.
    const updatePayload = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );

    const supabase = getSupabaseServerClient<ClientsSchema>();

    const { data, error } = await supabase
      .from('clients')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Client, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
