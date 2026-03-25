import Link from 'next/link';

import { ArrowLeft } from 'lucide-react';

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

export default function NewClientPage() {
  return (
    <>
      <PageHeader
        title="Add Client"
        description="Onboard a new MSSP client account"
      />

      <PageBody>
        <div className="max-w-2xl space-y-6">
          <Link href={pathsConfig.app.clients}>
            <Button variant="ghost" size="sm" className="gap-1.5 pl-0">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Clients
            </Button>
          </Link>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client Details</CardTitle>
              <CardDescription>
                Enter the details for the new client account. The client will be
                provisioned with the selected service tier.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                Client onboarding form — coming in Sprint 3
              </div>
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
