import crypto from "node:crypto";

import { createError } from "h3";
import { $fetch } from "ofetch";

const PAYSTACK_API_BASE = "https://api.paystack.co";

const getSecretKey = () => {
  const config = useRuntimeConfig();
  const secretKey = config.paystack?.secretKey;

  if (!secretKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Paystack secret key not configured",
    });
  }

  return secretKey;
};

const paystackRequest = async <T>(
  path: string,
  init: Parameters<typeof $fetch>[1] = {}
) => {
  const secretKey = getSecretKey();

  return $fetch<T>(`${PAYSTACK_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
};

interface InitializeTransactionPayload {
  reference: string;
  email: string;
  amountKobo: number;
  currency: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
  subaccount?: string;
  splitCode?: string;
  bearer?: "account" | "subaccount";
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

export const initializePaystackTransaction = async (
  payload: InitializeTransactionPayload
) => {
  const response = await paystackRequest<PaystackTransactionResponse>(
    "/transaction/initialize",
    {
      method: "POST",
      body: {
        reference: payload.reference,
        email: payload.email,
        amount: payload.amountKobo,
        currency: payload.currency,
        callback_url: payload.callbackUrl,
        metadata: payload.metadata,
        subaccount: payload.subaccount,
        split_code: payload.splitCode,
        bearer: payload.bearer,
      },
    }
  );

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
  rawBody: string | Buffer,
  incomingSignature: string | undefined
): PaystackSignatureVerification => {
  const config = useRuntimeConfig();
  const secretKey =
    config.paystack?.webhookSecret || config.paystack?.secretKey;

  if (!secretKey || !incomingSignature) {
    return { valid: false, incomingSignature };
  }

  const payloadBuffer =
    typeof rawBody === "string"
      ? Buffer.from(rawBody, "utf8")
      : Buffer.from(rawBody);
  const computedSignature = crypto
    .createHmac("sha512", secretKey)
    .update(payloadBuffer)
    .digest("hex");
  const normalized = incomingSignature.trim();

  if (computedSignature.length !== normalized.length) {
    return { valid: false, computedSignature, incomingSignature: normalized };
  }

  try {
    const valid = crypto.timingSafeEqual(
      Buffer.from(computedSignature, "hex"),
      Buffer.from(normalized, "hex")
    );

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

interface PaystackBankResponse {
  status: boolean;
  message: string;
  data?: Array<{
    name: string;
    code: string;
    type?: string | null;
    currency?: string | null;
    country?: string | null;
    active?: boolean;
  }>;
}

export interface PaystackBankOption {
  name: string;
  code: string;
  type?: string | null;
  currency?: string | null;
  country?: string | null;
}

interface PaystackBankQuery {
  country?: string;
  type?: string;
  currency?: string;
  perPage?: number;
}

export const listPaystackBanks = async ({
  country = "ghana",
  type,
  currency,
  perPage = 100,
}: PaystackBankQuery = {}) => {
  const query: Record<string, string> = {};

  if (country) query.country = country;
  if (currency) query.currency = currency;
  if (type) query.type = type;
  if (perPage) query.perPage = String(perPage);

  const response = await paystackRequest<PaystackBankResponse>(`/bank`, {
    method: "GET",
    query,
  });

  if (!response.status || !response.data) {
    throw createError({
      statusCode: 502,
      statusMessage: "Failed to fetch Paystack banks",
      data: { providerMessage: response.message },
    });
  }

  return response.data
    .filter((bank) => bank.active !== false)
    .map(
      (bank) =>
        ({
          name: bank.name,
          code: bank.code,
          type: bank.type ?? undefined,
          currency: bank.currency ?? undefined,
          country: bank.country ?? undefined,
        } satisfies PaystackBankOption)
    );
};

interface PaystackSubaccountResponse {
  status: boolean;
  message: string;
  data?: {
    business_name: string;
    settlement_bank: string;
    account_number: string;
    subaccount_code: string;
    settlement_schedule?: string;
    percentage_charge?: number;
    active?: boolean;
  };
}

interface BaseSubaccountPayload {
  businessName: string;
  settlementBank: string;
  bankCode?: string;
  accountNumber: string;
  accountName?: string;
  primaryContactEmail?: string;
  primaryContactName?: string;
  metadata?: Record<string, unknown>;
  settlementSchedule?: "auto" | "manual";
  currency?: string;
  type?: string;
}

export const createPaystackSubaccount = async (
  payload: BaseSubaccountPayload
) => {
  const response = await paystackRequest<PaystackSubaccountResponse>(
    "/subaccount",
    {
      method: "POST",
      body: {
        business_name: payload.businessName,
        settlement_bank: payload.settlementBank,
        account_number: payload.accountNumber,
        bank_code: payload.bankCode ?? payload.settlementBank,
        bank_account_number: payload.accountNumber,
        bank_account_name: payload.accountName,
        primary_contact_email: payload.primaryContactEmail,
        primary_contact_name: payload.primaryContactName,
        settlement_schedule: payload.settlementSchedule ?? "auto",
        settlement_currency: payload.currency ?? "GHS",
        business_type: payload.type,
        metadata: payload.metadata,
      },
    }
  );

  if (!response.status || !response.data) {
    throw createError({
      statusCode: 502,
      statusMessage: "Failed to create Paystack subaccount",
      data: { providerMessage: response.message },
    });
  }

  return response.data;
};

export const updatePaystackSubaccount = async (
  subaccountCode: string,
  payload: BaseSubaccountPayload
) => {
  const response = await paystackRequest<PaystackSubaccountResponse>(
    `/subaccount/${subaccountCode}`,
    {
      method: "PUT",
      body: {
        business_name: payload.businessName,
        settlement_bank: payload.settlementBank,
        account_number: payload.accountNumber,
        bank_code: payload.bankCode ?? payload.settlementBank,
        bank_account_number: payload.accountNumber,
        bank_account_name: payload.accountName,
        primary_contact_email: payload.primaryContactEmail,
        primary_contact_name: payload.primaryContactName,
        settlement_schedule: payload.settlementSchedule ?? "auto",
        settlement_currency: payload.currency ?? "GHS",
        business_type: payload.type,
        metadata: payload.metadata,
      },
    }
  );

  if (!response.status || !response.data) {
    throw createError({
      statusCode: 502,
      statusMessage: "Failed to update Paystack subaccount",
      data: { providerMessage: response.message },
    });
  }

  return response.data;
};
