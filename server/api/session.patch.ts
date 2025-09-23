import { eq } from "drizzle-orm";
import { readBody } from "h3";
import { serverSupabaseUser } from "#supabase/server";

import { db } from "../db/client";
import { businesses } from "../db/schema";
import { ensureBusinessForUser, toBusinessProfile } from "../utils/business";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody<{
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    whatsappNumber?: string;
    logoUrl?: string;
    themeColor?: string;
    plan?: "free" | "pro";
    address?: string;
    setupCompleted?: boolean;
  }>(event);

  const business = await ensureBusinessForUser(user);

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.email !== undefined) updates.email = body.email;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.whatsappNumber !== undefined) updates.whatsappNumber = body.whatsappNumber;
  if (body.logoUrl !== undefined) updates.logoUrl = body.logoUrl;
  if (body.themeColor !== undefined) updates.themeColor = body.themeColor;
  if (body.plan !== undefined) updates.plan = body.plan;
  if (body.address !== undefined) updates.address = body.address;
  if (body.setupCompleted !== undefined) updates.setupCompleted = Boolean(body.setupCompleted);

  const hasUpdates = Object.keys(updates).length > 0;

  let updatedBusiness = business;

  if (hasUpdates) {
    updates.updatedAt = new Date();

    await db.update(businesses).set(updates).where(eq(businesses.id, business.id));

    const [row] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, business.id))
      .limit(1);

    if (row) {
      updatedBusiness = row;
    }
  }

  return {
    success: true,
    profile: toBusinessProfile(updatedBusiness),
  };
});
