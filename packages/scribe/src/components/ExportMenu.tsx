'use client';

import { useCallback, useTransition } from 'react';

import { Download, FileCode, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';

interface ExportMenuProps {
  guideId: string;
  guideTitle: string;
  onExport: (guideId: string, format: 'markdown' | 'html') => Promise<string>;
}

export function ExportMenu({
  guideId,
  guideTitle,
  onExport,
}: ExportMenuProps) {
  const [isExporting, startExporting] = useTransition();

  const handleExport = useCallback(
    (format: 'markdown' | 'html') => {
      startExporting(async () => {
        try {
          const content = await onExport(guideId, format);
          const ext = format === 'markdown' ? 'md' : 'html';
          const mimeType =
            format === 'markdown' ? 'text/markdown' : 'text/html';

          const blob = new Blob([content], { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${guideTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          toast.success(`Exported as ${format.toUpperCase()}`);
        } catch {
          toast.error(`Failed to export as ${format}`);
        }
      });
    },
    [guideId, guideTitle, onExport],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('markdown')}>
          <FileText className="mr-2 h-4 w-4" />
          Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('html')}>
          <FileCode className="mr-2 h-4 w-4" />
          HTML (.html)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
