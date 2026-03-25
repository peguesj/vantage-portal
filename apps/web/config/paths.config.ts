import { z } from 'zod';

const PathsSchema = z.object({
  auth: z.object({
    signIn: z.string().min(1),
    signUp: z.string().min(1),
    verifyMfa: z.string().min(1),
    callback: z.string().min(1),
    passwordReset: z.string().min(1),
    passwordUpdate: z.string().min(1),
  }),
  app: z.object({
    home: z.string().min(1),
    profileSettings: z.string().min(1),
    guides: z.string().min(1),
    guidesNew: z.string().min(1),
    // MSSP Portal Sections
    soc: z.string().min(1),
    rmm: z.string().min(1),
    billing: z.string().min(1),
    compliance: z.string().min(1),
    clients: z.string().min(1),
    admin: z.string().min(1),
    support: z.string().min(1),
  }),
});

const pathsConfig = PathsSchema.parse({
  auth: {
    signIn: '/auth/sign-in',
    signUp: '/auth/sign-up',
    verifyMfa: '/auth/verify',
    callback: '/auth/callback',
    passwordReset: '/auth/password-reset',
    passwordUpdate: '/update-password',
  },
  app: {
    home: '/home',
    profileSettings: '/home/settings',
    guides: '/home/guides',
    guidesNew: '/home/guides/new',
    // MSSP Portal Sections
    soc: '/home/soc',
    rmm: '/home/rmm',
    billing: '/home/billing',
    compliance: '/home/compliance',
    clients: '/home/clients',
    admin: '/home/admin',
    support: '/home/support',
  },
} satisfies z.infer<typeof PathsSchema>);

export default pathsConfig;
