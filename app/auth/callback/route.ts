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
    const errLower = (error.message || '').toLowerCase()
    const isPkceFlowError =
        errLower.includes('flow state') ||
        errLower.includes('flow_state') ||
        errLower.includes('code_verifier') ||
        errLower.includes('code verifier') ||
        errLower.includes('pkce')

    const redirectUrl = request.nextUrl.clone()
    redirectUrl.searchParams.delete('code')
    redirectUrl.searchParams.delete('next')

    if (next.startsWith('/reset-password')) {
        redirectUrl.pathname = '/reset-password'
        if (isPkceFlowError) {
            redirectUrl.searchParams.set('error', 'flow_state_mismatch')
            redirectUrl.searchParams.set(
                'error_description',
                'This reset link was opened in a different browser. Please request a new password reset link in this browser or open the link directly in your installed app.'
            )
        } else {
            redirectUrl.searchParams.set('error', 'link_expired')
            redirectUrl.searchParams.set(
                'error_description',
                'Your password reset link has expired or has already been used. Please request a new link.'
            )
        }
    } else {
        // Signup email verification or regular login
        if (isPkceFlowError) {
            // For signup confirmation: Supabase confirms the email in the DB before code exchange.
            // When opened in an external browser from mobile, missing the PWA's PKCE verifier causes code exchange to fail,
            // but the user's email IS confirmed! Redirect to /login with confirmed=true so they can sign in.
            redirectUrl.pathname = '/login'
            redirectUrl.searchParams.set('confirmed', 'true')
        } else {
            redirectUrl.pathname = '/login'
            redirectUrl.searchParams.set('error', 'auth_callback_error')
            redirectUrl.searchParams.set('error_description', error.message || 'Authentication failed.')
        }
    }
    return NextResponse.redirect(redirectUrl)
}
