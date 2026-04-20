import { createClient } from "@/lib/supabase/server"
import { NextRequest } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: job, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching job:", error)
      return Response.json(
        { error: "Job nicht gefunden" },
        { status: 404 }
      )
    }

    return Response.json({ job })
  } catch (error) {
    console.error("Error:", error)
    return Response.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    )
  }
}
