'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Guide, GuideFilterOptions, PaginatedResponse, PaginationOptions } from '../types';

interface UseGuidesOptions {
  accountId: string;
  filters?: GuideFilterOptions;
  pagination?: PaginationOptions;
  enabled?: boolean;
}

export function useGuides({
  accountId,
  filters,
  pagination,
  enabled = true,
}: UseGuidesOptions) {
  // Use generic client since scribe tables aren't in generated types yet
  const client = useSupabase() as unknown as SupabaseClient;
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 10;

  return useQuery<PaginatedResponse<Guide>>({
    queryKey: ['guides', accountId, filters, page, pageSize],
    enabled: enabled && !!accountId,
    queryFn: async () => {
      const offset = (page - 1) * pageSize;

      let query = client
        .from('guides')
        .select('*', { count: 'exact' })
        .eq('account_id', accountId)
        .eq('is_template', false);

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters?.visibility) {
        query = query.eq('visibility', filters.visibility);
      }

      if (filters?.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
        );
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      query = query
        .order('updated_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch guides: ${error.message}`);
      }

      const total = count ?? 0;

      return {
        data: (data ?? []).map(mapToGuide),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
  });
}

function mapToGuide(data: Record<string, unknown>): Guide {
  return {
    id: data.id as string,
    accountId: data.account_id as string,
    createdBy: data.created_by as string | undefined,
    title: data.title as string,
    description: data.description as string | undefined,
    status: data.status as Guide['status'],
    visibility: data.visibility as Guide['visibility'],
    coverImageUrl: data.cover_image_url as string | undefined,
    tags: (data.tags as string[]) ?? [],
    stepCount: (data.step_count as number) ?? 0,
    viewCount: (data.view_count as number) ?? 0,
    isTemplate: (data.is_template as boolean) ?? false,
    sourceUrl: data.source_url as string | undefined,
    metadata: (data.metadata as Record<string, unknown>) ?? {},
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
  };
}
