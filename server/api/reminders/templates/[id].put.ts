import { defineEventHandler, readBody } from "h3";
import { eq, and } from "drizzle-orm";
import { db } from "../../../db/client";
import { reminderTemplates } from "../../../db/schema";
import { requireAuth } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  const { businessId } = await requireAuth(event);
  const templateId = getRouterParam(event, "id");

  if (!templateId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Template ID is required",
    });
  }

  const body = await readBody(event);
  const { label, offsetDays, channel, enabled } = body;

  const updateData: any = {};
  if (label !== undefined) updateData.label = label;
  if (offsetDays !== undefined) updateData.offsetDays = offsetDays;
  if (channel !== undefined) updateData.channel = channel;
  if (enabled !== undefined) updateData.enabled = enabled;

  const [template] = await db
    .update(reminderTemplates)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(reminderTemplates.id, templateId),
        eq(reminderTemplates.businessId, businessId)
      )
    )
    .returning();

  if (!template) {
    throw createError({
      statusCode: 404,
      statusMessage: "Template not found",
    });
  }

  return template;
});