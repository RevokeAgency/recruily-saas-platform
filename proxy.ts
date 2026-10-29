import { NextResponse, type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/middleware'
import { PREVIEW_COOKIE, PREVIEW_MAX_AGE, launchGate, launchMode } from '@/lib/launch'

export async function proxy(request: NextRequest) {
  // Warteliste vor dem Start (lib/launch.ts): Startseite umleiten, Vorschau-
  // Cookie setzen, Registrierung schließen.
  const mode = launchMode()
  const gate = launchGate({
    mode,
    pathname: request.nextUrl.pathname,
    searchParams: request.nextUrl.searchParams,
    previewCookie: request.cookies.get(PREVIEW_COOKIE)?.value,
    previewToken: process.env.LAUNCH_PREVIEW_TOKEN,
  })

  if (gate.type === 'redirect') {
    const url = request.nextUrl.clone()
    url.pathname = gate.pathname
    url.search = gate.search
    const res = NextResponse.redirect(url)
    if (gate.cookie === 'set') {
      res.cookies.set(PREVIEW_COOKIE, process.env.LAUNCH_PREVIEW_TOKEN!.trim(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: PREVIEW_MAX_AGE,
      })
    }
    if (gate.cookie === 'clear') res.cookies.delete(PREVIEW_COOKIE)
    return res
  }

  if (gate.type === 'rewrite') {
    const url = request.nextUrl.clone()
    url.pathname = gate.pathname
    return NextResponse.rewrite(url)
  }

  return await updateSession(request, {
    // Ohne Registrierung führt der Weg für nicht angemeldete Besucher zum Login.
    loginPath: mode === 'waitlist' && !gate.preview ? '/?anmelden=1' : '/auth/register',
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
