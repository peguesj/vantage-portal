'use client';

import { useState } from 'react';

import { FileText, Plus, Search } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import type { Guide, GuideFilterOptions, GuideStatus } from '../types';
import { GuideCard } from './GuideCard';

interface GuideListProps {
  guides: Guide[];
  isLoading?: boolean;
  filters?: GuideFilterOptions;
  onFilterChange?: (filters: GuideFilterOptions) => void;
  onCreateNew?: () => void;
  onView?: (guide: Guide) => void;
  onEdit?: (guide: Guide) => void;
  onShare?: (guide: Guide) => void;
  onDuplicate?: (guide: Guide) => void;
  onArchive?: (guide: Guide) => void;
  onDelete?: (guide: Guide) => void;
}

export function GuideList({
  guides,
  isLoading,
  filters,
  onFilterChange,
  onCreateNew,
  onView,
  onEdit,
  onShare,
  onDuplicate,
  onArchive,
  onDelete,
}: GuideListProps) {
  const [search, setSearch] = useState(filters?.search ?? '');

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFilterChange?.({ ...filters, search: value || undefined });
  };

  const handleStatusChange = (value: string) => {
    const status = value === 'all' ? undefined : (value as GuideStatus);
    onFilterChange?.({ ...filters, status });
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search guides..."
            className="pl-9"
          />
        </div>

        <Select
          value={
            filters?.status
              ? Array.isArray(filters.status)
                ? 'all'
                : filters.status
              : 'all'
          }
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        {onCreateNew && (
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            New Guide
          </Button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-muted h-48 animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : guides.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <GuideCard
              key={guide.id}
              guide={guide}
              onView={onView}
              onEdit={onEdit}
              onShare={onShare}
              onDuplicate={onDuplicate}
              onArchive={onArchive}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground rounded-lg border border-dashed p-16 text-center">
          <FileText className="mx-auto mb-4 h-16 w-16 opacity-50" />
          <h3 className="mb-2 text-lg font-medium">No guides yet</h3>
          <p className="mb-4 text-sm">
            Create your first step-by-step guide to get started.
          </p>
          {onCreateNew && (
            <Button onClick={onCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create Guide
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
