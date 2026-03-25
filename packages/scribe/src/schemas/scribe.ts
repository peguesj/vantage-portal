import { z } from 'zod';

// Status schemas
export const GuideStatusSchema = z.enum(['draft', 'published', 'archived']);
export const GuideVisibilitySchema = z.enum(['private', 'team', 'public']);
export const AnnotationTypeSchema = z.enum([
  'arrow',
  'rectangle',
  'circle',
  'text',
  'blur',
  'highlight',
  'click_indicator',
]);
export const PageItemTypeSchema = z.enum([
  'guide_embed',
  'text_block',
  'video_link',
  'image',
  'divider',
]);
export const SharePermissionSchema = z.enum(['view', 'edit', 'comment']);

// Annotation input schema
export const AnnotationInputSchema = z.object({
  annotationType: AnnotationTypeSchema,
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().default(0),
  color: z.string().default('#ff0000'),
  strokeWidth: z.number().default(2),
  textContent: z.string().optional(),
  fontSize: z.number().default(14),
  opacity: z.number().min(0).max(1).default(1),
  props: z.record(z.unknown()).optional(),
  sortOrder: z.number().default(0),
});

// Create guide schema
export const CreateGuideSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  title: z.string().min(1).max(500).default('Untitled Guide'),
  description: z.string().max(5000).optional(),
  visibility: GuideVisibilitySchema.default('private'),
  tags: z.array(z.string().max(50)).max(20).default([]),
  sourceUrl: z.string().url().optional(),
});

// Update guide schema
export const UpdateGuideSchema = z.object({
  id: z.string().uuid('Invalid guide ID'),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: GuideStatusSchema.optional(),
  visibility: GuideVisibilitySchema.optional(),
  coverImageUrl: z.string().url().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  sourceUrl: z.string().url().optional(),
});

// Delete guide schema
export const DeleteGuideSchema = z.object({
  id: z.string().uuid('Invalid guide ID'),
});

// Create step schema
export const CreateStepSchema = z.object({
  guideId: z.string().uuid('Invalid guide ID'),
  stepOrder: z.number().int().nonnegative(),
  title: z.string().max(500).optional(),
  instruction: z.string().max(5000).optional(),
  clickTarget: z.string().max(500).optional(),
  url: z.string().url().optional(),
});

// Update step schema
export const UpdateStepSchema = z.object({
  id: z.string().uuid('Invalid step ID'),
  title: z.string().max(500).optional(),
  instruction: z.string().max(5000).optional(),
  clickTarget: z.string().max(500).optional(),
  url: z.string().url().optional(),
  screenshotUrl: z.string().url().optional(),
  screenshotStoragePath: z.string().optional(),
  annotations: z.array(AnnotationInputSchema).optional(),
});

// Delete step schema
export const DeleteStepSchema = z.object({
  id: z.string().uuid('Invalid step ID'),
});

// Reorder steps schema
export const ReorderStepsSchema = z.object({
  guideId: z.string().uuid('Invalid guide ID'),
  stepIds: z.array(z.string().uuid()).min(1),
});

// Create share schema
export const CreateShareSchema = z.object({
  guideId: z.string().uuid('Invalid guide ID'),
  permission: SharePermissionSchema.default('view'),
  password: z.string().min(4).max(100).optional(),
  expiresAt: z.coerce.date().optional(),
  maxViews: z.number().int().positive().optional(),
});

// Revoke share schema
export const RevokeShareSchema = z.object({
  id: z.string().uuid('Invalid share ID'),
});

// Guide filter schema
export const GuideFilterSchema = z.object({
  status: z
    .union([GuideStatusSchema, z.array(GuideStatusSchema)])
    .optional(),
  visibility: GuideVisibilitySchema.optional(),
  search: z.string().max(200).optional(),
  tags: z.array(z.string()).optional(),
  isTemplate: z.boolean().optional(),
});

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
});

// Upload screenshot schema
export const UploadScreenshotSchema = z.object({
  stepId: z.string().uuid('Invalid step ID'),
  fileName: z.string().min(1).max(255),
  contentType: z.string().regex(/^image\/(png|jpeg|webp|gif)$/),
});

// Export guide schema
export const ExportGuideSchema = z.object({
  guideId: z.string().uuid('Invalid guide ID'),
  format: z.enum(['markdown', 'html']),
});

// Type exports from schemas
export type CreateGuideInput = z.infer<typeof CreateGuideSchema>;
export type UpdateGuideInput = z.infer<typeof UpdateGuideSchema>;
export type CreateStepInput = z.infer<typeof CreateStepSchema>;
export type UpdateStepInput = z.infer<typeof UpdateStepSchema>;
export type ReorderStepsInput = z.infer<typeof ReorderStepsSchema>;
export type CreateShareInput = z.infer<typeof CreateShareSchema>;
export type GuideFilter = z.infer<typeof GuideFilterSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
export type AnnotationInput = z.infer<typeof AnnotationInputSchema>;
export type ExportGuideInput = z.infer<typeof ExportGuideSchema>;
