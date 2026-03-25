import { CreditCard, DollarSign, FileText, TrendingUp } from 'lucide-react';

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

type InvoiceStatus = 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';

const STATUS_BADGE: Record<InvoiceStatus, 'secondary' | 'default' | 'success' | 'destructive'> = {
  draft: 'secondary',
  pending: 'secondary',
  sent: 'default',
  paid: 'success',
  overdue: 'destructive',
  cancelled: 'secondary',
};

interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  total: number;
  currency: string;
  due_date: string | null;
  created_at: string;
}

const PLACEHOLDER_INVOICES: InvoiceRow[] = [];

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export default function BillingPage() {
  return (
    <>
      <PageHeader
        title="Billing"
        description="Invoicing, metering, and payment management"
      />

      <PageBody>
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="Outstanding"
              value={formatCurrency(0)}
              icon={DollarSign}
            />
            <StatCard label="Overdue" value={0} icon={CreditCard} />
            <StatCard
              label="Paid This Month"
              value={formatCurrency(0)}
              icon={TrendingUp}
            />
            <StatCard label="Drafts" value={0} icon={FileText} />
          </div>

          {/* Invoice list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoices</CardTitle>
              <CardDescription>All invoices across clients</CardDescription>
            </CardHeader>
            <CardContent>
              {PLACEHOLDER_INVOICES.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                  <FileText className="h-8 w-8 opacity-30" aria-hidden="true" />
                  <p>No invoices yet.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Invoice #</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 pr-4 font-medium">Amount</th>
                      <th className="pb-2 pr-4 font-medium">Due</th>
                      <th className="pb-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PLACEHOLDER_INVOICES.map((inv) => (
                      <tr key={inv.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-mono text-xs font-medium">
                          {inv.invoice_number}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={STATUS_BADGE[inv.status]}>
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          {formatCurrency(inv.total, inv.currency)}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {inv.due_date
                            ? new Date(inv.due_date).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(inv.created_at).toLocaleDateString()}
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
