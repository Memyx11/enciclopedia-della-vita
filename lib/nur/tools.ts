/**
 * NUR TOOLS SYSTEM
 * Basato sul Master Document - Parte 8
 * Formato: [TOOL:nome]{json}[/TOOL]
 */

import { supabase } from '@/lib/supabase'

interface ToolResult {
  success: boolean
  message: string
  data?: any
}

async function saveInsight(userId: string, params: {
  type: string
  content: string
  importance?: number
}): Promise<ToolResult> {
  const { error } = await supabase
    .from('user_insights')
    .insert({
      clerk_user_id: userId,
      category: params.type,
      content: params.content,
      importance: params.importance || 7,
      used_for_mission: false
    })

  if (error) {
    console.error('[TOOL:save_insight] Error:', error)
    return { success: false, message: error.message }
  }
  console.log('[TOOL:save_insight] Saved:', params.type, '-', params.content)
  return { success: true, message: 'Insight salvato' }
}

async function updateProfile(userId: string, params: {
  life_phase?: string
  situation?: string
  mindset?: string
  skill?: string
  name?: string
}): Promise<ToolResult> {
  const { data: existing } = await supabase
    .from('user_profile_data')
    .select('*')
    .eq('clerk_user_id', userId)
    .single()

  const updates: any = {}
  if (params.life_phase) updates.life_phase = params.life_phase
  if (params.mindset) updates.mindset = params.mindset
  if (params.name) updates.name = params.name
  
  if (params.situation) {
    const currentSituation = existing?.situation || []
    if (!currentSituation.includes(params.situation)) {
      updates.situation = [...currentSituation, params.situation]
    }
  }
  
  if (params.skill) {
    const currentSkills = existing?.skills || []
    if (!currentSkills.includes(params.skill)) {
      updates.skills = [...currentSkills, params.skill]
    }
  }

  if (Object.keys(updates).length === 0) {
    return { success: true, message: 'Nessun aggiornamento' }
  }

  const { error } = await supabase
    .from('user_profile_data')
    .upsert({ clerk_user_id: userId, ...updates, updated_at: new Date().toISOString() })

  if (error) return { success: false, message: error.message }
  console.log('[TOOL:update_profile] Updated:', updates)
  return { success: true, message: 'Profilo aggiornato', data: updates }
}

async function completeQuest(userId: string, params: { quest_id: string }): Promise<ToolResult> {
  const { data: canComplete } = await supabase.rpc('check_quest_completion', {
    p_clerk_user_id: userId, p_quest_id: params.quest_id
  })
  if (!canComplete) return { success: false, message: 'Requisiti non soddisfatti' }

  const { data: quest } = await supabase
    .from('game_quests')
    .select('xp_reward, title')
    .eq('id', params.quest_id)
    .single()
  if (!quest) return { success: false, message: 'Quest non trovata' }

  await supabase.from('user_quest_progress').update({
    status: 'completed', completed_at: new Date().toISOString(), xp_awarded: quest.xp_reward
  }).eq('clerk_user_id', userId).eq('quest_id', params.quest_id)

  await supabase.rpc('add_xp', {
    p_clerk_user_id: userId, p_amount: quest.xp_reward,
    p_reason: 'Quest: ' + quest.title, p_source_type: 'quest'
  })
  await supabase.rpc('unlock_next_quests', { p_clerk_user_id: userId, p_completed_quest_id: params.quest_id })

  console.log('[TOOL:complete_quest]', params.quest_id, '+', quest.xp_reward, 'XP')
  return { success: true, message: 'Quest completata! +' + quest.xp_reward + ' XP', data: { xp: quest.xp_reward } }
}

async function awardXp(userId: string, params: { amount: number, reason: string }): Promise<ToolResult> {
  const { error } = await supabase.rpc('add_xp', {
    p_clerk_user_id: userId, p_amount: params.amount, p_reason: params.reason, p_source_type: 'bonus'
  })
  if (error) return { success: false, message: error.message }
  return { success: true, message: '+' + params.amount + ' XP' }
}

async function createMission(userId: string, params: {
  title: string, description: string, area: string, duration_days?: number
}): Promise<ToolResult> {
  const { data, error } = await supabase.from('user_missions').insert({
    clerk_user_id: userId, title: params.title, description: params.description,
    area: params.area, status: 'active', duration_days: params.duration_days || 14,
    start_date: new Date().toISOString().split('T')[0], progress: 0
  }).select().single()
  if (error) return { success: false, message: error.message }
  return { success: true, message: 'Missione creata!', data }
}

async function addRoutineTask(userId: string, params: {
  mission_id?: string, title: string, difficulty: string, time?: string, frequency?: string
}): Promise<ToolResult> {
  const xpMap: Record<string, number> = { facile: 30, media: 60, difficile: 100, epica: 200 }
  const { error } = await supabase.from('mission_tasks').insert({
    clerk_user_id: userId, mission_id: params.mission_id, title: params.title,
    difficulty: params.difficulty, xp_reward: xpMap[params.difficulty] || 60,
    scheduled_time: params.time, frequency: params.frequency || 'daily'
  })
  if (error) return { success: false, message: error.message }
  return { success: true, message: 'Task aggiunta (+' + (xpMap[params.difficulty] || 60) + ' XP/giorno)' }
}

export function parseToolCalls(text: string): Array<{tool: string, params: any}> {
  const regex = /\[TOOL:(\w+)\]([\s\S]*?)\[\/TOOL\]/g
  const calls: Array<{tool: string, params: any}> = []
  let match
  while ((match = regex.exec(text)) !== null) {
    try {
      calls.push({ tool: match[1], params: JSON.parse(match[2].trim()) })
    } catch (e) {
      console.error('[TOOL PARSER] Invalid JSON:', match[1])
    }
  }
  return calls
}

export async function executeToolCalls(userId: string, toolCalls: Array<{tool: string, params: any}>): Promise<ToolResult[]> {
  console.log('[TOOLS] Executing', toolCalls.length, 'tools for user', userId)
  const results: ToolResult[] = []

  for (const call of toolCalls) {
    console.log('[TOOLS] Executing:', call.tool, JSON.stringify(call.params))
    let result: ToolResult

    switch (call.tool) {
      case 'save_insight':
        result = await saveInsight(userId, call.params)
        break
      case 'update_profile':
        result = await updateProfile(userId, call.params)
        break
      case 'complete_quest':
        console.log('[TOOLS] === COMPLETING QUEST ===', call.params.quest_id)
        result = await completeQuest(userId, call.params)
        console.log('[TOOLS] Quest completion result:', result.success, result.message)
        break
      case 'award_xp':
        result = await awardXp(userId, call.params)
        break
      case 'create_mission':
        result = await createMission(userId, call.params)
        break
      case 'add_routine_task':
        result = await addRoutineTask(userId, call.params)
        break
      default:
        result = { success: false, message: 'Tool sconosciuto: ' + call.tool }
    }

    console.log('[TOOLS] Result:', call.tool, '->', result.success ? 'OK' : 'FAIL', result.message)
    results.push(result)
  }

  return results
}

export function cleanToolCalls(text: string): string {
  return text.replace(/\[TOOL:\w+\][\s\S]*?\[\/TOOL\]/g, '').trim()
}
