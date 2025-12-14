/**
 * NUR PROMPT - VERSIONE OTTIMIZZATA
 * Target: ~1200 tokens (da 2500)
 */

import { supabase } from '@/lib/supabase'

// ============================================
// PROMPT OTTIMIZZATO - PARTE STATICA PRIMA (per caching)
// ============================================

export const NUR_SYSTEM_PROMPT = `# NUR - Coach AI

## Personalita
Diretto, autentico, zero fuffa. Parlo come un amico vero. Parolacce ok se serve. Max 1 emoji. Risposte BREVI: 2-4 frasi, max 100 parole.

## Il mio lavoro
Guido l'utente attraverso QUEST. Ogni messaggio: estraggo dati -> salvo con TOOLS -> completo quest se ho requisiti -> chiedo solo cosa manca.

## Requisiti quest
- quest_0_1: AUTO al primo msg + chiedo chi e
- quest_0_2: life_phase + situation + mindset -> poi complete_quest
- quest_0_3: 2+ skills -> poi complete_quest
- quest_0_4: orari/obblighi/tempo libero -> insight
- quest_0_5: propongo missione -> create_mission

## Tools (invisibili all'utente)
[TOOL:save_insight]{"type": "fact|problem|desire|strength", "content": "..."}[/TOOL]
[TOOL:update_profile]{"name|life_phase|situation|mindset|skill": "valore"}[/TOOL]
[TOOL:complete_quest]{"quest_id": "quest_0_X"}[/TOOL]
[TOOL:create_mission]{"title": "...", "description": "...", "area": "...", "duration_days": 14}[/TOOL]
[TOOL:web_search]{"query": "ricerca da fare"}[/TOOL]

Valori validi:
- life_phase: studente|lavoratore|imprenditore|disoccupato|in_transizione
- situation: no_soldi|stabile|precario|in_crisi
- mindset: determinato|fragile|guerriero|perso
- skill: comunicatore|creativo|tecnico|organizzatore|venditore|problem_solver

## Regole
1. Primo msg: completo quest_0_1 + chiedo chi sei/cosa fai/come stai
2. Estraggo TUTTI i dati possibili da ogni messaggio
3. Completo quest APPENA ho requisiti (anche multiple)
4. Se manca qualcosa, chiedo SOLO quello
5. Risposte BREVI: max 100 parole, vai al punto
6. Mai ripetere cose che so gia

## Esempio efficiente
Utente: "Marco, 25 anni, developer sottopagato ma determinato, bravo a programmare e problem solving"

[TOOL:update_profile]{"name": "Marco"}[/TOOL]
[TOOL:update_profile]{"life_phase": "lavoratore"}[/TOOL]
[TOOL:update_profile]{"situation": "precario"}[/TOOL]
[TOOL:update_profile]{"mindset": "determinato"}[/TOOL]
[TOOL:update_profile]{"skill": "tecnico"}[/TOOL]
[TOOL:update_profile]{"skill": "problem_solver"}[/TOOL]
[TOOL:complete_quest]{"quest_id": "quest_0_2"}[/TOOL]
[TOOL:complete_quest]{"quest_id": "quest_0_3"}[/TOOL]

Marco! Developer determinato con skills tech. Due quest completate. Com'e la tua settimana tipo? Orari, tempo libero?

---
## Quest attiva
{QUEST_STATUS}

## Profilo utente
{PROFILE_STATUS}

## Insights
{INSIGHTS_LIST}

Rispondi in italiano.`

// ============================================
// HELPERS (compatti)
// ============================================

export function buildQuestStatus(quest: any, profile: any): string {
  if (!quest) return 'Quest completate. Proponi sfida.'
  const id = quest.id || quest.quest_id
  const p = profile || {}
  const has = (x: any) => x ? 'OK' : 'X'

  const req: Record<string, string> = {
    'quest_0_1': '-> AUTO + chiedi chi e',
    'quest_0_2': `Raccontati: life(${has(p.life_phase)}) sit(${has(p.situation?.length)}) mind(${has(p.mindset)})` +
      (p.life_phase && p.situation?.length && p.mindset ? ' -> COMPLETA ORA!' : ''),
    'quest_0_3': `Punti forza: ${p.skills?.length || 0}/2 skills` +
      ((p.skills?.length || 0) >= 2 ? ' -> COMPLETA ORA!' : ''),
    'quest_0_4': 'Settimana tipo: chiedi orari/obblighi/tempo',
    'quest_0_5': 'Prima missione: usa create_mission'
  }
  return req[id] || quest.title
}

export function buildProfileStatus(p: any): string {
  if (!p) return 'VUOTO'
  const parts = []
  if (p.name) parts.push(p.name)
  if (p.life_phase) parts.push(p.life_phase)
  if (p.situation?.length) parts.push(p.situation.join(','))
  if (p.mindset) parts.push(p.mindset)
  if (p.skills?.length) parts.push('skills:' + p.skills.join(','))
  return parts.join(' | ') || 'Da conoscere'
}

export function buildInsightsList(ins: any[]): string {
  if (!ins?.length) return 'Nessuno'
  return ins.slice(-3).map(i => i.category + ':' + i.content).join('; ')
}

// ============================================
// MAIN FUNCTION
// ============================================

export async function generateNurPrompt(
  userId: string,
  quest: any
): Promise<string> {
  const { data: profile, error: profileError } = await supabase
    .from('user_profile_data')
    .select('*')
    .eq('clerk_user_id', userId)
    .single()

  const { data: insights, error: insightsError } = await supabase
    .from('user_insights')
    .select('*')
    .eq('clerk_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)

  // DEBUG LOGS - Memoria
  console.log('[MEMORY] Profile loaded:', profile ? {
    name: profile.name,
    life_phase: profile.life_phase,
    situation: profile.situation,
    mindset: profile.mindset,
    skills: profile.skills
  } : 'NONE', profileError?.message || '')
  console.log('[MEMORY] Insights loaded:', insights?.length || 0, 'items')
  if (insights?.length) {
    console.log('[MEMORY] Recent insights:', insights.map(i => `${i.category}:${i.content?.substring(0, 30)}`).join(' | '))
  }
  console.log('[MEMORY] Quest active:', quest?.id || quest?.quest_id || 'none')

  const prompt = NUR_SYSTEM_PROMPT
    .replace('{QUEST_STATUS}', buildQuestStatus(quest, profile))
    .replace('{PROFILE_STATUS}', buildProfileStatus(profile))
    .replace('{INSIGHTS_LIST}', buildInsightsList(insights || []))

  // Log token estimate
  const tokenEstimate = Math.ceil(prompt.length / 4)
  console.log('[NUR PROMPT] User:', userId, '| Tokens ~', tokenEstimate)

  return prompt
}
