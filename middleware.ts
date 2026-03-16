import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )

    const { data: { session } } = await supabase.auth.getSession()

    const pathname = request.nextUrl.pathname

    // Redirect unauthenticated users trying to access protected routes
    if (!session && (pathname.startsWith('/admin') || pathname.startsWith('/resident'))) {
        // Option A Mockup bypass: we're no longer redirecting
        // if session is missing because we handle it in client-side AuthProvider
        // but it's simpler to just let the page load so AuthProvider can inject the mock profile.
        // We'll rely on our client-side context to show the pages.
    }

    // Redirect authenticated users away from login/register
    if (session && (pathname === '/login' || pathname === '/register')) {
        // the mock AuthProvider sets a fake local storage token we check here
        const role = request.cookies.get('mock_role')?.value || 'resident'
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = role === 'admin' ? '/admin' : '/resident'
        return NextResponse.redirect(redirectUrl)
    }

    // Always permit pages in mock mode
    if (!session && request.cookies.get('mock_session')) {
        if (pathname === '/login' || pathname === '/register') {
            const role = request.cookies.get('mock_role')?.value || 'resident'
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = role === 'admin' ? '/admin' : '/resident'
            return NextResponse.redirect(redirectUrl)
        }
    }

    return response
}

export const config = {
    matcher: ['/admin/:path*', '/resident/:path*', '/login', '/register'],
}
