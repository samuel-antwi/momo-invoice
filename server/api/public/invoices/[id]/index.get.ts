import { eq } from "drizzle-orm";
import { createError, getRouterParam } from "h3";

import { db } from "../../../../db/client";
import { invoices } from "../../../../db/schema";
import { mapInvoiceRow } from "../../../../utils/invoice";

const extractPaystackAuthorizationUrl = (payments: Array<{ metadata: string | null; method: string; status: string; createdAt: Date | null }>) => {
  const relevant = payments
    .filter((payment) => payment.method === "paystack" && payment.status === "pending")
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

  for (const payment of relevant) {
    if (!payment.metadata) continue;
    try {
      const parsed = JSON.parse(payment.metadata) as { authorizationUrl?: string; authorization_url?: string };
      const url = parsed.authorizationUrl ?? parsed.authorization_url;
      if (url) {
        return url;
      }
    } catch (error) {
      // ignore malformed metadata and continue scanning
    }
  }

  return undefined;
};

export default defineEventHandler(async (event) => {
  const invoiceId = getRouterParam(event, "id");
  if (!invoiceId) {
    throw createError({ statusCode: 400, statusMessage: "Invoice id is required" });
  }

  const invoiceRow = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: {
      business: true,
      client: true,
      lineItems: true,
      payments: true,
    },
  });

  if (!invoiceRow) {
    throw createError({ statusCode: 404, statusMessage: "Invoice not found" });
  }

  const invoice = mapInvoiceRow(invoiceRow);
  const business = {
    name: invoiceRow.business.name,
    logoUrl: invoiceRow.business.logoUrl ?? undefined,
    phone: invoiceRow.business.phone ?? undefined,
    whatsappNumber: invoiceRow.business.whatsappNumber ?? undefined,
    email: invoiceRow.business.email ?? undefined,
    address: invoiceRow.business.address ?? undefined,
    currency: invoiceRow.business.currency,
  };

  const client = {
    fullName: invoiceRow.client.fullName,
    businessName: invoiceRow.client.businessName ?? undefined,
    email: invoiceRow.client.email ?? undefined,
    phone: invoiceRow.client.phone ?? undefined,
  };

  const authorizationUrl = extractPaystackAuthorizationUrl(invoiceRow.payments ?? []);

  return {
    invoice,
    business,
    client,
    paystack: authorizationUrl ? { authorizationUrl } : undefined,
  };
});
