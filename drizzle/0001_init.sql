DO $$ BEGIN
  CREATE TYPE "invoice_status" AS ENUM ('draft', 'sent', 'paid', 'overdue');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "reminder_channel" AS ENUM ('whatsapp', 'sms', 'email');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "plan" AS ENUM ('free', 'pro');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "momo_provider" AS ENUM ('mtn', 'vodafone', 'airteltigo', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "businesses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" text,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "email" text,
  "phone" text,
  "whatsapp_number" text,
  "address" text,
  "logo_url" text,
  "theme_color" text DEFAULT '#fbbf24',
  "plan" plan NOT NULL DEFAULT 'free',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "clients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "full_name" text NOT NULL,
  "business_name" text,
  "email" text,
  "phone" text,
  "whatsapp_number" text,
  "momo_provider" momo_provider NOT NULL DEFAULT 'mtn',
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "status" invoice_status NOT NULL DEFAULT 'draft',
  "currency" text NOT NULL DEFAULT 'GHS',
  "issue_date" timestamptz NOT NULL DEFAULT now(),
  "due_date" timestamptz,
  "subtotal" numeric(12,2) DEFAULT 0,
  "tax_total" numeric(12,2) DEFAULT 0,
  "discount_total" numeric(12,2) DEFAULT 0,
  "total" numeric(12,2) DEFAULT 0,
  "notes" text,
  "payment_instructions" text,
  "payable_to" text,
  "invoice_number" text NOT NULL,
  "sequential_number" integer,
  "last_shared_at" timestamptz,
  "paid_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "invoice_line_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoice_id" uuid NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "description" text NOT NULL,
  "quantity" numeric(10,2) NOT NULL DEFAULT 1,
  "unit_price" numeric(12,2) NOT NULL DEFAULT 0,
  "tax_rate" numeric(5,4) DEFAULT 0,
  "discount" numeric(12,2) DEFAULT 0,
  "sort_order" integer,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "reminder_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "offset_days" integer NOT NULL,
  "channel" reminder_channel NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "reminders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoice_id" uuid NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "template_id" uuid REFERENCES "reminder_templates"("id") ON DELETE SET NULL,
  "channel" reminder_channel NOT NULL,
  "status" text NOT NULL DEFAULT 'scheduled',
  "scheduled_at" timestamptz NOT NULL,
  "sent_at" timestamptz,
  "payload" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoice_id" uuid NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "amount" numeric(12,2) NOT NULL,
  "method" text NOT NULL DEFAULT 'momo',
  "reference" text,
  "status" text NOT NULL DEFAULT 'pending',
  "metadata" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_business_id ON clients(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminders_invoice_id ON reminders(invoice_id);
