import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { awardXp } from '@/lib/gamification/xp'
import { updateStreak } from '@/lib/gamification/streak'
import { checkAllAchievements } from '@/lib/gamification/achievements'

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { taskId } = await req.json()

        if (!taskId) {
            return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
        }

        // Get task
        const { data: task, error: fetchError } = await supabaseAdmin
            .from('tasks')
            .select('*, goal:goals(id, title)')
            .eq('id', taskId)
            .eq('clerk_user_id', userId)
            .single()

        if (fetchError || !task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        if (task.status === 'completed') {
            return NextResponse.json({ error: 'Task already completed' }, { status: 400 })
        }

        // Mark as completed
        const { error: updateError } = await supabaseAdmin
            .from('tasks')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', taskId)

        if (updateError) {
            throw updateError
        }

        // Award XP
        const activityType = task.is_boss_task ? 'boss_task_completed' : 'task_completed'
        const xpResult = await awardXp(
            userId,
            task.xp_reward,
            activityType,
            `Task: ${task.title}`
        )

        // Update streak
        await updateStreak(userId)

        // Update goal progress if linked
        if (task.goal_id) {
            await updateGoalProgress(task.goal_id)
        }

        // Check achievements
        await checkAllAchievements(userId)

        return NextResponse.json({
            success: true,
            xpAwarded: task.xp_reward,
            leveledUp: xpResult.leveledUp || false,
            newLevel: xpResult.newLevel
        })

    } catch (error) {
        console.error('Task complete error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

async function updateGoalProgress(goalId: string): Promise<void> {
    try {
        // Get all tasks for this goal
        const { data: tasks } = await supabaseAdmin
            .from('tasks')
            .select('status')
            .eq('goal_id', goalId)

        if (!tasks || tasks.length === 0) return

        const completed = tasks.filter(t => t.status === 'completed').length
        const progress = Math.floor((completed / tasks.length) * 100)

        await supabaseAdmin
            .from('goals')
            .update({ progress })
            .eq('id', goalId)
    } catch (error) {
        console.error('Error updating goal progress:', error)
    }
}
