import Link from 'next/link';

import { Building2, Plus } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { PageBody, PageHeader } from '@kit/ui/page';

import pathsConfig from '~/config/paths.config';

const TIER_BADGE: Record<
  string,
  'default' | 'secondary' | 'success' | 'warning'
> = {
  starter: 'secondary',
  professional: 'default',
  enterprise: 'success',
  sovereign: 'warning',
};

const STATUS_BADGE: Record<string, 'success' | 'destructive' | 'warning'> = {
  active: 'success',
  suspended: 'warning',
  terminated: 'destructive',
};

interface ClientRow {
  id: string;
  name: string;
  slug: string;
  service_tier: string;
  status: string;
  created_at: string;
}

const PLACEHOLDER_CLIENTS: ClientRow[] = [];

export default function ClientsPage() {
  return (
    <>
      <PageHeader
        title="Client Management"
        description="Onboard and manage MSSP client accounts"
      />

      <PageBody>
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-sm font-medium">
                  Total Clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">0</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-sm font-medium">
                  Active
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">0</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-sm font-medium">
                  Enterprise+
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">0</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-sm font-medium">
                  Suspended
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">0</p>
              </CardContent>
            </Card>
          </div>

          {/* Client list */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Clients</CardTitle>
                <CardDescription>All managed client accounts</CardDescription>
              </div>
              <Link href={`${pathsConfig.app.clients}/new`}>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add Client
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {PLACEHOLDER_CLIENTS.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                  <Building2 className="h-8 w-8 opacity-30" aria-hidden="true" />
                  <p>No clients yet. Add your first client to get started.</p>
                  <Link href={`${pathsConfig.app.clients}/new`}>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Add Client
                    </Button>
                  </Link>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Name</th>
                      <th className="pb-2 pr-4 font-medium">Slug</th>
                      <th className="pb-2 pr-4 font-medium">Tier</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PLACEHOLDER_CLIENTS.map((client) => (
                      <tr key={client.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">
                          <Link
                            href={`${pathsConfig.app.clients}/${client.id}`}
                            className="hover:underline"
                          >
                            {client.name}
                          </Link>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {client.slug}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={TIER_BADGE[client.service_tier]}>
                            {client.service_tier}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={STATUS_BADGE[client.status]}>
                            {client.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(client.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
