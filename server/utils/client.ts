import type { InferSelectModel } from "drizzle-orm";

import type { ClientContact } from "~/types/models";

import { clients } from "../db/schema";

export type ClientRow = InferSelectModel<typeof clients>;

export const mapClientRow = (row: ClientRow): ClientContact => ({
  id: row.id,
  businessName: row.businessName ?? undefined,
  fullName: row.fullName,
  email: row.email ?? undefined,
  phone: row.phone ?? "",
  whatsappNumber: row.whatsappNumber ?? undefined,
  momoProvider: row.momoProvider,
  notes: row.notes ?? undefined,
});
