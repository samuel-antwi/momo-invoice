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

  console.log('[paystack-webhook] processing webhook');
  console.log("[paystack-webhook] config", sanitizedConfig);
  console.log("[paystack-webhook] signature present", Boolean(signature));
  console.log("[paystack-webhook] raw body length", typeof rawBody === "string" ? rawBody.length : rawBody?.byteLength ?? 0);

  // Skip signature verification in development when no webhook secret is set
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const hasWebhookSecret = Boolean(runtimeConfig.paystack?.webhookSecret);

  if (!hasWebhookSecret && isDevelopment) {
    console.log('[paystack-webhook] DEVELOPMENT MODE: Skipping signature verification (no webhook secret configured)');
  } else {
    const verification = verifyPaystackSignature(rawBody, signature);
    console.log("[paystack-webhook] verification result", verification);

    if (!verification.valid) {
      console.error('[paystack-webhook] signature verification failed', {
        paystackConfig: sanitizedConfig,
        signaturePresent: Boolean(signature),
        rawLength: typeof rawBody === "string" ? rawBody.length : rawBody?.byteLength ?? 0,
        verification,
      });

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
  }

  let payload: PaystackWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as PaystackWebhookPayload;
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: "Invalid JSON payload" });
  }

  const reference = payload.data?.reference;
  console.log('[paystack-webhook] payload event:', payload.event);
  console.log('[paystack-webhook] payment reference:', reference);

  if (!reference) {
    console.log('[paystack-webhook] no reference in payload, acknowledging');
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
    console.log('[paystack-webhook] payment not found for reference:', reference);
    setResponseStatus(event, 202);
    return { acknowledged: true };
  }

  console.log('[paystack-webhook] found payment:', {
    paymentId: paymentRow.id,
    invoiceId: paymentRow.invoiceId,
    currentInvoiceStatus: paymentRow.invoice.status,
    currentPaymentStatus: paymentRow.status
  });

  const paidAt = payload.data?.paid_at ? new Date(payload.data.paid_at) : new Date();

  if (payload.event === "charge.success") {
    console.log('[paystack-webhook] processing successful charge');

    try {
      await db.transaction(async (tx) => {
        console.log('[paystack-webhook] updating payment status to successful');
        await tx
          .update(payments)
          .set({
            status: "successful",
            metadata: JSON.stringify(payload.data ?? null),
          })
          .where(eq(payments.id, paymentRow.id));

        if (paymentRow.invoice.status !== "paid") {
          console.log('[paystack-webhook] updating invoice status to paid');
          await tx
            .update(invoices)
            .set({
              status: "paid",
              paidAt,
              updatedAt: new Date(),
            })
            .where(eq(invoices.id, paymentRow.invoiceId));
        } else {
          console.log('[paystack-webhook] invoice already marked as paid');
        }
      });

      console.log('[paystack-webhook] successfully processed charge.success');
    } catch (error) {
      console.error('[paystack-webhook] error processing charge.success:', error);
      throw error;
    }
  } else if (payload.event === "charge.failed") {
    console.log('[paystack-webhook] processing failed charge');

    await db
      .update(payments)
      .set({
        status: "failed",
        metadata: JSON.stringify(payload.data ?? null),
      })
      .where(eq(payments.id, paymentRow.id));

    console.log('[paystack-webhook] successfully processed charge.failed');
  } else {
    console.log('[paystack-webhook] processing other event:', payload.event);

    await db
      .update(payments)
      .set({
        metadata: JSON.stringify(payload.data ?? null),
      })
      .where(eq(payments.id, paymentRow.id));

    console.log('[paystack-webhook] successfully updated payment metadata');
  }

  setResponseStatus(event, 202);
  return { acknowledged: true };
});
