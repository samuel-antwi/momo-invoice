import { defineEventHandler } from "h3";
import { eq, asc } from "drizzle-orm";
import { db } from "../../db/client";
import { reminderTemplates } from "../../db/schema";
import { requireAuth } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const { businessId } = await requireAuth(event);

  const templates = await db
    .select()
    .from(reminderTemplates)
    .where(eq(reminderTemplates.businessId, businessId))
    .orderBy(asc(reminderTemplates.offsetDays));

  return templates;
});