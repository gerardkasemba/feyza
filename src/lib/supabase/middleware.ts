import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
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
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname;

  // OPTIMIZATION: Only get user for protected routes
  // This avoids unnecessary auth checks on public pages
  const protectedPaths = [
    '/dashboard', '/loans', '/business', '/settings', 
    '/notifications', '/admin', '/profile', '/lender', '/borrower'
  ]
  
  const authPaths = [
    '/auth/signin', '/auth/signup', 
    '/auth/forgot-password', '/auth/reset-password'
  ]

  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  const isAuthPath = authPaths.some(path => pathname === path || pathname.startsWith(path))

  // Skip auth check if not needed
  if (!isProtectedPath && !isAuthPath) {
    return response
  }

  try {
    // OPTIMIZATION: Use getSession instead of getUser for faster checks
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('[Middleware] Session error:', sessionError.message)
      
      // Clear invalid cookies
      response.cookies.delete('sb-access-token')
      response.cookies.delete('sb-refresh-token')
      
      if (isProtectedPath) {
        const url = new URL('/auth/signin', request.url)
        url.searchParams.set('redirect', pathname)
        return NextResponse.redirect(url)
      }
      
      return response
    }

    // Protected routes - redirect if not authenticated
    if (!session && isProtectedPath) {
      const url = new URL('/auth/signin', request.url)
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    // Auth routes - redirect if already authenticated
    if (session && isAuthPath) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

  } catch (error) {
    console.error('[Middleware] Unexpected error:', error)
    // Don't crash on middleware errors
  }

  return response
}