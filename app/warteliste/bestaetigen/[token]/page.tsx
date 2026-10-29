import type { Metadata } from "next"

import { WaitlistLinkAction } from "@/components/waitlist/link-action"

export const metadata: Metadata = {
  title: { absolute: "Eintrag bestätigen | Revetly" },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

export default async function ConfirmWaitlistPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <WaitlistLinkAction kind="confirm" token={token} />
}
