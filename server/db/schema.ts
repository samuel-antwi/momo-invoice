import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "sent", "paid", "overdue"]);
export const invoiceChannelEnum = pgEnum("reminder_channel", ["whatsapp", "sms", "email"]);
export const planEnum = pgEnum("plan", ["free", "pro"]);
export const momoProviderEnum = pgEnum("momo_provider", ["mtn", "vodafone", "airteltigo", "other"]);

export const businesses = pgTable("businesses", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id"), // reserved for Supabase auth uuid
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  email: text("email"),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  logoUrl: text("logo_url"),
  address: text("address"),
  themeColor: text("theme_color").default("#fbbf24"),
  plan: planEnum("plan").default("free").notNull(),
  setupCompleted: boolean("setup_completed").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  businessName: text("business_name"),
  email: text("email"),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  momoProvider: momoProviderEnum("momo_provider").default("mtn").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  status: invoiceStatusEnum("status").default("draft").notNull(),
  currency: text("currency").default("GHS").notNull(),
  issueDate: timestamp("issue_date", { withTimezone: true }).defaultNow().notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0"),
  taxTotal: numeric("tax_total", { precision: 12, scale: 2 }).default("0"),
  discountTotal: numeric("discount_total", { precision: 12, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  paymentInstructions: text("payment_instructions"),
  payableTo: text("payable_to"),
  invoiceNumber: text("invoice_number").notNull(),
  sequentialNumber: integer("sequential_number"),
  lastSharedAt: timestamp("last_shared_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const invoiceLineItems = pgTable("invoice_line_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).default("1").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).default("0").notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 4 }).default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).default("0"),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const reminderTemplates = pgTable("reminder_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  offsetDays: integer("offset_days").notNull(),
  channel: invoiceChannelEnum("channel").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const reminders = pgTable("reminders", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").references(() => reminderTemplates.id, { onDelete: "set null" }),
  channel: invoiceChannelEnum("channel").notNull(),
  status: text("status").default("scheduled").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  payload: text("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  method: text("method").default("momo").notNull(),
  reference: text("reference"),
  status: text("status").default("pending").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const businessesRelations = relations(businesses, ({ many }) => ({
  clients: many(clients),
  invoices: many(invoices),
  reminderTemplates: many(reminderTemplates),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  business: one(businesses, {
    fields: [clients.businessId],
    references: [businesses.id],
  }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  business: one(businesses, {
    fields: [invoices.businessId],
    references: [businesses.id],
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  lineItems: many(invoiceLineItems),
  reminders: many(reminders),
  payments: many(payments),
}));

export const invoiceLineItemsRelations = relations(invoiceLineItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLineItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  invoice: one(invoices, {
    fields: [reminders.invoiceId],
    references: [invoices.id],
  }),
  template: one(reminderTemplates, {
    fields: [reminders.templateId],
    references: [reminderTemplates.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

export const reminderTemplatesRelations = relations(reminderTemplates, ({ one, many }) => ({
  business: one(businesses, {
    fields: [reminderTemplates.businessId],
    references: [businesses.id],
  }),
  reminders: many(reminders),
}));
