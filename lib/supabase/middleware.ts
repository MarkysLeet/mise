import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value }) =>
            supabaseResponse.cookies.set(name, value)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Public routes
  if (path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/auth') || path.startsWith('/privacy')) {
    return supabaseResponse
  }

  // If no user, redirect to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login' // Assuming /login exists, otherwise maybe /register
    return NextResponse.redirect(url)
  }

  // Check onboarding status from user_metadata
  const isOnboarded = user.user_metadata?.is_onboarded === true;

  // If user is NOT onboarded and trying to access protected areas, redirect to /onboarding
  if (!isOnboarded && path !== '/onboarding') {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  // If user IS onboarded and trying to access /onboarding, redirect to /dashboard
  if (isOnboarded && path === '/onboarding') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
