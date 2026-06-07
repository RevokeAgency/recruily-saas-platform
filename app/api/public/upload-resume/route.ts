import { createClient } from "@supabase/supabase-js"
import { NextRequest } from "next/server"

// Service-role client — used to upload public application CVs to a private bucket.
function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  return createClient(url, key, { auth: { persistSession: false } })
}

const BUCKET = "resumes"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const jobId = formData.get("jobId") as string | null

    if (!file) {
      return Response.json({ error: "Keine Datei" }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Ensure the bucket exists (private). Ignore "already exists" errors.
    await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => null)

    const ext = file.name.split(".").pop() || "pdf"
    const path = `${jobId || "unknown"}/${crypto.randomUUID()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      })

    if (uploadError) {
      console.error("[v0] Resume upload failed:", uploadError)
      return Response.json({ error: "Upload fehlgeschlagen" }, { status: 500 })
    }

    return Response.json({ success: true, path })
  } catch (error) {
    console.error("[v0] Error in upload-resume:", error)
    return Response.json({ error: "Interner Serverfehler" }, { status: 500 })
  }
}
