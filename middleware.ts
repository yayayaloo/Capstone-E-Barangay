import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const pathname = request.nextUrl.pathname

    // Public routes that never need auth — skip Supabase entirely for speed
    const isPublicRoute = pathname.startsWith('/services') || pathname.startsWith('/request')
    if (isPublicRoute) {
        return supabaseResponse
    }

    // Auth callback routes — let them pass through without session checks
    if (pathname.startsWith('/auth/')) {
        return supabaseResponse
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Fallback if environment variables are missing on Vercel
    if (!url || !key) {
        return supabaseResponse
    }

    // Quick cookie presence check — if no supabase auth cookies exist,
    // we know the user is unauthenticated without creating a client
    const hasAuthCookie = request.cookies.getAll().some(c => c.name.startsWith('sb-'))

    // For login/register pages with no auth cookie, skip session check entirely
    if (!hasAuthCookie && (pathname === '/login' || pathname === '/register')) {
        return supabaseResponse
    }

    // For protected routes with no auth cookie, redirect immediately
    // C1 FIX: Preserve the original path as ?redirect= so users return after login
    if (!hasAuthCookie && (pathname.startsWith('/admin') || pathname.startsWith('/resident'))) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(redirectUrl)
    }

    // Only create Supabase client when we actually need session validation
    const supabase = createServerClient(
        url,
        key,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options })
                    supabaseResponse = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    // Set all existing cookies again on the new response
                    request.cookies.getAll().forEach((cookie) => {
                        supabaseResponse.cookies.set({ name: cookie.name, value: cookie.value })
                    })
                    // Now set the new cookie
                    supabaseResponse.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options })
                    supabaseResponse = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    // Set all existing cookies again on the new response
                    request.cookies.getAll().forEach((cookie) => {
                        supabaseResponse.cookies.set({ name: cookie.name, value: cookie.value })
                    })
                    supabaseResponse.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )

    // Secure user verification - cryptographically verifies the signature on the JWT against the server
    const { data: { user }, error: userError } = await supabase.auth.getUser()
 
    // Redirect unauthenticated users trying to access protected routes
    // C1 FIX: Preserve the original path as ?redirect= so users return after login
    if ((!user || userError) && (pathname.startsWith('/admin') || pathname.startsWith('/resident'))) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(redirectUrl)
    }
 
    if (user) {
        // Query the profile role directly from the database table (our source of truth)
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
 
        const role = profile?.role || 'resident';
 
        // Enforce Role-Based Access Control (RBAC)
        if (pathname.startsWith('/admin') && role !== 'admin') {
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/resident'
            return NextResponse.redirect(redirectUrl)
        }
 
        if (pathname.startsWith('/resident') && role === 'admin') {
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/admin'
            return NextResponse.redirect(redirectUrl)
        }
 
        // Redirect authenticated users away from landing, login, and register pages
        if (pathname === '/' || pathname === '/login' || pathname === '/register') {
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = role === 'admin' ? '/admin' : '/resident'
            return NextResponse.redirect(redirectUrl)
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: ['/', '/admin/:path*', '/resident/:path*', '/login', '/register', '/auth/:path*', '/services', '/request/:path*'],
}
