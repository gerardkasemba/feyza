import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

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
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  try {
    // Get user with session refresh
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Handle refresh token errors specifically
    if (userError) {
      console.error('Auth error in middleware:', userError.message)
      
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
        request.nextUrl.pathname.startsWith(path)
      )
      
      if (isProtectedPath) {
        const url = new URL('/auth/signin', request.url)
        url.searchParams.set('redirect', request.nextUrl.pathname)
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
      request.nextUrl.pathname.startsWith(path)
    )

    if (!user && isProtectedPath) {
      const url = new URL('/auth/signin', request.url)
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    // Auth routes - redirect to dashboard if already authenticated
    const authPaths = [
      '/auth/signin', '/auth/signup', 
      '/auth/forgot-password', '/auth/reset-password'
    ]
    const isAuthPath = authPaths.some(path => 
      request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path)
    )

    if (user && isAuthPath) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

  } catch (error) {
    console.error('Unexpected error in middleware:', error)
    // Don't crash on middleware errors
  }

  return response
}