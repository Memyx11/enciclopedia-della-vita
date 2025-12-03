/**
 * Clerk Webhook
 * Gestisce eventi di autenticazione per inizializzare utenti
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { getNur } from '@/lib/nur'

// Tipo per il payload del webhook Clerk
interface ClerkWebhookPayload {
    type: string
    data: {
        id: string
        email_addresses?: Array<{
            email_address: string
            id: string
        }>
        first_name?: string
        last_name?: string
        username?: string
        image_url?: string
        created_at?: number
    }
}

export async function POST(req: NextRequest) {
    // Verifica che il webhook secret sia configurato
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

    if (!WEBHOOK_SECRET) {
        console.error('CLERK_WEBHOOK_SECRET non configurato')
        // In development, procedi comunque
        if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ Webhook secret mancante - modalità development')
        } else {
            return NextResponse.json(
                { error: 'Webhook secret non configurato' },
                { status: 500 }
            )
        }
    }

    // Ottieni gli headers
    const headersList = await headers()
    const svix_id = headersList.get('svix-id')
    const svix_timestamp = headersList.get('svix-timestamp')
    const svix_signature = headersList.get('svix-signature')

    // Se mancano gli headers svix, potrebbe essere una chiamata diretta
    if (!svix_id || !svix_timestamp || !svix_signature) {
        // In development, accetta payload JSON diretto
        if (process.env.NODE_ENV === 'development') {
            try {
                const payload = await req.json()
                return await handleWebhookEvent(payload)
            } catch {
                return NextResponse.json(
                    { error: 'Payload non valido' },
                    { status: 400 }
                )
            }
        }
        return NextResponse.json(
            { error: 'Headers webhook mancanti' },
            { status: 400 }
        )
    }

    // Verifica la firma del webhook
    const body = await req.text()

    if (WEBHOOK_SECRET) {
        const wh = new Webhook(WEBHOOK_SECRET)
        let payload: ClerkWebhookPayload

        try {
            payload = wh.verify(body, {
                'svix-id': svix_id,
                'svix-timestamp': svix_timestamp,
                'svix-signature': svix_signature
            }) as ClerkWebhookPayload
        } catch (err) {
            console.error('Errore verifica webhook:', err)
            return NextResponse.json(
                { error: 'Firma webhook non valida' },
                { status: 400 }
            )
        }

        return await handleWebhookEvent(payload)
    } else {
        // Development senza secret
        const payload = JSON.parse(body) as ClerkWebhookPayload
        return await handleWebhookEvent(payload)
    }
}

/**
 * Gestisce gli eventi del webhook
 */
async function handleWebhookEvent(payload: ClerkWebhookPayload) {
    const { type, data } = payload

    console.log(`📨 Webhook Clerk: ${type}`)

    switch (type) {
        case 'user.created':
            await handleUserCreated(data)
            break

        case 'user.updated':
            await handleUserUpdated(data)
            break

        case 'user.deleted':
            await handleUserDeleted(data)
            break

        default:
            console.log(`Evento non gestito: ${type}`)
    }

    return NextResponse.json({ received: true, type })
}

/**
 * Gestisce la creazione di un nuovo utente
 */
async function handleUserCreated(data: ClerkWebhookPayload['data']) {
    console.log(`👤 Nuovo utente: ${data.id}`)

    try {
        const nur = getNur()

        // Estrai email
        const email = data.email_addresses?.[0]?.email_address

        // Costruisci nome completo
        const fullName = [data.first_name, data.last_name]
            .filter(Boolean)
            .join(' ') || data.username || undefined

        // Inizializza l'utente con NUR
        await nur.initializeUser(data.id, {
            email,
            fullName
        })

        console.log(`✅ Utente ${data.id} inizializzato con successo`)

    } catch (error) {
        console.error(`❌ Errore inizializzazione utente ${data.id}:`, error)
        // Non ritorniamo errore - l'utente verrà inizializzato al primo accesso
    }
}

/**
 * Gestisce l'aggiornamento di un utente
 */
async function handleUserUpdated(data: ClerkWebhookPayload['data']) {
    console.log(`🔄 Utente aggiornato: ${data.id}`)

    try {
        const { supabase } = await import('@/lib/supabase')

        const email = data.email_addresses?.[0]?.email_address
        const fullName = [data.first_name, data.last_name]
            .filter(Boolean)
            .join(' ') || data.username

        // Aggiorna il profilo
        await supabase
            .from('profiles')
            .update({
                email,
                full_name: fullName,
                avatar_url: data.image_url
            })
            .eq('clerk_user_id', data.id)

        console.log(`✅ Profilo ${data.id} aggiornato`)

    } catch (error) {
        console.error(`❌ Errore aggiornamento utente ${data.id}:`, error)
    }
}

/**
 * Gestisce l'eliminazione di un utente
 */
async function handleUserDeleted(data: ClerkWebhookPayload['data']) {
    console.log(`🗑️ Utente eliminato: ${data.id}`)

    try {
        const { supabase } = await import('@/lib/supabase')

        // Elimina tutti i dati dell'utente
        // Le foreign key con CASCADE dovrebbero gestire le tabelle correlate
        await Promise.all([
            supabase.from('profiles').delete().eq('clerk_user_id', data.id),
            supabase.from('life_areas').delete().eq('clerk_user_id', data.id),
            supabase.from('user_memory').delete().eq('clerk_user_id', data.id),
            supabase.from('conversations').delete().eq('clerk_user_id', data.id),
            supabase.from('solutions').delete().eq('clerk_user_id', data.id),
            supabase.from('ai_insights').delete().eq('clerk_user_id', data.id),
            supabase.from('journal_entries').delete().eq('clerk_user_id', data.id)
        ])

        console.log(`✅ Dati utente ${data.id} eliminati`)

    } catch (error) {
        console.error(`❌ Errore eliminazione dati utente ${data.id}:`, error)
    }
}
