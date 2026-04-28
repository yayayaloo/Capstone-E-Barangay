import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Auth callback handler for PKCE flow.
 * 
 * This handles the `code` parameter that Supabase sends when using
 * the PKCE auth flow (e.g., password reset links, magic links).
 * It exchanges the authorization code for a session.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/login'

    if (!code) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.set('error', 'missing_code')
        redirectUrl.searchParams.set('error_description', 'Invalid authentication link.')
        return NextResponse.redirect(redirectUrl)
    }

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
                    } catch (error) {
                        // Ignored in Server Components
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.delete({ name, ...options })
                    } catch (error) {
                        // Ignored in Server Components
                    }
                },
            },
        }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = next
        redirectUrl.searchParams.delete('code')
        redirectUrl.searchParams.delete('next')
        return NextResponse.redirect(redirectUrl)
    }

    // Code exchange failed
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('error', 'auth_callback_error')
    redirectUrl.searchParams.set('error_description', error.message || 'Authentication failed.')
    return NextResponse.redirect(redirectUrl)
}
