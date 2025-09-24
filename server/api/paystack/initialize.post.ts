import { and, eq } from "drizzle-orm";
import { serverSupabaseUser } from "#supabase/server";
import { createError, readBody, setResponseStatus } from "h3";
import { z } from "zod";

import { db } from "../../db/client";
import { invoices, payments } from "../../db/schema";
import { ensureBusinessForUser } from "../../utils/business";
import { parseAmount } from "../../utils/invoice";
import { initializePaystackTransaction, toPaystackReference } from "../../utils/paystack";

const initializeSchema = z.object({
  invoiceId: z.string().uuid("Select a valid invoice"),
});

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody(event);
  const parsed = initializeSchema.safeParse(body);

  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: "Validation failed", data: parsed.error.flatten() });
  }

  const { invoiceId } = parsed.data;

  const business = await ensureBusinessForUser(user);

  const invoiceRow = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: {
      client: true,
      payments: true,
    },
  });

  if (!invoiceRow || invoiceRow.businessId !== business.id) {
    throw createError({ statusCode: 404, statusMessage: "Invoice not found" });
  }

  if (invoiceRow.status === "paid") {
    throw createError({ statusCode: 400, statusMessage: "Invoice already settled" });
  }

  const payableAmount = parseAmount(invoiceRow.total);
  if (payableAmount <= 0) {
    throw createError({ statusCode: 400, statusMessage: "Invoice has no payable amount" });
  }

  const currency = invoiceRow.currency || "GHS";
  const amountKobo = Math.round(payableAmount * 100);
  const reference = toPaystackReference(invoiceRow.invoiceNumber);

  const config = useRuntimeConfig();
  const callbackUrl = `${config.public.appUrl}/payments/paystack/callback`;

  const email = invoiceRow.client.email || business.email || `billing+${invoiceRow.id}@momoinvoice.app`;

  const subaccountCode = business.paystackSubaccountCode ?? undefined;
  const splitCode = business.paystackSplitCode ?? undefined;

  const transaction = await initializePaystackTransaction({
    reference,
    email,
    amountKobo,
    currency,
    callbackUrl,
    metadata: {
      invoiceId: invoiceRow.id,
      businessId: business.id,
      clientId: invoiceRow.clientId,
      workspace: business.slug,
    },
    subaccount: subaccountCode,
    splitCode,
    bearer: subaccountCode ? "subaccount" : undefined,
  });

  await db.transaction(async (tx) => {
    await tx
      .update(payments)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(payments.invoiceId, invoiceRow.id),
          eq(payments.method, "paystack"),
          eq(payments.status, "pending"),
        ),
      );

    await tx.insert(payments).values({
      invoiceId: invoiceRow.id,
      amount: invoiceRow.total,
      method: "paystack",
      reference: transaction.reference,
      status: "pending",
      metadata: JSON.stringify({
        accessCode: transaction.access_code,
        authorizationUrl: transaction.authorization_url,
      }),
    });
  });

  setResponseStatus(event, 201);
  return {
    authorizationUrl: transaction.authorization_url,
    reference: transaction.reference,
  };
});
