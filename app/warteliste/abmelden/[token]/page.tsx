import type { Metadata } from "next"

import { WaitlistLinkAction } from "@/components/waitlist/link-action"

export const metadata: Metadata = {
  title: { absolute: "Von der Warteliste austragen | Revetly" },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

export default async function UnsubscribeWaitlistPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <WaitlistLinkAction kind="unsubscribe" token={decodeURIComponent(token)} />
}
