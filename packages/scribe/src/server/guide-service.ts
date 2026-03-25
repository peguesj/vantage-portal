import 'server-only';

import { getLogger } from '@kit/shared/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AnnotationType,
  CreateGuideInput,
  Guide,
  GuideFilterOptions,
  GuideStatus,
  GuideVisibility,
  PaginatedResponse,
  PaginationOptions,
  UpdateGuideInput,
} from '../types';

export function createGuideService(client: SupabaseClient) {
  const logger = getLogger();

  return {
    async create(input: CreateGuideInput): Promise<Guide> {
      const log = await logger;

      const guideData = {
        account_id: input.accountId,
        title: input.title ?? 'Untitled Guide',
        description: input.description,
        visibility: input.visibility ?? 'private',
        tags: input.tags ?? [],
        source_url: input.sourceUrl,
        status: 'draft' as GuideStatus,
      };

      const { data, error } = await client
        .from('guides')
        .insert(guideData)
        .select()
        .single();

      if (error) {
        log.error({ error, input }, 'Failed to create guide');
        throw new Error(`Failed to create guide: ${error.message}`);
      }

      log.info({ guideId: data.id }, 'Guide created');
      return mapToGuide(data);
    },

    async getById(id: string): Promise<Guide | null> {
      const { data, error } = await client
        .from('guides')
        .select()
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to get guide: ${error.message}`);
      }

      return mapToGuide(data);
    },

    async getWithSteps(id: string): Promise<Guide | null> {
      const { data, error } = await client
        .from('guides')
        .select(`
          *,
          guide_steps (
            *,
            guide_annotations (*)
          )
        `)
        .eq('id', id)
        .order('step_order', {
          referencedTable: 'guide_steps',
          ascending: true,
        })
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to get guide with steps: ${error.message}`);
      }

      const guide = mapToGuide(data);

      guide.steps = ((data.guide_steps as Record<string, unknown>[]) ?? []).map(
        (step) => ({
          id: step.id as string,
          guideId: step.guide_id as string,
          stepOrder: step.step_order as number,
          title: step.title as string | undefined,
          instruction: step.instruction as string | undefined,
          clickTarget: step.click_target as string | undefined,
          url: step.url as string | undefined,
          screenshotUrl: step.screenshot_url as string | undefined,
          screenshotStoragePath: step.screenshot_storage_path as string | undefined,
          annotations: (
            (step.guide_annotations as Record<string, unknown>[]) ?? []
          ).map((ann) => ({
            id: ann.id as string,
            stepId: ann.step_id as string,
            annotationType: ann.annotation_type as AnnotationType,
            x: ann.x as number,
            y: ann.y as number,
            width: ann.width as number | undefined,
            height: ann.height as number | undefined,
            rotation: (ann.rotation as number) ?? 0,
            color: (ann.color as string) ?? '#ff0000',
            strokeWidth: (ann.stroke_width as number) ?? 2,
            textContent: ann.text_content as string | undefined,
            fontSize: (ann.font_size as number) ?? 14,
            opacity: (ann.opacity as number) ?? 1,
            props: (ann.props as Record<string, unknown>) ?? {},
            sortOrder: (ann.sort_order as number) ?? 0,
            createdAt: new Date(ann.created_at as string),
            updatedAt: new Date(ann.updated_at as string),
          })),
          metadata: (step.metadata as Record<string, unknown>) ?? {},
          createdAt: new Date(step.created_at as string),
          updatedAt: new Date(step.updated_at as string),
        }),
      );

      return guide;
    },

    async update(input: UpdateGuideInput): Promise<Guide> {
      const log = await logger;

      const updateData: Record<string, unknown> = {};

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined)
        updateData.description = input.description;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.visibility !== undefined)
        updateData.visibility = input.visibility;
      if (input.coverImageUrl !== undefined)
        updateData.cover_image_url = input.coverImageUrl;
      if (input.tags !== undefined) updateData.tags = input.tags;
      if (input.sourceUrl !== undefined)
        updateData.source_url = input.sourceUrl;

      const { data, error } = await client
        .from('guides')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        log.error({ error, input }, 'Failed to update guide');
        throw new Error(`Failed to update guide: ${error.message}`);
      }

      log.info({ guideId: input.id }, 'Guide updated');
      return mapToGuide(data);
    },

    async delete(id: string): Promise<void> {
      const log = await logger;

      const { error } = await client.from('guides').delete().eq('id', id);

      if (error) {
        log.error({ error, id }, 'Failed to delete guide');
        throw new Error(`Failed to delete guide: ${error.message}`);
      }

      log.info({ guideId: id }, 'Guide deleted');
    },

    async list(
      accountId: string,
      filters?: GuideFilterOptions,
      pagination?: PaginationOptions,
    ): Promise<PaginatedResponse<Guide>> {
      const page = pagination?.page ?? 1;
      const pageSize = pagination?.pageSize ?? 10;
      const offset = (page - 1) * pageSize;

      let query = client
        .from('guides')
        .select('*', { count: 'exact' })
        .eq('account_id', accountId);

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

      if (filters?.isTemplate !== undefined) {
        query = query.eq('is_template', filters.isTemplate);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      if (filters?.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
        );
      }

      query = query
        .order('updated_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to list guides: ${error.message}`);
      }

      const total = count ?? 0;

      return {
        data: (data ?? []).map((item) => mapToGuide(item)),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },

    async publish(id: string): Promise<Guide> {
      return this.update({ id, status: 'published' });
    },

    async archive(id: string): Promise<Guide> {
      return this.update({ id, status: 'archived' });
    },

    async duplicate(id: string, accountId: string): Promise<Guide> {
      const log = await logger;
      const source = await this.getWithSteps(id);

      if (!source) {
        throw new Error('Guide not found');
      }

      const newGuide = await this.create({
        accountId,
        title: `${source.title} (Copy)`,
        description: source.description,
        visibility: source.visibility,
        tags: source.tags,
      });

      if (source.steps) {
        for (const step of source.steps) {
          await client.from('guide_steps').insert({
            guide_id: newGuide.id,
            step_order: step.stepOrder,
            title: step.title,
            instruction: step.instruction,
            click_target: step.clickTarget,
            url: step.url,
            screenshot_url: step.screenshotUrl,
            screenshot_storage_path: step.screenshotStoragePath,
            annotations: step.annotations,
          });
        }
      }

      log.info(
        { sourceId: id, newGuideId: newGuide.id },
        'Guide duplicated',
      );

      return this.getWithSteps(newGuide.id) as Promise<Guide>;
    },

    async incrementViewCount(id: string): Promise<void> {
      const { error } = await client.rpc('increment_guide_view_count', { guide_id: id });

      if (error) {
        // Silently fail - view count is non-critical
      }
    },
  };
}

function mapToGuide(data: Record<string, unknown>): Guide {
  return {
    id: data.id as string,
    accountId: data.account_id as string,
    createdBy: data.created_by as string | undefined,
    title: data.title as string,
    description: data.description as string | undefined,
    status: data.status as GuideStatus,
    visibility: data.visibility as GuideVisibility,
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

export type GuideService = ReturnType<typeof createGuideService>;
