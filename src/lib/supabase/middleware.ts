import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdminEmail } from '@/lib/admin'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(
          cookiesToSet: {
            name: string
            value: string
            options?: Record<string, unknown>
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(
              name,
              value,
              options as Record<string, unknown>
            )
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isPublicApi =
    path.startsWith('/api/webhooks/') ||
    path.startsWith('/api/nota/') ||
    path === '/api/eventos'

  const isPublic =
    path.startsWith('/p/') ||
    path.startsWith('/auth/') ||
    path === '/redefinir-senha' ||
    isPublicApi
  const isAuthPage = path === '/login' || path === '/cadastro'
  const isAdmin = path.startsWith('/admin') || path.startsWith('/api/admin')

  if (isPublic) {
    return supabaseResponse
  }

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/inicio'
    return NextResponse.redirect(url)
  }

  // Admin route protection
  if (isAdmin && (!user || !isAdminEmail(user.email))) {
    if (path.startsWith('/api/admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/inicio'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
