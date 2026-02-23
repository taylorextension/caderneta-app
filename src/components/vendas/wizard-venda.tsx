'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { XMarkIcon, CameraIcon, PlusIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { PhoneInput } from '@/components/ui/phone-input'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { useCamera } from '@/hooks/use-camera'
import type { Cliente, ItemNota } from '@/types/database'

interface WizardVendaProps {
  open: boolean
  onClose: () => void
  preselectedClienteId?: string
}

export function WizardVenda({ open, onClose, preselectedClienteId }: WizardVendaProps) {
  const profile = useAuthStore((s) => s.profile)
  const addToast = useUIStore((s) => s.addToast)
  const [step, setStep] = useState(preselectedClienteId ? 2 : 1)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [search, setSearch] = useState('')
  const [showNovoCliente, setShowNovoCliente] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoApelido, setNovoApelido] = useState('')
  const [novoTelefone, setNovoTelefone] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [valorDisplay, setValorDisplay] = useState('')
  const [itens, setItens] = useState<ItemNota[]>([])
  const [showItens, setShowItens] = useState(false)
  const [vencimento, setVencimento] = useState<string | null>(null)
  const [vencimentoCustom, setVencimentoCustom] = useState('')
  const [showCustomDate, setShowCustomDate] = useState(false)
  const vencimentoInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const { inputRef, capture, handleCapture } = useCamera()

  const loadClientes = useCallback(async () => {
    if (!profile) return
    const supabase = createClient()
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('user_id', profile.id)
      .eq('ativo', true)
      .order('nome')
    setClientes(data || [])

    if (preselectedClienteId && data) {
      const found = data.find((c) => c.id === preselectedClienteId)
      if (found) setSelectedCliente(found)
    }
  }, [profile, preselectedClienteId])

  useEffect(() => {
    if (open) loadClientes()
  }, [open, loadClientes])

  const filteredClientes = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      (c.apelido && c.apelido.toLowerCase().includes(search.toLowerCase()))
  )

  async function handleNovoCliente() {
    if (!profile || !novoNome || !novoTelefone) {
      addToast({ message: 'Preencha nome e telefone', type: 'warning' })
      return
    }
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          user_id: profile.id,
          nome: novoNome,
          telefone: novoTelefone,
          apelido: novoApelido || null,
        })
        .select()
        .single()
      if (error) throw error
      setSelectedCliente(data)
      setShowNovoCliente(false)
      setStep(2)
      loadClientes()
    } catch {
      addToast({ message: 'Erro ao criar cliente', type: 'error' })
    }
  }

  async function handleOCR(base64: string) {
    try {
      setOcrLoading(true)
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      const data = await res.json()
      let hasData = false

      const parsedTotal = Number(data.total)
      if (parsedTotal > 0) {
        setValor(parsedTotal.toFixed(2))
        setValorDisplay(formatCurrencyInput(parsedTotal.toFixed(2).replace('.', '')))
        hasData = true
      }

      if (data.descricao) {
        setDescricao(data.descricao)
        hasData = true
      }

      if (data.data_vencimento) {
        setVencimentoCustom(data.data_vencimento)
        setVencimento(data.data_vencimento)
        setShowCustomDate(true)
        hasData = true
      }

      if (hasData) {
        addToast({ message: 'Dados extraídos da nota!', type: 'success' })
      } else {
        addToast({ message: 'Não foi possível ler os valores da nota', type: 'warning' })
      }
    } catch {
      addToast({ message: 'Erro ao processar imagem', type: 'error' })
    } finally {
      setOcrLoading(false)
    }
  }

  function addItem() {
    setItens([...itens, { descricao: '', quantidade: 1, valor_unitario: 0 }])
  }

  function removeItem(index: number) {
    setItens(itens.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof ItemNota, value: string | number) {
    const updated = [...itens]
    updated[index] = { ...updated[index], [field]: value }
    setItens(updated)
    const total = updated.reduce((acc, item) => acc + item.quantidade * item.valor_unitario, 0)
    setValor(total.toFixed(2))
    setValorDisplay(formatCurrencyInput(total.toFixed(2).replace('.', '')))
  }

  function formatCurrencyInput(rawValue: string) {
    const numbersOnly = rawValue.replace(/\D/g, '')
    if (!numbersOnly) return ''
    const amount = (parseInt(numbersOnly, 10) / 100).toFixed(2)
    return amount.replace('.', ',')
  }

  function handleValorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const numbersOnly = e.target.value.replace(/\D/g, '')
    if (!numbersOnly) {
      setValor('')
      setValorDisplay('')
      return
    }
    const amount = (parseInt(numbersOnly, 10) / 100).toFixed(2)
    setValor(amount)
    setValorDisplay(amount.replace('.', ','))
  }

  function toISODateLocal(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  function getDateAfter(days: number) {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + days)
    return toISODateLocal(date)
  }

  function formatDueDate(isoDate: string) {
    const [year, month, day] = isoDate.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    })
  }

  function selectVencimento(days: number | null) {
    if (days === null) {
      setVencimento(null)
      setVencimentoCustom('')
      setShowCustomDate(false)
      return
    }

    const selectedDate = getDateAfter(days)
    setVencimento(selectedDate)
    setVencimentoCustom('')
    setShowCustomDate(false)
  }

  async function handleSalvar() {
    if (!profile || !selectedCliente) return
    const valorNum = parseFloat(valor)
    if (!valorNum || valorNum <= 0) {
      addToast({ message: 'Informe o valor da venda', type: 'warning' })
      return
    }

    try {
      setSaving(true)
      const supabase = createClient()

      // Se for à vista (sem vencimento), marca como paga
      const isAVista = !vencimentoCustom && !vencimento

      const { error } = await supabase.from('notas').insert({
        user_id: profile.id,
        cliente_id: selectedCliente.id,
        descricao: descricao || null,
        itens: itens.length > 0 ? itens : [],
        valor: valorNum,
        data_vencimento: vencimentoCustom || vencimento,
        status: isAVista ? 'paga' : 'pendente',
        data_pagamento: isAVista ? new Date().toISOString() : null,
      })
      if (error) throw error

      const msg = isAVista ? 'Venda à vista registrada' : 'Venda registrada'
      addToast({ message: msg, type: 'success' })
      onClose()
    } catch {
      addToast({ message: 'Erro ao salvar venda', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-bg-app overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Nova venda</h1>
          <button onClick={onClose}>
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-2 rounded-full transition-colors ${s === step ? 'bg-black' : 'bg-border'
                }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
            >
              <h2 className="text-lg font-semibold mb-4">Quem comprou?</h2>
              <Input
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="mt-4 space-y-0 divide-y divide-divider">
                <button
                  onClick={() => setShowNovoCliente(true)}
                  className="w-full flex items-center gap-3 py-3"
                >
                  <div className="h-10 w-10 rounded-full border border-dashed border-border flex items-center justify-center">
                    <PlusIcon className="h-5 w-5 text-text-muted" />
                  </div>
                  <span className="text-sm font-medium">Novo cliente</span>
                </button>
                {filteredClientes.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCliente(c)
                      setStep(2)
                    }}
                    className="w-full flex items-center gap-3 py-3"
                  >
                    <Avatar name={c.nome} />
                    <div className="text-left">
                      <p className="text-sm font-medium">{c.nome}</p>
                      {c.apelido && (
                        <p className="text-xs text-text-secondary">{c.apelido}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
            >
              <h2 className="text-lg font-semibold mb-4">O que comprou?</h2>

              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleCapture(file, handleOCR)
                }}
              />

              <Button
                variant="secondary"
                onClick={capture}
                loading={ocrLoading}
                className="w-full mb-6"
              >
                <CameraIcon className="h-5 w-5" />
                Escanear nota
              </Button>

              <Input
                label="Descrição"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Compra da semana"
              />

              <div className="mt-4">
                <Input
                  label="Valor total (R$)"
                  inputMode="numeric"
                  value={valorDisplay}
                  onChange={handleValorChange}
                  placeholder="0,00"
                />
              </div>

              {!showItens && (
                <button
                  onClick={() => {
                    setShowItens(true)
                    if (itens.length === 0) addItem()
                  }}
                  className="mt-3 text-sm font-medium text-text-secondary"
                >
                  Detalhar itens
                </button>
              )}

              {showItens && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-text-secondary">Itens</span>
                    <button onClick={addItem} className="text-xs font-medium text-text-primary">
                      + Adicionar
                    </button>
                  </div>
                  {itens.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <input
                        value={item.descricao}
                        onChange={(e) => updateItem(i, 'descricao', e.target.value)}
                        placeholder="Item"
                        className="flex-1 h-10 bg-transparent border-b border-border text-sm outline-none focus:border-b-black"
                      />
                      <input
                        type="number"
                        value={item.quantidade}
                        onChange={(e) => updateItem(i, 'quantidade', parseInt(e.target.value) || 1)}
                        className="w-12 h-10 bg-transparent border-b border-border text-sm text-center outline-none focus:border-b-black"
                        inputMode="numeric"
                      />
                      <input
                        type="number"
                        value={item.valor_unitario || ''}
                        onChange={(e) => updateItem(i, 'valor_unitario', parseFloat(e.target.value) || 0)}
                        placeholder="R$"
                        className="w-20 h-10 bg-transparent border-b border-border text-sm outline-none focus:border-b-black"
                        inputMode="decimal"
                      />
                      <button onClick={() => removeItem(i)}>
                        <XCircleIcon className="h-5 w-5 text-text-muted" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={() => setStep(3)}
                disabled={!valor || parseFloat(valor) <= 0}
                className="w-full mt-8"
              >
                Próximo →
              </Button>
              <button
                onClick={() => setStep(1)}
                className="w-full mt-3 h-12 text-sm font-medium text-text-secondary"
              >
                ← Voltar
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
            >
              <h2 className="text-lg font-semibold mb-4">Quando vence?</h2>

              {/* Pílulas de prazo */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { label: '7 dias', days: 7 },
                  { label: '15 dias', days: 15 },
                  { label: '30 dias', days: 30 },
                ].map((opt) => {
                  const optStr = getDateAfter(opt.days)
                  const selected = vencimento === optStr && !showCustomDate

                  return (
                    <button
                      key={opt.days}
                      onClick={() => selectVencimento(opt.days)}
                      className={`flex-1 min-w-[80px] rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${selected
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-text-primary border-divider'
                        }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>

              {/* Data específica e À vista */}
              <div className="flex flex-wrap gap-2 mb-4">
                {/* Data específica */}
                <label
                  className={`flex-1 min-w-[120px] rounded-full border px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer text-center ${showCustomDate
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-text-primary border-divider'
                    }`}
                >
                  {showCustomDate && vencimentoCustom
                    ? formatDueDate(vencimentoCustom)
                    : 'Data específica'}
                  <input
                    ref={vencimentoInputRef}
                    type="date"
                    value={vencimentoCustom}
                    min={toISODateLocal(new Date())}
                    onClick={() => setShowCustomDate(true)}
                    onChange={(e) => {
                      const value = e.target.value
                      setShowCustomDate(true)
                      setVencimentoCustom(value)
                      setVencimento(value || null)
                    }}
                    className="absolute opacity-0 w-0 h-0"
                  />
                </label>

                {/* À vista */}
                <button
                  onClick={() => selectVencimento(null)}
                  className={`flex-1 min-w-[100px] rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${!vencimento && !showCustomDate
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-text-primary border-divider'
                    }`}
                >
                  À vista
                </button>
              </div>

              {vencimento ? (
                <p className="text-xs text-text-secondary mb-4">
                  Vencimento: {formatDueDate(vencimento)}
                </p>
              ) : showCustomDate && vencimentoCustom ? (
                <p className="text-xs text-text-secondary mb-4">
                  Vencimento: {formatDueDate(vencimentoCustom)}
                </p>
              ) : (
                <p className="text-xs text-text-secondary mb-4">
                  Pagamento à vista · Nota será marcada como paga
                </p>
              )}

              <Button
                onClick={handleSalvar}
                loading={saving}
                className="w-full mt-8"
              >
                Salvar venda ✓
              </Button>
              <button
                onClick={() => setStep(2)}
                className="w-full mt-3 h-12 text-sm font-medium text-text-secondary"
              >
                ← Voltar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomSheet open={showNovoCliente} onClose={() => setShowNovoCliente(false)}>
        <h3 className="text-lg font-semibold mb-4">Novo cliente</h3>
        <div className="space-y-4">
          <Input
            label="Nome"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome do cliente"
          />
          <Input
            label="Apelido (opcional)"
            value={novoApelido}
            onChange={(e) => setNovoApelido(e.target.value)}
            placeholder="Como você chama ele/a"
          />
          <PhoneInput
            label="Telefone"
            value={novoTelefone}
            onChange={setNovoTelefone}
          />
        </div>
        <Button onClick={handleNovoCliente} className="w-full mt-6">
          Salvar cliente
        </Button>
      </BottomSheet>
    </div>
  )
}
