-- Add onboarding flag expected by app logic
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completo BOOLEAN DEFAULT false;

-- Backfill: if store name already exists, consider onboarding complete
UPDATE profiles
SET onboarding_completo = true
WHERE COALESCE(TRIM(nome_loja), '') <> ''
  AND COALESCE(onboarding_completo, false) = false;

-- Normalize nulls and enforce defaults
UPDATE profiles
SET onboarding_completo = false
WHERE onboarding_completo IS NULL;

ALTER TABLE profiles
ALTER COLUMN onboarding_completo SET DEFAULT false;

ALTER TABLE profiles
ALTER COLUMN onboarding_completo SET NOT NULL;
