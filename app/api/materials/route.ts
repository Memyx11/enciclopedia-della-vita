import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch materials
        const { data: materials, error } = await supabaseAdmin
            .from('materials')
            .select('*')
            .eq('clerk_user_id', userId)
            .order('is_owned', { ascending: false })
            .order('rarity', { ascending: false })
            .order('name', { ascending: true })

        if (error) throw error

        // Fetch linked goals for each material
        const { data: goalMaterials } = await supabaseAdmin
            .from('goal_materials')
            .select(`
                material_id,
                goals(id, title)
            `)
            .in('material_id', materials?.map(m => m.id) || [])

        // Group goals by material
        const materialGoalsMap = new Map<string, Array<{ id: string; title: string }>>()
        for (const gm of goalMaterials || []) {
            const current = materialGoalsMap.get(gm.material_id) || []
            const goal = gm.goals as any
            if (goal?.id && goal?.title) {
                current.push({ id: goal.id, title: goal.title })
            }
            materialGoalsMap.set(gm.material_id, current)
        }

        // Format response
        const formattedMaterials = materials?.map(material => ({
            id: material.id,
            name: material.name,
            description: material.description,
            category: material.category || 'altro',
            rarity: material.rarity,
            is_owned: material.is_owned,
            progress: material.progress || (material.is_owned ? 100 : 0),
            acquired_at: material.acquired_at,
            linked_goals: materialGoalsMap.get(material.id) || []
        })) || []

        return NextResponse.json({ materials: formattedMaterials })
    } catch (error) {
        console.error('Materials API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
