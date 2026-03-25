import Link from 'next/link';

import {
  CreditCard,
  MonitorCheck,
  Settings2,
  Shield,
  ShieldCheck,
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

import pathsConfig from '~/config/paths.config';

interface PortalArea {
  key: string;
  title: string;
  description: string;
  path: string;
  icon: React.ElementType;
  status: 'active' | 'coming-soon';
}

const portalAreas: PortalArea[] = [
  {
    key: 'soc',
    title: 'Security Operations',
    description: 'SOC dashboard, alert triage, and incident management',
    path: pathsConfig.app.soc,
    icon: Shield,
    status: 'coming-soon',
  },
  {
    key: 'compliance',
    title: 'Compliance',
    description:
      'Framework mapping, evidence collection, and gap analysis',
    path: pathsConfig.app.compliance,
    icon: ShieldCheck,
    status: 'coming-soon',
  },
  {
    key: 'rmm',
    title: 'RMM & Devices',
    description:
      'Endpoint inventory, patch compliance, and remote control',
    path: pathsConfig.app.rmm,
    icon: MonitorCheck,
    status: 'coming-soon',
  },
  {
    key: 'clients',
    title: 'Client Management',
    description: 'Onboard and manage MSSP client accounts',
    path: pathsConfig.app.clients,
    icon: Users,
    status: 'active',
  },
  {
    key: 'billing',
    title: 'Billing',
    description: 'Invoicing, metering, and payment management',
    path: pathsConfig.app.billing,
    icon: CreditCard,
    status: 'coming-soon',
  },
  {
    key: 'admin',
    title: 'Admin Panel',
    description:
      'Staff management, system settings, and platform configuration',
    path: pathsConfig.app.admin,
    icon: Settings2,
    status: 'active',
  },
];

export default function HomePage() {
  return (
    <>
      <PageHeader
        title={'MSSP Portal'}
        description={'Manage your security operations, clients, and platform'}
      />

      <PageBody>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {portalAreas.map((area) => {
            const Icon = area.icon;
            const isActive = area.status === 'active';

            return (
              <Link
                key={area.key}
                href={area.path}
                className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
              >
                <Card className="h-full transition-colors group-hover:border-primary/50">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Icon
                        className="text-muted-foreground"
                        size={24}
                        aria-hidden="true"
                      />
                      <CardTitle className="text-base">{area.title}</CardTitle>
                    </div>

                    <Badge variant={isActive ? 'success' : 'secondary'}>
                      {isActive ? 'Active' : 'Coming Soon'}
                    </Badge>
                  </CardHeader>

                  <CardContent>
                    <CardDescription>{area.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </PageBody>
    </>
  );
}
