'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as fbq from '@/lib/fpixel'
import { trackEvent } from '@/lib/analytics'
import { createClient } from '@/lib/supabase/client'
import { cadastroSchema } from '@/lib/validators'
import { useUIStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { PageTransition } from '@/components/layout/page-transition'
import { LogoAnimated } from '@/components/ui/logo-animated'

export default function CadastroPage() {
  const router = useRouter()
  const addToast = useUIStore((s) => s.addToast)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    senha: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    trackEvent('cadastro_view')
  }, [])

  function validateField(field: string, value: string) {
    const result = cadastroSchema.safeParse({ ...form, [field]: value })
    if (!result.success) {
      const fieldError =
        result.error.flatten().fieldErrors[field as keyof typeof form]
      setErrors((prev) => ({
        ...prev,
        [field]: fieldError?.[0] || '',
      }))
    } else {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const result = cadastroSchema.safeParse(form)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors({
        nome: fieldErrors.nome?.[0] || '',
        telefone: fieldErrors.telefone?.[0] || '',
        email: fieldErrors.email?.[0] || '',
        senha: fieldErrors.senha?.[0] || '',
      })
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.senha,
        options: {
          data: {
            nome: form.nome,
            telefone: form.telefone,
          },
        },
      })

      if (error) throw error
      if (!data.user) throw new Error('Erro ao criar conta')

      // Se Logado automaticamente (Confirmação de Email desativada), tenta criar o profile:
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          nome: form.nome,
          nome_loja: '',
          telefone: form.telefone,
        },
        { onConflict: 'id' }
      )

      if (profileError) {
        console.warn('Aviso profile:', profileError.message)
      }

      fbq.event('CompleteRegistration')
      trackEvent('cadastro_submit')

      router.push('/setup')
    } catch (err) {
      const message =
        err instanceof Error && err.message.includes('already registered')
          ? 'Este email já está cadastrado'
          : 'Erro ao criar conta'
      addToast({ message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col justify-center px-6 py-10">
        <div className="w-full max-w-sm lg:max-w-md mx-auto">
          <div className="flex justify-center mb-4">
            <LogoAnimated
              width={128}
              height={128}
              className="h-32 w-auto"
              priority
            />
          </div>

          <div className="text-center mb-6">
            <p className="text-sm text-text-secondary mt-1">
              Crie sua conta gratuitamente e comece a usar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Nome"
              type="text"
              autoComplete="name"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              onBlur={() => validateField('nome', form.nome)}
              error={errors.nome}
              placeholder="Seu nome"
            />

            <PhoneInput
              label="Telefone"
              value={form.telefone}
              onChange={(val) => setForm({ ...form, telefone: val })}
              error={errors.telefone}
            />

            <Input
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              onBlur={() => validateField('email', form.email)}
              error={errors.email}
              placeholder="seu@email.com"
            />

            <Input
              label="Senha"
              type="password"
              autoComplete="new-password"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              onBlur={() => validateField('senha', form.senha)}
              error={errors.senha}
              placeholder="Mínimo 6 caracteres"
            />

            <Button type="submit" loading={loading} className="w-full">
              Criar conta grátis
            </Button>

            <p className="text-center text-xs text-text-muted">
              Sem cartão agora
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Já tem conta?{' '}
            <Link href="/login" className="font-semibold text-text-primary">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </PageTransition>
  )
}
