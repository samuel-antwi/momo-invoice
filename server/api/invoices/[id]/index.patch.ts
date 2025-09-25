import { eq } from "drizzle-orm";
import { createError, getRouterParam, readBody } from "h3";
import { z } from "zod";
import { serverSupabaseUser } from "#supabase/server";

import { db } from "../../../db/client";
import { invoices } from "../../../db/schema";
import { ensureBusinessForUser } from "../../../utils/business";
import { mapInvoiceRow } from "../../../utils/invoice";

const payloadSchema = z.object({
  status: z.enum(["draft", "sent", "paid", "overdue"]).optional(),
  lastSharedAt: z.string().datetime().optional(),
});

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const invoiceId = getRouterParam(event, "id");
  if (!invoiceId) {
    throw createError({ statusCode: 400, statusMessage: "Invoice id is required" });
  }

  const body = await readBody(event);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: "Validation failed", data: parsed.error.flatten() });
  }

  if (!parsed.data.status && !parsed.data.lastSharedAt) {
    throw createError({ statusCode: 400, statusMessage: "No changes supplied" });
  }

  const business = await ensureBusinessForUser(user);

  const [existing] = await db
    .select({ id: invoices.id, businessId: invoices.businessId })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!existing || existing.businessId !== business.id) {
    throw createError({ statusCode: 404, statusMessage: "Invoice not found" });
  }

  const updates: Partial<typeof invoices.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (parsed.data.status) {
    updates.status = parsed.data.status;
  }

  if (parsed.data.lastSharedAt) {
    updates.lastSharedAt = new Date(parsed.data.lastSharedAt);
  }

  await db.update(invoices).set(updates).where(eq(invoices.id, invoiceId));

  const invoiceRow = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: {
      client: true,
      lineItems: true,
    },
  });

  if (!invoiceRow) {
    throw createError({ statusCode: 500, statusMessage: "Failed to reload invoice" });
  }

  return {
    invoice: mapInvoiceRow(invoiceRow),
  };
});
