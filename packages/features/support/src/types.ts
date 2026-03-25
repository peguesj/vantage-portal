/**
 * @kit/support - Type definitions for support ticketing system
 */

// Ticket Status
export type TicketStatus = 'open' | 'answered' | 'customer-reply' | 'closed';

// Ticket Priority
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

// Department
export interface Department {
  id: string;
  name: string;
  description: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Ticket
export interface Ticket {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  department_id: string | null;
  customer_id: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  // Relations
  department?: Department | null;
  customer?: TicketUser | null;
  assignee?: TicketUser | null;
  replies?: TicketReply[];
  reply_count?: number;
  last_reply_at?: string | null;
}

// Ticket Reply
export interface TicketReply {
  id: string;
  ticket_id: string;
  author_id: string;
  content: string;
  is_staff_reply: boolean;
  is_internal_note: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  author?: TicketUser | null;
  attachments?: TicketAttachment[];
}

// Ticket Attachment
export interface TicketAttachment {
  id: string;
  reply_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

// User (simplified for ticket context)
export interface TicketUser {
  id: string;
  name: string;
  email: string | null;
  picture_url: string | null;
}

// Canned Response
export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  department_id: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Relations
  department?: Department | null;
}

// Canned Response Variable
export interface CannedResponseVariable {
  name: string;
  placeholder: string;
  description: string;
}

// Email Notification Types
export type EmailNotificationType =
  | 'ticket_created'
  | 'ticket_replied'
  | 'ticket_closed'
  | 'ticket_assigned'
  | 'ticket_status_changed';

// Email Notification
export interface EmailNotification {
  id: string;
  ticket_id: string;
  type: EmailNotificationType;
  recipient_email: string;
  subject: string;
  body: string;
  sent_at: string | null;
  error: string | null;
  created_at: string;
}

// List Filters
export interface TicketFilters {
  status?: TicketStatus | TicketStatus[];
  priority?: TicketPriority | TicketPriority[];
  department_id?: string;
  assigned_to?: string;
  customer_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Paginated Response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Available Template Variables
export const TEMPLATE_VARIABLES: CannedResponseVariable[] = [
  {
    name: 'customer_name',
    placeholder: '{{customer_name}}',
    description: 'Customer display name',
  },
  {
    name: 'ticket_id',
    placeholder: '{{ticket_id}}',
    description: 'Ticket reference number',
  },
  {
    name: 'ticket_subject',
    placeholder: '{{ticket_subject}}',
    description: 'Ticket subject line',
  },
  {
    name: 'agent_name',
    placeholder: '{{agent_name}}',
    description: 'Support agent name',
  },
  {
    name: 'department_name',
    placeholder: '{{department_name}}',
    description: 'Department name',
  },
];

// Status Configuration
export const TICKET_STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; color: string; description: string }
> = {
  open: {
    label: 'Open',
    color: 'blue',
    description: 'Awaiting staff response',
  },
  answered: {
    label: 'Answered',
    color: 'green',
    description: 'Staff has responded',
  },
  'customer-reply': {
    label: 'Customer Reply',
    color: 'yellow',
    description: 'Customer has replied',
  },
  closed: {
    label: 'Closed',
    color: 'gray',
    description: 'Ticket resolved',
  },
};

// Priority Configuration
export const TICKET_PRIORITY_CONFIG: Record<
  TicketPriority,
  { label: string; color: string; weight: number }
> = {
  low: {
    label: 'Low',
    color: 'slate',
    weight: 1,
  },
  medium: {
    label: 'Medium',
    color: 'blue',
    weight: 2,
  },
  high: {
    label: 'High',
    color: 'orange',
    weight: 3,
  },
  urgent: {
    label: 'Urgent',
    color: 'red',
    weight: 4,
  },
};
