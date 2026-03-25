'use client';

import { useCallback, useState, useTransition } from 'react';

import {
  Check,
  Copy,
  Link2,
  Loader2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
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

import type { GuideShare, SharePermission } from '../types';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guideId: string;
  guideTitle: string;
  shares: GuideShare[];
  onCreateShare: (data: {
    permission: SharePermission;
    password?: string;
    expiresAt?: Date;
  }) => Promise<GuideShare>;
  onRevokeShare: (shareId: string) => Promise<void>;
  baseShareUrl: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  guideTitle,
  shares,
  onCreateShare,
  onRevokeShare,
  baseShareUrl,
}: ShareDialogProps) {
  const [permission, setPermission] = useState<SharePermission>('view');
  const [password, setPassword] = useState('');
  const [isCreating, startCreating] = useTransition();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleCreate = useCallback(() => {
    startCreating(async () => {
      try {
        await onCreateShare({
          permission,
          password: password || undefined,
        });
        setPassword('');
        toast.success('Share link created');
      } catch {
        toast.error('Failed to create share link');
      }
    });
  }, [permission, password, onCreateShare]);

  const copyLink = useCallback(
    (token: string) => {
      const url = `${baseShareUrl}/${token}`;
      navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    },
    [baseShareUrl],
  );

  const handleRevoke = useCallback(
    async (shareId: string) => {
      try {
        await onRevokeShare(shareId);
        toast.success('Share link revoked');
      } catch {
        toast.error('Failed to revoke share link');
      }
    },
    [onRevokeShare],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Guide</DialogTitle>
          <DialogDescription>
            Create share links for &quot;{guideTitle}&quot;
          </DialogDescription>
        </DialogHeader>

        {/* Create new share */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Permission</Label>
              <Select
                value={permission}
                onValueChange={(v) => setPermission(v as SharePermission)}
              >
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View only</SelectItem>
                  <SelectItem value="comment">Can comment</SelectItem>
                  <SelectItem value="edit">Can edit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Password (optional)</Label>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set password"
                type="password"
                className="mt-1 h-9 text-sm"
              />
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className="w-full"
          >
            {isCreating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="mr-2 h-4 w-4" />
            )}
            Create Share Link
          </Button>
        </div>

        {shares.length > 0 && (
          <>
            <Separator />

            {/* Existing shares */}
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="max-w-32 truncate text-xs">
                        {share.token.slice(0, 12)}...
                      </code>
                      <Badge variant="outline" className="text-xs">
                        {share.permission}
                      </Badge>
                      {share.hasPassword && (
                        <Badge variant="secondary" className="text-xs">
                          password
                        </Badge>
                      )}
                      {!share.isActive && (
                        <Badge variant="destructive" className="text-xs">
                          revoked
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {share.currentViews} views
                      {share.maxViews && ` / ${share.maxViews} max`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {share.isActive && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyLink(share.token)}
                        >
                          {copiedToken === share.token ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive h-7 w-7"
                          onClick={() => handleRevoke(share.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
