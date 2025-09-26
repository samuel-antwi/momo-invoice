import { defineEventHandler } from "h3";
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

  const [deleted] = await db
    .delete(reminderTemplates)
    .where(
      and(
        eq(reminderTemplates.id, templateId),
        eq(reminderTemplates.businessId, businessId)
      )
    )
    .returning();

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: "Template not found",
    });
  }

  return { success: true };
});
