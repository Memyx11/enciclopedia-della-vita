/**
 * Reset completo di NUR - Nuova memoria
 * Esegui con: npx tsx scripts/reset-nur.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://acspggsthvdqdddexekp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjc3BnZ3N0aHZkcWRkZGV4ZWtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDM2NjQ4MiwiZXhwIjoyMDc5OTQyNDgyfQ.oYMcEpTDNc4dAqG3rHY_U7bP5AmQdCA8Pxm3UZQwMQM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function resetNur() {
    console.log('\n' + '='.repeat(60))
    console.log('🔄 RESET COMPLETO NUR - NUOVA MEMORIA')
    console.log('='.repeat(60))

    // 1. Elimina tutti i messaggi
    console.log('\n🗑️  Elimino messaggi...')
    const { error: msgErr, count: msgCount } = await supabase
        .from('messages')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select('*', { count: 'exact', head: true })
    console.log(msgErr ? `   ❌ Errore: ${msgErr.message}` : `   ✅ Messaggi eliminati`)

    // 2. Elimina tutte le conversazioni
    console.log('\n🗑️  Elimino conversazioni...')
    const { error: convErr } = await supabase
        .from('conversations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
    console.log(convErr ? `   ❌ Errore: ${convErr.message}` : `   ✅ Conversazioni eliminate`)

    // 3. Elimina memorie utente
    console.log('\n🗑️  Elimino memorie utente...')
    const { error: memErr } = await supabase
        .from('user_memory')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
    console.log(memErr ? `   ❌ Errore: ${memErr.message}` : `   ✅ Memorie utente eliminate`)

    // 4. Elimina memorie NUR
    console.log('\n🗑️  Elimino memorie NUR...')
    const { error: nurMemErr } = await supabase
        .from('nur_memory')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
    console.log(nurMemErr ? `   ❌ Errore: ${nurMemErr.message}` : `   ✅ Memorie NUR eliminate`)

    // 5. Elimina journal entries
    console.log('\n🗑️  Elimino journal entries...')
    const { error: journalErr } = await supabase
        .from('journal_entries')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
    console.log(journalErr ? `   ❌ Errore: ${journalErr.message}` : `   ✅ Journal entries eliminati`)

    // 6. Elimina solutions
    console.log('\n🗑️  Elimino solutions...')
    const { error: solErr } = await supabase
        .from('solutions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
    console.log(solErr ? `   ❌ Errore: ${solErr.message}` : `   ✅ Solutions eliminate`)

    // 7. Elimina AI insights
    console.log('\n🗑️  Elimino AI insights...')
    const { error: insErr } = await supabase
        .from('ai_insights')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
    console.log(insErr ? `   ❌ Errore: ${insErr.message}` : `   ✅ AI insights eliminati`)

    // 8. Elimina NUR growth metrics
    console.log('\n🗑️  Elimino NUR growth metrics...')
    const { error: growthErr } = await supabase
        .from('nur_growth')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
    console.log(growthErr ? `   ❌ Errore: ${growthErr.message}` : `   ✅ NUR growth eliminati`)

    // 9. Reset life_areas (mantieni le aree ma resetta progress/tasks/goals)
    console.log('\n🔄 Reset life_areas...')
    const { error: areaErr } = await supabase
        .from('life_areas')
        .update({
            progress: 0,
            current_state: {},
            goal_state: {},
            active_tasks: [],
            notes: null,
            last_significant_update: null
        })
        .neq('id', '00000000-0000-0000-0000-000000000000')
    console.log(areaErr ? `   ❌ Errore: ${areaErr.message}` : `   ✅ Life areas resettate`)

    // Verifica finale
    console.log('\n' + '='.repeat(60))
    console.log('📊 VERIFICA FINALE')
    console.log('='.repeat(60))

    const tables = ['messages', 'conversations', 'user_memory', 'nur_memory', 'journal_entries', 'solutions', 'ai_insights', 'nur_growth']

    for (const table of tables) {
        const { count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
        console.log(`   ${table.padEnd(20)} → ${count || 0} record`)
    }

    const { data: areas } = await supabase
        .from('life_areas')
        .select('area_type, progress')

    console.log(`   ${'life_areas'.padEnd(20)} → ${areas?.length || 0} aree (tutte a 0%)`)

    console.log('\n' + '='.repeat(60))
    console.log('✅ NUR È PRONTA PER UNA NUOVA VITA')
    console.log('='.repeat(60))
    console.log('\n"Haha ok. Tabula rasa. Ricominciamo da zero."\n')
}

resetNur().catch(console.error)
