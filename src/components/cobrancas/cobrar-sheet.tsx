'use client'

import { useCallback, useEffect, useState } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { createClient } from '@/lib/supabase/client'
import { openWhatsApp } from '@/lib/whatsapp'
import { formatCurrencyShort } from '@/lib/format'
import type { NotaComCliente } from '@/types/database'

interface CobrarSheetProps {
  open: boolean
  onClose: () => void
  notas: NotaComCliente[]
}

export function CobrarSheet({ open, onClose, notas }: CobrarSheetProps) {
  const profile = useAuthStore((s) => s.profile)
  const addToast = useUIStore((s) => s.addToast)
  const [mensagem, setMensagem] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  const total = notas.reduce((acc, n) => acc + Number(n.valor), 0)
  const cliente = notas[0]
  const displayName = cliente?.apelido || cliente?.cliente_nome || ''

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const linkPix = notas.length === 1
    ? `${appUrl}/p/${notas[0]?.id}`
    : `${appUrl}/p/${notas[0]?.id}`

  const gerarMensagem = useCallback(async () => {
    if (!profile || notas.length === 0) return
    try {
      setLoading(true)
      const res = await fetch('/api/mensagem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_nome: cliente.cliente_nome,
          cliente_apelido: cliente.apelido,
          lojista_nome: profile.nome,
          nome_loja: profile.nome_loja,
          notas: notas.map((n) => ({
            descricao: n.descricao,
            itens: n.itens,
            valor: n.valor,
            data_vencimento: n.data_vencimento,
            vezes_cobrado: n.vezes_cobrado,
          })),
          total,
        }),
      })
      const data = await res.json()
      setMensagem(data.mensagem || '')
    } catch {
      addToast({ message: 'Erro ao gerar mensagem', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [profile, notas, cliente, total, addToast])

  useEffect(() => {
    if (open && notas.length > 0) {
      gerarMensagem()
    }
  }, [open, notas.length, gerarMensagem])

  async function handleEnviar() {
    if (!profile || !cliente) return
    try {
      setSending(true)
      const fullMessage = `${mensagem}\n\n${linkPix}`
      openWhatsApp(cliente.cliente_telefone, fullMessage)

      const supabase = createClient()
      await supabase.from('cobrancas').insert({
        user_id: profile.id,
        nota_id: notas.length === 1 ? notas[0].id : null,
        cliente_id: cliente.cliente_id,
        mensagem,
        notas_ids: notas.map((n) => n.id),
      })

      for (const nota of notas) {
        await supabase
          .from('notas')
          .update({ vezes_cobrado: nota.vezes_cobrado + 1 })
          .eq('id', nota.id)
      }

      addToast({ message: 'Cobrança registrada', type: 'success' })
      onClose()
    } catch {
      addToast({ message: 'Erro ao registrar cobrança', type: 'error' })
    } finally {
      setSending(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <h2 className="text-lg font-semibold text-text-primary">
        Lembrete para {displayName}
      </h2>
      <p className="text-sm text-text-secondary mt-1">
        {formatCurrencyShort(total)}
        {notas.length === 1 && notas[0]?.dias_atraso && notas[0].dias_atraso > 0
          ? ` · Venceu há ${notas[0].dias_atraso} dias`
          : ''}
      </p>

      <div className="mt-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            aria-label="Mensagem de cobrança"
            className="w-full min-h-[200px] bg-transparent p-0 border-0 rounded-none text-sm leading-7 text-text-primary outline-none resize-none appearance-none"
          />
        )}
      </div>

      <div className="mt-3 flex items-start gap-2">
        <span className="text-xs text-text-muted">🔗</span>
        <div>
          <p className="text-xs text-text-muted break-all">{linkPix}</p>
          <p className="text-xs text-text-muted mt-0.5">
            Incluído automaticamente
          </p>
        </div>
      </div>

      <button
        onClick={gerarMensagem}
        disabled={loading}
        className="mt-3 text-sm font-medium text-text-secondary"
      >
        Gerar outra variação
      </button>

      <Button
        variant="whatsapp"
        onClick={handleEnviar}
        loading={sending}
        className="w-full mt-6"
      >
        Enviar via WhatsApp
      </Button>
    </BottomSheet>
  )
}
