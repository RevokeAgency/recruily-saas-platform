import type { Metadata } from "next"

import { AuthSplitLayout } from "@/components/auth/auth-split-layout"
import { InviteAccept } from "@/components/team/invite-accept"
import { createClient } from "@/lib/supabase/server"
import { inviteState, plausibleInviteToken } from "@/lib/team/model"
import { inviteByToken, invitePreview, teamDb } from "@/lib/team/store"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Einladung ins Team | Revetly",
  robots: { index: false, follow: false },
}

/**
 * Einladungslink aus der Mail. Zeigt, wer einlädt, und führt je nach Lage zu
 * Anmelden, Konto anlegen oder direkt zum Beitreten.
 */
export default async function TeamInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const db = teamDb()
  const invite = db && plausibleInviteToken(token) ? await inviteByToken(db, token) : null

  const state = inviteState(invite)

  const preview = invite && db && state === "open" ? await invitePreview(db, invite) : null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <AuthSplitLayout>
      <InviteAccept
        token={token}
        state={state}
        company={preview?.company ?? null}
        inviter={preview?.inviter ?? null}
        inviteEmail={preview?.email ?? null}
        signedInEmail={user?.email ?? null}
      />
    </AuthSplitLayout>
  )
}
