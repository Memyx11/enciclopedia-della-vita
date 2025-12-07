/**
 * Script per pulire i dati duplicati nel database
 * Esegui con: npx tsx scripts/cleanup-db.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://acspggsthvdqdddexekp.supabase.co'
// Usa service_role per avere permessi di delete
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjc3BnZ3N0aHZkcWRkZGV4ZWtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDM2NjQ4MiwiZXhwIjoyMDc5OTQyNDgyfQ.oYMcEpTDNc4dAqG3rHY_U7bP5AmQdCA8Pxm3UZQwMQM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanupDatabase() {
    console.log('\n' + '='.repeat(60))
    console.log('🧹 PULIZIA DATABASE NUR')
    console.log('='.repeat(60))

    // 1. RIMUOVI DUPLICATI LIFE_AREAS
    console.log('\n📊 Analisi LIFE_AREAS...')

    const { data: allAreas } = await supabase
        .from('life_areas')
        .select('*')
        .order('created_at', { ascending: true })

    if (allAreas && allAreas.length > 0) {
        // Raggruppa per clerk_user_id + area_type
        const areaMap = new Map<string, any[]>()

        for (const area of allAreas) {
            const key = `${area.clerk_user_id}:${area.area_type}`
            if (!areaMap.has(key)) {
                areaMap.set(key, [])
            }
            areaMap.get(key)!.push(area)
        }

        // Trova duplicati e tieni solo il più recente
        let deletedCount = 0
        for (const [key, areas] of areaMap) {
            if (areas.length > 1) {
                console.log(`   Trovati ${areas.length} duplicati per ${key}`)

                // Ordina per created_at DESC e tieni il primo (più recente)
                areas.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

                // Elimina tutti tranne il primo
                const idsToDelete = areas.slice(1).map(a => a.id)

                const { error } = await supabase
                    .from('life_areas')
                    .delete()
                    .in('id', idsToDelete)

                if (!error) {
                    deletedCount += idsToDelete.length
                    console.log(`   ✅ Eliminati ${idsToDelete.length} duplicati`)
                } else {
                    console.log(`   ❌ Errore: ${error.message}`)
                }
            }
        }

        console.log(`\n   Totale life_areas eliminati: ${deletedCount}`)
    }

    // 2. PULISCI JOURNAL_ENTRIES (dovrebbero essere articoli, non chat)
    console.log('\n📰 Analisi JOURNAL_ENTRIES...')

    const { data: journals, count: journalCount } = await supabase
        .from('journal_entries')
        .select('*', { count: 'exact' })

    if (journals && journals.length > 0) {
        // Identifica entries che sembrano essere messaggi chat (tipo errato)
        const chatLikeEntries = journals.filter(j => {
            // Se è un tipo conversazione o il contenuto è corto come un messaggio
            const isChatType = ['conversazione', 'messaggio', 'chat'].includes(j.entry_type?.toLowerCase() || '')
            const isShortContent = j.content && j.content.length < 100
            return isChatType || (isShortContent && !['quote', 'tip'].includes(j.entry_type?.toLowerCase() || ''))
        })

        if (chatLikeEntries.length > 0) {
            console.log(`   Trovati ${chatLikeEntries.length} entries che sembrano chat logs`)
            console.log(`   Esempi:`)
            chatLikeEntries.slice(0, 3).forEach(e => {
                console.log(`   - [${e.entry_type}] ${e.content?.slice(0, 50)}...`)
            })

            // Per ora non eliminiamo, solo segnaliamo
            console.log(`   ⚠️  Da rivedere manualmente o con comando separato`)
        } else {
            console.log(`   ✅ ${journalCount} entries, nessun problema rilevato`)
        }
    }

    // 3. VERIFICA PROFILES
    console.log('\n👤 Analisi PROFILES...')

    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')

    if (profiles) {
        console.log(`   ${profiles.length} profili trovati:`)
        profiles.forEach(p => {
            console.log(`   - ${p.clerk_user_id.slice(0, 20)}... | ${p.full_name || 'Senza nome'} | ${p.email || 'no email'}`)
        })
    }

    // 4. VERIFICA STATO FINALE LIFE_AREAS
    console.log('\n🌟 LIFE_AREAS dopo pulizia:')

    const { data: cleanedAreas } = await supabase
        .from('life_areas')
        .select('*')
        .order('area_type')

    if (cleanedAreas && cleanedAreas.length > 0) {
        for (const area of cleanedAreas) {
            const goalStr = typeof area.goal_state === 'string' ? area.goal_state : JSON.stringify(area.goal_state || '')
            const hasGoal = goalStr && goalStr.trim() !== '' && goalStr !== 'null' && goalStr !== '{}'
            const hasTasks = area.active_tasks && Array.isArray(area.active_tasks) && area.active_tasks.length > 0

            console.log(`   ${area.area_type.padEnd(12)} | Progress: ${area.progress}% | Goal: ${hasGoal ? '✅' : '❌'} | Tasks: ${hasTasks ? area.active_tasks.length : 0}`)

            if (hasGoal) {
                console.log(`      → Goal: ${goalStr.slice(0, 60)}...`)
            }
            if (hasTasks) {
                area.active_tasks.slice(0, 2).forEach((t: any) => {
                    console.log(`      → Task: ${typeof t === 'string' ? t.slice(0, 40) : JSON.stringify(t).slice(0, 40)}...`)
                })
            }
        }
    } else {
        console.log('   Nessuna life_area trovata')
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Pulizia completata')
    console.log('='.repeat(60) + '\n')
}

cleanupDatabase().catch(console.error)
