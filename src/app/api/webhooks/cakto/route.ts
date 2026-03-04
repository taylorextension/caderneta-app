import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { secret, event, data } = body

        // 1. Validate secret
        const expectedSecret = process.env.CAKTO_WEBHOOK_SECRET?.trim()
        if (expectedSecret && secret !== expectedSecret) {
            return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
        }

        // 2. Create admin client inside handler (ensures env vars are read at runtime)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

        if (!supabaseUrl || !serviceRoleKey) {
            console.error('Cakto webhook: missing SUPABASE_URL or SERVICE_ROLE_KEY')
            return NextResponse.json(
                { error: 'Server config error', detail: 'Missing Supabase credentials' },
                { status: 500 }
            )
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

        // 3. Extract customer email
        const customerEmail = data?.customer?.email
        if (!customerEmail) {
            return NextResponse.json({ error: 'No customer email' }, { status: 400 })
        }

        // 4. Find user by email via auth admin
        let userId: string | null = null
        try {
            const { data: authData } = await supabaseAdmin.auth.admin.listUsers({
                page: 1,
                perPage: 1000,
            })
            const user = authData?.users?.find(
                (u) => u.email?.toLowerCase() === customerEmail.toLowerCase()
            )
            userId = user?.id || null
        } catch (authErr) {
            console.error('Cakto webhook: auth admin error', authErr)
        }

        // 5. Determine profile updates based on event
        let assinaturaAtiva: boolean | undefined
        let plano: string | undefined

        switch (event) {
            case 'purchase_approved':
                assinaturaAtiva = true
                plano = 'basico'
                break
            case 'subscription_renewed':
                assinaturaAtiva = true
                break
            case 'subscription_canceled':
                assinaturaAtiva = false
                plano = 'trial'
                break
            case 'refund':
            case 'chargeback':
                assinaturaAtiva = false
                plano = 'trial'
                break
        }

        // 6. Update profile if user found and event is actionable
        if (userId && assinaturaAtiva !== undefined) {
            const updateData: Record<string, unknown> = {
                assinatura_ativa: assinaturaAtiva,
                updated_at: new Date().toISOString(),
            }
            if (plano) updateData.plano = plano

            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update(updateData)
                .eq('id', userId)

            if (updateError) {
                console.error('Cakto webhook: profile update error', updateError)
            }
        }

        // 7. Log event (always)
        const { error: logError } = await supabaseAdmin.from('subscription_events').insert({
            user_id: userId || null,
            event,
            status: data?.status || null,
            customer_email: customerEmail,
            cakto_order_id: data?.id || null,
            cakto_subscription_id: data?.subscription?.id || null,
            amount: data?.amount || data?.offer?.price || null,
            payment_method: data?.paymentMethod || null,
            raw_payload: body,
        })

        if (logError) {
            console.error('Cakto webhook: log insert error', logError)
        }

        return NextResponse.json({
            ok: true,
            event,
            userId: userId || 'not_found',
            assinaturaAtiva,
        })
    } catch (error) {
        console.error('Cakto webhook: unhandled error', error)
        return NextResponse.json(
            { error: 'Internal error', detail: String(error) },
            { status: 500 }
        )
    }
}
