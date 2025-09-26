import { desc, eq } from "drizzle-orm";
import { serverSupabaseUser } from "#supabase/server";

import { db } from "../../db/client";
import { invoices } from "../../db/schema";
import { ensureBusinessForUser } from "../../utils/business";
import { mapInvoiceRow } from "../../utils/invoice";

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
  let unpaidCount = 0;
  const activeClientIds = new Set<string>();
  const mapped = invoiceRows.map((invoice) => {
    const record = mapInvoiceRow(invoice);

    activeClientIds.add(record.clientId);

    switch (record.status) {
      case "paid":
        paidCount += 1;
        totalRevenue += record.total ?? 0;
        break;
      case "sent":
        sentCount += 1;
        unpaidCount += 1;
        outstanding += record.total ?? 0;
        if (record.dueDate && new Date(record.dueDate) < now) {
          overdueCount += 1;
          overdueTotal += record.total ?? 0;
        }
        break;
      case "overdue":
        overdueCount += 1;
        unpaidCount += 1;
        overdueTotal += record.total ?? 0;
        outstanding += record.total ?? 0;
        break;
      default:
        draftCount += 1;
    }

    return record;
  });

  const overdueInvoices = mapped
    .filter((invoice) =>
      invoice.status !== "paid" &&
      (invoice.status === "overdue" || (invoice.dueDate && new Date(invoice.dueDate) < now))
    )
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
      unpaidCount,
      pendingCount: sentCount + overdueCount,
      activeClients: activeClientIds.size,
    },
    overdueInvoices,
    invoicesDueSoon,
    recentInvoices,
  };
});
