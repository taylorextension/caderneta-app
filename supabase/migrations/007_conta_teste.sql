-- Add conta_teste flag to profiles
-- Used by admin to mark test accounts that should be excluded from MRR
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS conta_teste BOOLEAN NOT NULL DEFAULT false;
