import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    // Security check first: Verify the Bearer token (Service Role Key)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
        console.error('Unauthorized attempt to send welcome email');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    console.log('Webhook payload received:', JSON.stringify(payload, null, 2));
    
    // Supabase Webhook payload structure: { type: 'INSERT', table: 'profiles', record: { id, nome, ... }, ... }
    const record = payload.record || payload;
    const { id, nome } = record;

    if (!id || !nome) {
      console.error('Missing id or name in record:', record);
      return NextResponse.json({ error: 'Missing id or name in record' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
      console.error('Missing required environment variables for welcome email route');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const resend = new Resend(resendApiKey);

    // Supabase Admin client for fetching user email
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Fetch email from auth.users (public.profiles doesn't have it)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(id);

    if (userError || !userData.user?.email) {
      console.error('Error fetching user email:', userError);
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    const email = userData.user.email;
    console.log(`Sending welcome email to ${nome} (${email})`);

    const { data, error } = await resend.emails.send({
      from: 'Caderneta <contato@caderneta.app>',
      to: [email],
      subject: `Bem-vindo ao Caderneta, ${nome}!`,
      html: `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F7F5;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0E0F0C;">
          <tr><td align="center" style="padding:48px 24px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:420px;width:100%;">
              <tr><td style="padding-bottom:32px;">
                <a href="https://caderneta.app" style="text-decoration:none;">
                  <img src="https://caderneta.app/logo.png" alt="Caderneta" width="48" height="48" style="display:inline-block;vertical-align:middle;border:0;" />
                  <span style="display:inline-block;vertical-align:middle;margin-left:12px;font-size:22px;font-weight:800;color:#163300;letter-spacing:-0.5px;">Caderneta</span>
                </a>
              </td></tr>
              <tr><td style="padding-bottom:8px;">
                <h1 style="margin:0;font-size:24px;font-weight:700;color:#0E0F0C;line-height:1.3;">Olá, ${nome}!</h1>
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
                <a href="https://caderneta.app/inicio" style="display:inline-block;background-color:#163300;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;padding:14px 36px;border-radius:100px;">Acessar minha conta</a>
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
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Internal Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
