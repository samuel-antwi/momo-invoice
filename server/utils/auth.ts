import { serverSupabaseUser } from "#supabase/server";
import type { H3Event } from "h3";
import { ensureBusinessForUser } from "./business";

export async function requireAuth(event: H3Event) {
  const user = await serverSupabaseUser(event);

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized - Please log in",
    });
  }

  const business = await ensureBusinessForUser(user);

  if (!business) {
    throw createError({
      statusCode: 403,
      statusMessage: "No business found for user",
    });
  }

  return {
    userId: user.id,
    businessId: business.id,
    business,
  };
}