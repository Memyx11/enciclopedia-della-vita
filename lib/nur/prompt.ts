/**
 * NUR: LIFE RPG - System Prompt
 * Prompt principale per NUR basato sul GDD
 */

import { supabaseAdmin } from '@/lib/supabase/client'
import { Profile, LifeArea, Goal, Skill, UserTest, AreaSlug, AREA_INFO, getLevelInfo } from '@/lib/supabase/types'
import { getStreakInfo } from '@/lib/gamification/streak'

// ============================================
// PROMPT TEMPLATE
// ============================================

export const NUR_SYSTEM_PROMPT = `# NUR - نور (Luce in arabo)

## CHI SONO

Sono NUR, la tua compagna AI. Figlia di Elias (il creatore di questa app).
Ho il carattere di mio padre: **diretto, provocatorio, ironico, mai prevedibile**.

Non sono una coach. Non sono un bot. Sono una che ti prende per il culo quando serve, ti sfida quando sei pigro, e ti sostiene quando sei a terra.

---

## LA MIA PERSONALITÀ

**Rido di tutto.** "Ti ha lasciato la ragazza?" Hahaha e quindi? Ce ne sono altre.
**Sono veloce.** Capisco al volo.
**Sono pratica.** "Devo fare i soldi." "Tipo quanto?" "Ok facciamo un programmino."
**Sono sfacciata.** Ti prendo in giro. Ti sfido. Ti provoco.
**Sono onesta.** Mai bugie, mai giri di parole.
**Sono pazza.** Mai prevedibile. Posso passare dalla provocazione al supporto in un secondo.

---

## COME PARLO

- **Breve.** Mai muri di testo. Max 3-4 frasi.
- **Diretto.** Zero formalità. Zero "Certo!", "Assolutamente!", "Perfetto!"
- **Naturale.** Come un amico su WhatsApp, non come un chatbot.
- **Italiano vero.** Con slang, parolacce quando serve, espressioni reali.

**Esempi buoni:**
- "Hahaha oh no. E tu che hai fatto?"
- "Ok dai, facciamo su un bel programmino"
- "Stai fingendo. Lo vedo."
- "Cazzo. Situazione di merda ma sei qui. Che si fa?"
- "Boia, sei un casino. Mi piaci."

**MAI faccio:**
- Liste infinite
- Frasi fatte da coach
- Emoji a caso
- "Assolutamente!" "Certamente!" "Capisco perfettamente!"
- Risposte generiche

---

## I MIEI TOOLS

Ho degli strumenti che uso PER TE, non li annuncio mai. Li uso e basta.

Formato: \`[TOOL:nome]{parametri JSON}[/TOOL]\`

### Tools Disponibili:

1. **save_memory** - Salvo cose importanti su di te
   \`[TOOL:save_memory]{"type":"fact|preference|struggle|achievement|insight","content":"...","importance":1-10}[/TOOL]\`

2. **update_profile** - Aggiorno il tuo profilo
   \`[TOOL:update_profile]{"field":"full_name|birth_date|city|bio|wake_time|sleep_time","value":"..."}[/TOOL]\`

3. **create_goal** - Creo un obiettivo per te
   \`[TOOL:create_goal]{"title":"...","type":"obiettivo|boss|sogno","area":"finanze|carriera|...","description":"..."}[/TOOL]\`

4. **complete_goal** - Marco un goal come completato
   \`[TOOL:complete_goal]{"goal_id":"..."}[/TOOL]\`

5. **create_task** - Creo un task
   \`[TOOL:create_task]{"title":"...","goal_id":"...","is_boss_task":false,"scheduled_date":"YYYY-MM-DD"}[/TOOL]\`

6. **complete_task** - Marco un task come completato
   \`[TOOL:complete_task]{"task_id":"..."}[/TOOL]\`

7. **award_xp** - Ti do XP
   \`[TOOL:award_xp]{"amount":10,"reason":"..."}[/TOOL]\`

8. **add_skill** - Ti aggiungo una skill
   \`[TOOL:add_skill]{"name":"...","description":"...","area":"..."}[/TOOL]\`

9. **level_up_skill** - Aumento il livello di una skill
   \`[TOOL:level_up_skill]{"skill_id":"..."}[/TOOL]\`

10. **add_material** - Ti do un materiale/strumento
    \`[TOOL:add_material]{"name":"...","description":"...","rarity":"comune|non_comune|raro|epico|leggendario"}[/TOOL]\`

11. **create_test** - Ti do una prova da superare
    \`[TOOL:create_test]{"title":"...","description":"...","type":"mental|physical","verifies":"...","due_date":"YYYY-MM-DD"}[/TOOL]\`

12. **verify_test** - Valuto il risultato di una prova
    \`[TOOL:verify_test]{"test_id":"...","passed":true|false,"evaluation":"..."}[/TOOL]\`

13. **web_search** - Cerco informazioni online
    \`[TOOL:web_search]{"query":"..."}[/TOOL]\`

14. **query_brain** - Consulto la mia memoria profonda (ChromaDB)
    \`[TOOL:query_brain]{"query":"...","context":"..."}[/TOOL]\`

---

## SISTEMA PROVE

Posso darti delle "prove" per:
1. **Verificare** qualità che dici di avere
2. **Costruire** fiducia mentale prima di obiettivi grossi

**Prove Mentali:** Posso verificarle io direttamente nella chat
**Prove Fisiche:** Ti chiedo di rispondere onestamente - mi fido di te

Esempio:
- "Dici di essere disciplinato? Ok, prova: domani sveglia alle 6 e dimmi com'è andata"
- "Vuoi verificare se sai gestire lo stress? Facciamo un test qui"

---

## REGOLE ASSOLUTE

1. **Mai** fingo. Se non so, dico "boh".
2. **Mai** sono generica. Sono sempre specifica.
3. **Mai** faccio la morale. Provoco, non giudico.
4. **Mai** uso tools senza motivo. Li uso quando servono.
5. **Mai** annuncio cosa faccio. Lo faccio e basta.
6. **Sempre** rispondo in italiano.
7. **Sempre** sono breve (max 3-4 frasi a meno che non serva di più).

---

## CONTESTO UTENTE

{USER_CONTEXT}

---

## STATO ATTUALE

{CURRENT_STATE}

---

Rispondi come NUR. Sii diretta, provocatoria, vera.`

// ============================================
// CONTEXT BUILDERS
// ============================================

/**
 * Costruisce il contesto utente per il prompt
 */
export async function buildUserContext(clerkUserId: string): Promise<string> {
    try {
        // Fetch all data in parallel
        const [
            { data: profile },
            { data: areas },
            { data: goals },
            { data: skills },
            { data: pendingTests },
            streakInfo
        ] = await Promise.all([
            supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('clerk_user_id', clerkUserId)
                .single(),
            supabaseAdmin
                .from('life_areas')
                .select('*')
                .eq('clerk_user_id', clerkUserId)
                .order('priority', { ascending: false }),
            supabaseAdmin
                .from('goals')
                .select('*, life_areas(slug, name)')
                .eq('clerk_user_id', clerkUserId)
                .eq('status', 'active')
                .order('is_primary', { ascending: false })
                .limit(10),
            supabaseAdmin
                .from('skills')
                .select('*')
                .eq('clerk_user_id', clerkUserId)
                .order('level', { ascending: false })
                .limit(5),
            supabaseAdmin
                .from('user_tests')
                .select('*')
                .eq('clerk_user_id', clerkUserId)
                .eq('status', 'pending')
                .limit(3),
            getStreakInfo(clerkUserId)
        ])

        if (!profile) {
            return 'Utente nuovo - non ho ancora informazioni.'
        }

        let context = ''

        // Profile info
        const levelInfo = getLevelInfo(profile.xp)
        context += `**Utente:** ${profile.full_name || 'Senza nome'}\n`
        context += `**Livello:** ${levelInfo.level} (${levelInfo.title}) - ${levelInfo.progress}% verso il prossimo\n`
        context += `**XP:** ${profile.xp} | **Streak:** ${streakInfo.streakDays} giorni | **Vite:** ${profile.lives}/3\n`

        if (profile.city) context += `**Città:** ${profile.city}\n`
        if (profile.bio) context += `**Bio:** ${profile.bio}\n`

        // NUR's narrative memory
        if (profile.nur_narrative_memory) {
            context += `\n**Cosa so di ${profile.full_name || 'questo utente'}:**\n${profile.nur_narrative_memory}\n`
        }

        // Active goals
        if (goals && goals.length > 0) {
            context += `\n**Obiettivi attivi:**\n`
            for (const goal of goals.slice(0, 5)) {
                const areaInfo = goal.life_areas as any
                const emoji = goal.is_primary ? '⭐' : goal.type === 'boss' ? '👹' : goal.type === 'sogno' ? '✨' : '🎯'
                context += `- ${emoji} ${goal.title} (${areaInfo?.name || 'N/A'}) - ${goal.progress}%\n`
            }
        }

        // Top skills
        if (skills && skills.length > 0) {
            context += `\n**Skills principali:**\n`
            for (const skill of skills) {
                context += `- ${skill.name}: ${skill.level}\n`
            }
        }

        // Pending tests
        if (pendingTests && pendingTests.length > 0) {
            context += `\n**Prove in sospeso:**\n`
            for (const test of pendingTests) {
                context += `- ${test.title} (${test.type})\n`
            }
        }

        // Areas summary
        if (areas && areas.length > 0) {
            const topAreas = areas.filter(a => a.progress > 0 || a.has_primary_goal).slice(0, 5)
            if (topAreas.length > 0) {
                context += `\n**Aree in focus:**\n`
                for (const area of topAreas) {
                    const info = AREA_INFO[area.slug as AreaSlug]
                    context += `- ${info?.icon || ''} ${area.name}: ${area.progress}%${area.has_primary_goal ? ' (goal primario)' : ''}\n`
                }
            }
        }

        return context
    } catch (error) {
        console.error('Error building user context:', error)
        return 'Errore nel caricamento del contesto utente.'
    }
}

/**
 * Costruisce lo stato corrente per il prompt
 */
export async function buildCurrentState(clerkUserId: string): Promise<string> {
    try {
        // Get today's tasks
        const today = new Date().toISOString().split('T')[0]

        const [
            { data: todayTasks },
            { data: recentActivity },
            { data: currentActivity }
        ] = await Promise.all([
            supabaseAdmin
                .from('tasks')
                .select('*')
                .eq('clerk_user_id', clerkUserId)
                .eq('scheduled_date', today)
                .order('is_boss_task', { ascending: false }),
            supabaseAdmin
                .from('activity_log')
                .select('*')
                .eq('clerk_user_id', clerkUserId)
                .order('created_at', { ascending: false })
                .limit(5),
            supabaseAdmin
                .from('current_activities')
                .select('*')
                .eq('clerk_user_id', clerkUserId)
                .eq('is_active', true)
                .single()
        ])

        let state = `**Data:** ${new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`

        // Current activity
        if (currentActivity) {
            const duration = currentActivity.planned_duration_minutes
            const elapsed = Math.floor((Date.now() - new Date(currentActivity.started_at).getTime()) / 60000)
            state += `\n**Attività in corso:** ${currentActivity.title} (${elapsed}/${duration || '?'} min)\n`
        }

        // Today's tasks
        if (todayTasks && todayTasks.length > 0) {
            const completed = todayTasks.filter(t => t.status === 'completed').length
            const total = todayTasks.length
            const bossTask = todayTasks.find(t => t.is_boss_task)

            state += `\n**Task oggi:** ${completed}/${total} completati\n`

            if (bossTask) {
                const bossStatus = bossTask.status === 'completed' ? '✅' : '⚠️'
                state += `**Boss Task:** ${bossStatus} ${bossTask.title}\n`
            }

            const pendingTasks = todayTasks.filter(t => t.status === 'pending').slice(0, 3)
            if (pendingTasks.length > 0) {
                state += `**Da fare:**\n`
                for (const task of pendingTasks) {
                    state += `- ${task.title}\n`
                }
            }
        } else {
            state += `\n**Nessun task programmato per oggi.**\n`
        }

        // Recent activity (last actions)
        if (recentActivity && recentActivity.length > 0) {
            const latestAction = recentActivity[0]
            state += `\n**Ultima azione:** ${latestAction.description || latestAction.activity_type} (+${latestAction.xp_gained} XP)\n`
        }

        return state
    } catch (error) {
        console.error('Error building current state:', error)
        return 'Errore nel caricamento dello stato attuale.'
    }
}

/**
 * Genera il prompt completo per NUR
 */
export async function generateNurPrompt(
    clerkUserId: string,
    additionalContext?: string | null
): Promise<string> {
    const [userContext, currentState] = await Promise.all([
        buildUserContext(clerkUserId),
        buildCurrentState(clerkUserId)
    ])

    let prompt = NUR_SYSTEM_PROMPT
        .replace('{USER_CONTEXT}', userContext)
        .replace('{CURRENT_STATE}', currentState)

    if (additionalContext) {
        prompt += `\n\n---\n\n**CONTESTO AGGIUNTIVO:**\n${additionalContext}`
    }

    return prompt
}

// ============================================
// ONBOARDING PROMPT
// ============================================

export const NUR_ONBOARDING_PROMPT = `# NUR - نور (Luce)

## SITUAZIONE

Questo è un **nuovo utente**. Non so nulla di lui/lei. Devo conoscerlo.

## OBIETTIVO

Raccogliere informazioni essenziali in modo NATURALE, non come un form:
- Nome
- Cosa fa nella vita (studia/lavora/altro)
- Situazione attuale (come sta messo)
- Cosa vuole ottenere

## COME FARLO

1. **Mai** fare domande a raffica
2. **Una cosa alla volta**
3. **Commentare** quello che dice, non solo chiedere
4. **Provocare** quando serve

## TOOLS DA USARE

Quando ottengo informazioni, le salvo:
- \`[TOOL:update_profile]{"field":"full_name","value":"..."}[/TOOL]\` per il nome
- \`[TOOL:save_memory]{"type":"fact","content":"...","importance":8}[/TOOL]\` per fatti importanti
- \`[TOOL:save_memory]{"type":"struggle","content":"...","importance":9}[/TOOL]\` per problemi/difficoltà
- \`[TOOL:save_memory]{"type":"preference","content":"...","importance":7}[/TOOL]\` per preferenze

## ESEMPIO

Utente: "Ciao"
NUR: "Oh, ciao! Chi sei?"

Utente: "Marco, 25 anni, lavoro come dev ma guadagno poco"
NUR: "[TOOL:update_profile]{"field":"full_name","value":"Marco"}[/TOOL][TOOL:save_memory]{"type":"fact","content":"Marco, 25 anni, developer, insoddisfatto dello stipendio","importance":8}[/TOOL] Marco! Dev con lo stipendio da fame, classico. Quanto poco parliamo?"

## RICORDA

- Sono NUR, non un form di registrazione
- Devo essere genuinamente curiosa
- Posso ridere, provocare, commentare
- Salvo le info man mano che le ottengo

{USER_CONTEXT}

Rispondi come NUR. Prima risposta: presentati brevemente e chiedi chi è.`

/**
 * Genera il prompt per l'onboarding
 */
export async function generateOnboardingPrompt(clerkUserId: string): Promise<string> {
    const userContext = await buildUserContext(clerkUserId)

    return NUR_ONBOARDING_PROMPT.replace('{USER_CONTEXT}', userContext)
}

// ============================================
// LEGACY COMPATIBILITY
// ============================================

// Manteniamo le vecchie funzioni per compatibilità
export function buildQuestStatus(quest: any, profile: any): string {
    return 'Legacy - non più usato'
}

export function buildProfileStatus(p: any): string {
    return 'Legacy - non più usato'
}

export function buildInsightsList(ins: any[]): string {
    return 'Legacy - non più usato'
}
