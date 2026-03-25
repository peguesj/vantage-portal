'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  CreateGuideSchema,
  CreateShareSchema,
  CreateStepSchema,
  DeleteGuideSchema,
  DeleteStepSchema,
  ExportGuideSchema,
  ReorderStepsSchema,
  RevokeShareSchema,
  UpdateGuideSchema,
  UpdateStepSchema,
} from '../schemas/scribe';

import { createExportService } from './export-service';
import { createGuideService } from './guide-service';
import { createShareService } from './share-service';
import { createStepService } from './step-service';

// Guide actions

export async function createGuideAction(formData: FormData) {
  const client = getSupabaseServerClient();
  const service = createGuideService(client);

  const input = CreateGuideSchema.parse({
    accountId: formData.get('accountId'),
    title: formData.get('title') || undefined,
    description: formData.get('description') || undefined,
    visibility: formData.get('visibility') || undefined,
    sourceUrl: formData.get('sourceUrl') || undefined,
  });

  return service.create(input);
}

export async function createGuideJsonAction(data: unknown) {
  const client = getSupabaseServerClient();
  const service = createGuideService(client);

  const input = CreateGuideSchema.parse(data);
  return service.create(input);
}

export async function updateGuideAction(data: unknown) {
  const client = getSupabaseServerClient();
  const service = createGuideService(client);

  const input = UpdateGuideSchema.parse(data);
  return service.update(input);
}

export async function deleteGuideAction(data: unknown) {
  const client = getSupabaseServerClient();
  const service = createGuideService(client);

  const { id } = DeleteGuideSchema.parse(data);
  return service.delete(id);
}

export async function publishGuideAction(guideId: string) {
  const client = getSupabaseServerClient();
  const service = createGuideService(client);

  return service.publish(guideId);
}

export async function archiveGuideAction(guideId: string) {
  const client = getSupabaseServerClient();
  const service = createGuideService(client);

  return service.archive(guideId);
}

export async function duplicateGuideAction(guideId: string, accountId: string) {
  const client = getSupabaseServerClient();
  const service = createGuideService(client);

  return service.duplicate(guideId, accountId);
}

// Step actions

export async function createStepAction(data: unknown) {
  const client = getSupabaseServerClient();
  const service = createStepService(client);

  const input = CreateStepSchema.parse(data);
  return service.create(input);
}

export async function addStepAction(guideId: string, data?: unknown) {
  const client = getSupabaseServerClient();
  const service = createStepService(client);

  return service.addStep(guideId, data as Record<string, unknown> | undefined);
}

export async function updateStepAction(data: unknown) {
  const client = getSupabaseServerClient();
  const service = createStepService(client);

  const input = UpdateStepSchema.parse(data);
  return service.update(input);
}

export async function deleteStepAction(data: unknown) {
  const client = getSupabaseServerClient();
  const service = createStepService(client);

  const { id } = DeleteStepSchema.parse(data);
  return service.delete(id);
}

export async function reorderStepsAction(data: unknown) {
  const client = getSupabaseServerClient();
  const service = createStepService(client);

  const { guideId, stepIds } = ReorderStepsSchema.parse(data);
  return service.reorder(guideId, stepIds);
}

// Share actions

export async function createShareAction(data: unknown) {
  const client = getSupabaseServerClient();
  const service = createShareService(client);

  const input = CreateShareSchema.parse(data);
  return service.create(input);
}

export async function revokeShareAction(data: unknown) {
  const client = getSupabaseServerClient();
  const service = createShareService(client);

  const { id } = RevokeShareSchema.parse(data);
  return service.revoke(id);
}

// Export actions

export async function exportGuideAction(data: unknown) {
  const client = getSupabaseServerClient();
  const service = createExportService(client);

  const { guideId, format } = ExportGuideSchema.parse(data);

  if (format === 'markdown') {
    return service.toMarkdown(guideId);
  }

  return service.toHtml(guideId);
}
