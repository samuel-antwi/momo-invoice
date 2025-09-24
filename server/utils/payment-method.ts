import type { InferSelectModel } from "drizzle-orm";

import type { PaymentMethod } from "~/types/models";

import { paymentMethods } from "../db/schema";

export type PaymentMethodRow = InferSelectModel<typeof paymentMethods>;

export const mapPaymentMethodRow = (row: PaymentMethodRow): PaymentMethod => ({
  id: row.id,
  businessId: row.businessId,
  label: row.label,
  provider: row.provider ?? undefined,
  accountName: row.accountName ?? undefined,
  accountNumber: row.accountNumber ?? undefined,
  instructions: row.instructions ?? undefined,
  isDefault: row.isDefault,
});
