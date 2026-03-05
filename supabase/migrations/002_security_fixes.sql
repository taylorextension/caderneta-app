-- Fix: get_inicio use auth.uid() instead of client-provided p_user_id
DROP FUNCTION IF EXISTS get_inicio(UUID);

CREATE OR REPLACE FUNCTION get_inicio()
RETURNS JSON AS $$
DECLARE
  result json;
  v_user_id UUID := auth.uid();
  v_total_pendente numeric;
  v_recebido_mes numeric;
  v_vencidas json;
  v_vencendo json;
  v_recebidos_hoje json;
BEGIN
  SELECT COALESCE(SUM(valor), 0) INTO v_total_pendente
  FROM notas WHERE user_id = v_user_id AND status = 'pendente';

  SELECT COALESCE(SUM(valor), 0) INTO v_recebido_mes
  FROM notas WHERE user_id = v_user_id AND status = 'pago'
    AND data_pagamento >= date_trunc('month', now());

  SELECT COALESCE(json_agg(sub), '[]'::json) INTO v_vencidas
  FROM (
    SELECT n.id, n.valor::float, n.data_vencimento, n.itens, n.descricao, n.status,
           COALESCE(n.vezes_cobrado, 0) as vezes_cobrado, n.cliente_id,
           c.nome as cliente_nome, c.apelido, c.telefone as cliente_telefone,
           (CURRENT_DATE - n.data_vencimento) as dias_atraso
    FROM notas n JOIN clientes c ON c.id = n.cliente_id
    WHERE n.user_id = v_user_id AND n.status = 'pendente' AND n.data_vencimento < CURRENT_DATE
    ORDER BY n.data_vencimento ASC
  ) sub;

  SELECT COALESCE(json_agg(sub), '[]'::json) INTO v_vencendo
  FROM (
    SELECT n.id, n.valor::float, n.data_vencimento, n.itens, n.descricao, n.status,
           COALESCE(n.vezes_cobrado, 0) as vezes_cobrado, n.cliente_id,
           c.nome as cliente_nome, c.apelido, c.telefone as cliente_telefone,
           (n.data_vencimento - CURRENT_DATE) as dias_restantes
    FROM notas n JOIN clientes c ON c.id = n.cliente_id
    WHERE n.user_id = v_user_id AND n.status = 'pendente'
      AND n.data_vencimento >= CURRENT_DATE
      AND n.data_vencimento <= (CURRENT_DATE + interval '7 days')
    ORDER BY n.data_vencimento ASC
  ) sub;

  SELECT COALESCE(json_agg(sub), '[]'::json) INTO v_recebidos_hoje
  FROM (
    SELECT n.id, n.valor::float, c.nome as cliente_nome
    FROM notas n JOIN clientes c ON c.id = n.cliente_id
    WHERE n.user_id = v_user_id AND n.status = 'pago'
      AND n.data_pagamento >= date_trunc('day', now())
      AND n.data_pagamento < (date_trunc('day', now()) + interval '1 day')
    ORDER BY n.data_pagamento DESC
  ) sub;

  result := json_build_object(
    'total_pendente', v_total_pendente,
    'recebido_mes', v_recebido_mes,
    'vencidas', v_vencidas,
    'vencendo', v_vencendo,
    'recebidos_hoje', v_recebidos_hoje
  );
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix: tighten eventos RLS
DROP POLICY IF EXISTS "public_write" ON eventos;
CREATE POLICY "validated_write" ON eventos FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM notas n WHERE n.id = nota_id AND n.cliente_id = cliente_id
  )
);

-- Track subscription_events in migrations
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  status TEXT,
  customer_email TEXT NOT NULL,
  cakto_order_id TEXT,
  cakto_subscription_id TEXT,
  amount NUMERIC(10,2),
  payment_method TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only" ON subscription_events FOR ALL USING (false);
