'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { loginSchema } from '@/lib/validators'
import { useUIStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageTransition } from '@/components/layout/page-transition'
import { isOnboardingComplete } from '@/lib/onboarding'

export default function LoginPage() {
  const router = useRouter()
  const addToast = useUIStore((s) => s.addToast)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', senha: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validateField(field: string, value: string) {
    const result = loginSchema.safeParse({ ...form, [field]: value })
    if (!result.success) {
      const fieldError = result.error.flatten().fieldErrors[field as keyof typeof form]
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

    const result = loginSchema.safeParse(form)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors({
        email: fieldErrors.email?.[0] || '',
        senha: fieldErrors.senha?.[0] || '',
      })
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.senha,
      })

      if (error) throw error

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não encontrado')

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (!isOnboardingComplete(profile)) {
        router.push('/setup')
      } else {
        router.push('/inicio')
      }
    } catch {
      addToast({ message: 'Email ou senha incorretos', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!form.email) {
      addToast({ message: 'Digite seu email primeiro', type: 'warning' })
      return
    }
    try {
      const supabase = createClient()
      const redirectUrl = `${window.location.origin}/redefinir-senha`
      await supabase.auth.resetPasswordForEmail(form.email, {
        redirectTo: redirectUrl,
      })
      addToast({ message: 'Email de recuperação enviado', type: 'success' })
    } catch {
      addToast({ message: 'Erro ao enviar email', type: 'error' })
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col justify-center px-6 py-12">
        <div className="w-full max-w-sm lg:max-w-md mx-auto">
          <img src="/logo.png" alt="Caderneta" className="h-8 w-auto mb-8" />

          <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>
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
              suppressHydrationWarning
            />

            <Input
              label="Senha"
              type="password"
              autoComplete="current-password"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              onBlur={() => validateField('senha', form.senha)}
              error={errors.senha}
              placeholder="••••••"
              suppressHydrationWarning
            />

            <Button type="submit" loading={loading} className="w-full">
              Entrar
            </Button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            <button
              onClick={handleForgotPassword}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Esqueci minha senha
            </button>
            <div>
              <Link
                href="/cadastro"
                className="text-sm font-semibold text-text-primary"
              >
                Criar conta
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
