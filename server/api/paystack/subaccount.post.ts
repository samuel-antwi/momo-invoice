import { eq } from "drizzle-orm";
import { createError, readBody, setResponseStatus } from "h3";
import { z } from "zod";
import { serverSupabaseUser } from "#supabase/server";

import { db } from "../../db/client";
import { businesses } from "../../db/schema";
import { ensureBusinessForUser, toBusinessProfile } from "../../utils/business";
import { createPaystackSubaccount, updatePaystackSubaccount } from "../../utils/paystack";

const payloadSchema = z.object({
  bankCode: z.string().min(2, "Select a bank"),
  bankType: z.string().optional(),
  currency: z.string().min(3).max(3).optional(),
  accountNumber: z.string().min(6, "Enter a valid account/MoMo number").max(30),
  accountName: z.string().min(2, "Enter the recipient name").max(120),
});

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody(event);
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: "Validation failed", data: parsed.error.flatten() });
  }

  const { bankCode, bankType, currency, accountNumber, accountName } = parsed.data;

  const business = await ensureBusinessForUser(user);

  const basePayload = {
    businessName: business.name,
    settlementBank: bankCode,
    bankCode: bankType ? bankCode : undefined,
    currency,
    type: bankType,
    accountNumber,
    accountName,
    primaryContactEmail: business.email ?? user.email ?? undefined,
    primaryContactName: business.name,
    metadata: {
      businessId: business.id,
      workspace: business.slug,
    },
  };

  const subaccountResponse = business.paystackSubaccountCode
    ? await updatePaystackSubaccount(business.paystackSubaccountCode, basePayload)
    : await createPaystackSubaccount(basePayload);

  const updates: Record<string, unknown> = {
    paystackSubaccountCode: subaccountResponse.subaccount_code,
    paystackSubaccountStatus: "active",
    paystackSettlementBankCode: subaccountResponse.settlement_bank ?? bankCode,
    paystackSettlementAccountNumber: subaccountResponse.account_number ?? accountNumber,
    paystackSettlementAccountName: accountName,
    paystackSubaccountCreatedAt: new Date(),
    updatedAt: new Date(),
  };

  await db.update(businesses).set(updates).where(eq(businesses.id, business.id));

  const [row] = await db.select().from(businesses).where(eq(businesses.id, business.id)).limit(1);

  const updated = row ?? business;

  setResponseStatus(event, business.paystackSubaccountCode ? 200 : 201);
  return {
    success: true,
    profile: toBusinessProfile(updated),
  };
});
