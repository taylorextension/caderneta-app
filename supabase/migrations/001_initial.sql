-- Caderneta MVP - Initial Schema

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  nome_loja TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  pix_chave TEXT,
  pix_tipo TEXT CHECK (pix_tipo IN ('cpf','cnpj','email','telefone','aleatoria')),
  pix_nome TEXT,
  pix_cidade TEXT DEFAULT 'SAO PAULO',
  trial_fim TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  assinatura_ativa BOOLEAN DEFAULT false,
  onboarding_completo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL DEFAULT '',
  apelido TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  descricao TEXT,
  itens JSONB DEFAULT '[]',
  valor NUMERIC(10,2) NOT NULL,
  data_compra DATE DEFAULT CURRENT_DATE,
  data_vencimento DATE,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','pago','cancelado')),
  data_pagamento TIMESTAMPTZ,
  foto_url TEXT,
  ocr_confianca TEXT CHECK (ocr_confianca IN ('alta','media','baixa')),
  vezes_cobrado INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cobrancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nota_id UUID REFERENCES notas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  notas_ids UUID[] DEFAULT '{}',
  enviado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_id UUID NOT NULL REFERENCES notas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'link_aberto','pix_copiado','tempo_pagina','marcou_pago','desfez_pago'
  )),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobrancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own" ON profiles FOR ALL USING (id = auth.uid());
CREATE POLICY "own" ON clientes FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own" ON notas FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own" ON cobrancas FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_read" ON eventos FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "public_write" ON eventos FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX idx_clientes_user_id ON clientes(user_id);
CREATE INDEX idx_notas_user_id ON notas(user_id);
CREATE INDEX idx_notas_cliente_id ON notas(cliente_id);
CREATE INDEX idx_notas_status ON notas(status);
CREATE INDEX idx_cobrancas_user_id ON cobrancas(user_id);
CREATE INDEX idx_eventos_nota_id ON eventos(nota_id);
CREATE INDEX idx_eventos_cliente_id ON eventos(cliente_id);

-- Function: get_inicio
CREATE OR REPLACE FUNCTION get_inicio(p_user_id UUID)
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_pendente', COALESCE(SUM(valor) FILTER (WHERE status='pendente'), 0),
    'recebido_mes', COALESCE(SUM(valor) FILTER (
      WHERE status='pago' AND data_pagamento >= date_trunc('month', NOW())
    ), 0),
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
        SELECT n.id, n.valor, c.nome as cliente_nome
        FROM notas n JOIN clientes c ON n.cliente_id = c.id
        WHERE n.user_id = p_user_id AND n.status = 'pago'
          AND n.data_pagamento::date = CURRENT_DATE
        ORDER BY n.data_pagamento DESC
      ) t
    )
  )
  FROM notas WHERE user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;
