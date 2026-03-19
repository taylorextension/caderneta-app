-- 1. Drop the incorrect 1-argument function from previous migration
DROP FUNCTION IF EXISTS get_inicio(UUID);

-- 2. Recreate the 0-argument function correctly with the partial payments logic
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
  
  -- Abater parciais do total_pendente
  v_total_pendente := v_total_pendente - COALESCE(
    (SELECT SUM((metadata->>'valor')::numeric) FROM eventos e JOIN notas n ON e.nota_id = n.id WHERE e.user_id = v_user_id AND e.tipo = 'pagamento_parcial' AND n.status = 'pendente'), 0
  );

  SELECT COALESCE(SUM(valor), 0) INTO v_recebido_mes
  FROM notas WHERE user_id = v_user_id AND status = 'pago' AND data_pagamento >= date_trunc('month', now());
  
  -- Adicionar parciais ao recebido_mes
  v_recebido_mes := v_recebido_mes + COALESCE(
    (SELECT SUM((metadata->>'valor')::numeric) FROM eventos WHERE user_id = v_user_id AND tipo = 'pagamento_parcial' AND created_at >= date_trunc('month', now())), 0
  );

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
    SELECT id, valor, cliente_nome, data_sort FROM (
      SELECT n.id, n.valor::float, c.nome as cliente_nome, n.data_pagamento as data_sort
      FROM notas n JOIN clientes c ON c.id = n.cliente_id
      WHERE n.user_id = v_user_id AND n.status = 'pago'
        AND n.data_pagamento >= date_trunc('day', now())
        AND n.data_pagamento < (date_trunc('day', now()) + interval '1 day')
      UNION ALL
      SELECT e.id, (e.metadata->>'valor')::numeric as valor, c.nome as cliente_nome, e.created_at as data_sort
      FROM eventos e JOIN clientes c ON e.cliente_id = c.id
      WHERE e.user_id = v_user_id AND e.tipo = 'pagamento_parcial'
        AND e.created_at >= date_trunc('day', now())
        AND e.created_at < (date_trunc('day', now()) + interval '1 day')
    ) combined
    ORDER BY data_sort DESC
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
