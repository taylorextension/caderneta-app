'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import { useUIStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const pixTipos = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'Email' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'aleatoria', label: 'Chave aleatória' },
] as const

export default function SetupPage() {
  const router = useRouter()
  const addToast = useUIStore((s) => s.addToast)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [nomeLoja, setNomeLoja] = useState('')
  const [pixTipo, setPixTipo] = useState<string>('cpf')
  const [pixChave, setPixChave] = useState('')
  const [pixNome, setPixNome] = useState('')
  const [pixCidade, setPixCidade] = useState('')

  async function handleSaveLoja() {
    if (!nomeLoja.trim()) {
      addToast({ message: 'Digite o nome da loja', type: 'warning' })
      return
    }
    setStep(2)
  }

  async function handleSavePix() {
    try {
      setLoading(true)
      const supabase = createClient()

      // Tenta obter o usuário com retry simples para casos de propagação lenta de sessão
      let { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Fallback para getSession se getUser falhar (comum logo após o signup)
        const { data: { session } } = await supabase.auth.getSession()
        user = session?.user || null
      }

      if (!user) throw new Error('Usuario nao autenticado. Tente fazer login novamente.')

      let profileData: { id: string } | null = null

      const { data, error } = await supabase
        .from('profiles')
        .update({
          nome_loja: nomeLoja,
          pix_tipo: pixTipo,
          pix_chave: pixChave || null,
          pix_nome: pixNome || null,
          pix_cidade: pixCidade || 'SAO PAULO',
          onboarding_completo: true,
        })
        .eq('id', user.id)
        .select('id')
        .maybeSingle()

      if (error) throw error
      profileData = data

      if (!profileData) {
        const fallbackNome =
          (user.user_metadata?.nome as string | undefined) ||
          user.email?.split('@')[0] ||
          'Usuário'

        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            nome: fallbackNome,
            telefone: '',
            nome_loja: nomeLoja,
            pix_tipo: pixTipo,
            pix_chave: pixChave || null,
            pix_nome: pixNome || null,
            pix_cidade: pixCidade || 'SAO PAULO',
            onboarding_completo: true,
          })
          .select('id')
          .single()

        if (insertError) throw insertError
        profileData = inserted
      }

      if (!profileData?.id) {
        throw new Error('Não foi possível concluir o onboarding')
      }

      setStep(3)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message || 'Erro ao salvar')
          : 'Erro ao salvar'
      addToast({ message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSkipPix() {
    try {
      setLoading(true)
      const supabase = createClient()

      // Tenta obter o usuário com retry simples para casos de propagação lenta de sessão
      let { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Fallback para getSession se getUser falhar (comum logo após o signup)
        const { data: { session } } = await supabase.auth.getSession()
        user = session?.user || null
      }

      if (!user) throw new Error('Usuario nao autenticado. Tente fazer login novamente.')

      let profileData: { id: string } | null = null

      const { data, error } = await supabase
        .from('profiles')
        .update({
          nome_loja: nomeLoja,
          onboarding_completo: true,
        })
        .eq('id', user.id)
        .select('id')
        .maybeSingle()

      if (error) throw error
      profileData = data

      if (!profileData) {
        const fallbackNome =
          (user.user_metadata?.nome as string | undefined) ||
          user.email?.split('@')[0] ||
          'Usuário'

        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            nome: fallbackNome,
            telefone: '',
            nome_loja: nomeLoja,
            onboarding_completo: true,
          })
          .select('id')
          .single()

        if (insertError) throw insertError
        profileData = inserted
      }

      if (!profileData?.id) {
        throw new Error('Não foi possível concluir o onboarding')
      }

      setStep(3)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message || 'Erro ao salvar')
          : 'Erro ao salvar'
      addToast({ message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12">
      <div className="w-full max-w-sm lg:max-w-md mx-auto">
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
              transition={{ duration: 0.25 }}
            >
              <h1 className="text-xl font-semibold mb-2">Nome da sua loja</h1>
              <p className="text-sm text-text-secondary mb-6">
                Como seus clientes conhecem seu negócio?
              </p>

              <Input
                label="Nome da loja"
                value={nomeLoja}
                onChange={(e) => setNomeLoja(e.target.value)}
                placeholder="Ex: Mercearia da Ana"
              />

              <Button onClick={handleSaveLoja} className="w-full mt-8">
                Próximo →
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.25 }}
            >
              <h1 className="text-xl font-semibold mb-2">Chave Pix</h1>
              <p className="text-sm text-text-secondary mb-6">
                Para gerar cobranças automáticas com QR Code
              </p>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Tipo da chave
                  </label>
                  <select
                    value={pixTipo}
                    onChange={(e) => setPixTipo(e.target.value)}
                    className="h-12 w-full bg-transparent border-b border-border text-base outline-none focus:border-b-black rounded-none"
                  >
                    {pixTipos.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Chave Pix"
                  value={pixChave}
                  onChange={(e) => setPixChave(e.target.value)}
                  placeholder="Digite sua chave"
                />

                <Input
                  label="Nome do beneficiário"
                  value={pixNome}
                  onChange={(e) => setPixNome(e.target.value)}
                  placeholder="Nome que aparece no Pix"
                  hint="Como aparece na sua conta bancária"
                />

                <Input
                  label="Cidade"
                  value={pixCidade}
                  onChange={(e) => setPixCidade(e.target.value.toUpperCase())}
                  placeholder="Ex: SAO PAULO"
                  hint="Cidade do recebedor (aparece no QR Code)"
                />
              </div>

              <Button
                onClick={handleSavePix}
                loading={loading}
                className="w-full mt-8"
              >
                Próximo →
              </Button>
              <button
                onClick={handleSkipPix}
                disabled={loading}
                className="w-full mt-3 h-12 text-sm font-medium text-text-secondary"
              >
                Configurar depois
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.25 }}
              className="text-center"
            >
              <h1 className="text-xl font-semibold mb-2">Tudo pronto!</h1>
              <p className="text-sm text-text-secondary mb-8">
                Sua caderneta digital está configurada. Comece cadastrando seus
                clientes.
              </p>

              <Button
                onClick={() => router.push('/inicio')}
                className="w-full"
              >
                Cadastrar primeiro cliente
              </Button>
              <button
                onClick={() => router.push('/inicio')}
                className="w-full mt-3 h-12 text-sm font-medium text-text-secondary"
              >
                Ir para o início
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
