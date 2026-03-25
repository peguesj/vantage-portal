import {
  Activity,
  Database,
  Key,
  LayoutDashboard,
  Settings2,
  Users,
} from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { PageBody, PageHeader } from '@kit/ui/page';

interface AdminSectionProps {
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'success';
  items?: string[];
}

function AdminSection({
  icon: Icon,
  title,
  description,
  badge,
  badgeVariant = 'secondary',
  items = [],
}: AdminSectionProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon
            className="text-muted-foreground"
            size={20}
            aria-hidden="true"
          />
          <div>
            <CardTitle className="text-sm">{title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {description}
            </CardDescription>
          </div>
        </div>
        {badge ? (
          <Badge variant={badgeVariant}>{badge}</Badge>
        ) : null}
      </CardHeader>
      {items.length > 0 ? (
        <CardContent>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {items.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}
    </Card>
  );
}

export default function AdminPage() {
  return (
    <>
      <PageHeader
        title="Admin Panel"
        description="Platform configuration, staff management, and system health"
      />

      <PageBody>
        <div className="space-y-6">
          {/* Platform health */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-sm font-medium">
                  Platform Status
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className="text-sm font-semibold">Operational</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-sm font-medium">
                  Staff Users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">—</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-sm font-medium">
                  Active Sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">—</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-sm font-medium">
                  License Tier
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="default">Enterprise</Badge>
              </CardContent>
            </Card>
          </div>

          {/* Admin sections grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AdminSection
              icon={Users}
              title="Staff Management"
              description="Manage MSSP staff, roles, and on-call schedules"
              badge="Active"
              badgeVariant="success"
              items={[
                'User provisioning and deprovisioning',
                'Role assignment and RBAC configuration',
                'Shift schedules and on-call rotations',
              ]}
            />
            <AdminSection
              icon={Key}
              title="License & Quota"
              description="License key management and seat/endpoint quotas"
              badge="Active"
              badgeVariant="success"
              items={[
                'License key validation and status',
                'Seat count and endpoint quota tracking',
                'Tier upgrade and grace period management',
              ]}
            />
            <AdminSection
              icon={Database}
              title="Integrations"
              description="Connected platforms and API configurations"
              badge="Coming Soon"
              items={[
                'Tactical RMM connector status',
                'NATS JetStream event bus health',
                'Stripe billing integration',
              ]}
            />
            <AdminSection
              icon={Activity}
              title="Audit Log"
              description="Immutable platform activity and access log"
              badge="Active"
              badgeVariant="success"
              items={[
                'All user actions and API calls',
                'Authentication and session events',
                'Admin configuration changes',
              ]}
            />
            <AdminSection
              icon={Settings2}
              title="Platform Settings"
              description="Global configuration and feature flags"
              badge="Coming Soon"
              items={[
                'Email and notification templates',
                'Feature flag management',
                'Maintenance mode and announcements',
              ]}
            />
            <AdminSection
              icon={LayoutDashboard}
              title="System Health"
              description="Service uptime, queue depth, and performance metrics"
              badge="Coming Soon"
              items={[
                'NATS consumer group health',
                'Alert ingestion pipeline metrics',
                'DB query performance and cache hit rates',
              ]}
            />
          </div>
        </div>
      </PageBody>
    </>
  );
}
