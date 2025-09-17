export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export interface BusinessProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  logoUrl?: string;
  address?: string;
  currency: string;
  themeColor: string;
  plan: "free" | "pro";
}

export interface ClientContact {
  id: string;
  businessName?: string;
  fullName: string;
  email?: string;
  phone: string;
  whatsappNumber?: string;
  momoProvider: "mtn" | "vodafone" | "airteltigo" | "other";
  notes?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number; // expressed as decimal e.g. 0.125
  discount?: number; // flat amount
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
  dueDate: string;
  status: InvoiceStatus;
  invoiceNumber: string;
  lineItems: InvoiceLineItem[];
  notes?: string;
  paymentInstructions?: string;
  reminders: InvoiceReminder[];
  lastSharedAt?: string;
  paidAt?: string;
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
}

export interface ReminderTemplateSetting {
  id: string;
  label: string;
  offsetDays: number;
  channel: "whatsapp" | "sms" | "email";
  enabled: boolean;
}
