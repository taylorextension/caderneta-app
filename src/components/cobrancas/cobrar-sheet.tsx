'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { createClient } from '@/lib/supabase/client'
import { openWhatsApp } from '@/lib/whatsapp'
import { formatCurrencyShort } from '@/lib/format'
import { trackEvent } from '@/lib/analytics'
import { ArrowPathIcon, PencilIcon, LinkIcon } from '@heroicons/react/24/outline'
import type { NotaComCliente } from '@/types/database'

interface CobrarSheetProps {
  open: boolean
  onClose: () => void
  notas: NotaComCliente[]
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

/** Renderiza markdown do WhatsApp: *negrito* → <strong> */
function renderWhatsAppMarkdown(text: string) {
  const parts = text.split(/(\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(1, -1)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export function CobrarSheet({ open, onClose, notas }: CobrarSheetProps) {
  const profile = useAuthStore((s) => s.profile)
  const addToast = useUIStore((s) => s.addToast)
  const [mensagem, setMensagem] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [editing, setEditing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const total = notas.reduce((acc, n) => acc + Number(n.valor), 0)
  const cliente = notas[0]
  const displayName = cliente?.apelido || cliente?.cliente_nome || ''
  const initial = (displayName[0] || 'C').toUpperCase()

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const linkPix = notas.length === 1
    ? `${appUrl}/p/${notas[0]?.id}`
    : `${appUrl}/p/${notas[0]?.id}`

  const gerarMensagem = useCallback(async () => {
    if (!profile || notas.length === 0) return
    try {
      setLoading(true)
      setEditing(false)
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

  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current
      el.style.height = '0px'
      el.style.height = `${el.scrollHeight}px`
      el.focus()
    }
  }, [editing, mensagem])

  async function handleEnviar() {
    if (!profile || !cliente) return
    try {
      setSending(true)
      const fullMessage = `${mensagem}\n\n*Clique aqui pra pagar* 👇\n\n${linkPix}`
      openWhatsApp(cliente.cliente_telefone, fullMessage)

      const supabase = createClient()
      await supabase.from('cobrancas').insert({
        user_id: profile.id,
        nota_id: notas.length === 1 ? notas[0].id : null,
        cliente_id: cliente.cliente_id,
        mensagem,
      })

      for (const nota of notas) {
        await supabase
          .from('notas')
          .update({ vezes_cobrado: nota.vezes_cobrado + 1 })
          .eq('id', nota.id)

        await supabase
          .from('eventos')
          .insert({
            nota_id: nota.id,
            cliente_id: cliente.cliente_id,
            user_id: profile.id,
            tipo: 'lembrete_enviado'
          })
      }

      addToast({ message: 'Cobrança registrada', type: 'success' })
      trackEvent('first_cobranca_sent')
      onClose()
    } catch {
      addToast({ message: 'Erro ao registrar cobrança', type: 'error' })
    } finally {
      setSending(false)
    }
  }

  const diasAtraso = notas.length === 1 && notas[0]?.dias_atraso && notas[0].dias_atraso > 0
    ? notas[0].dias_atraso
    : null

  return (
    <BottomSheet open={open} onClose={onClose}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-[#163300] text-white flex items-center justify-center text-sm font-semibold shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-text-primary truncate">
            {displayName}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm font-medium text-[#163300]">
              {formatCurrencyShort(total)}
            </span>
            {diasAtraso && (
              <span className="text-xs text-[#A8200D] bg-[#A8200D]/8 px-2 py-0.5 rounded-full font-medium">
                {diasAtraso}d atraso
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-divider my-4" />

      {/* Mensagem */}
      <div className="relative">
        {loading ? (
          <div className="space-y-2.5 py-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-[85%]" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : editing ? (
          <textarea
            ref={textareaRef}
            value={mensagem}
            onChange={(e) => {
              setMensagem(e.target.value)
              e.target.style.height = '0px'
              e.target.style.height = `${e.target.scrollHeight}px`
            }}
            onBlur={() => setEditing(false)}
            aria-label="Mensagem de cobrança"
            className="w-full bg-[#163300]/[0.03] rounded-xl p-3 border-0 text-sm leading-7 text-text-primary outline-none resize-none appearance-none overflow-hidden focus:ring-1 focus:ring-[#9FE870]"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="w-full text-left bg-[#163300]/[0.03] rounded-xl p-3 group cursor-text relative"
          >
            <div className="text-sm leading-7 text-text-primary whitespace-pre-wrap">
              {mensagem.split('\n').map((line, i) => (
                <span key={i}>
                  {renderWhatsAppMarkdown(line)}
                  {i < mensagem.split('\n').length - 1 && <br />}
                </span>
              ))}
            </div>
            <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <PencilIcon className="h-4 w-4 text-text-muted" />
            </div>
          </button>
        )}
      </div>

      {/* Link PIX */}
      <div className="mt-3 flex items-center gap-2.5 bg-[#9FE870]/8 border border-[#9FE870]/20 rounded-lg px-3 py-2.5">
        <LinkIcon className="h-4 w-4 text-[#163300] shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#163300]">Link de pagamento</p>
          <p className="text-xs text-text-muted truncate">{linkPix}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-col gap-3">
        <button
          onClick={gerarMensagem}
          disabled={loading}
          className="flex items-center justify-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Gerar outra variação
        </button>

        <Button
          variant="whatsapp"
          onClick={handleEnviar}
          loading={sending}
          className="w-full"
        >
          <WhatsAppIcon className="h-5 w-5" />
          Enviar via WhatsApp
        </Button>
      </div>
    </BottomSheet>
  )
}
