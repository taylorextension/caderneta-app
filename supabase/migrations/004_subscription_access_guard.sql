-- Enforce paid/trial access for authenticated app usage.
-- Profiles stay readable so the client can decide whether to show the paywall.

CREATE OR REPLACE FUNCTION has_app_access(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = p_user_id
      AND (
        p.assinatura_ativa = true
        OR (p.trial_fim IS NOT NULL AND p.trial_fim > NOW())
      )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION has_app_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION has_app_access(UUID) TO authenticated;

DROP POLICY IF EXISTS "own" ON clientes;
DROP POLICY IF EXISTS "own_with_access" ON clientes;
CREATE POLICY "own_with_access" ON clientes
  FOR ALL
  USING (user_id = auth.uid() AND has_app_access(user_id))
  WITH CHECK (user_id = auth.uid() AND has_app_access(user_id));

DROP POLICY IF EXISTS "own" ON notas;
DROP POLICY IF EXISTS "own_with_access" ON notas;
CREATE POLICY "own_with_access" ON notas
  FOR ALL
  USING (user_id = auth.uid() AND has_app_access(user_id))
  WITH CHECK (user_id = auth.uid() AND has_app_access(user_id));

DROP POLICY IF EXISTS "own" ON cobrancas;
DROP POLICY IF EXISTS "own_with_access" ON cobrancas;
CREATE POLICY "own_with_access" ON cobrancas
  FOR ALL
  USING (user_id = auth.uid() AND has_app_access(user_id))
  WITH CHECK (user_id = auth.uid() AND has_app_access(user_id));

DROP POLICY IF EXISTS "own_read" ON eventos;
DROP POLICY IF EXISTS "own_read_with_access" ON eventos;
CREATE POLICY "own_read_with_access" ON eventos
  FOR SELECT
  USING (user_id = auth.uid() AND has_app_access(user_id));

DROP POLICY IF EXISTS "validated_write" ON eventos;
CREATE POLICY "validated_write" ON eventos
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND has_app_access(user_id)
    AND EXISTS (
      SELECT 1
      FROM notas n
      WHERE n.id = nota_id
        AND n.cliente_id = cliente_id
        AND n.user_id = user_id
    )
  );

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
  IF v_user_id IS NULL OR NOT has_app_access(v_user_id) THEN
    RAISE EXCEPTION 'subscription_required' USING ERRCODE = '42501';
  END IF;

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

REVOKE ALL ON FUNCTION get_inicio() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_inicio() TO authenticated;
ALTER FUNCTION get_inicio() SET search_path = public;
