import { defineEventHandler } from "h3";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/client";
import { reminders, invoices, reminderTemplates } from "../../db/schema";
import { requireAuth } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const { businessId } = await requireAuth(event);

  const reminderHistory = await db
    .select({
      id: reminders.id,
      invoiceId: reminders.invoiceId,
      invoiceNumber: invoices.invoiceNumber,
      templateLabel: reminderTemplates.label,
      channel: reminders.channel,
      status: reminders.status,
      scheduledAt: reminders.scheduledAt,
      sentAt: reminders.sentAt,
      payload: reminders.payload,
    })
    .from(reminders)
    .leftJoin(invoices, eq(reminders.invoiceId, invoices.id))
    .leftJoin(reminderTemplates, eq(reminders.templateId, reminderTemplates.id))
    .where(eq(invoices.businessId, businessId))
    .orderBy(desc(reminders.createdAt))
    .limit(20);

  return reminderHistory;
});