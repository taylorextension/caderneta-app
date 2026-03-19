-- Update get_inicio to consider partial payments for totals and today's receipts
CREATE OR REPLACE FUNCTION get_inicio(p_user_id UUID)
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_pendente', (
      COALESCE((SELECT SUM(valor) FROM notas WHERE user_id = p_user_id AND status = 'pendente'), 0)
      -
      COALESCE((SELECT SUM((metadata->>'valor')::numeric) FROM eventos e JOIN notas n ON e.nota_id = n.id WHERE e.user_id = p_user_id AND e.tipo = 'pagamento_parcial' AND n.status = 'pendente'), 0)
    ),
    'recebido_mes', (
      COALESCE((SELECT SUM(valor) FROM notas WHERE user_id = p_user_id AND status = 'pago' AND data_pagamento >= date_trunc('month', NOW())), 0)
      +
      COALESCE((SELECT SUM((metadata->>'valor')::numeric) FROM eventos WHERE user_id = p_user_id AND tipo = 'pagamento_parcial' AND created_at >= date_trunc('month', NOW())), 0)
    ),
    'vencidas', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT n.id, n.valor, n.data_vencimento, n.itens, n.descricao, n.vezes_cobrado,
               c.id as cliente_id, c.nome as cliente_nome, c.apelido, c.telefone as cliente_telefone,
               CURRENT_DATE - n.data_vencimento as dias_atraso
        FROM notas n JOIN clientes c ON n.cliente_id = c.id
        WHERE n.user_id = p_user_id AND n.status = 'pendente'
          AND n.data_vencimento < CURRENT_DATE
        ORDER BY n.data_vencimento ASC
      ) t
    ),
    'vencendo', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT n.id, n.valor, n.data_vencimento, n.itens, n.descricao, n.vezes_cobrado,
               c.id as cliente_id, c.nome as cliente_nome, c.apelido, c.telefone as cliente_telefone,
               n.data_vencimento - CURRENT_DATE as dias_restantes
        FROM notas n JOIN clientes c ON n.cliente_id = c.id
        WHERE n.user_id = p_user_id AND n.status = 'pendente'
          AND n.data_vencimento >= CURRENT_DATE
          AND n.data_vencimento <= CURRENT_DATE + INTERVAL '7 days'
        ORDER BY n.data_vencimento ASC
      ) t
    ),
    'recebidos_hoje', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT id, valor, cliente_nome FROM (
          SELECT n.id, n.valor, c.nome as cliente_nome, n.data_pagamento as data_sort
          FROM notas n JOIN clientes c ON n.cliente_id = c.id
          WHERE n.user_id = p_user_id AND n.status = 'pago'
            AND n.data_pagamento::date = CURRENT_DATE
          
          UNION ALL
          
          SELECT e.id, (e.metadata->>'valor')::numeric as valor, c.nome as cliente_nome, e.created_at as data_sort
          FROM eventos e JOIN clientes c ON e.cliente_id = c.id
          WHERE e.user_id = p_user_id AND e.tipo = 'pagamento_parcial'
            AND e.created_at::date = CURRENT_DATE
        ) combined
        ORDER BY data_sort DESC
      ) t
    )
  );
$$ LANGUAGE sql SECURITY DEFINER;
