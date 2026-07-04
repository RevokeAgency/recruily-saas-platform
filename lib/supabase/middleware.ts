import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase isn't configured in this environment, skip auth handling
  // so public pages still render instead of throwing.
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public job pages live at /jobs/<company-slug>/<job-slug> (two extra
  // segments) and must stay reachable for applicants without an account.
  // The authenticated app uses /jobs, /jobs/new and /jobs/<id> (one segment).
  const segments = pathname.split('/').filter(Boolean)
  const isPublicJobPage = segments[0] === 'jobs' && segments.length >= 3

  // Protected routes - redirect to register if not authenticated
  const protectedRoutes = ['/dashboard', '/jobs', '/candidates', '/subscription', '/settings', '/inbox', '/onboarding']
  const isProtectedRoute = !isPublicJobPage && protectedRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/register'
    return NextResponse.redirect(url)
  }

  // Auth routes - redirect to dashboard if already authenticated
  const authRoutes = ['/auth/register', '/auth/reset', '/auth/error']
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
