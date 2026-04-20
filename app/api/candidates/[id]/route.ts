import { createClient } from "@/lib/supabase/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: candidate, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      return Response.json({ error: "Kandidat nicht gefunden" }, { status: 404 })
    }

    return Response.json({ candidate })
  } catch (error) {
    console.error("Error fetching candidate:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from("candidates")
      .delete()
      .eq("id", id)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("Error deleting candidate:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
