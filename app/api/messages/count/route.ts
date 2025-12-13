import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase.rpc('get_message_count', {
    p_clerk_user_id: userId
  })

  if (error) {
    // Fallback se RPC non esiste
    const { data: countData } = await supabase
      .from('user_daily_messages')
      .select('count')
      .eq('clerk_user_id', userId)
      .eq('date', new Date().toISOString().split('T')[0])
      .single()

    return NextResponse.json({
      count: countData?.count || 0,
      limit: 20,
      remaining: 20 - (countData?.count || 0)
    })
  }

  return NextResponse.json(data || { count: 0, limit: 20, remaining: 20 })
}
