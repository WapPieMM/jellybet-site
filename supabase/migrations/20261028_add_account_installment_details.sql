-- Add optional installment terms to each account without changing its sale status.
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS installment_details text NOT NULL DEFAULT '';
