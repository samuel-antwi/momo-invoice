import { db } from "../db/client";
import {
  businesses,
  clients,
  invoiceLineItems,
  invoices,
  reminderTemplates,
} from "../db/schema";
import { demoData } from "~/utils/demo-data";

const computeTotals = (items: typeof demoData.invoices[number]["lineItems"]) => {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxTotal = items.reduce((sum, item) => sum + (item.taxRate ? item.quantity * item.unitPrice * item.taxRate : 0), 0);
  const discountTotal = items.reduce((sum, item) => sum + (item.discount ?? 0), 0);
  const total = subtotal + taxTotal - discountTotal;
  return { subtotal, taxTotal, discountTotal, total };
};

export default async () => {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL missing, skipping database seed");
    return;
  }

  try {
    const existing = await db.select().from(businesses).limit(1);
    if (existing.length) {
      return;
    }

    const demoBusiness = demoData.businessProfile;
    const slug = demoBusiness.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const [business] = await db
      .insert(businesses)
      .values({
        name: demoBusiness.name,
        slug,
        email: demoBusiness.email,
        phone: demoBusiness.phone,
        whatsappNumber: demoBusiness.whatsappNumber,
        address: demoBusiness.address,
        themeColor: demoBusiness.themeColor,
        plan: demoBusiness.plan,
      })
      .returning({ id: businesses.id });

    const clientIdMap = new Map<string, string>();

    for (const client of demoData.clients) {
      const [row] = await db
        .insert(clients)
        .values({
          businessId: business.id,
          fullName: client.fullName,
          businessName: client.businessName,
          email: client.email,
          phone: client.phone,
          whatsappNumber: client.whatsappNumber,
          momoProvider: client.momoProvider,
          notes: client.notes,
        })
        .returning({ id: clients.id });

      clientIdMap.set(client.id, row.id);
    }

    for (const template of demoData.reminderTemplateSettings) {
      await db.insert(reminderTemplates).values({
        businessId: business.id,
        label: template.label,
        offsetDays: template.offsetDays,
        channel: template.channel,
        enabled: template.enabled,
      });
    }

    for (const invoice of demoData.invoices) {
      const totals = computeTotals(invoice.lineItems);
      const [invoiceRow] = await db
        .insert(invoices)
        .values({
          businessId: business.id,
          clientId: clientIdMap.get(invoice.clientId)!,
          status: invoice.status,
          issueDate: new Date(invoice.issueDate),
          dueDate: new Date(invoice.dueDate),
          subtotal: totals.subtotal,
          taxTotal: totals.taxTotal,
          discountTotal: totals.discountTotal,
          total: totals.total,
          notes: invoice.notes,
          paymentInstructions: invoice.paymentInstructions,
          invoiceNumber: invoice.invoiceNumber,
          lastSharedAt: invoice.lastSharedAt ? new Date(invoice.lastSharedAt) : null,
          paidAt: invoice.paidAt ? new Date(invoice.paidAt) : null,
        })
        .returning({ id: invoices.id });

      for (const item of invoice.lineItems) {
        await db.insert(invoiceLineItems).values({
          invoiceId: invoiceRow.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate ?? 0,
          discount: item.discount ?? 0,
        });
      }
    }
  } catch (error) {
    console.error("Seed routine failed", error);
  }
};
