import { and, eq } from "drizzle-orm";
import { serverSupabaseUser } from "#supabase/server";
import { createError, getRouterParam, readBody, setResponseStatus } from "h3";

import { db } from "../../db/client";
import { clients } from "../../db/schema";
import { ensureBusinessForUser } from "../../utils/business";
import { mapClientRow } from "../../utils/client";
import { clientPayloadSchema } from "../../utils/schemas/client";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const clientId = getRouterParam(event, "id");
  if (!clientId) {
    throw createError({ statusCode: 400, statusMessage: "Client id is required" });
  }

  const body = await readBody(event);
  const parsed = clientPayloadSchema.safeParse(body);

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

  const existing = await db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.businessId, business.id)),
  });

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: "Client not found" });
  }

  const [updated] = await db
    .update(clients)
    .set({
      fullName: payload.fullName,
      businessName: payload.businessName ?? null,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      whatsappNumber: payload.whatsappNumber ?? null,
      momoProvider: payload.momoProvider,
      notes: payload.notes ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(clients.id, clientId), eq(clients.businessId, business.id)))
    .returning();

  if (!updated) {
    throw createError({ statusCode: 500, statusMessage: "Failed to update client" });
  }

  const client = mapClientRow(updated);

  setResponseStatus(event, 200);
  return { client };
});
