import { defineEventHandler, readBody, createError } from "h3";
import { eq, and, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client";
import { invoices, reminders, reminderTemplates } from "../../db/schema";
import { requireAuth } from "../../utils/auth";
import { sendReminderEmail } from "../../utils/email";

const sendReminderSchema = z.object({
  invoiceId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  test: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  const { businessId } = await requireAuth(event);

  const body = await readBody(event);
  const parsed = sendReminderSchema.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: "Invalid request body",
    });
  }

  const { invoiceId, templateId, test } = parsed.data;

  // If specific invoice and template, send just that one
  if (invoiceId && templateId) {
    const [template] = await db
      .select()
      .from(reminderTemplates)
      .where(
        and(
          eq(reminderTemplates.id, templateId),
          eq(reminderTemplates.businessId, businessId),
          eq(reminderTemplates.enabled, true)
        )
      );

    if (!template) {
      throw createError({
        statusCode: 404,
        statusMessage: "Template not found or disabled",
      });
    }

    const invoice = await db.query.invoices.findFirst({
      where: and(
        eq(invoices.id, invoiceId),
        eq(invoices.businessId, businessId)
      ),
      with: {
        client: true,
        business: true,
      },
    });

    if (!invoice) {
      throw createError({
        statusCode: 404,
        statusMessage: "Invoice not found",
      });
    }

    // Send the reminder
    const result = await sendReminder(invoice, template, test);

    return {
      success: true,
      sent: 1,
      results: [result],
    };
  }

  // Otherwise, find all due reminders and send them
  const now = new Date();
  const templates = await db.query.reminderTemplates.findMany({
    where: and(
      eq(reminderTemplates.businessId, businessId),
      eq(reminderTemplates.enabled, true)
    ),
  });

  if (!templates.length) {
    return {
      success: true,
      sent: 0,
      message: "No enabled templates found",
    };
  }

  // Get all unpaid invoices for this business
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

  const results = [];

  for (const invoice of unpaidInvoices) {
    if (!invoice.dueDate) continue;

    for (const template of templates) {
      // Calculate when this reminder should be sent
      const scheduledDate = new Date(invoice.dueDate);
      scheduledDate.setDate(scheduledDate.getDate() + template.offsetDays);

      // Check if it's time to send this reminder
      if (scheduledDate <= now) {
        // Check if we already sent this reminder
        const existing = await db.query.reminders.findFirst({
          where: and(
            eq(reminders.invoiceId, invoice.id),
            eq(reminders.templateId, template.id),
            eq(reminders.status, "sent")
          ),
        });

        if (!existing) {
          const result = await sendReminder(invoice, template, test);
          results.push(result);
        }
      }
    }
  }

  return {
    success: true,
    sent: results.length,
    results,
  };
});

async function sendReminder(invoice: any, template: any, test = false) {
  const channel = template.channel;
  let status = "sent";
  let error = null;

  try {
    switch (channel) {
      case "email":
        if (invoice.client?.email) {
          await sendReminderEmail(invoice, template, test);
        } else {
          throw new Error("Client has no email address");
        }
        break;

      case "whatsapp":
        if (invoice.client?.whatsappNumber || invoice.client?.phone) {
          // TODO: Implement WhatsApp sending via WhatsApp Business API
          console.log("WhatsApp reminder would be sent to:", invoice.client.whatsappNumber || invoice.client.phone);
          if (!test) {
            throw new Error("WhatsApp integration not yet implemented");
          }
        } else {
          throw new Error("Client has no WhatsApp number");
        }
        break;

      case "sms":
        if (invoice.client?.phone) {
          // TODO: Implement SMS sending via Africa's Talking or similar
          console.log("SMS reminder would be sent to:", invoice.client.phone);
          if (!test) {
            throw new Error("SMS integration not yet implemented");
          }
        } else {
          throw new Error("Client has no phone number");
        }
        break;

      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  } catch (err: any) {
    status = "failed";
    error = err.message;
  }

  // Record the reminder in the database
  if (!test) {
    const [reminder] = await db
      .insert(reminders)
      .values({
        invoiceId: invoice.id,
        templateId: template.id,
        channel: template.channel,
        status,
        scheduledAt: new Date(),
        sentAt: status === "sent" ? new Date() : null,
        payload: error ? JSON.stringify({ error }) : null,
      })
      .returning();

    return reminder;
  }

  return {
    invoiceId: invoice.id,
    templateId: template.id,
    channel,
    status,
    test: true,
    error,
  };
}