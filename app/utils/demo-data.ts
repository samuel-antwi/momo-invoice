import type {
  BusinessProfile,
  ClientContact,
  InvoiceRecord,
  InvoiceReminder,
  InvoiceLineItem,
  ReminderTemplateSetting,
} from "~/types/models";

const businessProfile: BusinessProfile = {
  id: "biz_001",
  name: "Glow & Go Beauty",
  email: "hello@glowandgo.com",
  phone: "+233200000001",
  whatsappNumber: "233200000001",
  logoUrl: "/logo-placeholder.svg",
  address: "Accra, Ghana",
  currency: "GHS",
  themeColor: "#f59e0b",
  plan: "free",
};

const clients: ClientContact[] = [
  {
    id: "client_001",
    businessName: "Ama's Boutique",
    fullName: "Ama Boateng",
    email: "ama.b@example.com",
    phone: "+233501234567",
    whatsappNumber: "233501234567",
    momoProvider: "mtn",
    notes: "Prefers WhatsApp updates",
  },
  {
    id: "client_002",
    businessName: "Kwame Dev Consultancy",
    fullName: "Kwame Mensah",
    email: "kwame.dev@example.com",
    phone: "+233247654321",
    whatsappNumber: "233247654321",
    momoProvider: "vodafone",
  },
  {
    id: "client_003",
    fullName: "Esi Owusu",
    phone: "+233209876543",
    momoProvider: "mtn",
    notes: "Send invoice end of month",
  },
];

const reminders = (invoiceId: string): InvoiceReminder[] => [
  {
    id: `${invoiceId}_rem_1`,
    type: "upcoming",
    channel: "whatsapp",
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: "scheduled",
  },
  {
    id: `${invoiceId}_rem_2`,
    type: "overdue",
    channel: "sms",
    scheduledAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: "scheduled",
  },
];

const buildLineItems = (items: Partial<InvoiceLineItem>[]): InvoiceLineItem[] =>
  items.map((item, index) => ({
    id: `${item.id ?? "item"}_${index}`,
    description: item.description ?? "Service",
    quantity: item.quantity ?? 1,
    unitPrice: item.unitPrice ?? 100,
    taxRate: item.taxRate,
    discount: item.discount,
  }));

const invoices: InvoiceRecord[] = [
  {
    id: "inv_001",
    businessId: businessProfile.id,
    clientId: clients[0].id,
    issueDate: new Date("2024-10-01").toISOString(),
    dueDate: new Date("2024-10-07").toISOString(),
    status: "overdue",
    invoiceNumber: "GNB-2024-001",
    lineItems: buildLineItems([
      { description: "Full Glam Package", quantity: 1, unitPrice: 480 },
      { description: "Home Service Surcharge", quantity: 1, unitPrice: 80 },
    ]),
    notes: "Please make payment to MoMo number 024 XXX XXXX",
    paymentInstructions: "MTN MoMo: *170# > Pay Bill > Enter Merchant ID 123456",
    reminders: reminders("inv_001"),
    lastSharedAt: new Date("2024-10-01T09:15:00Z").toISOString(),
  },
  {
    id: "inv_002",
    businessId: businessProfile.id,
    clientId: clients[1].id,
    issueDate: new Date("2024-09-20").toISOString(),
    dueDate: new Date("2024-09-27").toISOString(),
    status: "paid",
    invoiceNumber: "GNB-2024-002",
    lineItems: buildLineItems([
      { description: "Corporate Makeup Session", quantity: 2, unitPrice: 350 },
    ]),
    reminders: reminders("inv_002"),
    paidAt: new Date("2024-09-23T13:40:00Z").toISOString(),
    lastSharedAt: new Date("2024-09-20T08:30:00Z").toISOString(),
  },
  {
    id: "inv_003",
    businessId: businessProfile.id,
    clientId: clients[2].id,
    issueDate: new Date("2024-10-05").toISOString(),
    dueDate: new Date("2024-10-12").toISOString(),
    status: "sent",
    invoiceNumber: "GNB-2024-003",
    lineItems: buildLineItems([
      { description: "Bridal Trial", quantity: 1, unitPrice: 600 },
    ]),
    reminders: reminders("inv_003"),
    lastSharedAt: new Date("2024-10-05T10:05:00Z").toISOString(),
  },
  {
    id: "inv_004",
    businessId: businessProfile.id,
    clientId: clients[0].id,
    issueDate: new Date("2024-10-12").toISOString(),
    dueDate: new Date("2024-10-19").toISOString(),
    status: "draft",
    invoiceNumber: "GNB-2024-004",
    lineItems: buildLineItems([
      { description: "Product Refill", quantity: 5, unitPrice: 75 },
    ]),
    reminders: reminders("inv_004"),
  },
];

const reminderTemplateSettings: ReminderTemplateSetting[] = [
  {
    id: "rem_temp_1",
    label: "3 days before due",
    offsetDays: -3,
    channel: "whatsapp",
    enabled: true,
  },
  {
    id: "rem_temp_2",
    label: "Due date",
    offsetDays: 0,
    channel: "sms",
    enabled: true,
  },
  {
    id: "rem_temp_3",
    label: "2 days overdue",
    offsetDays: 2,
    channel: "email",
    enabled: false,
  },
];

export const demoData = {
  businessProfile,
  clients,
  invoices,
  reminderTemplateSettings,
};
