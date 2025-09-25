import { and, eq } from "drizzle-orm";
import { createError, getRouterParam, readBody } from "h3";
import { z } from "zod";
import { serverSupabaseUser } from "#supabase/server";

import { db } from "../../../db/client";
import { invoiceLineItems, invoices, paymentMethods } from "../../../db/schema";
import { ensureBusinessForUser } from "../../../utils/business";
import { computeInvoiceTotals, mapInvoiceRow } from "../../../utils/invoice";

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce
    .number({ invalid_type_error: "Quantity must be a number" })
    .positive("Quantity must be greater than zero"),
  unitPrice: z.coerce
    .number({ invalid_type_error: "Unit price must be a number" })
    .min(0, "Unit price cannot be negative"),
  taxRate: z
    .union([z.coerce.number().min(0).max(1), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      return Number(value);
    })
    .optional(),
  discount: z
    .union([z.coerce.number().min(0), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      return Number(value);
    })
    .optional(),
});

const payloadSchema = z.object({
  status: z.enum(["draft", "sent", "paid", "overdue"]).optional(),
  lastSharedAt: z.string().datetime().optional(),
  clientId: z.string().uuid().optional(),
  issueDate: z.string().min(1).optional(),
  dueDate: z.string().optional().nullable(),
  currency: z.string().length(3).optional(),
  paymentMethodId: z
    .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
      if (value === null || value === "") {
        return null;
      }
      return undefined;
    })
    .optional(),
  notes: z.string().max(2000).optional().nullable().transform((value) => {
    if (value === null) return null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    }
    return undefined;
  }),
  paymentInstructions: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .transform((value) => {
      if (value === null) return null;
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
      }
      return undefined;
    }),
  payableTo: z
    .string()
    .max(255)
    .optional()
    .nullable()
    .transform((value) => {
      if (value === null) return null;
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
      }
      return undefined;
    }),
  lineItems: z.array(lineItemSchema).min(1).optional(),
});

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const invoiceId = getRouterParam(event, "id");
  if (!invoiceId) {
    throw createError({ statusCode: 400, statusMessage: "Invoice id is required" });
  }

  const body = await readBody(event);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: "Validation failed", data: parsed.error.flatten() });
  }

  const keysWithValues = Object.entries(parsed.data).filter(([, value]) => value !== undefined);
  if (keysWithValues.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "No changes supplied" });
  }

  const business = await ensureBusinessForUser(user);

  const invoiceRow = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, invoiceId), eq(invoices.businessId, business.id)),
    with: {
      client: true,
      lineItems: true,
    },
  });

  if (!invoiceRow) {
    throw createError({ statusCode: 404, statusMessage: "Invoice not found" });
  }

  if (["paid", "overdue"].includes(invoiceRow.status)) {
    throw createError({
      statusCode: 409,
      statusMessage: "Paid or overdue invoices cannot be edited.",
    });
  }

  let paymentMethodId: string | null | undefined = undefined;
  let paymentMethodRow: { id: string; instructions: string | null; accountName: string | null } | null = null;

  if (parsed.data.paymentMethodId !== undefined) {
    if (parsed.data.paymentMethodId === null) {
      paymentMethodId = null;
    } else {
      const row = await db
        .select({ id: paymentMethods.id, instructions: paymentMethods.instructions, accountName: paymentMethods.accountName })
        .from(paymentMethods)
        .where(and(eq(paymentMethods.id, parsed.data.paymentMethodId), eq(paymentMethods.businessId, business.id)))
        .limit(1);

      if (!row.length) {
        throw createError({ statusCode: 404, statusMessage: "Payment method not found" });
      }
      paymentMethodRow = row[0];
      paymentMethodId = paymentMethodRow.id;
    }
  }

  const lineItemsFromPayload = parsed.data.lineItems?.map((item) => ({
    description: item.description.trim(),
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    taxRate: item.taxRate !== undefined ? Number(item.taxRate) : undefined,
    discount: item.discount !== undefined ? Number(item.discount) : undefined,
  }));

  const lineItemsForTotals = lineItemsFromPayload
    ? lineItemsFromPayload
    : invoiceRow.lineItems.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity ?? 0),
        unitPrice: Number(item.unitPrice ?? 0),
        taxRate: item.taxRate ? Number(item.taxRate) : undefined,
        discount: item.discount ? Number(item.discount) : undefined,
      }));

  const totals = computeInvoiceTotals(lineItemsForTotals);

  const updates: Partial<typeof invoices.$inferInsert> = {
    updatedAt: new Date(),
    subtotal: totals.subtotal,
    taxTotal: totals.taxTotal,
    discountTotal: totals.discountTotal,
    total: totals.total,
  };

  if (parsed.data.status) {
    updates.status = parsed.data.status;
  }

  if (parsed.data.lastSharedAt) {
    updates.lastSharedAt = new Date(parsed.data.lastSharedAt);
  }

  if (parsed.data.clientId) {
    updates.clientId = parsed.data.clientId;
  }

  if (parsed.data.issueDate) {
    updates.issueDate = new Date(parsed.data.issueDate);
  }

  if (parsed.data.dueDate !== undefined) {
    updates.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  }

  if (parsed.data.currency) {
    updates.currency = parsed.data.currency.toUpperCase();
  }

  if (paymentMethodId !== undefined) {
    updates.paymentMethodId = paymentMethodId;
  }

  if (parsed.data.notes !== undefined) {
    updates.notes = parsed.data.notes ?? null;
  }

  if (parsed.data.paymentInstructions !== undefined) {
    updates.paymentInstructions = parsed.data.paymentInstructions ?? null;
  } else if (paymentMethodRow && paymentMethodRow.instructions) {
    // If payment method changed and no explicit instructions provided, fall back to method instructions.
    updates.paymentInstructions = paymentMethodRow.instructions;
  }

  if (parsed.data.payableTo !== undefined) {
    updates.payableTo = parsed.data.payableTo ?? null;
  } else if (paymentMethodRow && paymentMethodRow.accountName) {
    updates.payableTo = paymentMethodRow.accountName;
  }

  await db.transaction(async (tx) => {
    await tx.update(invoices).set(updates).where(eq(invoices.id, invoiceId));

    if (lineItemsFromPayload) {
      await tx.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId));
      await tx.insert(invoiceLineItems).values(
        lineItemsFromPayload.map((item, index) => ({
          invoiceId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate ?? 0,
          discount: item.discount ?? 0,
          sortOrder: index,
        })),
      );
    }
  });

  const updatedInvoiceRow = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: {
      client: true,
      lineItems: true,
    },
  });

  if (!updatedInvoiceRow) {
    throw createError({ statusCode: 500, statusMessage: "Failed to reload invoice" });
  }

  return {
    invoice: mapInvoiceRow(updatedInvoiceRow),
  };
});
