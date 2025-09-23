import { eq } from "drizzle-orm";
import { serverSupabaseUser } from "#supabase/server";
import { createError, readBody, setResponseStatus } from "h3";
import { z } from "zod";

import { db } from "../../db/client";
import { clients } from "../../db/schema";
import { ensureBusinessForUser } from "../../utils/business";
import { mapClientRow } from "../../utils/client";

const createClientSchema = z.object({
  fullName: z.string().min(1, "Client name is required"),
  businessName: z
    .string()
    .optional()
    .nullable()
    .transform((value) => value?.trim() || undefined),
  email: z
    .string()
    .email("Enter a valid email")
    .optional()
    .nullable()
    .transform((value) => value?.trim() || undefined),
  phone: z
    .string()
    .min(3, "Enter a valid phone number")
    .optional()
    .nullable()
    .transform((value) => value?.trim() || undefined),
  whatsappNumber: z
    .string()
    .min(3, "Enter a valid WhatsApp number")
    .optional()
    .nullable()
    .transform((value) => value?.trim() || undefined),
  momoProvider: z.enum(["mtn", "vodafone", "airteltigo", "other"]).default("mtn"),
  notes: z
    .string()
    .max(1000, "Notes must be 1000 characters or less")
    .optional()
    .nullable()
    .transform((value) => value?.trim() || undefined),
});

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    setResponseStatus(event, 401);
    return { error: "Unauthorized" };
  }

  const body = await readBody(event);
  const parsed = createClientSchema.safeParse(body);

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

  const [created] = await db
    .insert(clients)
    .values({
      businessId: business.id,
      fullName: payload.fullName.trim(),
      businessName: payload.businessName ?? null,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      whatsappNumber: payload.whatsappNumber ?? null,
      momoProvider: payload.momoProvider,
      notes: payload.notes ?? null,
    })
    .returning();

  if (!created) {
    throw createError({ statusCode: 500, statusMessage: "Failed to create client" });
  }

  const row = await db.query.clients.findFirst({
    where: eq(clients.id, created.id),
  });

  if (!row) {
    throw createError({ statusCode: 500, statusMessage: "Unable to load created client" });
  }

  const client = mapClientRow(row);

  setResponseStatus(event, 201);
  return { client };
});
