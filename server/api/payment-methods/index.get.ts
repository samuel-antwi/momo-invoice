import { asc, desc, eq } from "drizzle-orm";
import { serverSupabaseUser } from "#supabase/server";

import { db } from "../../db/client";
import { paymentMethods } from "../../db/schema";
import { ensureBusinessForUser } from "../../utils/business";
import { mapPaymentMethodRow } from "../../utils/payment-method";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    setResponseStatus(event, 401);
    return { paymentMethods: [], defaultMethodId: null };
  }

  const business = await ensureBusinessForUser(user);

  const rows = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.businessId, business.id))
    .orderBy(desc(paymentMethods.isDefault), asc(paymentMethods.createdAt));

  const defaultMethodId = rows.find((row) => row.isDefault)?.id ?? null;

  return {
    paymentMethods: rows.map(mapPaymentMethodRow),
    defaultMethodId,
  };
});
