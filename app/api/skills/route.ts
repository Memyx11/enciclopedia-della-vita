import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch skills with area
        const { data: skills, error } = await supabaseAdmin
            .from('skills')
            .select(`
                id,
                name,
                description,
                category,
                level,
                progress,
                life_areas(slug, name)
            `)
            .eq('clerk_user_id', userId)
            .order('level', { ascending: false })
            .order('name', { ascending: true })

        if (error) throw error

        // Fetch linked goals for each skill
        const { data: goalSkills } = await supabaseAdmin
            .from('goal_skills')
            .select(`
                skill_id,
                goals(id, title)
            `)
            .in('skill_id', skills?.map(s => s.id) || [])

        // Group goals by skill
        const skillGoalsMap = new Map<string, Array<{ id: string; title: string }>>()
        for (const gs of goalSkills || []) {
            const current = skillGoalsMap.get(gs.skill_id) || []
            const goal = gs.goals as any
            if (goal?.id && goal?.title) {
                current.push({ id: goal.id, title: goal.title })
            }
            skillGoalsMap.set(gs.skill_id, current)
        }

        // Format response
        const formattedSkills = skills?.map(skill => {
            const area = skill.life_areas as any

            // Map level string to number
            let levelNum = 1
            switch (skill.level) {
                case 'base': levelNum = 1; break
                case 'intermedio': levelNum = 2; break
                case 'avanzato': levelNum = 3; break
                case 'esperto': levelNum = 4; break
                case 'leggenda': levelNum = 5; break
            }

            return {
                id: skill.id,
                name: skill.name,
                description: skill.description,
                category: skill.category || 'altro',
                level: levelNum,
                progress: skill.progress || 0,
                area: area ? {
                    slug: area.slug,
                    name: area.name
                } : null,
                linked_goals: skillGoalsMap.get(skill.id) || []
            }
        }) || []

        return NextResponse.json({ skills: formattedSkills })
    } catch (error) {
        console.error('Skills API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
