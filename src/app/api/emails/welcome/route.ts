import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // Supabase Webhook payload structure: { type: 'INSERT', table: 'profiles', record: { ... }, ... }
    const { record } = payload;
    const { email, nome } = record || payload; // Fallback to direct payload for manual testing

    if (!email || !nome) {
      return NextResponse.json({ error: 'Missing email or name in record' }, { status: 400 });
    }

    // Security check: Verify the Bearer token (Service Role Key)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
        console.error('Unauthorized attempt to send welcome email');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await resend.emails.send({
      from: 'Caderneta <contato@caderneta.app>',
      to: [email],
      subject: 'Bem-vindo ao Caderneta! 🚀',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #111827;">Olá ${nome}, tudo bem?</h1>
          <p>Ficamos muito felizes em ter você conosco no <strong>Caderneta</strong>!</p>
          <p>Agora você tem o controle total das suas vendas a prazo e fiados de forma simples e profissional.</p>
          <div style="margin: 32px 0;">
            <a href="https://caderneta.app/dashboard" 
               style="background-color: #111827; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
               Acessar meu Dashboard
            </a>
          </div>
          <p>Se tiver qualquer dúvida, é só responder a este e-mail.</p>
          <p>Boas vendas!<br>Equipe Caderneta</p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
