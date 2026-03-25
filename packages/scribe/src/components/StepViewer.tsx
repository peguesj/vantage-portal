'use client';

import { ExternalLink, MousePointer2 } from 'lucide-react';

import type { GuideStep } from '../types';

interface StepViewerProps {
  step: GuideStep;
  stepNumber: number;
}

export function StepViewer({ step, stepNumber }: StepViewerProps) {
  return (
    <div className="relative flex gap-4 pb-8">
      {/* Step number indicator */}
      <div className="flex shrink-0 flex-col items-center">
        <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
          {stepNumber}
        </div>
        <div className="bg-border mt-2 w-px flex-1" />
      </div>

      {/* Step content */}
      <div className="min-w-0 flex-1 pb-4">
        {step.title && (
          <h3 className="mb-1 text-base font-semibold">{step.title}</h3>
        )}

        {step.instruction && (
          <p className="text-muted-foreground mb-3 text-sm leading-relaxed">
            {step.instruction}
          </p>
        )}

        {step.screenshotUrl && (
          <div className="relative mb-3 overflow-hidden rounded-lg border">
            <img
              src={step.screenshotUrl}
              alt={step.title ?? `Step ${stepNumber}`}
              className="w-full"
            />
            {/* Render click indicator if there's a click target */}
            {step.clickTarget && (
              <div className="bg-primary/10 border-primary absolute bottom-2 left-2 flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
                <MousePointer2 className="h-3 w-3" />
                <span className="max-w-48 truncate font-mono">
                  {step.clickTarget}
                </span>
              </div>
            )}
          </div>
        )}

        {step.url && (
          <a
            href={step.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {step.url}
          </a>
        )}
      </div>
    </div>
  );
}
