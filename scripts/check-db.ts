/**
 * Script per visualizzare lo stato delle tabelle Supabase
 * Esegui con: npx ts-node scripts/check-db.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://acspggsthvdqdddexekp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjc3BnZ3N0aHZkcWRkZGV4ZWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNjY0ODIsImV4cCI6MjA3OTk0MjQ4Mn0.Uty12MB1ufj2WlfYY-xAmXRXlRpiCDmaOLJGZ5nc_9o'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabase() {
    console.log('\n' + '='.repeat(60))
    console.log('📊 STATO DATABASE NUR')
    console.log('='.repeat(60))

    // 1. Profiles
    const { data: profiles, count: profileCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
    console.log(`\n👤 PROFILES: ${profileCount || 0} utenti`)
    if (profiles && profiles.length > 0) {
        profiles.slice(0, 3).forEach(p => {
            console.log(`   - ${p.full_name || p.email || p.clerk_user_id.slice(0,20)}...`)
        })
    }

    // 2. Conversations
    const { data: convs, count: convCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact' })
        .order('updated_at', { ascending: false })
    console.log(`\n💬 CONVERSATIONS: ${convCount || 0} totali`)
    if (convs && convs.length > 0) {
        convs.slice(0, 3).forEach(c => {
            console.log(`   - ${c.id.slice(0,8)}... | ${c.message_count || 0} msg | ${c.status} | ${c.area_related || 'generale'}`)
        })
    }

    // 3. Messages
    const { count: msgCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
    const { data: recentMsgs } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
    console.log(`\n📝 MESSAGES: ${msgCount || 0} totali`)
    if (recentMsgs && recentMsgs.length > 0) {
        console.log('   Ultimi 5:')
        recentMsgs.forEach(m => {
            const preview = m.content.slice(0, 50).replace(/\n/g, ' ')
            const time = new Date(m.created_at).toLocaleString('it-IT')
            console.log(`   [${m.role}] ${preview}... (${time})`)
        })
    }

    // 4. User Memory
    const { data: memories, count: memCount } = await supabase
        .from('user_memory')
        .select('*', { count: 'exact' })
        .order('importance', { ascending: false })
    console.log(`\n🧠 USER_MEMORY: ${memCount || 0} memorie`)
    if (memories && memories.length > 0) {
        console.log('   Top memorie per importanza:')
        memories.slice(0, 5).forEach(m => {
            console.log(`   - [${m.memory_type}] ${m.content.slice(0,40)}... (imp: ${m.importance})`)
        })
    }

    // 5. Solutions
    const { data: solutions, count: solCount } = await supabase
        .from('solutions')
        .select('*', { count: 'exact' })
    console.log(`\n💡 SOLUTIONS: ${solCount || 0} piani`)
    if (solutions && solutions.length > 0) {
        solutions.slice(0, 3).forEach(s => {
            console.log(`   - ${s.title?.slice(0,40) || 'Senza titolo'} | ${s.status}`)
        })
    }

    // 6. AI Insights
    const { count: insightCount } = await supabase
        .from('ai_insights')
        .select('*', { count: 'exact', head: true })
    console.log(`\n🔍 AI_INSIGHTS: ${insightCount || 0} insight`)

    // 7. Journal Entries
    const { count: journalCount } = await supabase
        .from('journal_entries')
        .select('*', { count: 'exact', head: true })
    console.log(`\n📰 JOURNAL_ENTRIES: ${journalCount || 0} voci`)

    // 8. Life Areas
    const { data: areas } = await supabase
        .from('life_areas')
        .select('area_type, progress, priority')
        .order('priority', { ascending: false })
    console.log(`\n🌟 LIFE_AREAS:`)
    if (areas && areas.length > 0) {
        areas.forEach(a => {
            const bar = '█'.repeat(Math.floor(a.progress / 10)) + '░'.repeat(10 - Math.floor(a.progress / 10))
            console.log(`   ${a.area_type.padEnd(12)} [${bar}] ${a.progress}%`)
        })
    } else {
        console.log('   Nessuna area configurata')
    }

    // 9. Knowledge Chunks
    const { count: knowledgeCount } = await supabase
        .from('knowledge_chunks')
        .select('*', { count: 'exact', head: true })
    console.log(`\n📚 KNOWLEDGE_CHUNKS: ${knowledgeCount || 0} chunk`)

    console.log('\n' + '='.repeat(60))
    console.log('✅ Controllo completato')
    console.log('='.repeat(60) + '\n')
}

checkDatabase().catch(console.error)
