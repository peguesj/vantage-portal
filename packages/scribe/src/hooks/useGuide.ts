'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { AnnotationType, Guide, GuideStep } from '../types';

interface UseGuideOptions {
  guideId: string;
  includeSteps?: boolean;
  enabled?: boolean;
}

export function useGuide({
  guideId,
  includeSteps = true,
  enabled = true,
}: UseGuideOptions) {
  // Use generic client since scribe tables aren't in generated types yet
  const client = useSupabase() as unknown as SupabaseClient;

  return useQuery<Guide & { steps: GuideStep[] }>({
    queryKey: ['guide', guideId, includeSteps],
    enabled: enabled && !!guideId,
    queryFn: async () => {
      const selectQuery = includeSteps
        ? `*, guide_steps (*, guide_annotations (*))`
        : '*';

      const query = client
        .from('guides')
        .select(selectQuery)
        .eq('id', guideId)
        .order('step_order', {
          referencedTable: 'guide_steps',
          ascending: true,
        })
        .single();

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch guide: ${error.message}`);
      }

      const record = data as unknown as Record<string, unknown>;
      const guide = mapToGuide(record);

      if (includeSteps) {
        guide.steps = (
          (record.guide_steps as Record<string, unknown>[]) ?? []
        ).map(mapToStep);
      }

      return guide;
    },
  });
}

function mapToGuide(data: Record<string, unknown>): Guide & { steps: GuideStep[] } {
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
    steps: [],
  };
}

function mapToStep(step: Record<string, unknown>): GuideStep {
  return {
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
  };
}
