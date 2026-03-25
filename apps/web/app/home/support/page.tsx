import { CheckCircle2, Clock, Headphones, Zap } from 'lucide-react';

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

type TicketStatus = 'open' | 'pending' | 'on_hold' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

const PRIORITY_BADGE: Record<TicketPriority, 'secondary' | 'default' | 'warning' | 'destructive'> = {
  low: 'secondary',
  medium: 'default',
  high: 'warning',
  urgent: 'destructive',
};

const STATUS_BADGE: Record<TicketStatus, 'default' | 'secondary' | 'success'> = {
  open: 'default',
  pending: 'secondary',
  on_hold: 'secondary',
  resolved: 'success',
  closed: 'secondary',
};

interface TicketRow {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
}

const PLACEHOLDER_TICKETS: TicketRow[] = [];

export default function SupportPage() {
  return (
    <>
      <PageHeader
        title="Support"
        description="Helpdesk ticketing and client request management"
      />

      <PageBody>
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Open Tickets" value={0} icon={Headphones} />
            <StatCard label="Pending" value={0} icon={Clock} />
            <StatCard label="High Priority" value={0} icon={Zap} />
            <StatCard label="Resolved Today" value={0} icon={CheckCircle2} />
          </div>

          {/* Ticket queue */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ticket Queue</CardTitle>
              <CardDescription>Active support requests</CardDescription>
            </CardHeader>
            <CardContent>
              {PLACEHOLDER_TICKETS.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                  <Headphones className="h-8 w-8 opacity-30" aria-hidden="true" />
                  <p>No open tickets.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Subject</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 pr-4 font-medium">Priority</th>
                      <th className="pb-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PLACEHOLDER_TICKETS.map((ticket) => (
                      <tr key={ticket.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{ticket.subject}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={STATUS_BADGE[ticket.status]}>
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={PRIORITY_BADGE[ticket.priority]}>
                            {ticket.priority}
                          </Badge>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(ticket.created_at).toLocaleDateString()}
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
