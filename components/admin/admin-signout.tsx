"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { createClient } from "@/lib/supabase/client"

export function AdminSignOut() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={async () => {
        await createClient().auth.signOut()
        router.refresh()
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--app-line)] bg-white px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <LogOut className="h-4 w-4" />
      Abmelden
    </button>
  )
}
