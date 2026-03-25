import { AlertTriangle, CheckCircle2, Shield, Zap } from 'lucide-react';

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
  variant?: 'default' | 'destructive' | 'warning';
}

function StatCard({ label, value, icon: Icon, variant = 'default' }: StatCardProps) {
  const iconColorMap = {
    default: 'text-muted-foreground',
    destructive: 'text-destructive',
    warning: 'text-amber-500',
  } as const;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-sm font-medium">{label}</CardDescription>
        <Icon className={`h-4 w-4 ${iconColorMap[variant]}`} aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

const SEVERITY_BADGE: Record<string, 'destructive' | 'warning' | 'secondary'> = {
  critical: 'destructive',
  high: 'warning',
  medium: 'secondary',
  low: 'secondary',
  info: 'secondary',
};

interface IncidentRow {
  id: string;
  title: string;
  severity: keyof typeof SEVERITY_BADGE;
  status: string;
  category: string;
  created_at: string;
}

const PLACEHOLDER_INCIDENTS: IncidentRow[] = [];

export default function SocPage() {
  return (
    <>
      <PageHeader
        title="Security Operations Center"
        description="Incident queue, alert triage, and threat monitoring"
      />

      <PageBody>
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Open Incidents" value={0} icon={Shield} />
            <StatCard
              label="Critical"
              value={0}
              icon={AlertTriangle}
              variant="destructive"
            />
            <StatCard
              label="Open Alerts"
              value={0}
              icon={Zap}
              variant="warning"
            />
            <StatCard label="Resolved Today" value={0} icon={CheckCircle2} />
          </div>

          {/* Incident Queue */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Incidents</CardTitle>
              <CardDescription>
                Open and in-progress security incidents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {PLACEHOLDER_INCIDENTS.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  No active incidents
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Title</th>
                      <th className="pb-2 pr-4 font-medium">Severity</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 pr-4 font-medium">Category</th>
                      <th className="pb-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PLACEHOLDER_INCIDENTS.map((incident) => (
                      <tr key={incident.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{incident.title}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={SEVERITY_BADGE[incident.severity]}>
                            {incident.severity}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 capitalize">{incident.status}</td>
                        <td className="py-3 pr-4">{incident.category}</td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(incident.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Alert Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Alerts</CardTitle>
              <CardDescription>Unacknowledged alerts requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No unacknowledged alerts
              </div>
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
