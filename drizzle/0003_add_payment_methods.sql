CREATE TABLE IF NOT EXISTS "payment_methods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "provider" momo_provider,
  "account_name" text,
  "account_number" text,
  "instructions" text,
  "is_default" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "invoices"
ADD COLUMN IF NOT EXISTS "payment_method_id" uuid REFERENCES "payment_methods"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payment_methods_business_id ON payment_methods(business_id);
