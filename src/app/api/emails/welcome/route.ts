import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

// Supabase Admin client for fetching user email
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

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
      subject: 'Bem-vindo ao Caderneta! 🚀',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #F5F7F5; padding: 40px 20px;">
          <div style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
            <div style="background-color: #163300; padding: 40px 32px; text-align: center;">
              <a href="https://caderneta.app" style="font-size: 28px; font-weight: 800; color: #9FE870; letter-spacing: -1px; text-decoration: none;">Caderneta</a>
            </div>
            <div style="padding: 40px 32px; text-align: center;">
              <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #0E0F0C;">Olá ${nome}! 🚀</h1>
              <p style="font-size: 16px; line-height: 1.6; color: #454745; margin-bottom: 24px;">Obrigado por escolher o <strong>Caderneta</strong>. Estamos muito felizes em ajudar você a organizar suas vendas e cobranças.</p>
              <p style="font-size: 16px; line-height: 1.6; color: #454745; margin-bottom: 24px;">Prepare-se para ter o controle total do seu negócio na palma da mão.</p>
              <a href="https://caderneta.app/inicio" 
                 style="display: inline-block; background-color: #9FE870; color: #163300; text-decoration: none; font-weight: 700; font-size: 16px; padding: 16px 32px; border-radius: 12px;">
                 Começar Agora
              </a>
            </div>
            <div style="padding: 32px; text-align: center; font-size: 14px; color: #6A6C6A; background-color: #FFFFFF;">
              &copy; 2026 Caderneta App. Todos os direitos reservados.<br>
              Este é um e-mail automático, por favor não responda.
            </div>
          </div>
        </div>
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
