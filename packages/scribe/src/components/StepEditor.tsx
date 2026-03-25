'use client';

import { useCallback, useState } from 'react';

import {
  GripVertical,
  ImagePlus,
  MousePointer2,
  Trash2,
  X,
} from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';

import type { GuideStep } from '../types';

interface StepEditorProps {
  step: GuideStep;
  stepNumber: number;
  onUpdate: (stepId: string, data: Partial<GuideStep>) => void;
  onDelete: (stepId: string) => void;
  onScreenshotUpload: (stepId: string, file: File) => void;
  onScreenshotRemove: (stepId: string) => void;
  dragHandleProps?: Record<string, unknown>;
}

export function StepEditor({
  step,
  stepNumber,
  onUpdate,
  onDelete,
  onScreenshotUpload,
  onScreenshotRemove,
  dragHandleProps,
}: StepEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onScreenshotUpload(step.id, file);
      }
    },
    [step.id, onScreenshotUpload],
  );

  return (
    <div className="bg-card group rounded-lg border p-4">
      {/* Step header */}
      <div className="mb-3 flex items-center gap-2">
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="text-muted-foreground h-5 w-5" />
        </div>

        <button
          type="button"
          className="bg-primary text-primary-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {stepNumber}
        </button>

        <Input
          value={step.title ?? ''}
          onChange={(e) => onUpdate(step.id, { title: e.target.value })}
          placeholder={`Step ${stepNumber} title`}
          className="h-8 flex-1 border-none bg-transparent px-1 text-sm font-medium shadow-none focus-visible:ring-0"
        />

        <Button
          variant="ghost"
          size="icon"
          className="text-destructive h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => onDelete(step.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-3 pl-9">
          {/* Instruction */}
          <div>
            <Label className="text-muted-foreground text-xs">Instruction</Label>
            <Textarea
              value={step.instruction ?? ''}
              onChange={(e) =>
                onUpdate(step.id, { instruction: e.target.value })
              }
              placeholder="Describe what the user should do in this step..."
              rows={2}
              className="mt-1 resize-none text-sm"
            />
          </div>

          {/* Screenshot */}
          <div>
            <Label className="text-muted-foreground text-xs">Screenshot</Label>
            {step.screenshotUrl ? (
              <div className="relative mt-1 overflow-hidden rounded-md border">
                <img
                  src={step.screenshotUrl}
                  alt={step.title ?? `Step ${stepNumber}`}
                  className="max-h-64 w-full object-contain"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2 h-6 w-6"
                  onClick={() => onScreenshotRemove(step.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <label className="border-border hover:bg-accent mt-1 flex cursor-pointer items-center justify-center rounded-md border border-dashed p-6 transition-colors">
                <div className="text-muted-foreground flex flex-col items-center gap-1 text-xs">
                  <ImagePlus className="h-6 w-6" />
                  <span>Upload screenshot</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>

          {/* Click target & URL */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-muted-foreground text-xs">
                <MousePointer2 className="mr-1 inline h-3 w-3" />
                Click Target
              </Label>
              <Input
                value={step.clickTarget ?? ''}
                onChange={(e) =>
                  onUpdate(step.id, { clickTarget: e.target.value })
                }
                placeholder="e.g., #submit-btn"
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">URL</Label>
              <Input
                value={step.url ?? ''}
                onChange={(e) => onUpdate(step.id, { url: e.target.value })}
                placeholder="https://..."
                className="mt-1 h-8 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
