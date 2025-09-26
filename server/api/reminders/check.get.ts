import { defineEventHandler, getQuery, createError } from "h3";
import { eq, and, or } from "drizzle-orm";
import { db } from "../../db/client";
import { invoices, reminders, reminderTemplates } from "../../db/schema";
import { sendReminderEmail } from "../../utils/email";

// This endpoint can be called by a cron job to check and send due reminders
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const secret = query.secret as string;

  // Simple secret check for cron job authentication
  const config = useRuntimeConfig();
  if (secret !== config.cronSecret && config.public.appEnv === "production") {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const now = new Date();
  const results: any[] = [];

  // Get all enabled templates across all businesses
  const allTemplates = await db.query.reminderTemplates.findMany({
    where: eq(reminderTemplates.enabled, true),
    with: {
      business: true,
    },
  });

  if (!allTemplates.length) {
    return {
      success: true,
      message: "No enabled templates found",
      sent: 0,
    };
  }

  // Group templates by business
  const templatesByBusiness = allTemplates.reduce((acc: any, template) => {
    const businessId = template.businessId;
    if (!acc[businessId]) {
      acc[businessId] = [];
    }
    acc[businessId].push(template);
    return acc;
  }, {});

  // Process each business
  for (const [businessId, templates] of Object.entries(templatesByBusiness)) {
    // Get unpaid invoices for this business
    const unpaidInvoices = await db.query.invoices.findMany({
      where: and(
        eq(invoices.businessId, businessId),
        or(
          eq(invoices.status, "sent"),
          eq(invoices.status, "overdue")
        )
      ),
      with: {
        client: true,
        business: true,
      },
    });

    for (const invoice of unpaidInvoices) {
      if (!invoice.dueDate) continue;

      for (const template of templates as any[]) {
        // Calculate when this reminder should be sent
        const scheduledDate = new Date(invoice.dueDate);
        scheduledDate.setDate(scheduledDate.getDate() + template.offsetDays);

        // Check if it's time to send this reminder
        if (scheduledDate <= now) {
          // Check if we already sent this reminder today
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const existing = await db.query.reminders.findFirst({
            where: and(
              eq(reminders.invoiceId, invoice.id),
              eq(reminders.templateId, template.id),
              eq(reminders.status, "sent")
            ),
          });

          if (!existing) {
            try {
              await sendReminder(invoice, template);
              results.push({
                invoiceId: invoice.id,
                templateId: template.id,
                invoiceNumber: invoice.invoiceNumber,
                client: invoice.client?.fullName,
                status: "sent",
              });
            } catch (error: any) {
              results.push({
                invoiceId: invoice.id,
                templateId: template.id,
                invoiceNumber: invoice.invoiceNumber,
                client: invoice.client?.fullName,
                status: "failed",
                error: error.message,
              });
            }
          }
        }
      }
    }
  }

  return {
    success: true,
    sent: results.filter((r) => r.status === "sent").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  };
});

async function sendReminder(invoice: any, template: any) {
  const channel = template.channel;
  let status = "sent";
  let error = null;

  try {
    switch (channel) {
      case "email":
        if (invoice.client?.email) {
          await sendReminderEmail(invoice, template, false);
        } else {
          throw new Error("Client has no email address");
        }
        break;

      case "whatsapp":
        // TODO: Implement WhatsApp sending
        console.log("WhatsApp reminder scheduled for:", invoice.client?.whatsappNumber || invoice.client?.phone);
        throw new Error("WhatsApp integration pending");

      case "sms":
        // TODO: Implement SMS sending
        console.log("SMS reminder scheduled for:", invoice.client?.phone);
        throw new Error("SMS integration pending");

      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  } catch (err: any) {
    status = "failed";
    error = err.message;
    throw err;
  } finally {
    // Record the reminder in the database
    await db
      .insert(reminders)
      .values({
        invoiceId: invoice.id,
        templateId: template.id,
        channel: template.channel,
        status,
        scheduledAt: new Date(),
        sentAt: status === "sent" ? new Date() : null,
        payload: error ? JSON.stringify({ error }) : null,
      });
  }
}