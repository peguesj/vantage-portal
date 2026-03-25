'use client';

import { ArrowLeft, Download, Eye, FileText, Share2 } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Separator } from '@kit/ui/separator';

import type { Guide, GuideStep } from '../types';
import { StepViewer } from './StepViewer';

interface GuideViewerProps {
  guide: Guide;
  steps: GuideStep[];
  onBack?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onExport?: () => void;
}

export function GuideViewer({
  guide,
  steps,
  onBack,
  onEdit,
  onShare,
  onExport,
}: GuideViewerProps) {
  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            )}
            {onShare && (
              <Button variant="outline" size="sm" onClick={onShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            )}
            {onEdit && (
              <Button size="sm" onClick={onEdit}>
                Edit
              </Button>
            )}
          </div>
        </div>

        <h1 className="text-2xl font-bold">{guide.title}</h1>

        {guide.description && (
          <p className="text-muted-foreground mt-2">{guide.description}</p>
        )}

        <div className="mt-3 flex items-center gap-3">
          <Badge variant="secondary">
            <FileText className="mr-1 h-3 w-3" />
            {steps.length} {steps.length === 1 ? 'step' : 'steps'}
          </Badge>

          {guide.viewCount > 0 && (
            <span className="text-muted-foreground flex items-center gap-1 text-sm">
              <Eye className="h-3 w-3" />
              {guide.viewCount} views
            </span>
          )}

          {guide.tags.length > 0 && (
            <div className="flex gap-1">
              {guide.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <Separator className="mb-8" />

      {/* Steps */}
      {steps.length > 0 ? (
        <div>
          {steps.map((step, index) => (
            <StepViewer
              key={step.id}
              step={step}
              stepNumber={index + 1}
            />
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground py-12 text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 opacity-50" />
          <p>This guide has no steps yet.</p>
        </div>
      )}
    </div>
  );
}
