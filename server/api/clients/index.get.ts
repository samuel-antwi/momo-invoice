import { asc, eq } from "drizzle-orm";

import { serverSupabaseUser } from "#supabase/server";
import { db } from "../../db/client";
import { clients } from "../../db/schema";
import { ensureBusinessForUser } from "../../utils/business";
import { mapClientRow } from "../../utils/client";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    setResponseStatus(event, 401);
    return { clients: [], breakdown: {} };
  }

  const business = await ensureBusinessForUser(user);

  const rows = await db
    .select()
    .from(clients)
    .where(eq(clients.businessId, business.id))
    .orderBy(asc(clients.createdAt));

  const breakdown = rows.reduce<Record<string, number>>((acc, client) => {
    acc[client.momoProvider] = (acc[client.momoProvider] ?? 0) + 1;
    return acc;
  }, {});

  return {
    clients: rows.map(mapClientRow),
    breakdown,
  };
});
