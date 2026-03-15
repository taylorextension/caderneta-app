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
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F7F5;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0E0F0C;">
          <tr><td align="center" style="padding:48px 24px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:420px;width:100%;">
              <tr><td style="padding-bottom:32px;">
                <a href="${APP_URL}" style="text-decoration:none;">
                  <img src="${APP_URL}/logo.png" alt="Caderneta" width="48" height="48" style="display:inline-block;vertical-align:middle;border:0;" />
                  <span style="display:inline-block;vertical-align:middle;margin-left:12px;font-size:22px;font-weight:800;color:#163300;letter-spacing:-0.5px;">Caderneta</span>
                </a>
              </td></tr>
              <tr><td style="padding-bottom:8px;">
                <h1 style="margin:0;font-size:24px;font-weight:700;color:#0E0F0C;line-height:1.3;">Olá, ${nome || 'lojista'}!</h1>
              </td></tr>
              <tr><td style="padding-bottom:32px;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:#454745;">Sua conta foi criada com sucesso. Você tem <strong style="color:#163300;">7 dias grátis</strong> para testar todas as funcionalidades.</p>
              </td></tr>
              <tr><td style="padding-bottom:28px;"><div style="height:1px;background-color:#E2E4E2;"></div></td></tr>
              <tr><td style="padding-bottom:20px;">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                  <td style="width:32px;vertical-align:top;padding-top:1px;"><div style="width:24px;height:24px;background-color:#9FE870;border-radius:50%;text-align:center;line-height:24px;"><span style="font-size:14px;font-weight:700;color:#163300;line-height:24px;">&#10003;</span></div></td>
                  <td style="padding-left:12px;"><p style="margin:0;font-size:14px;font-weight:600;color:#0E0F0C;">Registre vendas fiado direto no celular</p><p style="margin:4px 0 0;font-size:13px;color:#6A6C6A;line-height:1.4;">Anote tudo com poucos toques e tenha controle total</p></td>
                </tr></table>
              </td></tr>
              <tr><td style="padding-bottom:20px;">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                  <td style="width:32px;vertical-align:top;padding-top:1px;"><div style="width:24px;height:24px;background-color:#9FE870;border-radius:50%;text-align:center;line-height:24px;"><span style="font-size:14px;font-weight:700;color:#163300;line-height:24px;">&#10003;</span></div></td>
                  <td style="padding-left:12px;"><p style="margin:0;font-size:14px;font-weight:600;color:#0E0F0C;">Cobre pelo WhatsApp com mensagens da IA</p><p style="margin:4px 0 0;font-size:13px;color:#6A6C6A;line-height:1.4;">Mensagens personalizadas geradas automaticamente</p></td>
                </tr></table>
              </td></tr>
              <tr><td style="padding-bottom:36px;">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                  <td style="width:32px;vertical-align:top;padding-top:1px;"><div style="width:24px;height:24px;background-color:#9FE870;border-radius:50%;text-align:center;line-height:24px;"><span style="font-size:14px;font-weight:700;color:#163300;line-height:24px;">&#10003;</span></div></td>
                  <td style="padding-left:12px;"><p style="margin:0;font-size:14px;font-weight:600;color:#0E0F0C;">Receba via Pix com link automático</p><p style="margin:4px 0 0;font-size:13px;color:#6A6C6A;line-height:1.4;">Link de pagamento gerado pra cada nota</p></td>
                </tr></table>
              </td></tr>
              <tr><td style="padding-bottom:36px;">
                <a href="${APP_URL}/inicio" style="display:inline-block;background-color:#163300;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;padding:14px 36px;border-radius:100px;">Acessar minha conta</a>
              </td></tr>
              <tr><td style="padding-bottom:24px;"><div style="height:1px;background-color:#E2E4E2;"></div></td></tr>
              <tr><td style="padding-bottom:40px;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#454745;">Dica</p>
                <p style="margin:0;font-size:13px;color:#6A6C6A;line-height:1.5;">Adicione o Caderneta na tela inicial do celular para acesso rápido. Abra no Safari ou Chrome para melhor experiência.</p>
              </td></tr>
              <tr><td>
                <p style="margin:0;font-size:12px;color:#6A6C6A;">Caderneta &middot; Gestão simples para pequenos comércios</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
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
