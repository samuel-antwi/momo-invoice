import { and, eq } from "drizzle-orm";
import { createError, getRequestURL, getRouterParam, setResponseStatus } from "h3";

import { db } from "../../../../db/client";
import { invoices, payments } from "../../../../db/schema";
import { parseAmount } from "../../../../utils/invoice";
import { initializePaystackTransaction, toPaystackReference } from "../../../../utils/paystack";

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
    },
  });

  if (!invoiceRow) {
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
  const requestUrl = getRequestURL(event);
  const baseAppUrl = (config.public.appUrl || `${requestUrl.protocol}//${requestUrl.host}`).replace(/\/$/, "");
  const callbackUrl = `${baseAppUrl}/payments/paystack/callback`;

  const email = invoiceRow.client.email || invoiceRow.business.email || `billing+${invoiceRow.id}@momoinvoice.app`;

  const subaccountCode = invoiceRow.business.paystackSubaccountCode ?? undefined;
  const splitCode = invoiceRow.business.paystackSplitCode ?? undefined;

  const transaction = await initializePaystackTransaction({
    reference,
    email,
    amountKobo,
    currency,
    callbackUrl,
    metadata: {
      invoiceId: invoiceRow.id,
      businessId: invoiceRow.businessId,
      clientId: invoiceRow.clientId,
      workspace: invoiceRow.business.slug,
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
