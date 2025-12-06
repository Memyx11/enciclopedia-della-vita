/**
 * Tasks API
 * Endpoint per gestire tasks nelle life areas
 */

import { NextRequest, NextResponse } from 'next/server'
import {
    loadUserLifeAreas,
    addTaskToArea,
    toggleTaskCompletion,
    removeTaskFromArea,
    updateTask,
    setAreaGoal,
    generateProgressSummary
} from '@/lib/nur/goals'
import { AreaType } from '@/lib/nur/memory'

// GET - Ottieni tutte le life areas con tasks
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            return NextResponse.json(
                { error: 'userId richiesto' },
                { status: 400 }
            )
        }

        const areas = await loadUserLifeAreas(userId)

        return NextResponse.json({
            success: true,
            areas
        })
    } catch (error: any) {
        console.error('GET /api/tasks error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

// POST - Crea nuovo task o goal
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { action, userId, areaType, ...data } = body

        if (!userId || !areaType) {
            return NextResponse.json(
                { error: 'userId e areaType richiesti' },
                { status: 400 }
            )
        }

        switch (action) {
            case 'add_task': {
                const { title, description, priority = 'medium', due_date } = data
                if (!title) {
                    return NextResponse.json(
                        { error: 'title richiesto per il task' },
                        { status: 400 }
                    )
                }

                const task = await addTaskToArea(userId, areaType as AreaType, {
                    title,
                    description,
                    priority,
                    due_date
                })

                if (!task) {
                    return NextResponse.json(
                        { error: 'Impossibile aggiungere il task' },
                        { status: 500 }
                    )
                }

                return NextResponse.json({
                    success: true,
                    task
                })
            }

            case 'set_goal': {
                const { title, description, target_date, milestones } = data
                if (!title) {
                    return NextResponse.json(
                        { error: 'title richiesto per il goal' },
                        { status: 400 }
                    )
                }

                const success = await setAreaGoal(userId, areaType as AreaType, {
                    title,
                    description,
                    target_date,
                    milestones
                })

                if (!success) {
                    return NextResponse.json(
                        { error: 'Impossibile impostare il goal' },
                        { status: 500 }
                    )
                }

                return NextResponse.json({ success: true })
            }

            default:
                return NextResponse.json(
                    { error: 'Action non valida. Usa: add_task, set_goal' },
                    { status: 400 }
                )
        }
    } catch (error: any) {
        console.error('POST /api/tasks error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

// PATCH - Aggiorna task (toggle completion, modifica)
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json()
        const { action, userId, areaType, taskId, ...data } = body

        if (!userId || !areaType || !taskId) {
            return NextResponse.json(
                { error: 'userId, areaType e taskId richiesti' },
                { status: 400 }
            )
        }

        switch (action) {
            case 'toggle': {
                const { completed } = data
                if (completed === undefined) {
                    return NextResponse.json(
                        { error: 'completed richiesto' },
                        { status: 400 }
                    )
                }

                const success = await toggleTaskCompletion(
                    userId,
                    areaType as AreaType,
                    taskId,
                    completed
                )

                if (!success) {
                    return NextResponse.json(
                        { error: 'Impossibile aggiornare il task' },
                        { status: 500 }
                    )
                }

                return NextResponse.json({ success: true })
            }

            case 'update': {
                const success = await updateTask(
                    userId,
                    areaType as AreaType,
                    taskId,
                    data
                )

                if (!success) {
                    return NextResponse.json(
                        { error: 'Impossibile aggiornare il task' },
                        { status: 500 }
                    )
                }

                return NextResponse.json({ success: true })
            }

            default:
                return NextResponse.json(
                    { error: 'Action non valida. Usa: toggle, update' },
                    { status: 400 }
                )
        }
    } catch (error: any) {
        console.error('PATCH /api/tasks error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

// DELETE - Rimuovi task
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')
        const areaType = searchParams.get('areaType')
        const taskId = searchParams.get('taskId')

        if (!userId || !areaType || !taskId) {
            return NextResponse.json(
                { error: 'userId, areaType e taskId richiesti' },
                { status: 400 }
            )
        }

        const success = await removeTaskFromArea(
            userId,
            areaType as AreaType,
            taskId
        )

        if (!success) {
            return NextResponse.json(
                { error: 'Impossibile rimuovere il task' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('DELETE /api/tasks error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}
