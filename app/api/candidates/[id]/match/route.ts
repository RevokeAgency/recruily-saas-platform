import { createClient } from "@/lib/supabase/server"
import { linkCandidateToJob, scoreLinkInBackground } from "@/lib/matching/link"
import { getWorkspace } from "@/lib/workspace"

export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params
    const supabase = await createClient()
    const body = await req.json()
    const { jobId } = body

    if (!jobId) {
      return Response.json({ error: "jobId is required" }, { status: 400 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: "Nicht authentifiziert" }, { status: 401 })
    }
    const { ownerId } = await getWorkspace(supabase, user.id)

    // Prüfen, Match verbrauchen, verknüpfen (lib/matching/link.ts), dann im
    // Hintergrund matchen.
    const result = await linkCandidateToJob(supabase, { ownerId, jobId, candidateId })
    if (!result.ok) return Response.json(result.body, { status: result.status })

    scoreLinkInBackground(result.linkId)

    return Response.json({
      success: true,
      linkId: result.linkId,
      message: "Matching wird gestartet...",
    })
  } catch (error) {
    console.error("Error in match API:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
