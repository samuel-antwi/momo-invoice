ALTER TABLE businesses
  ADD COLUMN paystack_subaccount_code text,
  ADD COLUMN paystack_split_code text,
  ADD COLUMN paystack_subaccount_status text NOT NULL DEFAULT 'unconfigured',
  ADD COLUMN paystack_settlement_bank_code text,
  ADD COLUMN paystack_settlement_account_number text,
  ADD COLUMN paystack_settlement_account_name text,
  ADD COLUMN paystack_subaccount_created_at timestamptz;
