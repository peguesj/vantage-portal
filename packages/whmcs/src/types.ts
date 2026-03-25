import { z } from 'zod';

// ============================================================================
// Configuration Types
// ============================================================================

export const WhmcsConfigSchema = z.object({
  apiUrl: z.string().url(),
  apiIdentifier: z.string().min(1),
  apiSecret: z.string().min(1),
  /** Optional access key for additional security */
  accessKey: z.string().optional(),
  /** Request timeout in milliseconds (default: 30000) */
  timeout: z.number().positive().default(30000),
  /** Number of retry attempts on failure (default: 3) */
  retries: z.number().min(0).max(10).default(3),
  /** Enable request/response logging (default: false) */
  debug: z.boolean().default(false),
});

export type WhmcsConfig = z.infer<typeof WhmcsConfigSchema>;

// ============================================================================
// Base API Response Types
// ============================================================================

export const WhmcsBaseResponseSchema = z.object({
  result: z.enum(['success', 'error']),
  message: z.string().optional(),
});

export type WhmcsBaseResponse = z.infer<typeof WhmcsBaseResponseSchema>;

export const WhmcsErrorResponseSchema = WhmcsBaseResponseSchema.extend({
  result: z.literal('error'),
  message: z.string(),
});

export type WhmcsErrorResponse = z.infer<typeof WhmcsErrorResponseSchema>;

export const WhmcsPaginationSchema = z.object({
  startnumber: z.number().default(0),
  numreturned: z.number(),
  totalresults: z.number(),
});

export type WhmcsPagination = z.infer<typeof WhmcsPaginationSchema>;

// ============================================================================
// Client Entity Types
// ============================================================================

export const WhmcsClientSchema = z.object({
  id: z.number(),
  uuid: z.string().optional(),
  firstname: z.string(),
  lastname: z.string(),
  fullname: z.string().optional(),
  companyname: z.string().optional(),
  email: z.string().email(),
  address1: z.string(),
  address2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  postcode: z.string(),
  country: z.string(),
  phonenumber: z.string(),
  tax_id: z.string().optional(),
  password: z.string().optional(),
  currency: z.number(),
  defaultgateway: z.string().optional(),
  credit: z.string().optional(),
  taxexempt: z.boolean().optional(),
  latefeeoveride: z.boolean().optional(),
  overideduenotices: z.boolean().optional(),
  separateinvoices: z.boolean().optional(),
  disableautocc: z.boolean().optional(),
  datecreated: z.string(),
  notes: z.string().optional(),
  billingcid: z.number().optional(),
  groupid: z.number().optional(),
  status: z.enum(['Active', 'Inactive', 'Closed']),
  lastlogin: z.string().optional(),
  language: z.string().optional(),
  isOptedInToMarketingEmails: z.boolean().optional(),
  emailoptout: z.boolean().optional(),
  overrideautoclose: z.boolean().optional(),
  allowSingleSignOn: z.number().optional(),
});

export type WhmcsClient = z.infer<typeof WhmcsClientSchema>;

export const WhmcsClientContactSchema = z.object({
  id: z.number(),
  userid: z.number(),
  firstname: z.string(),
  lastname: z.string(),
  companyname: z.string().optional(),
  email: z.string().email(),
  address1: z.string(),
  address2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  postcode: z.string(),
  country: z.string(),
  phonenumber: z.string(),
  subaccount: z.boolean().optional(),
  password: z.string().optional(),
  permissions: z.string().optional(),
  generalemails: z.boolean().optional(),
  productemails: z.boolean().optional(),
  domainemails: z.boolean().optional(),
  invoiceemails: z.boolean().optional(),
  supportemails: z.boolean().optional(),
});

export type WhmcsClientContact = z.infer<typeof WhmcsClientContactSchema>;

// ============================================================================
// Product/Service Entity Types
// ============================================================================

export const WhmcsProductSchema = z.object({
  pid: z.number(),
  gid: z.number(),
  type: z.enum(['hostingaccount', 'reselleraccount', 'server', 'other']),
  name: z.string(),
  slug: z.string().optional(),
  description: z.string().optional(),
  module: z.string().optional(),
  paytype: z.enum(['free', 'onetime', 'recurring']),
  pricing: z
    .record(
      z.object({
        prefix: z.string().optional(),
        suffix: z.string().optional(),
        msetupfee: z.string().optional(),
        qsetupfee: z.string().optional(),
        ssetupfee: z.string().optional(),
        asetupfee: z.string().optional(),
        bsetupfee: z.string().optional(),
        tsetupfee: z.string().optional(),
        monthly: z.string().optional(),
        quarterly: z.string().optional(),
        semiannually: z.string().optional(),
        annually: z.string().optional(),
        biennially: z.string().optional(),
        triennially: z.string().optional(),
      })
    )
    .optional(),
  configoptions: z.array(z.unknown()).optional(),
  customfields: z.array(z.unknown()).optional(),
});

export type WhmcsProduct = z.infer<typeof WhmcsProductSchema>;

export const WhmcsServiceSchema = z.object({
  id: z.number(),
  clientid: z.number(),
  orderid: z.number(),
  pid: z.number(),
  regdate: z.string(),
  name: z.string().optional(),
  translated_name: z.string().optional(),
  groupname: z.string().optional(),
  translated_groupname: z.string().optional(),
  domain: z.string().optional(),
  dedicatedip: z.string().optional(),
  serverid: z.number().optional(),
  servername: z.string().optional(),
  serverip: z.string().optional(),
  firstpaymentamount: z.string(),
  recurringamount: z.string(),
  paymentmethod: z.string(),
  paymentmethodname: z.string().optional(),
  billingcycle: z.string(),
  nextduedate: z.string(),
  status: z.enum([
    'Pending',
    'Active',
    'Suspended',
    'Terminated',
    'Cancelled',
    'Fraud',
    'Completed',
  ]),
  username: z.string().optional(),
  password: z.string().optional(),
  subscriptionid: z.string().optional(),
  promoid: z.number().optional(),
  overideautosuspend: z.boolean().optional(),
  overidesuspenduntil: z.string().optional(),
  ns1: z.string().optional(),
  ns2: z.string().optional(),
  assignedips: z.string().optional(),
  notes: z.string().optional(),
  diskusage: z.number().optional(),
  disklimit: z.number().optional(),
  bwusage: z.number().optional(),
  bwlimit: z.number().optional(),
  lastupdate: z.string().optional(),
  customfields: z.array(z.unknown()).optional(),
  configoptions: z.array(z.unknown()).optional(),
});

export type WhmcsService = z.infer<typeof WhmcsServiceSchema>;

export const WhmcsProductGroupSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string().optional(),
  headline: z.string().optional(),
  tagline: z.string().optional(),
  orderfrmtpl: z.string().optional(),
  disabledgateways: z.string().optional(),
  hidden: z.boolean().optional(),
  order: z.number().optional(),
});

export type WhmcsProductGroup = z.infer<typeof WhmcsProductGroupSchema>;

// ============================================================================
// Order Entity Types
// ============================================================================

export const WhmcsOrderSchema = z.object({
  id: z.number(),
  ordernum: z.string(),
  userid: z.number(),
  contactid: z.number().optional(),
  date: z.string(),
  nameservers: z.string().optional(),
  transfersecret: z.string().optional(),
  renewals: z.string().optional(),
  promocode: z.string().optional(),
  promotype: z.string().optional(),
  promovalue: z.string().optional(),
  orderdata: z.string().optional(),
  amount: z.string(),
  paymentmethod: z.string(),
  invoiceid: z.number(),
  status: z.enum([
    'Pending',
    'Active',
    'Fraud',
    'Cancelled',
    'Refunded',
    'Draft',
  ]),
  ipaddress: z.string().optional(),
  fraudmodule: z.string().optional(),
  fraudoutput: z.string().optional(),
  notes: z.string().optional(),
  lineitems: z
    .array(
      z.object({
        type: z.string(),
        relid: z.number(),
        producttype: z.string().optional(),
        product: z.string().optional(),
        domain: z.string().optional(),
        billingcycle: z.string().optional(),
        amount: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .optional(),
});

export type WhmcsOrder = z.infer<typeof WhmcsOrderSchema>;

// ============================================================================
// Invoice Entity Types
// ============================================================================

export const WhmcsInvoiceItemSchema = z.object({
  id: z.number(),
  type: z.string(),
  relid: z.number(),
  description: z.string(),
  amount: z.string(),
  taxed: z.boolean(),
});

export type WhmcsInvoiceItem = z.infer<typeof WhmcsInvoiceItemSchema>;

export const WhmcsInvoiceSchema = z.object({
  invoiceid: z.number(),
  invoicenum: z.string().optional(),
  userid: z.number(),
  date: z.string(),
  duedate: z.string(),
  datepaid: z.string().optional(),
  lastcaptureattempt: z.string().optional(),
  subtotal: z.string(),
  credit: z.string().optional(),
  tax: z.string(),
  tax2: z.string().optional(),
  total: z.string(),
  balance: z.string(),
  taxrate: z.string().optional(),
  taxrate2: z.string().optional(),
  status: z.enum([
    'Paid',
    'Unpaid',
    'Cancelled',
    'Refunded',
    'Collections',
    'Payment Pending',
    'Draft',
  ]),
  paymentmethod: z.string(),
  notes: z.string().optional(),
  ccgateway: z.boolean().optional(),
  items: z
    .object({
      item: z.array(WhmcsInvoiceItemSchema),
    })
    .optional(),
  transactions: z.array(z.unknown()).optional(),
});

export type WhmcsInvoice = z.infer<typeof WhmcsInvoiceSchema>;

export const WhmcsTransactionSchema = z.object({
  id: z.number(),
  userid: z.number(),
  invoiceid: z.number(),
  currency: z.number(),
  gateway: z.string(),
  date: z.string(),
  description: z.string(),
  amountin: z.string(),
  fees: z.string(),
  amountout: z.string(),
  rate: z.string(),
  transid: z.string(),
  refundid: z.number().optional(),
});

export type WhmcsTransaction = z.infer<typeof WhmcsTransactionSchema>;

// ============================================================================
// Support Ticket Entity Types
// ============================================================================

export const WhmcsTicketSchema = z.object({
  id: z.number(),
  tid: z.string(),
  deptid: z.number(),
  deptname: z.string().optional(),
  userid: z.number(),
  contactid: z.number().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  cc: z.string().optional(),
  date: z.string(),
  subject: z.string(),
  message: z.string().optional(),
  status: z.string(),
  priority: z.enum(['Low', 'Medium', 'High']),
  admin: z.string().optional(),
  attachment: z.string().optional(),
  attachments: z.array(z.unknown()).optional(),
  lastreply: z.string().optional(),
  flag: z.number().optional(),
  service: z.string().optional(),
  replies: z
    .object({
      reply: z.array(
        z.object({
          replyid: z.number(),
          userid: z.number(),
          contactid: z.number().optional(),
          name: z.string().optional(),
          email: z.string().optional(),
          requestor_name: z.string().optional(),
          requestor_email: z.string().optional(),
          requestor_type: z.string().optional(),
          date: z.string(),
          message: z.string(),
          attachment: z.string().optional(),
          attachments: z.array(z.unknown()).optional(),
          admin: z.string().optional(),
          rating: z.number().optional(),
        })
      ),
    })
    .optional(),
  notes: z.string().optional(),
  editor: z.string().optional(),
});

export type WhmcsTicket = z.infer<typeof WhmcsTicketSchema>;

export const WhmcsTicketDepartmentSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  awaitingreply: z.number().optional(),
  opentickets: z.number().optional(),
});

export type WhmcsTicketDepartment = z.infer<typeof WhmcsTicketDepartmentSchema>;

export const WhmcsTicketPredefinedReplySchema = z.object({
  id: z.number(),
  name: z.string(),
  reply: z.string(),
});

export type WhmcsTicketPredefinedReply = z.infer<
  typeof WhmcsTicketPredefinedReplySchema
>;

// ============================================================================
// Domain Entity Types
// ============================================================================

export const WhmcsDomainSchema = z.object({
  id: z.number(),
  userid: z.number(),
  orderid: z.number().optional(),
  type: z.enum(['Register', 'Transfer', 'ExternalDomain']).optional(),
  registrationdate: z.string(),
  domain: z.string(),
  firstpaymentamount: z.string(),
  recurringamount: z.string(),
  registrar: z.string().optional(),
  registrationperiod: z.number().optional(),
  expirydate: z.string(),
  nextduedate: z.string(),
  status: z.enum([
    'Pending',
    'Pending Transfer',
    'Active',
    'Expired',
    'Cancelled',
    'Fraud',
    'Grace',
    'Redemption',
    'Transferred Away',
  ]),
  subscriptionid: z.string().optional(),
  promoid: z.number().optional(),
  paymentmethod: z.string(),
  dnsmanagement: z.boolean().optional(),
  emailforwarding: z.boolean().optional(),
  idprotection: z.boolean().optional(),
  donotrenew: z.boolean().optional(),
  notes: z.string().optional(),
  autorecalc: z.boolean().optional(),
  reminders: z.boolean().optional(),
  isPremium: z.boolean().optional(),
  nameservers: z.array(z.string()).optional(),
});

export type WhmcsDomain = z.infer<typeof WhmcsDomainSchema>;

export const WhmcsDomainWhoisSchema = z.object({
  domain: z.string(),
  status: z.string(),
  registrar: z.string().optional(),
  Registrant: z.record(z.string()).optional(),
  Admin: z.record(z.string()).optional(),
  Tech: z.record(z.string()).optional(),
  Billing: z.record(z.string()).optional(),
  nameservers: z.array(z.string()).optional(),
  rawdata: z.string().optional(),
});

export type WhmcsDomainWhois = z.infer<typeof WhmcsDomainWhoisSchema>;

export const WhmcsTldPricingSchema = z.object({
  tld: z.string(),
  currency: z.record(
    z.object({
      id: z.number(),
      code: z.string(),
      prefix: z.string(),
      suffix: z.string(),
      register: z.record(z.string()),
      transfer: z.record(z.string()),
      renew: z.record(z.string()),
    })
  ),
});

export type WhmcsTldPricing = z.infer<typeof WhmcsTldPricingSchema>;

// ============================================================================
// Request Parameter Types
// ============================================================================

export interface GetClientsParams {
  limitstart?: number;
  limitnum?: number;
  sorting?: 'ASC' | 'DESC';
  status?: 'Active' | 'Inactive' | 'Closed';
  search?: string;
  orderby?: 'id' | 'firstname' | 'lastname' | 'companyname' | 'email';
}

export interface AddClientParams {
  firstname: string;
  lastname: string;
  email: string;
  address1: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phonenumber: string;
  password2?: string;
  companyname?: string;
  address2?: string;
  currency?: number;
  clientip?: string;
  language?: string;
  groupid?: number;
  securityqid?: number;
  securityqans?: string;
  notes?: string;
  cardtype?: string;
  cardnum?: string;
  expdate?: string;
  startdate?: string;
  issuenumber?: string;
  cvv?: string;
  tax_id?: string;
  noemail?: boolean;
  skipvalidation?: boolean;
}

export interface UpdateClientParams {
  clientid: number;
  firstname?: string;
  lastname?: string;
  email?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  phonenumber?: string;
  password2?: string;
  companyname?: string;
  currency?: number;
  language?: string;
  groupid?: number;
  notes?: string;
  status?: 'Active' | 'Inactive' | 'Closed';
  tax_id?: string;
  taxexempt?: boolean;
  latefeeoveride?: boolean;
  overideduenotices?: boolean;
  separateinvoices?: boolean;
  disableautocc?: boolean;
  emailoptout?: boolean;
  overrideautoclose?: boolean;
  allowSingleSignOn?: boolean;
}

export interface GetProductsParams {
  pid?: number | number[];
  gid?: number;
  module?: string;
}

export interface GetClientServicesParams {
  clientid?: number;
  serviceid?: number;
  domain?: string;
  pid?: number;
  username2?: string;
  limitstart?: number;
  limitnum?: number;
}

export interface AddOrderParams {
  clientid: number;
  paymentmethod: string;
  pid?: number[];
  domain?: string[];
  billingcycle?: string[];
  domaintype?: ('register' | 'transfer' | 'owndomain')[];
  regperiod?: number[];
  eppcode?: string[];
  nameserver1?: string;
  nameserver2?: string;
  nameserver3?: string;
  nameserver4?: string;
  nameserver5?: string;
  customfields?: string[];
  configoptions?: string[];
  priceoverride?: number[];
  promocode?: string;
  promooverride?: boolean;
  affid?: number;
  noinvoice?: boolean;
  noinvoiceemail?: boolean;
  noemail?: boolean;
  addons?: string[];
  hostname?: string[];
  ns1prefix?: string[];
  ns2prefix?: string[];
  rootpw?: string[];
  contactid?: number;
  dnsmanagement?: boolean[];
  domainpriceoverride?: number[];
  emailforwarding?: boolean[];
  idprotection?: boolean[];
  domainrenewoverride?: number[];
  domainfields?: string[];
  ipaddress?: string;
}

export interface GetInvoicesParams {
  limitstart?: number;
  limitnum?: number;
  userid?: number;
  status?:
    | 'Paid'
    | 'Unpaid'
    | 'Cancelled'
    | 'Refunded'
    | 'Collections'
    | 'Payment Pending'
    | 'Draft';
  orderby?: 'id' | 'invoicenumber' | 'date' | 'duedate' | 'total' | 'status';
  order?: 'asc' | 'desc';
}

export interface CreateInvoiceParams {
  userid: number;
  status?: 'Draft' | 'Unpaid' | 'Paid';
  sendinvoice?: boolean;
  paymentmethod?: string;
  taxrate?: number;
  taxrate2?: number;
  date?: string;
  duedate?: string;
  notes?: string;
  itemdescription?: string[];
  itemamount?: number[];
  itemtaxed?: boolean[];
  autoapplycredit?: boolean;
}

export interface GetTicketsParams {
  limitstart?: number;
  limitnum?: number;
  deptid?: number;
  clientid?: number;
  email?: string;
  status?: string;
  subject?: string;
  ignore_dept_assignments?: boolean;
}

export interface OpenTicketParams {
  deptid: number;
  subject: string;
  message: string;
  clientid?: number;
  contactid?: number;
  name?: string;
  email?: string;
  priority?: 'Low' | 'Medium' | 'High';
  serviceid?: number;
  domainid?: number;
  admin?: boolean;
  markdown?: boolean;
  customfields?: string;
  attachments?: string;
}

export interface AddTicketReplyParams {
  ticketid: number;
  message: string;
  clientid?: number;
  contactid?: number;
  name?: string;
  email?: string;
  admin?: boolean;
  adminusername?: string;
  status?: string;
  noemail?: boolean;
  customfields?: string;
  attachments?: string;
  markdown?: boolean;
}

export interface GetDomainsParams {
  limitstart?: number;
  limitnum?: number;
  clientid?: number;
  domainid?: number;
  domain?: string;
  status?:
    | 'Pending'
    | 'Pending Transfer'
    | 'Active'
    | 'Expired'
    | 'Cancelled'
    | 'Fraud'
    | 'Grace'
    | 'Redemption'
    | 'Transferred Away';
}

export interface RegisterDomainParams {
  domainid?: number;
  domain?: string;
  registrar?: string;
  regperiod?: number;
  nameserver1?: string;
  nameserver2?: string;
  nameserver3?: string;
  nameserver4?: string;
  nameserver5?: string;
  dnsmanagement?: boolean;
  emailforwarding?: boolean;
  idprotection?: boolean;
  domainfields?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface GetClientsResponse extends WhmcsBaseResponse {
  totalresults: number;
  startnumber: number;
  numreturned: number;
  clients: {
    client: WhmcsClient[];
  };
}

export interface GetClientDetailsResponse extends WhmcsBaseResponse {
  client: WhmcsClient;
}

export interface AddClientResponse extends WhmcsBaseResponse {
  clientid: number;
  owner_user_id?: number;
}

export interface UpdateClientResponse extends WhmcsBaseResponse {
  clientid: number;
}

export interface GetProductsResponse extends WhmcsBaseResponse {
  totalresults: number;
  products: {
    product: WhmcsProduct[];
  };
}

export interface GetClientServicesResponse extends WhmcsBaseResponse {
  totalresults: number;
  startnumber: number;
  numreturned: number;
  products: {
    product: WhmcsService[];
  };
}

export interface AddOrderResponse extends WhmcsBaseResponse {
  orderid: number;
  productids: string;
  addonids: string;
  domainids: string;
  invoiceid: number;
}

export interface GetOrdersResponse extends WhmcsBaseResponse {
  totalresults: number;
  startnumber: number;
  numreturned: number;
  orders: {
    order: WhmcsOrder[];
  };
}

export interface GetInvoicesResponse extends WhmcsBaseResponse {
  totalresults: number;
  startnumber: number;
  numreturned: number;
  invoices: {
    invoice: WhmcsInvoice[];
  };
}

export interface GetInvoiceResponse extends WhmcsBaseResponse {
  invoice: WhmcsInvoice;
}

export interface CreateInvoiceResponse extends WhmcsBaseResponse {
  invoiceid: number;
  status: string;
}

export interface GetTicketsResponse extends WhmcsBaseResponse {
  totalresults: number;
  startnumber: number;
  numreturned: number;
  tickets: {
    ticket: WhmcsTicket[];
  };
}

export interface GetTicketResponse extends WhmcsBaseResponse {
  ticketid: number;
  tid: string;
  c: string;
  deptid: number;
  deptname: string;
  userid: number;
  contactid: number;
  name: string;
  email: string;
  cc: string;
  date: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin: string;
  attachment: string;
  attachments: string;
  lastreply: string;
  flag: number;
  service: string;
  replies: {
    reply: Array<{
      replyid: number;
      userid: number;
      contactid: number;
      name: string;
      email: string;
      requestor_name: string;
      requestor_email: string;
      requestor_type: string;
      date: string;
      message: string;
      attachment: string;
      attachments: string;
      admin: string;
      rating: number;
    }>;
  };
  notes: string;
}

export interface OpenTicketResponse extends WhmcsBaseResponse {
  id: number;
  tid: string;
  c: string;
}

export interface AddTicketReplyResponse extends WhmcsBaseResponse {
  replyid: number;
}

export interface GetSupportDepartmentsResponse extends WhmcsBaseResponse {
  totalresults: number;
  departments: {
    department: WhmcsTicketDepartment[];
  };
}

export interface GetDomainsResponse extends WhmcsBaseResponse {
  totalresults: number;
  startnumber: number;
  numreturned: number;
  domains: {
    domain: WhmcsDomain[];
  };
}

export interface GetDomainWhoisResponse extends WhmcsBaseResponse {
  whois: WhmcsDomainWhois;
}

export interface DomainCheckAvailabilityResponse extends WhmcsBaseResponse {
  searchresult?: Array<{
    domainname: string;
    available: 'available' | 'registered' | 'unknown';
    pricing?: Record<string, unknown>;
  }>;
}

export interface GetTldPricingResponse extends WhmcsBaseResponse {
  currency: Record<string, unknown>;
  pricing: {
    [tld: string]: WhmcsTldPricing;
  };
}

export interface RegisterDomainResponse extends WhmcsBaseResponse {
  domainid?: number;
}
