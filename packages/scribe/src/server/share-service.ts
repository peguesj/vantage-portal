import 'server-only';

import { getLogger } from '@kit/shared/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AnnotationType,
  CreateShareInput,
  Guide,
  GuideShare,
  GuideStep,
  SharePermission,
} from '../types';

export function createShareService(client: SupabaseClient) {
  const logger = getLogger();

  return {
    async create(input: CreateShareInput, userId?: string): Promise<GuideShare> {
      const log = await logger;

      const shareData: Record<string, unknown> = {
        guide_id: input.guideId,
        permission: input.permission ?? 'view',
        created_by: userId,
        max_views: input.maxViews,
      };

      if (input.expiresAt) {
        shareData.expires_at = input.expiresAt.toISOString();
      }

      if (input.password) {
        // Store password hash (in production, use proper hashing)
        shareData.password_hash = input.password;
      }

      const { data, error } = await client
        .from('guide_shares')
        .insert(shareData)
        .select()
        .single();

      if (error) {
        log.error({ error, input }, 'Failed to create share');
        throw new Error(`Failed to create share: ${error.message}`);
      }

      log.info({ shareId: data.id, guideId: input.guideId }, 'Share created');
      return mapToShare(data);
    },

    async getByToken(token: string): Promise<GuideShare | null> {
      const { data, error } = await client
        .from('guide_shares')
        .select()
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to get share: ${error.message}`);
      }

      return mapToShare(data);
    },

    async getGuideByToken(
      token: string,
    ): Promise<{ guide: Guide; steps: GuideStep[] } | null> {
      const share = await this.getByToken(token);

      if (!share) {
        return null;
      }

      // Check expiry
      if (share.expiresAt && new Date() > share.expiresAt) {
        return null;
      }

      // Check max views
      if (share.maxViews && share.currentViews >= share.maxViews) {
        return null;
      }

      // Increment view count
      await client
        .from('guide_shares')
        .update({ current_views: share.currentViews + 1 })
        .eq('id', share.id);

      // Fetch guide with steps
      const { data: guideData, error: guideError } = await client
        .from('guides')
        .select(`
          *,
          guide_steps (
            *,
            guide_annotations (*)
          )
        `)
        .eq('id', share.guideId)
        .order('step_order', {
          referencedTable: 'guide_steps',
          ascending: true,
        })
        .single();

      if (guideError) {
        return null;
      }

      const guide: Guide = {
        id: guideData.id as string,
        accountId: guideData.account_id as string,
        createdBy: guideData.created_by as string | undefined,
        title: guideData.title as string,
        description: guideData.description as string | undefined,
        status: guideData.status as Guide['status'],
        visibility: guideData.visibility as Guide['visibility'],
        coverImageUrl: guideData.cover_image_url as string | undefined,
        tags: (guideData.tags as string[]) ?? [],
        stepCount: (guideData.step_count as number) ?? 0,
        viewCount: (guideData.view_count as number) ?? 0,
        isTemplate: (guideData.is_template as boolean) ?? false,
        sourceUrl: guideData.source_url as string | undefined,
        metadata: (guideData.metadata as Record<string, unknown>) ?? {},
        createdAt: new Date(guideData.created_at as string),
        updatedAt: new Date(guideData.updated_at as string),
      };

      const steps: GuideStep[] = (
        (guideData.guide_steps as Record<string, unknown>[]) ?? []
      ).map((step) => ({
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
      }));

      return { guide, steps };
    },

    async listByGuide(guideId: string): Promise<GuideShare[]> {
      const { data, error } = await client
        .from('guide_shares')
        .select()
        .eq('guide_id', guideId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to list shares: ${error.message}`);
      }

      return (data ?? []).map((item) => mapToShare(item));
    },

    async revoke(id: string): Promise<void> {
      const log = await logger;

      const { error } = await client
        .from('guide_shares')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        log.error({ error, id }, 'Failed to revoke share');
        throw new Error(`Failed to revoke share: ${error.message}`);
      }

      log.info({ shareId: id }, 'Share revoked');
    },

    async deleteByGuide(guideId: string): Promise<void> {
      const { error } = await client
        .from('guide_shares')
        .delete()
        .eq('guide_id', guideId);

      if (error) {
        throw new Error(`Failed to delete shares: ${error.message}`);
      }
    },
  };
}

function mapToShare(data: Record<string, unknown>): GuideShare {
  return {
    id: data.id as string,
    guideId: data.guide_id as string,
    token: data.token as string,
    permission: data.permission as SharePermission,
    hasPassword: !!(data.password_hash as string),
    expiresAt: data.expires_at
      ? new Date(data.expires_at as string)
      : undefined,
    maxViews: data.max_views as number | undefined,
    currentViews: (data.current_views as number) ?? 0,
    isActive: (data.is_active as boolean) ?? true,
    createdBy: data.created_by as string | undefined,
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
  };
}

export type ShareService = ReturnType<typeof createShareService>;
