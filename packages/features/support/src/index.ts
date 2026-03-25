/**
 * @kit/support - Support ticketing system package
 *
 * This package provides a complete support ticketing system with:
 * - Ticket CRUD operations
 * - Department management
 * - Reply/conversation management
 * - Status transitions
 * - Priority management
 * - Canned responses
 * - Email notification preparation
 */

// Types
export * from './types';

// Schemas
export * from './schemas/tickets';

// Server actions — ticket types and functions
// Note: TicketStatus and TicketPriority are intentionally NOT re-exported here
// because types.ts already exports those names (legacy WHMCS-era values). Import
// the DB-aligned variants directly from the server actions subpath when needed.
export type {
  TicketSummary,
  TicketWithReplies,
  TicketStats,
  TicketListResult,
  ActionResult,
} from './server/ticket-server-actions';
export {
  createTicket,
  listTickets,
  getTicket,
  replyToTicket,
  updateTicketStatus,
  getTicketStats,
} from './server/ticket-server-actions';
