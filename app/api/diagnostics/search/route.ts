import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function expandedPattern(q: string) {
  // Build %a%s%d%f% pattern safely
  return `%${q.split('').join('%')}%`
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  if (!q) return NextResponse.json({ error: 'q required' }, { status: 400 })

  const qExpanded = expandedPattern(q)

  const { data, error } = await (supabase as any).rpc('diagnose_search', {
    user_uuid: user.id,
    q,
    q_expanded: qExpanded,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    query: q,
    expanded: qExpanded,
    diagnostics: data?.[0] || null,
  })
}
