import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";
import { createError, getHeader, readRawBody, setResponseStatus } from "h3";

import { db } from "../../db/client";
import { invoices, payments } from "../../db/schema";
import { verifyPaystackSignature } from "../../utils/paystack";

interface PaystackWebhookPayload {
  event: string;
  data?: {
    reference?: string;
    status?: string;
    amount?: number;
    paid_at?: string;
    channel?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export default defineEventHandler(async (event) => {
  const rawBody = await readRawBody(event);

  if (!rawBody) {
    throw createError({ statusCode: 400, statusMessage: "Empty webhook payload" });
  }

  const signature = getHeader(event, "x-paystack-signature");
  const runtimeConfig = useRuntimeConfig();
  const sanitizedConfig = {
    secretKey: runtimeConfig.paystack?.secretKey
      ? `hash:${createHash("sha256").update(runtimeConfig.paystack.secretKey).digest("hex").slice(0, 8)}`
      : undefined,
    webhookSecret: runtimeConfig.paystack?.webhookSecret ? "[set]" : undefined,
  };
  console.log('[paystack-secret] value', runtimeConfig.paystack?.secretKey);
  console.log("[paystack-webhook] config", sanitizedConfig);
  console.log("[paystack-webhook] signature present", Boolean(signature));
  const verification = verifyPaystackSignature(rawBody, signature);
  if (!verification.valid) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid Paystack signature",
      data: {
        paystackConfig: sanitizedConfig,
        signaturePresent: Boolean(signature),
        rawLength: typeof rawBody === "string" ? rawBody.length : rawBody?.byteLength ?? 0,
        verification,
      },
    });
  }

  let payload: PaystackWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as PaystackWebhookPayload;
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: "Invalid JSON payload" });
  }

  const reference = payload.data?.reference;
  if (!reference) {
    setResponseStatus(event, 202);
    return { acknowledged: true };
  }

  const paymentRow = await db.query.payments.findFirst({
    where: eq(payments.reference, reference),
    with: {
      invoice: true,
    },
  });

  if (!paymentRow) {
    setResponseStatus(event, 202);
    return { acknowledged: true };
  }

  const paidAt = payload.data?.paid_at ? new Date(payload.data.paid_at) : new Date();

  if (payload.event === "charge.success") {
    await db.transaction(async (tx) => {
      await tx
        .update(payments)
        .set({
          status: "successful",
          metadata: JSON.stringify(payload.data ?? null),
        })
        .where(eq(payments.id, paymentRow.id));

      if (paymentRow.invoice.status !== "paid") {
        await tx
          .update(invoices)
          .set({
            status: "paid",
            paidAt,
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, paymentRow.invoiceId));
      }
    });
  } else if (payload.event === "charge.failed") {
    await db
      .update(payments)
      .set({
        status: "failed",
        metadata: JSON.stringify(payload.data ?? null),
      })
      .where(eq(payments.id, paymentRow.id));
  } else {
    await db
      .update(payments)
      .set({
        metadata: JSON.stringify(payload.data ?? null),
      })
      .where(eq(payments.id, paymentRow.id));
  }

  setResponseStatus(event, 202);
  return { acknowledged: true };
});
