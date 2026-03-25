import 'server-only';

import { nanoid } from 'nanoid';

import { getLogger } from '@kit/shared/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'guide-screenshots';

export function createScreenshotService(client: SupabaseClient) {
  const logger = getLogger();

  return {
    async upload(
      stepId: string,
      file: File,
      guideId: string,
    ): Promise<{ url: string; storagePath: string }> {
      const log = await logger;

      const ext = file.name.split('.').pop() ?? 'png';
      const storagePath = `${guideId}/${stepId}/${nanoid()}.${ext}`;

      const { error: uploadError } = await client.storage
        .from(BUCKET)
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        log.error({ error: uploadError, stepId }, 'Failed to upload screenshot');
        throw new Error(`Failed to upload screenshot: ${uploadError.message}`);
      }

      const {
        data: { publicUrl },
      } = client.storage.from(BUCKET).getPublicUrl(storagePath);

      // Update the step with the screenshot URL
      const { error: updateError } = await client
        .from('guide_steps')
        .update({
          screenshot_url: publicUrl,
          screenshot_storage_path: storagePath,
        })
        .eq('id', stepId);

      if (updateError) {
        log.error({ error: updateError, stepId }, 'Failed to update step with screenshot');
        throw new Error(`Failed to update step: ${updateError.message}`);
      }

      log.info({ stepId, storagePath }, 'Screenshot uploaded');

      return { url: publicUrl, storagePath };
    },

    async delete(storagePath: string): Promise<void> {
      const log = await logger;

      const { error } = await client.storage
        .from(BUCKET)
        .remove([storagePath]);

      if (error) {
        log.error({ error, storagePath }, 'Failed to delete screenshot');
        throw new Error(`Failed to delete screenshot: ${error.message}`);
      }

      log.info({ storagePath }, 'Screenshot deleted');
    },

    async replace(
      stepId: string,
      file: File,
      guideId: string,
      existingPath?: string,
    ): Promise<{ url: string; storagePath: string }> {
      // Delete existing screenshot if present
      if (existingPath) {
        await this.delete(existingPath).catch(() => {
          // Ignore delete errors on replace
        });
      }

      return this.upload(stepId, file, guideId);
    },

    getPublicUrl(storagePath: string): string {
      const {
        data: { publicUrl },
      } = client.storage.from(BUCKET).getPublicUrl(storagePath);

      return publicUrl;
    },

    async createSignedUrl(
      storagePath: string,
      expiresIn = 3600,
    ): Promise<string> {
      const { data, error } = await client.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, expiresIn);

      if (error) {
        throw new Error(`Failed to create signed URL: ${error.message}`);
      }

      return data.signedUrl;
    },
  };
}

export type ScreenshotService = ReturnType<typeof createScreenshotService>;
