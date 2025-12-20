import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const today = new Date().toISOString().split('T')[0]

        // Fetch all data in parallel
        const [
            profileResult,
            areasResult,
            primaryGoalResult,
            todayTasksResult,
            currentActivityResult
        ] = await Promise.all([
            // Profile
            supabaseAdmin
                .from('profiles')
                .select('full_name, xp, streak_days, lives')
                .eq('clerk_user_id', userId)
                .single(),

            // Areas
            supabaseAdmin
                .from('life_areas')
                .select('slug, name, progress, has_primary_goal')
                .eq('clerk_user_id', userId)
                .order('priority', { ascending: false }),

            // Primary goal
            supabaseAdmin
                .from('goals')
                .select('title, progress, life_areas(name)')
                .eq('clerk_user_id', userId)
                .eq('is_primary', true)
                .eq('status', 'active')
                .single(),

            // Today's tasks
            supabaseAdmin
                .from('tasks')
                .select('id, title, status, is_boss_task, xp_reward, goals(title)')
                .eq('clerk_user_id', userId)
                .eq('scheduled_date', today)
                .order('is_boss_task', { ascending: false })
                .order('created_at', { ascending: true }),

            // Current activity
            supabaseAdmin
                .from('current_activities')
                .select('title, started_at, planned_duration_minutes')
                .eq('clerk_user_id', userId)
                .eq('is_active', true)
                .single()
        ])

        // Format response
        const response = {
            profile: profileResult.data || {
                full_name: null,
                xp: 0,
                streak_days: 0,
                lives: 3
            },
            areas: areasResult.data || [],
            primaryGoal: primaryGoalResult.data ? {
                title: primaryGoalResult.data.title,
                progress: primaryGoalResult.data.progress,
                area_name: (primaryGoalResult.data.life_areas as any)?.name || ''
            } : null,
            todayTasks: (todayTasksResult.data || []).map(task => ({
                id: task.id,
                title: task.title,
                status: task.status,
                is_boss_task: task.is_boss_task,
                xp_reward: task.xp_reward,
                goal_title: (task.goals as any)?.title
            })),
            currentActivity: currentActivityResult.data || null
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Dashboard API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
