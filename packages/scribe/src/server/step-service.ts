import 'server-only';

import { getLogger } from '@kit/shared/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AnnotationType,
  CreateStepInput,
  GuideStep,
  UpdateStepInput,
} from '../types';

export function createStepService(client: SupabaseClient) {
  const logger = getLogger();

  return {
    async create(input: CreateStepInput): Promise<GuideStep> {
      const log = await logger;

      const stepData = {
        guide_id: input.guideId,
        step_order: input.stepOrder,
        title: input.title,
        instruction: input.instruction,
        click_target: input.clickTarget,
        url: input.url,
      };

      const { data, error } = await client
        .from('guide_steps')
        .insert(stepData)
        .select()
        .single();

      if (error) {
        log.error({ error, input }, 'Failed to create step');
        throw new Error(`Failed to create step: ${error.message}`);
      }

      log.info({ stepId: data.id, guideId: input.guideId }, 'Step created');
      return mapToStep(data);
    },

    async getById(id: string): Promise<GuideStep | null> {
      const { data, error } = await client
        .from('guide_steps')
        .select(`
          *,
          guide_annotations (*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to get step: ${error.message}`);
      }

      return mapToStepWithAnnotations(data);
    },

    async listByGuide(guideId: string): Promise<GuideStep[]> {
      const { data, error } = await client
        .from('guide_steps')
        .select(`
          *,
          guide_annotations (*)
        `)
        .eq('guide_id', guideId)
        .order('step_order', { ascending: true });

      if (error) {
        throw new Error(`Failed to list steps: ${error.message}`);
      }

      return (data ?? []).map((item) => mapToStepWithAnnotations(item));
    },

    async update(input: UpdateStepInput): Promise<GuideStep> {
      const log = await logger;

      const updateData: Record<string, unknown> = {};

      if (input.title !== undefined) updateData.title = input.title;
      if (input.instruction !== undefined)
        updateData.instruction = input.instruction;
      if (input.clickTarget !== undefined)
        updateData.click_target = input.clickTarget;
      if (input.url !== undefined) updateData.url = input.url;
      if (input.screenshotUrl !== undefined)
        updateData.screenshot_url = input.screenshotUrl;
      if (input.screenshotStoragePath !== undefined)
        updateData.screenshot_storage_path = input.screenshotStoragePath;
      if (input.annotations !== undefined)
        updateData.annotations = input.annotations;

      const { data, error } = await client
        .from('guide_steps')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        log.error({ error, input }, 'Failed to update step');
        throw new Error(`Failed to update step: ${error.message}`);
      }

      log.info({ stepId: input.id }, 'Step updated');
      return mapToStep(data);
    },

    async delete(id: string): Promise<void> {
      const log = await logger;

      // Get the step to know its guide_id and order
      const step = await this.getById(id);
      if (!step) {
        throw new Error('Step not found');
      }

      const { error } = await client
        .from('guide_steps')
        .delete()
        .eq('id', id);

      if (error) {
        log.error({ error, id }, 'Failed to delete step');
        throw new Error(`Failed to delete step: ${error.message}`);
      }

      // Reorder remaining steps
      const { error: reorderError } = await client.rpc(
        'reorder_guide_steps_after_delete',
        {
          p_guide_id: step.guideId,
          p_deleted_order: step.stepOrder,
        },
      );

      if (reorderError) {
        log.warn({ error: reorderError }, 'Failed to reorder steps after delete');
      }

      log.info({ stepId: id, guideId: step.guideId }, 'Step deleted');
    },

    async reorder(guideId: string, stepIds: string[]): Promise<GuideStep[]> {
      const log = await logger;

      // Update each step's order
      const updates = stepIds.map((stepId, index) =>
        client
          .from('guide_steps')
          .update({ step_order: index })
          .eq('id', stepId)
          .eq('guide_id', guideId),
      );

      const results = await Promise.all(updates);

      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        log.error({ errors }, 'Failed to reorder some steps');
        throw new Error('Failed to reorder steps');
      }

      log.info({ guideId, stepCount: stepIds.length }, 'Steps reordered');

      return this.listByGuide(guideId);
    },

    async getNextOrder(guideId: string): Promise<number> {
      const { data, error } = await client
        .from('guide_steps')
        .select('step_order')
        .eq('guide_id', guideId)
        .order('step_order', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return 0;
        }
        throw new Error(`Failed to get next order: ${error.message}`);
      }

      return ((data.step_order as number) ?? 0) + 1;
    },

    async addStep(
      guideId: string,
      input?: Partial<CreateStepInput>,
    ): Promise<GuideStep> {
      const nextOrder = await this.getNextOrder(guideId);

      return this.create({
        guideId,
        stepOrder: nextOrder,
        title: input?.title,
        instruction: input?.instruction,
        clickTarget: input?.clickTarget,
        url: input?.url,
      });
    },
  };
}

function mapToStep(data: Record<string, unknown>): GuideStep {
  return {
    id: data.id as string,
    guideId: data.guide_id as string,
    stepOrder: data.step_order as number,
    title: data.title as string | undefined,
    instruction: data.instruction as string | undefined,
    clickTarget: data.click_target as string | undefined,
    url: data.url as string | undefined,
    screenshotUrl: data.screenshot_url as string | undefined,
    screenshotStoragePath: data.screenshot_storage_path as string | undefined,
    annotations: [],
    metadata: (data.metadata as Record<string, unknown>) ?? {},
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
  };
}

function mapToStepWithAnnotations(data: Record<string, unknown>): GuideStep {
  const step = mapToStep(data);

  step.annotations = (
    (data.guide_annotations as Record<string, unknown>[]) ?? []
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
  }));

  return step;
}

export type StepService = ReturnType<typeof createStepService>;
