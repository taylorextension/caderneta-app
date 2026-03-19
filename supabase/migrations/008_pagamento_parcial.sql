-- Add pagamento_parcial to eventos tipo check constraint
ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_tipo_check;
ALTER TABLE eventos ADD CONSTRAINT eventos_tipo_check CHECK (tipo IN (
  'link_aberto','pix_copiado','tempo_pagina','marcou_pago','desfez_pago','lembrete_enviado','pagamento_parcial'
));
