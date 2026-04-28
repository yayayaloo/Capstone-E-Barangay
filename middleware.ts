import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Fallback if environment variables are missing on Vercel
    if (!url || !key) {
        return supabaseResponse
    }

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

    const { data: { session } } = await supabase.auth.getSession()

    const pathname = request.nextUrl.pathname

    // Redirect unauthenticated users trying to access protected routes
    if (!session && (pathname.startsWith('/admin') || pathname.startsWith('/resident'))) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        return NextResponse.redirect(redirectUrl)
    }

    if (session) {
        let role = session.user.user_metadata?.role || 'resident';

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
    matcher: ['/', '/admin/:path*', '/resident/:path*', '/login', '/register', '/auth/:path*'],
}
