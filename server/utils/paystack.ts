import crypto from "node:crypto";

import { createError } from "h3";
import { $fetch } from "ofetch";

const PAYSTACK_API_BASE = "https://api.paystack.co";

interface InitializeTransactionPayload {
  reference: string;
  email: string;
  amountKobo: number;
  currency: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

interface PaystackTransactionResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export const initializePaystackTransaction = async (payload: InitializeTransactionPayload) => {
  const config = useRuntimeConfig();
  const secretKey = config.paystack?.secretKey;

  if (!secretKey) {
    throw createError({ statusCode: 500, statusMessage: "Paystack secret key not configured" });
  }

  const response = await $fetch<PaystackTransactionResponse>(`${PAYSTACK_API_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: {
      reference: payload.reference,
      email: payload.email,
      amount: payload.amountKobo,
      currency: payload.currency,
      callback_url: payload.callbackUrl,
      metadata: payload.metadata,
    },
  });

  if (!response.status || !response.data) {
    throw createError({
      statusCode: 502,
      statusMessage: "Failed to initialize Paystack transaction",
      data: { providerMessage: response.message },
    });
  }

  return response.data;
};

export interface PaystackSignatureVerification {
  valid: boolean;
  computedSignature?: string;
  incomingSignature?: string;
}

export const verifyPaystackSignature = (
  rawBody: string,
  incomingSignature: string | undefined,
): PaystackSignatureVerification => {
  const config = useRuntimeConfig();
  const secretKey = config.paystack?.webhookSecret || config.paystack?.secretKey;

  if (!secretKey || !incomingSignature) {
    return { valid: false, incomingSignature };
  }

  const payloadBuffer = typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : Buffer.from(rawBody);
  const computedSignature = crypto.createHmac("sha512", secretKey).update(payloadBuffer).digest("hex");
  const normalized = incomingSignature.trim();

  if (computedSignature.length !== normalized.length) {
    return { valid: false, computedSignature, incomingSignature: normalized };
  }

  try {
    const valid = crypto.timingSafeEqual(Buffer.from(computedSignature, "hex"), Buffer.from(normalized, "hex"));
    return { valid, computedSignature, incomingSignature: normalized };
  } catch (error) {
    return { valid: false, computedSignature, incomingSignature: normalized };
  }
};

export const toPaystackReference = (source: string) => {
  const sanitized = source.replace(/[^A-Z0-9-]/gi, "").slice(0, 30);
  const suffix = crypto.randomUUID().split("-")[0].toUpperCase();
  const prefix = sanitized.length > 0 ? sanitized.toUpperCase() : "INVOICE";
  return `${prefix}-${suffix}`;
};
