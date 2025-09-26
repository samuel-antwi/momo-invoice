import { defineEventHandler, readBody } from "h3";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { reminderTemplates } from "../../db/schema";
import { requireAuth } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const { businessId } = await requireAuth(event);

  const body = await readBody(event);

  const { label, offsetDays, channel, enabled = true } = body;

  if (!label || offsetDays === undefined || !channel) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing required fields: label, offsetDays, channel",
    });
  }

  const [template] = await db
    .insert(reminderTemplates)
    .values({
      businessId,
      label,
      offsetDays,
      channel,
      enabled,
    })
    .returning();

  return template;
});