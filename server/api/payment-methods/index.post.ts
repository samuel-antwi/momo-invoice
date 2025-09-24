import { eq } from "drizzle-orm";
import { serverSupabaseUser } from "#supabase/server";
import { createError, readBody, setResponseStatus } from "h3";
import { z } from "zod";

import { db } from "../../db/client";
import { paymentMethods } from "../../db/schema";
import { ensureBusinessForUser } from "../../utils/business";
import { mapPaymentMethodRow } from "../../utils/payment-method";

const schema = z.object({
  label: z
    .string()
    .min(1, "Label is required")
    .transform((value) => value.trim()),
  provider: z.enum(["mtn", "vodafone", "airteltigo", "other"]).optional(),
  accountName: z
    .string()
    .optional()
    .nullable()
    .transform((value) => value?.trim() || undefined),
  accountNumber: z
    .string()
    .optional()
    .nullable()
    .transform((value) => value?.trim() || undefined),
  instructions: z
    .string()
    .max(2000, "Instructions must be 2000 characters or less")
    .optional()
    .nullable()
    .transform((value) => value?.trim() || undefined),
  isDefault: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    setResponseStatus(event, 401);
    return { error: "Unauthorized" };
  }

  const body = await readBody(event);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    throw createError({
      statusCode: 422,
      statusMessage: "Validation failed",
      data: { errors: fieldErrors },
    });
  }

  const payload = parsed.data;
  const business = await ensureBusinessForUser(user);

  const existing = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.businessId, business.id));

  const existingDefault = existing.find((method) => method.isDefault);
  const shouldBeDefault = payload.isDefault === true || existing.length === 0;

  if (shouldBeDefault && existing.length > 0) {
    await db
      .update(paymentMethods)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(paymentMethods.businessId, business.id));
  }

  const [created] = await db
    .insert(paymentMethods)
    .values({
      businessId: business.id,
      label: payload.label,
      provider: payload.provider ?? null,
      accountName: payload.accountName ?? null,
      accountNumber: payload.accountNumber ?? null,
      instructions: payload.instructions ?? null,
      isDefault: shouldBeDefault,
    })
    .returning();

  if (!created) {
    throw createError({ statusCode: 500, statusMessage: "Failed to create payment method" });
  }

  const paymentMethod = mapPaymentMethodRow(created);
  const defaultMethodId = shouldBeDefault ? paymentMethod.id : existingDefault?.id ?? null;

  setResponseStatus(event, 201);
  return { paymentMethod, defaultMethodId };
});
