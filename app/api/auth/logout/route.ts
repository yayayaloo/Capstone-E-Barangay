import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side logout handler.
 *
 * The client-side supabase.auth.signOut() only clears in-memory/localStorage state.
 * HTTP-only session cookies must be cleared server-side. Without this, the middleware
 * may still detect a stale session after logout, blocking navigation to the home page.
 */
export async function POST(request: NextRequest) {
    const cookieStore = cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch {}
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.delete({ name, ...options })
                    } catch {}
                },
            },
        }
    )

    // Sign out server-side — this clears the session cookies properly
    await supabase.auth.signOut()

    const response = NextResponse.json({ success: true })

    // Explicitly clear all supabase auth cookies from the response
    const allCookies = cookieStore.getAll()
    for (const cookie of allCookies) {
        if (
            cookie.name.startsWith('sb-') ||
            cookie.name.includes('supabase') ||
            cookie.name.includes('auth-token')
        ) {
            response.cookies.set(cookie.name, '', {
                maxAge: 0,
                path: '/',
            })
        }
    }

    return response
}
