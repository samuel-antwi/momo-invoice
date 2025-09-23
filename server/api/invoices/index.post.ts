import { eq, sql } from "drizzle-orm";
import { serverSupabaseUser } from "#supabase/server";
import { createError, readBody, setResponseStatus } from "h3";
import { z } from "zod";

import { db } from "../../db/client";
import { clients, invoiceLineItems, invoices } from "../../db/schema";
import { ensureBusinessForUser } from "../../utils/business";
import { computeInvoiceTotals, mapInvoiceRow } from "../../utils/invoice";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number({ invalid_type_error: "Quantity must be a number" }).positive("Quantity must be greater than zero"),
  unitPrice: z.coerce.number({ invalid_type_error: "Unit price must be a number" }).min(0, "Unit price cannot be negative"),
  taxRate: z
    .coerce
    .number({ invalid_type_error: "Tax rate must be a number" })
    .min(0, "Tax rate cannot be negative")
    .max(1, "Tax rate must be a decimal e.g. 0.125")
    .optional()
    .transform((value) => (typeof value === "number" ? value : undefined)),
  discount: z
    .coerce
    .number({ invalid_type_error: "Discount must be a number" })
    .min(0, "Discount cannot be negative")
    .optional()
    .transform((value) => (typeof value === "number" ? value : undefined)),
});

const dateSchema = z.coerce.date({ invalid_type_error: "Invalid date" });
const optionalDateSchema = z
  .preprocess((value) => (value === "" || value === null || value === undefined ? null : value), dateSchema.nullable())
  .transform((value) => value ?? null);

const createInvoiceSchema = z
  .object({
    clientId: z.string().uuid("Select a valid client"),
    issueDate: dateSchema,
    dueDate: optionalDateSchema,
    status: z.enum(["draft", "sent", "paid", "overdue"]).default("draft"),
    currency: z.string().min(3).max(3).default("GHS"),
    notes: z.string().max(2000).optional().nullable().transform((value) => value?.trim() || undefined),
    paymentInstructions: z
      .string()
      .max(2000)
      .optional()
      .nullable()
      .transform((value) => value?.trim() || undefined),
    payableTo: z.string().max(255).optional().nullable().transform((value) => value?.trim() || undefined),
    lineItems: z.array(lineItemSchema).min(1, "Add at least one line item"),
  })
  .refine(
    (data) => {
      if (!data.dueDate) return true;
      return data.dueDate.getTime() >= data.issueDate.getTime();
    },
    { message: "Due date cannot be before the issue date", path: ["dueDate"] },
  );

const generateInvoiceNumber = (seed: { name: string | null; slug: string | null }, index: number, issueDate: Date) => {
  const base = (seed.slug || seed.name || "INV")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
  const prefix = base || "INV";
  const year = issueDate.getFullYear();
  const sequence = String(index).padStart(3, "0");
  return `${prefix}-${year}-${sequence}`;
};

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    setResponseStatus(event, 401);
    return { error: "Unauthorized" };
  }

  const body = await readBody(event);
  const parsed = createInvoiceSchema.safeParse(body);

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    throw createError({
      statusCode: 422,
      statusMessage: "Validation failed",
      data: { errors: fieldErrors },
    });
  }

  const payload = parsed.data;

  const business = await ensureBusinessForUser(user);

  const clientRow = await db.query.clients.findFirst({
    where: eq(clients.id, payload.clientId),
    columns: {
      id: true,
      businessId: true,
    },
  });

  if (!clientRow || clientRow.businessId !== business.id) {
    throw createError({ statusCode: 404, statusMessage: "Client not found" });
  }

  const totals = computeInvoiceTotals(
    payload.lineItems.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      discount: item.discount,
    })),
  );

  const invoiceRow = await db.transaction(async (tx) => {
    const [counter] = await tx
      .select({ value: sql<number>`coalesce(max(${invoices.sequentialNumber}), 0)` })
      .from(invoices)
      .where(eq(invoices.businessId, business.id));

    const nextSequential = Number(counter?.value ?? 0) + 1;
    const invoiceNumber = generateInvoiceNumber({ name: business.name, slug: business.slug }, nextSequential, payload.issueDate);

    const [created] = await tx
      .insert(invoices)
      .values({
        businessId: business.id,
        clientId: payload.clientId,
        status: payload.status,
        currency: payload.currency.toUpperCase(),
        issueDate: payload.issueDate,
        dueDate: payload.dueDate,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        discountTotal: totals.discountTotal,
        total: totals.total,
        notes: payload.notes ?? null,
        paymentInstructions: payload.paymentInstructions ?? null,
        payableTo: payload.payableTo ?? null,
        invoiceNumber,
        sequentialNumber: nextSequential,
      })
      .returning();

    if (!created) {
      throw createError({ statusCode: 500, statusMessage: "Failed to create invoice" });
    }

    await tx.insert(invoiceLineItems).values(
      payload.lineItems.map((item, index) => ({
        invoiceId: created.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate ?? 0,
        discount: item.discount ?? 0,
        sortOrder: index,
      })),
    );

    const [row] = await tx.query.invoices.findMany({
      where: eq(invoices.id, created.id),
      with: {
        client: true,
        lineItems: true,
      },
      limit: 1,
    });

    if (!row) {
      throw createError({ statusCode: 500, statusMessage: "Unable to load created invoice" });
    }

    return row;
  });

  const invoice = mapInvoiceRow(invoiceRow);

  setResponseStatus(event, 201);
  return { invoice };
});
