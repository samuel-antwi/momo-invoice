import { db } from "../db/client";
import { reminderTemplates } from "../db/schema";
import { eq } from "drizzle-orm";
import { serverSupabaseUser } from "#supabase/server";
import { ensureBusinessForUser, toBusinessProfile } from "../utils/business";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    setResponseStatus(event, 401);
    return { profile: null, reminderTemplates: [] };
  }

  const business = await ensureBusinessForUser(user);

  const profile = toBusinessProfile(business);

  const templateRows = await db
    .select()
    .from(reminderTemplates)
    .where(eq(reminderTemplates.businessId, business.id));

  return {
    profile,
    reminderTemplates: templateRows.map((template) => ({
      id: template.id,
      label: template.label,
      offsetDays: template.offsetDays,
      channel: template.channel,
      enabled: template.enabled,
    })),
  };
});
