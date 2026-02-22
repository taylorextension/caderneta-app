'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUIStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageTransition } from '@/components/layout/page-transition'

export default function RedefinirSenhaPage() {
    const router = useRouter()
    const addToast = useUIStore((s) => s.addToast)
    const [loading, setLoading] = useState(false)
    const [senha, setSenha] = useState('')
    const [confirmarSenha, setConfirmarSenha] = useState('')
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [ready, setReady] = useState(false)

    useEffect(() => {
        // The hash fragment contains the access_token from Supabase redirect
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const type = hashParams.get('type')

        if (accessToken && type === 'recovery') {
            const supabase = createClient()
            supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: hashParams.get('refresh_token') || '',
            }).then(({ error }) => {
                if (error) {
                    addToast({ message: 'Link expirado. Solicite novamente.', type: 'error' })
                    router.push('/login')
                } else {
                    setReady(true)
                }
            })
        } else {
            // Also check if user already has a session (e.g. via PKCE callback)
            const supabase = createClient()
            supabase.auth.getSession().then(({ data }) => {
                if (data.session) {
                    setReady(true)
                } else {
                    addToast({ message: 'Link inválido. Solicite novamente.', type: 'error' })
                    router.push('/login')
                }
            })
        }
    }, [addToast, router])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setErrors({})

        if (senha.length < 6) {
            setErrors({ senha: 'A senha deve ter no mínimo 6 caracteres' })
            return
        }

        if (senha !== confirmarSenha) {
            setErrors({ confirmarSenha: 'As senhas não coincidem' })
            return
        }

        try {
            setLoading(true)
            const supabase = createClient()
            const { error } = await supabase.auth.updateUser({ password: senha })

            if (error) throw error

            addToast({ message: 'Senha alterada com sucesso!', type: 'success' })
            router.push('/inicio')
        } catch {
            addToast({ message: 'Erro ao redefinir senha. Tente novamente.', type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    if (!ready) {
        return (
            <PageTransition>
                <div className="min-h-screen flex items-center justify-center">
                    <p className="text-text-secondary">Verificando link...</p>
                </div>
            </PageTransition>
        )
    }

    return (
        <PageTransition>
            <div className="min-h-screen flex flex-col justify-center px-6 py-12">
                <div className="w-full max-w-sm mx-auto">
                    <h1 className="text-xl font-bold text-text-primary mb-2">
                        Redefinir senha
                    </h1>
                    <p className="text-sm text-text-secondary mb-8">
                        Escolha uma nova senha para sua conta.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            label="Nova senha"
                            type="password"
                            autoComplete="new-password"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            error={errors.senha}
                            placeholder="••••••"
                        />

                        <Input
                            label="Confirmar nova senha"
                            type="password"
                            autoComplete="new-password"
                            value={confirmarSenha}
                            onChange={(e) => setConfirmarSenha(e.target.value)}
                            error={errors.confirmarSenha}
                            placeholder="••••••"
                        />

                        <Button type="submit" loading={loading} className="w-full">
                            Salvar nova senha
                        </Button>
                    </form>
                </div>
            </div>
        </PageTransition>
    )
}
