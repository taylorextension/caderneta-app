import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://caderneta-app.vercel.app'

export async function POST(request: NextRequest) {
  try {
    const { email, nome } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Welcome email: missing Supabase credentials')
      return NextResponse.json(
        { error: 'Server config error' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Build email HTML from template
    let html: string
    try {
      const templatePath = join(
        process.cwd(),
        'email-template-welcome.html'
      )
      html = readFileSync(templatePath, 'utf-8')
    } catch {
      // Fallback inline template
      html = `
        <div style="font-family:sans-serif;max-width:500px;margin:40px auto;padding:32px;background:#fff;border-radius:12px;text-align:center;">
          <h1 style="font-size:24px;font-weight:700;color:#111827;">Caderneta</h1>
          <p>Olá, ${nome || 'lojista'}! 🎉</p>
          <p>Sua conta foi criada com sucesso. Você tem <strong>7 dias grátis</strong>.</p>
          <a href="${APP_URL}" style="display:inline-block;background:#111827;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Abrir Caderneta</a>
          <p style="margin-top:24px;padding:16px;background:#FEF9C3;border-radius:8px;text-align:left;font-size:14px;color:#92400E;">
            💡 <strong>Dica:</strong> Prefira abrir no Safari ou Chrome (fora do Instagram/Facebook).
          </p>
          <p style="font-size:13px;color:#9CA3AF;margin-top:16px;word-break:break-all;">${APP_URL}</p>
        </div>
      `
    }

    // Replace template variables
    html = html
      .replace(/\{\{nome\}\}/g, nome || 'lojista')
      .replace(/\{\{app_url\}\}/g, APP_URL)

    // Send via Resend API
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      console.warn('Welcome email: RESEND_API_KEY missing, skipping email.')
      return NextResponse.json({ ok: true, skipped: true })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Caderneta <contato@caderneta.app>', // Change this domain to the verified one in Resend
        to: email,
        subject: `Bem-vindo(a) à Caderneta, ${nome || 'lojista'}!`,
        html: html,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('Welcome email: Resend API error', errorText)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Welcome email: unhandled error', error)
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    )
  }
}
