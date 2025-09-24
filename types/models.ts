export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type MomoProvider = "mtn" | "vodafone" | "airteltigo" | "other";

export interface BusinessProfile {
  id: string;
  name: string;
  slug?: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  logoUrl?: string;
  address?: string;
  currency: string;
  themeColor: string;
  plan: "free" | "pro";
  setupCompleted: boolean;
}

export interface ClientContact {
  id: string;
  businessName?: string;
  fullName: string;
  email?: string;
  phone: string;
  whatsappNumber?: string;
  momoProvider: MomoProvider;
  notes?: string;
}

export interface CreateClientPayload {
  fullName: string;
  businessName?: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  momoProvider: MomoProvider;
  notes?: string;
}

export interface PaymentMethod {
  id: string;
  businessId: string;
  label: string;
  provider?: MomoProvider;
  accountName?: string;
  accountNumber?: string;
  instructions?: string;
  isDefault: boolean;
}

export interface CreatePaymentMethodPayload {
  label: string;
  provider?: MomoProvider;
  accountName?: string;
  accountNumber?: string;
  instructions?: string;
  isDefault?: boolean;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number; // expressed as decimal e.g. 0.125
  discount?: number; // flat amount
}

export interface InvoiceLineItemDraft {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
}

export interface CreateInvoicePayload {
  clientId: string;
  issueDate: string;
  dueDate?: string | null;
  status: InvoiceStatus;
  currency: string;
  notes?: string;
  paymentInstructions?: string;
  payableTo?: string;
  paymentMethodId?: string;
  lineItems: InvoiceLineItemDraft[];
}

export interface InvoiceReminder {
  id: string;
  type: "upcoming" | "due_day" | "overdue";
  channel: "whatsapp" | "sms" | "email";
  scheduledAt: string;
  status: "scheduled" | "sent" | "failed";
  notes?: string;
}

export interface InvoiceRecord {
  id: string;
  businessId: string;
  clientId: string;
  issueDate: string;
  dueDate?: string;
  status: InvoiceStatus;
  invoiceNumber: string;
  lineItems: InvoiceLineItem[];
  notes?: string;
  paymentInstructions?: string;
  reminders: InvoiceReminder[];
  lastSharedAt?: string;
  paidAt?: string;
  paymentMethodId?: string;
  subtotal?: number;
  taxTotal?: number;
  discountTotal?: number;
  total?: number;
  clientName?: string;
  daysUntilDue?: number;
  daysOverdue?: number;
}

export interface DashboardSummary {
  totalRevenue: number;
  outstanding: number;
  overdueTotal: number;
  draftCount: number;
  sentCount: number;
  paidCount: number;
  overdueCount: number;
  pendingCount: number;
  activeClients: number;
}

export interface ReminderTemplateSetting {
  id: string;
  label: string;
  offsetDays: number;
  channel: "whatsapp" | "sms" | "email";
  enabled: boolean;
}
