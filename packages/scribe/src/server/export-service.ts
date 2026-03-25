import 'server-only';

import { getLogger } from '@kit/shared/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Guide, GuideStep } from '../types';
import { createGuideService } from './guide-service';

export function createExportService(client: SupabaseClient) {
  const logger = getLogger();
  const guideService = createGuideService(client);

  return {
    async toMarkdown(guideId: string): Promise<string> {
      const log = await logger;
      const guide = await guideService.getWithSteps(guideId);

      if (!guide) {
        throw new Error('Guide not found');
      }

      log.info({ guideId }, 'Exporting guide to Markdown');
      return generateMarkdown(guide, guide.steps ?? []);
    },

    async toHtml(guideId: string): Promise<string> {
      const log = await logger;
      const guide = await guideService.getWithSteps(guideId);

      if (!guide) {
        throw new Error('Guide not found');
      }

      log.info({ guideId }, 'Exporting guide to HTML');
      return generateHtml(guide, guide.steps ?? []);
    },
  };
}

function generateMarkdown(guide: Guide, steps: GuideStep[]): string {
  const lines: string[] = [];

  lines.push(`# ${guide.title}`);
  lines.push('');

  if (guide.description) {
    lines.push(guide.description);
    lines.push('');
  }

  lines.push(`**Steps:** ${steps.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const step of steps) {
    lines.push(`## Step ${step.stepOrder + 1}${step.title ? `: ${step.title}` : ''}`);
    lines.push('');

    if (step.instruction) {
      lines.push(step.instruction);
      lines.push('');
    }

    if (step.screenshotUrl) {
      lines.push(`![Step ${step.stepOrder + 1}](${step.screenshotUrl})`);
      lines.push('');
    }

    if (step.url) {
      lines.push(`**URL:** ${step.url}`);
      lines.push('');
    }

    if (step.clickTarget) {
      lines.push(`**Click Target:** \`${step.clickTarget}\``);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  lines.push(`*Generated from Vantage Portal on ${new Date().toLocaleDateString()}*`);

  return lines.join('\n');
}

function generateHtml(guide: Guide, steps: GuideStep[]): string {
  const stepHtml = steps
    .map(
      (step) => `
    <div class="step">
      <h2>Step ${step.stepOrder + 1}${step.title ? `: ${escapeHtml(step.title)}` : ''}</h2>
      ${step.instruction ? `<p class="instruction">${escapeHtml(step.instruction)}</p>` : ''}
      ${step.screenshotUrl ? `<div class="screenshot"><img src="${escapeHtml(step.screenshotUrl)}" alt="Step ${step.stepOrder + 1}" /></div>` : ''}
      ${step.url ? `<p class="url"><strong>URL:</strong> <a href="${escapeHtml(step.url)}">${escapeHtml(step.url)}</a></p>` : ''}
      ${step.clickTarget ? `<p class="click-target"><strong>Click Target:</strong> <code>${escapeHtml(step.clickTarget)}</code></p>` : ''}
    </div>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(guide.title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1a1a1a; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .description { color: #666; margin-bottom: 1.5rem; }
    .meta { color: #999; font-size: 0.875rem; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #eee; }
    .step { margin-bottom: 2.5rem; padding-bottom: 2rem; border-bottom: 1px solid #f0f0f0; }
    .step h2 { font-size: 1.25rem; margin-bottom: 0.75rem; color: #333; }
    .instruction { margin-bottom: 1rem; line-height: 1.6; }
    .screenshot { margin-bottom: 1rem; }
    .screenshot img { max-width: 100%; border-radius: 8px; border: 1px solid #e0e0e0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .url a { color: #2563eb; text-decoration: none; }
    .url a:hover { text-decoration: underline; }
    .click-target code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-size: 0.875rem; }
    .footer { margin-top: 3rem; color: #999; font-size: 0.75rem; text-align: center; }
    @media print { body { padding: 0; } .step { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(guide.title)}</h1>
  ${guide.description ? `<p class="description">${escapeHtml(guide.description)}</p>` : ''}
  <div class="meta">${steps.length} steps</div>
  ${stepHtml}
  <div class="footer">Generated from Vantage Portal on ${new Date().toLocaleDateString()}</div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export type ExportService = ReturnType<typeof createExportService>;
