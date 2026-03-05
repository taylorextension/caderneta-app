-- Keep webhook profile updates schema-safe
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS plano TEXT DEFAULT 'trial';

UPDATE profiles
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

UPDATE profiles
SET plano = COALESCE(NULLIF(TRIM(plano), ''), CASE WHEN assinatura_ativa THEN 'basico' ELSE 'trial' END)
WHERE plano IS NULL OR TRIM(plano) = '';

ALTER TABLE profiles
ALTER COLUMN plano SET NOT NULL;

-- Ensure eventos writes are internally consistent with note ownership
DROP POLICY IF EXISTS "validated_write" ON eventos;
CREATE POLICY "validated_write" ON eventos FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM notas n
    WHERE n.id = nota_id
      AND n.cliente_id = cliente_id
      AND n.user_id = user_id
  )
);

-- Keep check constraint aligned with app events
ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_tipo_check;
ALTER TABLE eventos ADD CONSTRAINT eventos_tipo_check CHECK (tipo IN (
  'link_aberto','pix_copiado','tempo_pagina','marcou_pago','desfez_pago','lembrete_enviado'
));

-- Restrict SECURITY DEFINER RPC execution and search_path
REVOKE ALL ON FUNCTION get_inicio() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_inicio() TO authenticated;
ALTER FUNCTION get_inicio() SET search_path = public;
