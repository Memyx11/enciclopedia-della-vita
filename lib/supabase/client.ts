/**
 * NUR: LIFE RPG - Supabase Client
 * Configurazione client Supabase per server e client-side
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ============================================
// ENVIRONMENT VARIABLES
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// ============================================
// LAZY CLIENT INSTANCES
// ============================================

let _supabaseClient: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

function getEnvOrThrow(): void {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)')
    }
}

/**
 * Client per uso client-side (rispetta RLS)
 * Usa anon key - le query sono filtrate per l'utente autenticato
 */
export const supabaseClient: SupabaseClient = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        if (!_supabaseClient) {
            getEnvOrThrow()
            _supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
        }
        return (_supabaseClient as any)[prop]
    }
})

/**
 * Client per uso server-side (bypassa RLS)
 * Usa service_role key - ha accesso completo al database
 * USARE SOLO IN API ROUTES E SERVER ACTIONS
 */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        if (!_supabaseAdmin) {
            getEnvOrThrow()
            _supabaseAdmin = supabaseServiceKey
                ? createClient(supabaseUrl, supabaseServiceKey, {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false
                    }
                })
                : createClient(supabaseUrl, supabaseAnonKey)
        }
        return (_supabaseAdmin as any)[prop]
    }
})

/**
 * Alias per compatibilità con codice esistente
 * @deprecated Usa supabaseAdmin per server-side o supabaseClient per client-side
 */
export const supabase = supabaseAdmin

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Crea un client Supabase con token JWT personalizzato
 * Utile per autenticazione Clerk -> Supabase
 */
export function createSupabaseClientWithToken(token: string): SupabaseClient {
    getEnvOrThrow()
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    })
}

/**
 * Verifica se siamo in ambiente server
 */
export function isServer(): boolean {
    return typeof window === 'undefined'
}

/**
 * Ottiene il client appropriato basato sull'ambiente
 */
export function getSupabaseClient(): SupabaseClient {
    return isServer() ? supabaseAdmin : supabaseClient
}

// ============================================
// DATABASE OPERATIONS HELPERS
// ============================================

export type QueryResult<T> = {
    data: T | null
    error: Error | null
}

export type QueryArrayResult<T> = {
    data: T[] | null
    error: Error | null
}

/**
 * Wrapper per query singola con error handling
 */
export async function querySingle<T>(
    query: Promise<{ data: T | null; error: any }>
): Promise<QueryResult<T>> {
    try {
        const { data, error } = await query
        if (error) throw error
        return { data, error: null }
    } catch (error) {
        console.error('Database query error:', error)
        return { data: null, error: error as Error }
    }
}

/**
 * Wrapper per query array con error handling
 */
export async function queryArray<T>(
    query: Promise<{ data: T[] | null; error: any }>
): Promise<QueryArrayResult<T>> {
    try {
        const { data, error } = await query
        if (error) throw error
        return { data: data || [], error: null }
    } catch (error) {
        console.error('Database query error:', error)
        return { data: null, error: error as Error }
    }
}
