-- Ticket 2: Reduce trial default from 14 to 7 days (new users only)
-- Existing users keep their already-stored trial_fim date.
ALTER TABLE profiles
  ALTER COLUMN trial_fim SET DEFAULT (NOW() + INTERVAL '7 days');

-- Ticket 3: Migrate existing 'basico' plan labels to 'pro'
UPDATE profiles SET plano = 'pro' WHERE plano = 'basico';
UPDATE subscription_events SET raw_payload = raw_payload WHERE false; -- no-op placeholder
