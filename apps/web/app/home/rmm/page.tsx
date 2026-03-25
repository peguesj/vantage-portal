import { MonitorCheck, Server, ShieldAlert, Wifi } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { PageBody, PageHeader } from '@kit/ui/page';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
}

function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-sm font-medium">{label}</CardDescription>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

interface EndpointRow {
  id: string;
  hostname: string;
  client: string;
  platform: string;
  patch_status: 'up_to_date' | 'pending' | 'overdue';
  online: boolean;
  last_seen: string;
}

const PLACEHOLDER_ENDPOINTS: EndpointRow[] = [];

const PATCH_BADGE: Record<
  EndpointRow['patch_status'],
  'success' | 'secondary' | 'destructive'
> = {
  up_to_date: 'success',
  pending: 'secondary',
  overdue: 'destructive',
};

export default function RmmPage() {
  return (
    <>
      <PageHeader
        title="RMM & Devices"
        description="Endpoint inventory, patch compliance, and remote control"
      />

      <PageBody>
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Total Endpoints" value={0} icon={Server} />
            <StatCard label="Online" value={0} icon={Wifi} />
            <StatCard label="Patch Overdue" value={0} icon={ShieldAlert} />
            <StatCard label="Managed Clients" value={0} icon={MonitorCheck} />
          </div>

          {/* Endpoint inventory */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Endpoint Inventory</CardTitle>
              <CardDescription>
                All managed endpoints across clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {PLACEHOLDER_ENDPOINTS.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                  <MonitorCheck
                    className="h-8 w-8 opacity-30"
                    aria-hidden="true"
                  />
                  <p>
                    No endpoints enrolled. Connect Tactical RMM to populate
                    inventory.
                  </p>
                  <Badge variant="secondary">Tactical RMM — coming soon</Badge>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Hostname</th>
                      <th className="pb-2 pr-4 font-medium">Client</th>
                      <th className="pb-2 pr-4 font-medium">Platform</th>
                      <th className="pb-2 pr-4 font-medium">Patches</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 font-medium">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PLACEHOLDER_ENDPOINTS.map((ep) => (
                      <tr key={ep.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{ep.hostname}</td>
                        <td className="py-3 pr-4">{ep.client}</td>
                        <td className="py-3 pr-4">{ep.platform}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={PATCH_BADGE[ep.patch_status]}>
                            {ep.patch_status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={ep.online ? 'success' : 'secondary'}>
                            {ep.online ? 'Online' : 'Offline'}
                          </Badge>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(ep.last_seen).toLocaleDateString()}
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
