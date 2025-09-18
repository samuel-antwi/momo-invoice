import { desc, eq } from "drizzle-orm";
import { serverSupabaseUser } from "#supabase/server";

import { db } from "../../db/client";
import { invoices } from "../../db/schema";
import { ensureBusinessForUser } from "../../utils/business";

const parseAmount = (value: unknown) => Number(value ?? 0);

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    setResponseStatus(event, 401);
    return {
      invoices: [],
      summary: {
        totalRevenue: 0,
        outstanding: 0,
        overdueTotal: 0,
        draftCount: 0,
        sentCount: 0,
        paidCount: 0,
        overdueCount: 0,
        pendingCount: 0,
      },
      overdueInvoices: [],
      invoicesDueSoon: [],
      recentInvoices: [],
    };
  }

  const business = await ensureBusinessForUser(user);

  const invoiceRows = await db.query.invoices.findMany({
    where: eq(invoices.businessId, business.id),
    with: {
      client: true,
      lineItems: true,
    },
    orderBy: [desc(invoices.issueDate)],
  });

  const now = new Date();

  let totalRevenue = 0;
  let outstanding = 0;
  let overdueTotal = 0;
  let draftCount = 0;
  let sentCount = 0;
  let paidCount = 0;
  let overdueCount = 0;

  const mapped = invoiceRows.map((invoice) => {
    const subtotal = parseAmount(invoice.subtotal);
    const taxTotal = parseAmount(invoice.taxTotal);
    const discountTotal = parseAmount(invoice.discountTotal);
    const total = parseAmount(invoice.total);
    const status = invoice.status;

    switch (status) {
      case "paid":
        paidCount += 1;
        totalRevenue += total;
        break;
      case "sent":
        sentCount += 1;
        outstanding += total;
        if (invoice.dueDate && new Date(invoice.dueDate) < now) {
          overdueCount += 1;
          overdueTotal += total;
        }
        break;
      case "overdue":
        overdueCount += 1;
        overdueTotal += total;
        outstanding += total;
        break;
      default:
        draftCount += 1;
    }

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

    return {
      id: invoice.id,
      businessId: invoice.businessId,
      clientId: invoice.clientId,
      issueDate,
      dueDate,
      status,
      invoiceNumber: invoice.invoiceNumber,
      lineItems,
      notes: invoice.notes ?? undefined,
      paymentInstructions: invoice.paymentInstructions ?? undefined,
      reminders: [],
      lastSharedAt:
        invoice.lastSharedAt instanceof Date
          ? invoice.lastSharedAt.toISOString()
          : invoice.lastSharedAt ?? undefined,
      paidAt: invoice.paidAt instanceof Date ? invoice.paidAt.toISOString() : invoice.paidAt ?? undefined,
      total,
      subtotal,
      taxTotal,
      discountTotal,
      clientName: invoice.client.fullName,
    };
  });

  const overdueInvoices = mapped
    .filter((invoice) => invoice.status === "overdue" || (invoice.dueDate && new Date(invoice.dueDate) < now))
    .map((invoice) => {
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : now;
      const daysOverdue = Math.max(0, Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        ...invoice,
        daysOverdue,
      };
    })
    .sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0));

  const invoicesDueSoon = mapped
    .filter((invoice) => invoice.status === "sent" && invoice.dueDate)
    .map((invoice) => {
      const dueDate = new Date(invoice.dueDate!);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { ...invoice, daysUntilDue };
    })
    .filter((invoice) => (invoice.daysUntilDue ?? 0) >= 0 && (invoice.daysUntilDue ?? 0) <= 3)
    .sort((a, b) => (a.daysUntilDue ?? 0) - (b.daysUntilDue ?? 0));

  const recentInvoices = mapped
    .slice()
    .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
    .slice(0, 5);

  return {
    invoices: mapped,
    summary: {
      totalRevenue,
      outstanding,
      overdueTotal,
      draftCount,
      sentCount,
      paidCount,
      overdueCount,
      pendingCount: sentCount + overdueCount,
    },
    overdueInvoices,
    invoicesDueSoon,
    recentInvoices,
  };
});
