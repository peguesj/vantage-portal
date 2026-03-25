import {
  BookOpen,
  Building2,
  CreditCard,
  Headphones,
  Home,
  LayoutDashboard,
  MonitorCheck,
  Settings2,
  Shield,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { z } from 'zod';

import { NavigationConfigSchema } from '@kit/ui/navigation-schema';

import pathsConfig from '~/config/paths.config';

const iconClasses = 'w-4';

const routes = [
  {
    label: 'common:routes.application',
    children: [
      {
        label: 'common:routes.home',
        path: pathsConfig.app.home,
        Icon: <Home className={iconClasses} />,
        end: true,
      },
      {
        label: 'common:routes.guides',
        path: pathsConfig.app.guides,
        Icon: <BookOpen className={iconClasses} />,
      },
    ],
  },
  {
    label: 'common:routes.securityOperations',
    children: [
      {
        label: 'common:routes.soc',
        path: pathsConfig.app.soc,
        Icon: <Shield className={iconClasses} />,
      },
      {
        label: 'common:routes.compliance',
        path: pathsConfig.app.compliance,
        Icon: <ShieldCheck className={iconClasses} />,
      },
    ],
  },
  {
    label: 'common:routes.rmmDevices',
    children: [
      {
        label: 'common:routes.rmm',
        path: pathsConfig.app.rmm,
        Icon: <MonitorCheck className={iconClasses} />,
      },
    ],
  },
  {
    label: 'common:routes.clientPortal',
    children: [
      {
        label: 'common:routes.clients',
        path: pathsConfig.app.clients,
        Icon: <Building2 className={iconClasses} />,
      },
      {
        label: 'common:routes.billing',
        path: pathsConfig.app.billing,
        Icon: <CreditCard className={iconClasses} />,
      },
      {
        label: 'common:routes.support',
        path: pathsConfig.app.support,
        Icon: <Headphones className={iconClasses} />,
      },
    ],
  },
  {
    label: 'common:routes.administration',
    children: [
      {
        label: 'common:routes.admin',
        path: pathsConfig.app.admin,
        Icon: <LayoutDashboard className={iconClasses} />,
      },
      {
        label: 'common:routes.members',
        path: `${pathsConfig.app.home}/members`,
        Icon: <Users className={iconClasses} />,
      },
    ],
  },
  {
    label: 'common:routes.settings',
    children: [
      {
        label: 'common:routes.profile',
        path: pathsConfig.app.profileSettings,
        Icon: <User className={iconClasses} />,
      },
      {
        label: 'common:routes.accountSettings',
        path: `${pathsConfig.app.home}/settings`,
        Icon: <Settings2 className={iconClasses} />,
      },
    ],
  },
] satisfies z.infer<typeof NavigationConfigSchema>['routes'];

export const navigationConfig = NavigationConfigSchema.parse({
  routes,
  style: process.env.NEXT_PUBLIC_NAVIGATION_STYLE,
  sidebarCollapsed: process.env.NEXT_PUBLIC_HOME_SIDEBAR_COLLAPSED,
});
