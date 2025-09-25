import type { InferSelectModel } from "drizzle-orm";

import type { InvoiceRecord } from "~/types/models";

import { businesses, clients, invoiceLineItems, invoices, payments } from "../db/schema";

export const parseAmount = (value: unknown) => Number(value ?? 0);

export const computeInvoiceTotals = (items: Array<{
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
}>) => {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxTotal = items.reduce(
    (sum, item) => sum + (item.taxRate ? item.quantity * item.unitPrice * item.taxRate : 0),
    0,
  );
  const discountTotal = items.reduce((sum, item) => sum + (item.discount ?? 0), 0);
  const total = subtotal + taxTotal - discountTotal;

  return {
    subtotal,
    taxTotal,
    discountTotal,
    total,
  };
};

type InvoiceRow = InferSelectModel<typeof invoices> & {
  client: InferSelectModel<typeof clients>;
  lineItems: InferSelectModel<typeof invoiceLineItems>[];
  business?: InferSelectModel<typeof businesses>;
  payments?: InferSelectModel<typeof payments>[];
};

export const mapInvoiceRow = (invoice: InvoiceRow): InvoiceRecord => {
  const subtotal = parseAmount(invoice.subtotal);
  const taxTotal = parseAmount(invoice.taxTotal);
  const discountTotal = parseAmount(invoice.discountTotal);
  const total = parseAmount(invoice.total);

  const lineItems = invoice.lineItems.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: Number(item.quantity ?? 0),
    unitPrice: parseAmount(item.unitPrice),
    taxRate: item.taxRate ? Number(item.taxRate) : undefined,
    discount: item.discount ? parseAmount(item.discount) : undefined,
  }));

  const issueDate = invoice.issueDate instanceof Date
    ? invoice.issueDate.toISOString()
    : new Date(invoice.issueDate).toISOString();

  const dueDate = invoice.dueDate
    ? invoice.dueDate instanceof Date
      ? invoice.dueDate.toISOString()
      : new Date(invoice.dueDate).toISOString()
    : undefined;

  const lastSharedAt = invoice.lastSharedAt
    ? invoice.lastSharedAt instanceof Date
      ? invoice.lastSharedAt.toISOString()
      : new Date(invoice.lastSharedAt).toISOString()
    : undefined;

  const paidAt = invoice.paidAt
    ? invoice.paidAt instanceof Date
      ? invoice.paidAt.toISOString()
      : new Date(invoice.paidAt).toISOString()
    : undefined;

  return {
    id: invoice.id,
    businessId: invoice.businessId,
    clientId: invoice.clientId,
    issueDate,
    dueDate,
    status: invoice.status,
    currency: invoice.currency,
    invoiceNumber: invoice.invoiceNumber,
    lineItems,
    notes: invoice.notes ?? undefined,
    paymentInstructions: invoice.paymentInstructions ?? undefined,
    paymentMethodId: invoice.paymentMethodId ?? undefined,
    reminders: [],
    lastSharedAt,
    paidAt,
    subtotal,
    taxTotal,
    discountTotal,
    total,
    clientName: invoice.client.fullName,
  };
};
