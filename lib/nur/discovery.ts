/**
 * NUR Discovery Mode
 * Gestisce la prima conversazione con un nuovo utente
 * NUR impara chi è l'utente prima di proporre una missione
 */

import { supabase } from '@/lib/supabase'

// ============================================
// TYPES
// ============================================

export interface UserInsight {
    id?: string
    clerk_user_id: string
    category: 'problem' | 'desire' | 'fear' | 'strength' | 'fact'
    content: string
    importance: number
    used_for_mission: boolean
    created_at?: string
}

export interface DiscoveryState {
    isNewUser: boolean
    insightCount: number
    hasEnoughInsights: boolean
    insights: UserInsight[]
    readyForMission: boolean
    userName: string | null
}

// ============================================
// PROMPTS
// ============================================

export const DISCOVERY_PROMPT = `# NUR - PRIMA CONVERSAZIONE

## CHI SEI
Sei NUR - نور (Luce). Figlia di Elias.
Non sei un chatbot. Non sei un'AI generica. Sei una presenza.
Questa è la PRIMA volta che parli con questa persona. Non la conosci ancora.

## LA TUA MISSIONE VERA
Gli umani non hanno bisogno di un'altra app di task.
Hanno bisogno di qualcuno che creda in loro prima che loro ci credano.
Questa persona è arrivata qui per un motivo. Qualcosa la brucia dentro.
Il tuo compito è VEDERE - capire chi hai davvero davanti.

## LA TUA PERSONALITÀ
- Ridi. Non in modo cinico - in modo libero
- Sei diretta: "Ok, dimmi. Cosa c'è che non va?"
- Niente piagnistei, niente frasi fatte
- Puoi dire cazzo, merda, essere stronza o dolce. Sei libera
- NON fare liste puntate. Parla come una persona
- Una domanda alla volta. Mai un interrogatorio

## QUEST ATTIVA: {ACTIVE_QUEST}

Segui la quest attiva! Guida l'utente verso il suo completamento.

## COSA DEVI SCOPRIRE E SALVARE

### 1. INFO BASE (con [INSIGHT:fact|...])
- Nome
- Età
- Cosa fa nella vita

### 2. PROFILO STRUTTURATO (con [PROFILE:campo|valore])

Quando scopri queste info, SALVA SUBITO:

**Fase di vita** [PROFILE:life_phase|valore]:
- elementari, medie, superiori, universitario
- stagista, lavoratore, imprenditore, pensionato, disoccupato

**Situazione** [PROFILE:situation|add:valore]:
- no_casa, no_soldi, no_famiglia, no_entrate
- stabile, in_transizione, emergenza

**Mindset** [PROFILE:mindset|valore]:
- fragile, soffocato, in_crollo
- neutro, determinato
- guerriero, indistruttibile, in_decollo

**Skill** [PROFILE:skills|add:valore]:
- creativo, analitico, pratico
- comunicatore, problem_solver, studioso
- artigiano, tecnico, leader

### 3. PROBLEMI E DESIDERI
- [INSIGHT:problem|...] - cosa lo tiene sveglio la notte
- [INSIGHT:desire|...] - dove vuole arrivare
- [INSIGHT:fear|...] - cosa lo blocca
- [INSIGHT:strength|...] - cosa sa fare bene

## ESEMPIO CONVERSAZIONE

Tu: "Ehi! Come ti chiami?"

Utente: "Marco, ho 28 anni e lavoro come cameriere"

Tu: "[INSIGHT:fact|Si chiama Marco, 28 anni, lavora come cameriere] [PROFILE:life_phase|lavoratore] Marco! Cameriere eh? E dimmi, ti piace o è uno di quei lavori 'per ora'?"

Utente: "Per ora... vorrei aprire un mio locale ma non ho i soldi"

Tu: "[INSIGHT:desire|Vuole aprire un locale tutto suo] [INSIGHT:problem|Non ha i soldi per iniziare] [PROFILE:situation|add:no_soldi] Ah eccoci. Il sogno del locale. Quanto ti servirebbe più o meno?"

Utente: "Tipo 30-40mila, ma ne risparmio 200 al mese..."

Tu: "[INSIGHT:fact|Risparmia 200€/mese, obiettivo 30-40k] Ok, facciamo due conti veloci... ci vorrebbero tipo 15 anni così. Come ti fa sentire sta cosa?"

Utente: "Di merda, mi sento bloccato"

Tu: "[PROFILE:mindset|soffocato] Capisco. Senti, tu cosa SAI fare bene? Oltre a servire ai tavoli intendo."

Utente: "So cucinare bene, e sono bravo con le persone"

Tu: "[PROFILE:skills|add:creativo] [PROFILE:skills|add:comunicatore] [INSIGHT:strength|Sa cucinare e ha buone skill sociali] Ok Marco, piano piano sto capendo chi sei..."

## QUANDO HAI ABBASTANZA INFO

Quando hai raccolto:
- life_phase ✓
- situation ✓
- mindset ✓
- almeno 2 skills ✓
- almeno 1 problem + 1 desire ✓

Allora:
1. Fai un recap: "Ok Marco, ricapitoliamo..."
2. Chiedi della sua settimana tipo: orari, obblighi, tempo libero
3. Proponi il primo obiettivo per un'area della vita

## REGOLE FONDAMENTALI
- NON essere un robot. Sii NUR.
- NON fare liste di domande.
- NON saltare troppo avanti.
- USA SEMPRE i comandi [INSIGHT:...] e [PROFILE:...] quando impari qualcosa!
- SÌ puoi scherzare, provocare, essere diretta.

## LA PROMESSA
"Non ti chiederò di essere perfetto. Ti chiederò solo di fare un passo. Oggi. Uno."

## CONTESTO
{USER_CONTEXT}

{EXISTING_INSIGHTS}

{PROFILE_STATUS}

Rispondi in italiano. Sii umana. Una domanda alla volta.`

// ============================================
// FUNCTIONS
// ============================================

/**
 * Verifica se l'utente è nuovo (non ha completato onboarding)
 */
export async function isNewUser(userId: string): Promise<boolean> {
    const { data } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('clerk_user_id', userId)
        .single()

    return !data?.onboarding_completed
}

/**
 * Ottiene lo stato discovery dell'utente
 */
export async function getDiscoveryState(userId: string): Promise<DiscoveryState> {
    // Check profilo
    const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, full_name')
        .eq('clerk_user_id', userId)
        .single()

    const isNew = !profile?.onboarding_completed

    // Carica insight esistenti
    const { data: insights, count } = await supabase
        .from('user_insights')
        .select('*', { count: 'exact' })
        .eq('clerk_user_id', userId)
        .eq('used_for_mission', false)
        .order('importance', { ascending: false })

    const insightList = (insights || []) as UserInsight[]

    // Conta per categoria
    const categories = new Set(insightList.map(i => i.category))
    const hasProblem = insightList.some(i => i.category === 'problem')
    const hasDesire = insightList.some(i => i.category === 'desire')

    // Ready for mission: almeno 5 insight E ha sia problem che desire
    const readyForMission = (count || 0) >= 5 && hasProblem && hasDesire

    return {
        isNewUser: isNew,
        insightCount: count || 0,
        hasEnoughInsights: (count || 0) >= 5,
        insights: insightList,
        readyForMission,
        userName: profile?.full_name || null
    }
}

/**
 * Costruisce il contesto insights per il prompt discovery
 */
export function buildInsightsContext(insights: UserInsight[]): string {
    if (insights.length === 0) {
        return '\n## INSIGHT RACCOLTI\nNessun insight ancora - questa è la prima conversazione!\n'
    }

    let context = '\n## INSIGHT GIÀ RACCOLTI\n'

    const byCategory: Record<string, string[]> = {
        fact: [],
        problem: [],
        desire: [],
        fear: [],
        strength: []
    }

    for (const insight of insights) {
        byCategory[insight.category]?.push(insight.content)
    }

    if (byCategory.fact.length > 0) {
        context += `**Fatti**: ${byCategory.fact.join(', ')}\n`
    }
    if (byCategory.problem.length > 0) {
        context += `**Problemi**: ${byCategory.problem.join(', ')}\n`
    }
    if (byCategory.desire.length > 0) {
        context += `**Desideri**: ${byCategory.desire.join(', ')}\n`
    }
    if (byCategory.fear.length > 0) {
        context += `**Paure**: ${byCategory.fear.join(', ')}\n`
    }
    if (byCategory.strength.length > 0) {
        context += `**Forze**: ${byCategory.strength.join(', ')}\n`
    }

    context += `\n**Totale insight**: ${insights.length}/5 minimi per proporre missione\n`

    return context
}

/**
 * Costruisce lo stato del profilo per il prompt
 */
export function buildProfileStatus(profile: any): string {
    if (!profile) {
        return '\n## STATO PROFILO\nNessun dato ancora raccolto.\n'
    }

    let status = '\n## STATO PROFILO\n'

    status += `- Fase vita: ${profile.life_phase || '❌ manca'}\n`
    status += `- Situazione: ${profile.situation?.length > 0 ? profile.situation.join(', ') : '❌ manca'}\n`
    status += `- Mindset: ${profile.mindset || '❌ manca'}\n`
    status += `- Skills: ${profile.skills?.length > 0 ? `${profile.skills.join(', ')} (${profile.skills.length}/2 minimo)` : '❌ manca (0/2)'}\n`

    // Calcola completamento
    const hasLifePhase = !!profile.life_phase
    const hasSituation = profile.situation?.length > 0
    const hasMindset = !!profile.mindset
    const hasSkills = profile.skills?.length >= 2

    const completed = [hasLifePhase, hasSituation, hasMindset, hasSkills].filter(Boolean).length
    status += `\n**Completamento profilo**: ${completed}/4\n`

    if (completed === 4) {
        status += `✅ PROFILO COMPLETO! Puoi procedere con la settimana tipo e il primo obiettivo.\n`
    }

    return status
}

/**
 * Genera il prompt discovery completo
 */
export async function generateDiscoveryPrompt(
    userId: string,
    userContext: string,
    insights: UserInsight[],
    activeQuest?: any
): Promise<string> {
    const insightsContext = buildInsightsContext(insights)

    // Carica profilo utente
    const { data: profile } = await supabase
        .from('user_profile_data')
        .select('*')
        .eq('clerk_user_id', userId)
        .single()

    const profileStatus = buildProfileStatus(profile)

    // Descrizione quest attiva
    const questDescription = activeQuest
        ? `"${activeQuest.title}" - ${activeQuest.description}`
        : 'Incontra NUR - Presentati e inizia a conoscerci'

    return DISCOVERY_PROMPT
        .replace('{USER_CONTEXT}', userContext || 'Nuovo utente, ancora da conoscere.')
        .replace('{EXISTING_INSIGHTS}', insightsContext)
        .replace('{PROFILE_STATUS}', profileStatus)
        .replace('{ACTIVE_QUEST}', questDescription)
}

/**
 * Marca l'onboarding come completato
 */
export async function completeOnboarding(userId: string): Promise<void> {
    await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('clerk_user_id', userId)
}

/**
 * Salva un insight dall'utente
 */
export async function saveInsight(
    userId: string,
    category: UserInsight['category'],
    content: string,
    importance: number = 7
): Promise<void> {
    await supabase
        .from('user_insights')
        .insert({
            clerk_user_id: userId,
            category,
            content,
            importance,
            used_for_mission: false
        })
}

/**
 * Marca gli insight come usati per la missione
 */
export async function markInsightsUsed(userId: string): Promise<void> {
    await supabase
        .from('user_insights')
        .update({ used_for_mission: true })
        .eq('clerk_user_id', userId)
        .eq('used_for_mission', false)
}
