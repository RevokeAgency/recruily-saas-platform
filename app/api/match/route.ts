import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { consumeMatch } from "@/lib/quota"
import { runIMLRSMatch } from "@/lib/matching/imlrs"

export async function POST(request: Request) {
  try {
    const { candidate, job } = await request.json()

    if (!candidate || !job) {
      return NextResponse.json(
        { error: "Missing candidate or job data" },
        { status: 400 }
      )
    }

    // Running the scorer costs one match — require auth and enforce the quota
    // so this route can't be used to bypass the counter.
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 })
    }

    const quota = await consumeMatch(supabase, user.id)
    if (!quota.allowed) {
      return NextResponse.json(
        { error: "match_limit_reached", used: quota.used, limit: quota.limit },
        { status: 403 }
      )
    }

    const match = await runIMLRSMatch(candidate, job)

    return NextResponse.json({ success: true, match })
  } catch (error) {
    console.error("IMLRS Match API Error:", error)
    return NextResponse.json(
      { error: "Failed to calculate IMLRS match" },
      { status: 500 }
    )
  }
}
