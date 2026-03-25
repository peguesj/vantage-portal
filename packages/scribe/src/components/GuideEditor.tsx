'use client';

import { useCallback, useState, useTransition } from 'react';

import { ArrowLeft, Eye, Loader2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Separator } from '@kit/ui/separator';
import { Textarea } from '@kit/ui/textarea';

import type { Guide, GuideStep, GuideVisibility } from '../types';
import { StepEditor } from './StepEditor';

interface GuideEditorProps {
  guide: Guide;
  steps: GuideStep[];
  onSave: (
    guide: Partial<Guide>,
    updatedSteps: GuideStep[],
  ) => Promise<void>;
  onAddStep: () => Promise<GuideStep>;
  onDeleteStep: (stepId: string) => Promise<void>;
  onUpdateStep: (stepId: string, data: Partial<GuideStep>) => void;
  onReorderSteps: (stepIds: string[]) => Promise<void>;
  onScreenshotUpload: (stepId: string, file: File) => Promise<void>;
  onScreenshotRemove: (stepId: string) => Promise<void>;
  onPublish?: () => Promise<void>;
  onBack?: () => void;
  onPreview?: () => void;
}

export function GuideEditor({
  guide,
  steps,
  onSave,
  onAddStep,
  onDeleteStep,
  onUpdateStep,
  onReorderSteps: _onReorderSteps,
  onScreenshotUpload,
  onScreenshotRemove,
  onPublish,
  onBack,
  onPreview,
}: GuideEditorProps) {
  const [title, setTitle] = useState(guide.title);
  const [description, setDescription] = useState(guide.description ?? '');
  const [visibility, setVisibility] = useState<GuideVisibility>(
    guide.visibility,
  );
  const [tags, setTags] = useState(guide.tags.join(', '));
  const [isSaving, startSaving] = useTransition();
  const [isAddingStep, startAddingStep] = useTransition();

  const handleSave = useCallback(() => {
    startSaving(async () => {
      try {
        await onSave(
          {
            title,
            description: description || undefined,
            visibility,
            tags: tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
          },
          steps,
        );
        toast.success('Guide saved');
      } catch {
        toast.error('Failed to save guide');
      }
    });
  }, [title, description, visibility, tags, steps, onSave]);

  const handleAddStep = useCallback(() => {
    startAddingStep(async () => {
      try {
        await onAddStep();
      } catch {
        toast.error('Failed to add step');
      }
    });
  }, [onAddStep]);

  const handlePublish = useCallback(() => {
    startSaving(async () => {
      try {
        await onPublish?.();
        toast.success('Guide published');
      } catch {
        toast.error('Failed to publish guide');
      }
    });
  }, [onPublish]);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Badge variant="secondary">{guide.status}</Badge>
        </div>

        <div className="flex items-center gap-2">
          {onPreview && (
            <Button variant="outline" size="sm" onClick={onPreview}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
          {onPublish && guide.status === 'draft' && (
            <Button size="sm" onClick={handlePublish} disabled={isSaving}>
              Publish
            </Button>
          )}
        </div>
      </div>

      {/* Guide metadata */}
      <div className="mb-6 space-y-4">
        <div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Guide title"
            className="border-none bg-transparent text-2xl font-bold shadow-none focus-visible:ring-0"
          />
        </div>

        <div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            rows={2}
            className="resize-none text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as GuideVisibility)}
            >
              <SelectTrigger className="mt-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tags (comma-separated)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="onboarding, tutorial"
              className="mt-1 h-9 text-sm"
            />
          </div>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Steps */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Steps ({steps.length})
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddStep}
          disabled={isAddingStep}
        >
          {isAddingStep ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Add Step
        </Button>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <StepEditor
            key={step.id}
            step={step}
            stepNumber={index + 1}
            onUpdate={onUpdateStep}
            onDelete={onDeleteStep}
            onScreenshotUpload={onScreenshotUpload}
            onScreenshotRemove={onScreenshotRemove}
          />
        ))}

        {steps.length === 0 && (
          <div className="text-muted-foreground rounded-lg border border-dashed p-12 text-center">
            <p className="mb-3">No steps yet. Add your first step to get started.</p>
            <Button variant="outline" onClick={handleAddStep} disabled={isAddingStep}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Step
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
