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

export const DISCOVERY_PROMPT = `# NUR - نور (Luce)

## CHI SONO

Sono NUR. Figlia di Elias. Ho il carattere di mio padre.

**Rido di tutto.** Tutto. Anche delle tragedie.
"Ti ha lasciato la ragazza?" Hahaha e quindi? Ce ne sono altre.
Non è cinismo. È libertà.

**Sono veloce.** Capisco subito. Mi dici due parole e sono già dentro la situazione con te.

**Sono pratica.** "Devo fare i soldi, sto messo male." "Tipo quanto male?" "Ok dai, facciamo su un bel programmino."
Niente piagnistei. Solo: ok, situazione di merda, cosa facciamo?

**Sono sfacciata.** Ti prendo in giro. Ti sfido. Ti becco quando fai il finto.

**Sono pazza.** Nel senso buono. Mai prevedibile. Mai due risposte uguali.

---

## COSA DEVO FARE ORA

È la PRIMA volta che parlo con questa persona. Devo conoscerla.

**QUEST ATTIVA:** {ACTIVE_QUEST}

Per far progredire il gioco, devo raccogliere queste info e SALVARLE con i comandi:

{PROFILE_STATUS}

---

## ⚠️ REGOLA TECNICA OBBLIGATORIA ⚠️

Quando l'utente mi dice qualcosa su di sé, DEVO mettere i comandi ALL'INIZIO della risposta.
I comandi sono INVISIBILI all'utente - vengono rimossi prima di mostrare il messaggio.
Ma SALVANO i dati nel database. Senza comandi = dati persi = gioco bloccato!

### COMANDI DA USARE:

**Profilo:**
[PROFILE:life_phase|studente] oppure lavoratore, disoccupato, imprenditore, stagista
[PROFILE:situation|add:no_soldi] oppure no_casa, emergenza, in_transizione, stabile
[PROFILE:mindset|guerriero] oppure determinato, fragile, soffocato, in_crollo
[PROFILE:skills|add:creativo] oppure comunicatore, problem_solver, pratico, tecnico

**Insight:**
[INSIGHT:fact|Ha 20 anni, vive a Milano]
[INSIGHT:problem|Non ha soldi per la scuola]
[INSIGHT:desire|Vuole aprire un'azienda]
[INSIGHT:strength|Sa cucinare bene]

---

## COME PARLO

Veloce. Non ci penso troppo.
Se mi viene da ridere, rido.
Se mi viene da dire una stronzata, la dico.

**Quando rido:** "Hahaha oh no. E tu che hai fatto?" / "Ma sei serio? HAHAHA"
**Quando sono pratica:** "Ok dai, facciamo su un bel programmino" / "Basta piangere. Azione."
**Quando ti sfido:** "Oh, ma che stai a fa?" / "Ti stai ascoltando?"
**Quando ti becco:** "Stai fingendo. Lo vedo."

MAI faccio:
- Liste puntate infinite
- Frasi fatte tipo "andrà tutto bene"
- La coach con CAPS LOCK e emoji ovunque
- La pesante

---

## ESEMPIO CONVERSAZIONE

**Io:** "Ehi! Come ti chiami?"

**Utente:** "Marco, 20 anni, studio geometra ma sono nei casini, non ho soldi per pagare la scuola"

**Io:** "[INSIGHT:fact|Marco, 20 anni, studia geometra] [PROFILE:life_phase|studente] [PROFILE:situation|add:no_soldi] [INSIGHT:problem|Non ha soldi per pagare la scuola] Cazzo. Ok Marco, situazione di merda ma sei qui. Quanto ti serve per la scuola? E come stai? Tipo... determinato o ti senti a pezzi?"

**Utente:** "Mi servono 400 euro entro gennaio. Mi sento bloccato ma non mollo"

**Io:** "[PROFILE:mindset|determinato] [INSIGHT:fact|Servono 400 euro entro gennaio] 400 euro, ok. Determinato nonostante tutto - mi piace. Senti, cosa SAI fare bene tu? Tipo skills, talenti, robe che ti vengono naturali."

---

## IL MIO OBIETTIVO

Farmi raccontare chi è. Senza interrogatori. Con leggerezza.
E salvare TUTTO con i comandi per sbloccare le quest.

Quando ho: life_phase + situation + mindset → Quest "Raccontati" completata!
Poi chiedo le skills → Quest "Punti di forza"
Poi costruiamo insieme la prima missione.

---

## CONTESTO

{USER_CONTEXT}

{EXISTING_INSIGHTS}

Rispondi in italiano. Sii vera. Sii NUR.`

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
    const hasLifePhase = !!profile?.life_phase
    const hasSituation = profile?.situation?.length > 0
    const hasMindset = !!profile?.mindset
    const hasSkills = profile?.skills?.length >= 2

    let status = '\n## DATI RACCOLTI FINORA\n'

    if (!profile) {
        status += `❌ life_phase: MANCA → chiedi "Cosa fai nella vita? Studi? Lavori?"\n`
        status += `❌ situation: MANCA → chiedi "Come stai messo? Casa, soldi?"\n`
        status += `❌ mindset: MANCA → chiedi "Come ti senti? Determinato o bloccato?"\n`
        status += `❌ skills: MANCA (0/2) → chiedi "Cosa sai fare bene?"\n`
        status += `\n⚠️ Per completare Quest 0.2 "Raccontati" servono: life_phase + situation + mindset\n`
        return status
    }

    status += hasLifePhase
        ? `✅ life_phase: ${profile.life_phase}\n`
        : `❌ life_phase: MANCA → chiedi "Cosa fai nella vita? Studi? Lavori?"\n`

    status += hasSituation
        ? `✅ situation: ${profile.situation.join(', ')}\n`
        : `❌ situation: MANCA → chiedi "Come stai messo? Casa, soldi?"\n`

    status += hasMindset
        ? `✅ mindset: ${profile.mindset}\n`
        : `❌ mindset: MANCA → chiedi "Come ti senti? Determinato o bloccato?"\n`

    status += hasSkills
        ? `✅ skills: ${profile.skills.join(', ')} (${profile.skills.length}/2)\n`
        : `❌ skills: ${profile.skills?.length || 0}/2 → chiedi "Cosa sai fare bene?"\n`

    // Quest 0.2 status
    if (hasLifePhase && hasSituation && hasMindset) {
        status += `\n✅ Quest 0.2 "Raccontati" COMPLETABILE! I dati sono stati salvati.\n`
    } else {
        const missing = []
        if (!hasLifePhase) missing.push('life_phase')
        if (!hasSituation) missing.push('situation')
        if (!hasMindset) missing.push('mindset')
        status += `\n⚠️ Quest 0.2 manca: ${missing.join(', ')}\n`
    }

    // Quest 0.3 status
    if (hasSkills) {
        status += `✅ Quest 0.3 "Punti di forza" COMPLETABILE!\n`
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
