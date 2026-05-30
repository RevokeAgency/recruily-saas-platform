import { NextResponse } from "next/server"
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

    const match = await runIMLRSMatch(candidate, job)

    return NextResponse.json({
      success: true,
      match,
    })
  } catch (error) {
    console.error("IMLRS Match API Error:", error)
    return NextResponse.json(
      { error: "Failed to calculate IMLRS match" },
      { status: 500 }
    )
  }
}
