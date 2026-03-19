'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'

import { gerarBRCode, validarBRCode } from '@/lib/pix'
import { formatCurrencyShort } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LogoAnimated } from '@/components/ui/logo-animated'
import type { Profile, ItemNota } from '@/types/database'

interface NotaPublica {
  id: string
  status: 'pendente' | 'pago' | 'cancelado'
  itens: ItemNota[] | null
  valor: number
  descricao: string | null
  profiles: Pick<Profile, 'nome_loja' | 'pix_chave' | 'pix_nome' | 'pix_cidade'>
  eventos?: { tipo: string; metadata: Record<string, unknown> | null }[]
}

export default function PublicPage() {
  const params = useParams()
  const id = params.id as string
  const [nota, setNota] = useState<NotaPublica | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrUrl, setQrUrl] = useState<string>('')
  const [brCode, setBrCode] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const fetchNota = useCallback(async () => {
    let removeBeforeUnload: (() => void) | undefined

    try {
      setLoading(true)

      const res = await fetch(`/api/nota/${id}`)
      if (!res.ok) {
        setNotFound(true)
        return
      }

      const data = await res.json()

      const notaData = data as NotaPublica
      setNota(notaData)

      // Track link opened
      fetch('/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nota_id: id,
          tipo: 'link_aberto',
        }),
      })

      // Track time on page
      const startTime = Date.now()
      const handleUnload = () => {
        const seconds = Math.floor((Date.now() - startTime) / 1000)
        navigator.sendBeacon(
          '/api/eventos',
          JSON.stringify({
            nota_id: id,
            tipo: 'tempo_pagina',
            metadata: { segundos: seconds },
          })
        )
      }
      window.addEventListener('beforeunload', handleUnload)
      removeBeforeUnload = () =>
        window.removeEventListener('beforeunload', handleUnload)

      // Generate Pix
      if (notaData.profiles?.pix_chave) {
        // Validações para garantir dados válidos no Pix
        const chavePix = notaData.profiles.pix_chave.trim()
        const nomeRecebedor = (
          notaData.profiles.pix_nome ||
          notaData.profiles.nome_loja ||
          'LOJISTA'
        ).trim()
        const cidadeRecebedor = (
          notaData.profiles.pix_cidade || 'SAO PAULO'
        ).trim()

        try {
          const totalParcial = (notaData.eventos || [])
            .filter(ev => ev.tipo === 'pagamento_parcial')
            .reduce((acc, ev) => acc + Number(ev.metadata?.valor || 0), 0)
          const valorFinal = Number(notaData.valor) - totalParcial

          const code = gerarBRCode({
            chave: chavePix,
            nome: nomeRecebedor,
            cidade: cidadeRecebedor,
            valor: valorFinal > 0 ? valorFinal : undefined,
            txid: id.substring(0, 25),
          })

          if (!validarBRCode(code)) {
            throw new Error('BRCode inválido')
          }

          setBrCode(code)

          // Use a public API to generate the QR Code securely instead of running qrcode library
          // which is causing client module instantiation errors ("Buffer is not defined") on some browsers
          const encodedCode = encodeURIComponent(code)
          setQrUrl(
            `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodedCode}`
          )
        } catch (pixError) {
          console.error('Erro ao gerar Pix:', pixError)
        }
      }
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }

    return removeBeforeUnload
  }, [id])

  useEffect(() => {
    let cleanup: (() => void) | undefined

    fetchNota().then((remove) => {
      cleanup = remove
    })

    return () => {
      if (cleanup) cleanup()
    }
  }, [fetchNota])

  async function handleCopyPix() {
    if (!brCode || !nota) return

    // Try modern clipboard API first, fall back to textarea method
    let copySuccess = false
    try {
      await navigator.clipboard.writeText(brCode)
      copySuccess = true
    } catch {
      // Fallback for mobile browsers without clipboard API (HTTP context)
      try {
        const textarea = document.createElement('textarea')
        textarea.value = brCode
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        textarea.style.top = '-9999px'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        copySuccess = document.execCommand('copy')
        document.body.removeChild(textarea)
      } catch {
        // Both methods failed
      }
    }

    if (copySuccess) {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }

    // Always track the event regardless of copy success
    try {
      await fetch('/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nota_id: id,
          tipo: 'pix_copiado',
        }),
      })
    } catch {
      // Event tracking failed silently
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-64 mb-4" />
        <Skeleton className="h-12 w-full max-w-xs" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <h1 className="text-xl font-semibold mb-2">Nota não encontrada</h1>
        <p className="text-sm text-text-secondary">
          Este link pode estar expirado ou incorreto.
        </p>
      </div>
    )
  }

  if (!nota) return null

  const isPaid = nota.status === 'pago'

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-6">
      <div className="w-full max-w-sm lg:max-w-md">
        <p className="text-sm font-medium text-text-primary flex items-center justify-center">
          {nota.profiles?.nome_loja ? (
            nota.profiles.nome_loja
          ) : (
            <LogoAnimated width={192} height={48} className="h-12 w-auto" />
          )}
        </p>

        {isPaid ? (
          <div className="text-center mt-8">
            <p className="text-lg font-semibold text-success">Pago ✓</p>
            <p className="text-sm text-text-secondary mt-1">
              Esta conta já foi acertada.
            </p>
          </div>
        ) : (
          <>
            {nota.itens && nota.itens.length > 0 && (
              <div className="mt-6 border border-divider rounded-none p-4">
                {nota.itens.map((item: ItemNota, i: number) => (
                  <div key={i} className="flex justify-between py-1.5 text-sm">
                    <span>
                      {item.descricao}{' '}
                      {item.quantidade > 1 && `(${item.quantidade}x)`}
                    </span>
                    <span className="font-medium">
                      {formatCurrencyShort(
                        item.quantidade * item.valor_unitario
                      )}
                    </span>
                  </div>
                ))}
                <div className="border-t border-divider mt-2 pt-2 flex justify-between text-sm font-bold">
                  <span>Total</span>
                  <span>{formatCurrencyShort(
                    Number(nota.valor) - 
                    (nota.eventos || [])
                      .filter(ev => ev.tipo === 'pagamento_parcial')
                      .reduce((acc, ev) => acc + Number(ev.metadata?.valor || 0), 0)
                  )}</span>
                </div>
                {((nota.eventos || []).filter(ev => ev.tipo === 'pagamento_parcial').length > 0) && (
                   <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
                     <span>Valor original</span>
                     <span className="line-through">{formatCurrencyShort(Number(nota.valor))}</span>
                   </div>
                )}
              </div>
            )}

            {(!nota.itens || nota.itens.length === 0) && (
              <div className="mt-6 text-center">
                <p className="text-3xl font-bold">
                  {formatCurrencyShort(
                    Number(nota.valor) - 
                    (nota.eventos || [])
                      .filter(ev => ev.tipo === 'pagamento_parcial')
                      .reduce((acc, ev) => acc + Number(ev.metadata?.valor || 0), 0)
                  )}
                </p>
                {((nota.eventos || []).filter(ev => ev.tipo === 'pagamento_parcial').length > 0) && (
                   <p className="text-xs text-text-muted mt-1">
                     Total original: {formatCurrencyShort(Number(nota.valor))}
                   </p>
                )}
                {nota.descricao && (
                  <p className="text-sm text-text-secondary mt-1">
                    {nota.descricao}
                  </p>
                )}
              </div>
            )}

            {nota.profiles?.pix_chave ? (
              <>
                {qrUrl && (
                  <div className="mt-6 flex justify-center">
                    <Image
                      src={qrUrl}
                      alt="QR Code Pix"
                      width={256}
                      height={256}
                      className="rounded-lg"
                      unoptimized
                    />
                  </div>
                )}

                <Button onClick={handleCopyPix} className="w-full mt-6">
                  {copied ? 'Copiado ✓' : 'Copiar código Pix'}
                </Button>

                <p className="text-xs text-text-muted text-center mt-3">
                  Se o QR Code não funcionar, use a chave:{' '}
                  {nota.profiles.pix_chave}
                </p>
              </>
            ) : (
              <div className="mt-6 text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium">
                  ⚠️ Pix não configurado
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  O lojista ainda não configurou a chave Pix. Entre em contato
                  com ele.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
