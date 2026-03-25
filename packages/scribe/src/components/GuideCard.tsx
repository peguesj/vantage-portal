'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  Archive,
  Copy,
  Eye,
  FileText,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
} from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';

import type { Guide } from '../types';

interface GuideCardProps {
  guide: Guide;
  onView?: (guide: Guide) => void;
  onEdit?: (guide: Guide) => void;
  onShare?: (guide: Guide) => void;
  onDuplicate?: (guide: Guide) => void;
  onArchive?: (guide: Guide) => void;
  onDelete?: (guide: Guide) => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  published: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export function GuideCard({
  guide,
  onView,
  onEdit,
  onShare,
  onDuplicate,
  onArchive,
  onDelete,
}: GuideCardProps) {
  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{guide.title}</CardTitle>
            {guide.description && (
              <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                {guide.description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(guide)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(guide)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onShare && (
                <DropdownMenuItem onClick={() => onShare(guide)}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(guide)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onArchive && guide.status !== 'archived' && (
                <DropdownMenuItem onClick={() => onArchive(guide)}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(guide)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={statusColors[guide.status]}>
            {guide.status}
          </Badge>
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <FileText className="h-3 w-3" />
            {guide.stepCount} {guide.stepCount === 1 ? 'step' : 'steps'}
          </span>
          {guide.viewCount > 0 && (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Eye className="h-3 w-3" />
              {guide.viewCount}
            </span>
          )}
        </div>

        {guide.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {guide.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {guide.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{guide.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="text-muted-foreground pt-0 text-xs">
        Updated {formatDistanceToNow(guide.updatedAt, { addSuffix: true })}
      </CardFooter>
    </Card>
  );
}
