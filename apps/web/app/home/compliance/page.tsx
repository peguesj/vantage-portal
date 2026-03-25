import { CheckCircle2, FileSearch, ShieldCheck, XCircle } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { PageBody, PageHeader } from '@kit/ui/page';

interface FrameworkCard {
  id: string;
  name: string;
  version: string;
  controls_total: number;
  controls_met: number;
  status: 'compliant' | 'in_progress' | 'gap';
}

const FRAMEWORKS: FrameworkCard[] = [
  {
    id: 'soc2',
    name: 'SOC 2 Type II',
    version: '2024',
    controls_total: 64,
    controls_met: 0,
    status: 'in_progress',
  },
  {
    id: 'iso27001',
    name: 'ISO 27001',
    version: '2022',
    controls_total: 93,
    controls_met: 0,
    status: 'in_progress',
  },
  {
    id: 'nist-csf',
    name: 'NIST CSF',
    version: '2.0',
    controls_total: 106,
    controls_met: 0,
    status: 'in_progress',
  },
  {
    id: 'cis',
    name: 'CIS Controls',
    version: 'v8.1',
    controls_total: 153,
    controls_met: 0,
    status: 'in_progress',
  },
];

const STATUS_BADGE: Record<
  FrameworkCard['status'],
  'success' | 'secondary' | 'warning'
> = {
  compliant: 'success',
  in_progress: 'secondary',
  gap: 'warning' as 'secondary',
};

const STATUS_ICON: Record<FrameworkCard['status'], React.ElementType> = {
  compliant: CheckCircle2,
  in_progress: FileSearch,
  gap: XCircle,
};

export default function CompliancePage() {
  return (
    <>
      <PageHeader
        title="Compliance"
        description="Framework mapping, evidence collection, and gap analysis"
      />

      <PageBody>
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-sm font-medium">
                  Frameworks Tracked
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{FRAMEWORKS.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-sm font-medium">
                  Fully Compliant
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {FRAMEWORKS.filter((f) => f.status === 'compliant').length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-sm font-medium">
                  In Progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {FRAMEWORKS.filter((f) => f.status === 'in_progress').length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-sm font-medium">
                  Gaps Found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {FRAMEWORKS.filter((f) => f.status === 'gap').length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Framework cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {FRAMEWORKS.map((fw) => {
              const StatusIcon = STATUS_ICON[fw.status];
              const pct =
                fw.controls_total > 0
                  ? Math.round((fw.controls_met / fw.controls_total) * 100)
                  : 0;

              return (
                <Card key={fw.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <ShieldCheck
                        className="text-muted-foreground"
                        size={20}
                        aria-hidden="true"
                      />
                      <div>
                        <CardTitle className="text-sm">{fw.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {fw.version}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={STATUS_BADGE[fw.status]} className="gap-1">
                      <StatusIcon className="h-3 w-3" aria-hidden="true" />
                      {fw.status.replace('_', ' ')}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {fw.controls_met} / {fw.controls_total} controls
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </PageBody>
    </>
  );
}
