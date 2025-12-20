import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch goals with area info
        const { data: goals, error: goalsError } = await supabaseAdmin
            .from('goals')
            .select(`
                id,
                title,
                description,
                type,
                status,
                progress,
                is_primary,
                xp_reward,
                life_areas(slug, name)
            `)
            .eq('clerk_user_id', userId)
            .order('is_primary', { ascending: false })
            .order('status', { ascending: true })
            .order('created_at', { ascending: false })

        if (goalsError) throw goalsError

        // Fetch tasks count per goal
        const { data: taskCounts } = await supabaseAdmin
            .from('tasks')
            .select('goal_id, status')
            .eq('clerk_user_id', userId)
            .in('goal_id', goals?.map(g => g.id) || [])

        // Group task counts
        const taskCountMap = new Map<string, { total: number; completed: number }>()
        for (const task of taskCounts || []) {
            if (!task.goal_id) continue
            const current = taskCountMap.get(task.goal_id) || { total: 0, completed: 0 }
            current.total++
            if (task.status === 'completed') current.completed++
            taskCountMap.set(task.goal_id, current)
        }

        // Fetch dependencies
        const { data: dependencies } = await supabaseAdmin
            .from('goal_dependencies')
            .select(`
                goal_id,
                dependency_type,
                required_goal:required_goal_id(id, title, status),
                required_skill:required_skill_id(id, name, level),
                required_material:required_material_id(id, name, is_owned)
            `)
            .in('goal_id', goals?.map(g => g.id) || [])

        // Group dependencies by goal
        const depsMap = new Map<string, Array<{
            type: string
            target_title: string
            satisfied: boolean
        }>>()

        for (const dep of dependencies || []) {
            const current = depsMap.get(dep.goal_id) || []

            if (dep.required_goal) {
                const goal = dep.required_goal as any
                current.push({
                    type: 'Goal',
                    target_title: goal.title,
                    satisfied: goal.status === 'completed'
                })
            }
            if (dep.required_skill) {
                const skill = dep.required_skill as any
                current.push({
                    type: 'Skill',
                    target_title: skill.name,
                    satisfied: skill.level >= 1 // Basic check
                })
            }
            if (dep.required_material) {
                const material = dep.required_material as any
                current.push({
                    type: 'Materiale',
                    target_title: material.name,
                    satisfied: material.is_owned
                })
            }

            depsMap.set(dep.goal_id, current)
        }

        // Fetch what each goal unlocks
        const { data: unlocks } = await supabaseAdmin
            .from('goal_dependencies')
            .select(`
                required_goal_id,
                goals!goal_dependencies_goal_id_fkey(title)
            `)
            .in('required_goal_id', goals?.map(g => g.id) || [])

        const unlocksMap = new Map<string, string[]>()
        for (const unlock of unlocks || []) {
            if (!unlock.required_goal_id) continue
            const current = unlocksMap.get(unlock.required_goal_id) || []
            const goal = unlock.goals as any
            if (goal?.title) current.push(goal.title)
            unlocksMap.set(unlock.required_goal_id, current)
        }

        // Fetch areas with goal counts
        const { data: areas } = await supabaseAdmin
            .from('life_areas')
            .select('slug, name, progress')
            .eq('clerk_user_id', userId)
            .order('priority', { ascending: false })

        // Count goals per area
        const areaGoalCounts = new Map<string, number>()
        for (const goal of goals || []) {
            const area = goal.life_areas as any
            if (area?.slug) {
                areaGoalCounts.set(area.slug, (areaGoalCounts.get(area.slug) || 0) + 1)
            }
        }

        // Format response
        const formattedGoals = goals?.map(goal => {
            const area = goal.life_areas as any
            const counts = taskCountMap.get(goal.id) || { total: 0, completed: 0 }

            return {
                id: goal.id,
                title: goal.title,
                description: goal.description,
                type: goal.type,
                status: goal.status,
                progress: goal.progress,
                is_primary: goal.is_primary,
                xp_reward: goal.xp_reward,
                area: {
                    slug: area?.slug || '',
                    name: area?.name || ''
                },
                tasks_count: counts.total,
                tasks_completed: counts.completed,
                dependencies: depsMap.get(goal.id) || [],
                unlocks: unlocksMap.get(goal.id) || []
            }
        }) || []

        const formattedAreas = areas?.map(area => ({
            slug: area.slug,
            name: area.name,
            goals_count: areaGoalCounts.get(area.slug) || 0,
            progress: area.progress
        })) || []

        return NextResponse.json({
            goals: formattedGoals,
            areas: formattedAreas
        })
    } catch (error) {
        console.error('Goals API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
