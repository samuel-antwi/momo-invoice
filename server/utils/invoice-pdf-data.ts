import { eq } from "drizzle-orm";

import type { InvoiceRecord } from "~/types/models";

import { db } from "../db/client";
import { invoices } from "../db/schema";
import { mapInvoiceRow } from "./invoice";

export interface InvoiceBusinessSummary {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  address?: string;
  logoUrl?: string;
  themeColor?: string;
}

export interface InvoiceClientSummary {
  fullName: string;
  businessName?: string;
  email?: string;
  phone?: string;
}

export interface InvoicePdfData {
  invoice: InvoiceRecord;
  business: InvoiceBusinessSummary;
  client: InvoiceClientSummary;
}

export const loadInvoicePdfData = async (invoiceId: string) => {
  const invoiceRow = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: {
      business: true,
      client: true,
      lineItems: true,
    },
  });

  if (!invoiceRow) {
    return null;
  }

  const invoice = mapInvoiceRow(invoiceRow);
  const business: InvoiceBusinessSummary = {
    id: invoiceRow.business.id,
    name: invoiceRow.business.name,
    email: invoiceRow.business.email ?? undefined,
    phone: invoiceRow.business.phone ?? undefined,
    whatsappNumber: invoiceRow.business.whatsappNumber ?? undefined,
    address: invoiceRow.business.address ?? undefined,
    logoUrl: invoiceRow.business.logoUrl ?? undefined,
    themeColor: invoiceRow.business.themeColor ?? undefined,
  };

  const client: InvoiceClientSummary = {
    fullName: invoiceRow.client.fullName,
    businessName: invoiceRow.client.businessName ?? undefined,
    email: invoiceRow.client.email ?? undefined,
    phone: invoiceRow.client.phone ?? undefined,
  };

  return { invoice, business, client } satisfies InvoicePdfData;
};
