/**
 * Routine API - Gestione routine e task giornaliere
 */

import { NextRequest, NextResponse } from 'next/server'
import {
    getRoutineTasksForDay,
    addRoutineTask,
    completeRoutineTask,
    getDayTaskLog,
    saveRoutineTemplate,
    getAreaObjectives,
    createAreaObjective,
    getLifeAreas
} from '@/lib/quest-system'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/routine
 * Ottiene routine per un giorno specifico
 *
 * Query params:
 * - userId: string
 * - date: string (YYYY-MM-DD) - default: oggi
 * - template: true → ottiene template settimanale
 * - areas: true → include configurazione aree
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')
        const dateStr = searchParams.get('date')
        const getTemplate = searchParams.get('template') === 'true'
        const getAreas = searchParams.get('areas') === 'true'
        const getObjectives = searchParams.get('objectives') === 'true'
        const areaId = searchParams.get('areaId')

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 })
        }

        // Ottieni aree
        if (getAreas) {
            const areas = await getLifeAreas()
            return NextResponse.json({ areas })
        }

        // Ottieni obiettivi
        if (getObjectives) {
            const objectives = await getAreaObjectives(userId, areaId || undefined)
            return NextResponse.json({ objectives })
        }

        // Ottieni template settimanale
        if (getTemplate) {
            const { data: template } = await supabase
                .from('user_routine_template')
                .select('*')
                .eq('clerk_user_id', userId)
                .order('day_of_week', { ascending: true })

            return NextResponse.json({ template: template || [] })
        }

        // Ottieni routine per il giorno
        const date = dateStr ? new Date(dateStr) : new Date()
        const dayOfWeek = date.getDay() // 0=dom, 1=lun...
        const dateFormatted = date.toISOString().split('T')[0]

        // Task programmate per questo giorno
        const tasks = await getRoutineTasksForDay(userId, dayOfWeek)

        // Log completamenti per questo giorno
        const taskLog = await getDayTaskLog(userId, dateFormatted)
        const logMap = new Map(taskLog.map(l => [l.routine_task_id, l]))

        // Combina task con stato completamento
        const tasksWithStatus = tasks.map(task => ({
            ...task,
            log: logMap.get(task.id),
            status: logMap.get(task.id)?.status || 'pending'
        }))

        // Template del giorno (obblighi)
        const { data: dayTemplate } = await supabase
            .from('user_routine_template')
            .select('*')
            .eq('clerk_user_id', userId)
            .eq('day_of_week', dayOfWeek)
            .single()

        // Calcola statistiche giorno
        const completed = tasksWithStatus.filter(t => t.status === 'completed').length
        const totalXp = tasksWithStatus
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => sum + (t.log?.xp_earned || 0), 0)

        return NextResponse.json({
            date: dateFormatted,
            day_of_week: dayOfWeek,
            tasks: tasksWithStatus,
            template: dayTemplate || null,
            stats: {
                total: tasks.length,
                completed,
                pending: tasks.length - completed,
                completion_percent: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
                xp_earned: totalXp
            }
        })

    } catch (error: any) {
        console.error('Routine GET error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * POST /api/routine
 * Gestione routine e task
 *
 * Body:
 * - action: 'add_task' | 'complete_task' | 'save_template' | 'add_objective' | 'update_task'
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { action, userId } = body

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 })
        }

        switch (action) {
            case 'add_task': {
                const {
                    areaId,
                    title,
                    scheduledTime,
                    durationMinutes,
                    frequency,
                    frequencyDays,
                    difficulty,
                    objectiveId
                } = body

                if (!areaId || !title) {
                    return NextResponse.json({ error: 'areaId and title required' }, { status: 400 })
                }

                const task = await addRoutineTask(
                    userId,
                    areaId,
                    title,
                    scheduledTime,
                    durationMinutes || 30,
                    frequency || 'daily',
                    frequencyDays || [],
                    difficulty || 'media',
                    objectiveId
                )

                return NextResponse.json({ success: !!task, task })
            }

            case 'complete_task': {
                const { taskId, date } = body

                if (!taskId) {
                    return NextResponse.json({ error: 'taskId required' }, { status: 400 })
                }

                const dateStr = date || new Date().toISOString().split('T')[0]
                const result = await completeRoutineTask(userId, taskId, dateStr)

                return NextResponse.json(result)
            }

            case 'skip_task': {
                const { taskId, date } = body

                if (!taskId) {
                    return NextResponse.json({ error: 'taskId required' }, { status: 400 })
                }

                const dateStr = date || new Date().toISOString().split('T')[0]

                const { error } = await supabase
                    .from('daily_task_log')
                    .upsert({
                        clerk_user_id: userId,
                        routine_task_id: taskId,
                        scheduled_date: dateStr,
                        status: 'skipped'
                    }, {
                        onConflict: 'clerk_user_id,routine_task_id,scheduled_date'
                    })

                return NextResponse.json({ success: !error })
            }

            case 'save_template': {
                const { dayOfWeek, wakeTime, sleepTime, obligations } = body

                if (dayOfWeek === undefined) {
                    return NextResponse.json({ error: 'dayOfWeek required' }, { status: 400 })
                }

                const success = await saveRoutineTemplate(
                    userId,
                    dayOfWeek,
                    wakeTime,
                    sleepTime,
                    obligations || []
                )

                return NextResponse.json({ success })
            }

            case 'add_objective': {
                const { areaId, title, description, why, targetDate, priority } = body

                if (!areaId || !title) {
                    return NextResponse.json({ error: 'areaId and title required' }, { status: 400 })
                }

                const objective = await createAreaObjective(
                    userId,
                    areaId,
                    title,
                    description,
                    why,
                    targetDate,
                    priority || 5
                )

                return NextResponse.json({ success: !!objective, objective })
            }

            case 'update_task': {
                const { taskId, updates } = body

                if (!taskId || !updates) {
                    return NextResponse.json({ error: 'taskId and updates required' }, { status: 400 })
                }

                const { error } = await supabase
                    .from('routine_tasks')
                    .update(updates)
                    .eq('id', taskId)
                    .eq('clerk_user_id', userId)

                return NextResponse.json({ success: !error })
            }

            case 'delete_task': {
                const { taskId } = body

                if (!taskId) {
                    return NextResponse.json({ error: 'taskId required' }, { status: 400 })
                }

                const { error } = await supabase
                    .from('routine_tasks')
                    .delete()
                    .eq('id', taskId)
                    .eq('clerk_user_id', userId)

                return NextResponse.json({ success: !error })
            }

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }

    } catch (error: any) {
        console.error('Routine POST error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
