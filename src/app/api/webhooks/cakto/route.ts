import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { secret, event, data } = body

        // 1. Validate secret
        const expectedSecret = process.env.CAKTO_WEBHOOK_SECRET
        if (expectedSecret && secret !== expectedSecret) {
            console.error('Cakto webhook: invalid secret')
            return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
        }

        // 2. Extract customer email
        const customerEmail = data?.customer?.email
        if (!customerEmail) {
            console.error('Cakto webhook: no customer email', { event })
            return NextResponse.json({ error: 'No customer email' }, { status: 400 })
        }

        // 3. Find user by email in auth.users
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
        if (authError) {
            console.error('Cakto webhook: error listing users', authError)
            return NextResponse.json({ error: 'Internal error' }, { status: 500 })
        }

        const user = authUsers.users.find(
            (u) => u.email?.toLowerCase() === customerEmail.toLowerCase()
        )

        if (!user) {
            console.warn('Cakto webhook: user not found for email', customerEmail)
            // Still log the event even if user not found
            await supabaseAdmin.from('subscription_events').insert({
                event,
                status: data?.status || null,
                customer_email: customerEmail,
                cakto_order_id: data?.id || null,
                cakto_subscription_id: data?.subscription?.id || null,
                amount: data?.amount || data?.offer?.price || null,
                payment_method: data?.paymentMethod || null,
                raw_payload: body,
            })
            return NextResponse.json({ ok: true, message: 'User not found, event logged' })
        }

        // 4. Process event
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

            default:
                // Log other events (pix_gerado, boleto_gerado, etc.) without updating profile
                break
        }

        // 5. Update profile if needed
        if (assinaturaAtiva !== undefined) {
            const updateData: Record<string, unknown> = {
                assinatura_ativa: assinaturaAtiva,
                updated_at: new Date().toISOString(),
            }
            if (plano) updateData.plano = plano

            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update(updateData)
                .eq('id', user.id)

            if (updateError) {
                console.error('Cakto webhook: error updating profile', updateError)
            }
        }

        // 6. Log event
        await supabaseAdmin.from('subscription_events').insert({
            user_id: user.id,
            event,
            status: data?.status || null,
            customer_email: customerEmail,
            cakto_order_id: data?.id || null,
            cakto_subscription_id: data?.subscription?.id || null,
            amount: data?.amount || data?.offer?.price || null,
            payment_method: data?.paymentMethod || null,
            raw_payload: body,
        })

        console.log(`Cakto webhook: processed ${event} for ${customerEmail}`, {
            assinaturaAtiva,
            plano,
        })

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('Cakto webhook: unhandled error', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
