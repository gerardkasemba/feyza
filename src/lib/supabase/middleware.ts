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

  try {
    // Get user with session refresh
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Handle refresh token errors specifically
    if (userError) {
      // Only log for page requests, not for static assets or API debug calls
      if (!pathname.includes('_next') && !pathname.includes('.') && !pathname.startsWith('/api/debug')) {
        console.error('[Middleware] Auth error:', userError.message, 'Path:', pathname)
      }
      
      // Clear invalid auth cookies
      response.cookies.delete('sb-access-token')
      response.cookies.delete('sb-refresh-token')
      response.cookies.delete('sb-provider-token')
      
      // Only redirect to login for protected routes
      const protectedPaths = [
        '/dashboard', '/loans', '/business', '/settings', 
        '/notifications', '/admin', '/profile', '/payments'
      ]
      const isProtectedPath = protectedPaths.some(path => 
        pathname.startsWith(path)
      )
      
      if (isProtectedPath) {
        console.log('[Middleware] Redirecting to signin (protected path, no auth):', pathname)
        const url = new URL('/auth/signin', request.url)
        url.searchParams.set('redirect', pathname)
        return NextResponse.redirect(url)
      }
      
      return response
    }

    // Protected routes - redirect to signin if not authenticated
    const protectedPaths = [
      '/dashboard', '/loans', '/business', '/settings', 
      '/notifications', '/admin', '/profile', '/payments'
    ]
    const isProtectedPath = protectedPaths.some(path => 
      pathname.startsWith(path)
    )

    if (!user && isProtectedPath) {
      console.log('[Middleware] No user, redirecting to signin:', pathname)
      const url = new URL('/auth/signin', request.url)
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    // Auth routes - redirect to dashboard if already authenticated
    const authPaths = [
      '/auth/signin', '/auth/signup', 
      '/auth/forgot-password', '/auth/reset-password'
    ]
    const isAuthPath = authPaths.some(path => 
      pathname === path || pathname.startsWith(path)
    )

    if (user && isAuthPath) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Log successful auth for fund page specifically
    if (pathname.includes('/fund')) {
      console.log('[Middleware] ✅ Auth OK for fund page, user:', user?.id)
    }

  } catch (error) {
    console.error('[Middleware] Unexpected error:', error)
    // Don't crash on middleware errors
  }

  return response
}
