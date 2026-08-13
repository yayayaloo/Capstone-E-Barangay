import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Email confirmation handler.
 * 
 * When a user clicks the confirmation link in their email, Supabase redirects
 * them here. This route handles both token_hash (OTP) and code (PKCE) flows,
 * exchanges the token for a valid session, and confirms the user's email address.
 * 
 * After successful confirmation, the user is redirected to the login page
 * with a success message. On failure, they are redirected with an error.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/login'

    // Check if Supabase passed error params directly in the URL
    const errorParam = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (errorParam || errorDescription) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.set('error', errorParam || 'confirmation_failed')
        redirectUrl.searchParams.set('error_description', errorDescription || 'Email confirmation link is invalid or has expired.')
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
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing sessions.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.delete({ name, ...options })
                    } catch (error) {
                        // Same as above
                    }
                },
            },
        }
    )

    let error: Error | null = null

    if (token_hash && type) {
        // OTP flow
        const { error: otpError } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })
        error = otpError
    } else if (code) {
        // PKCE flow
        const { error: codeError } = await supabase.auth.exchangeCodeForSession(code)
        error = codeError
    } else {
        // Missing parameters
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.set('error', 'missing_params')
        redirectUrl.searchParams.set('error_description', 'Invalid confirmation link. Please request a new one.')
        return NextResponse.redirect(redirectUrl)
    }

    if (!error) {
        // Email confirmed successfully!
        // Sign out the user so they must log in with their credentials
        // (prevents auto-login before admin verification)
        await supabase.auth.signOut()

        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.delete('token_hash')
        redirectUrl.searchParams.delete('type')
        redirectUrl.searchParams.delete('code')
        redirectUrl.searchParams.delete('next')
        redirectUrl.searchParams.set('confirmed', 'true')
        return NextResponse.redirect(redirectUrl)
    }

    // Check if the failure is solely due to PKCE code verifier missing across browsers/devices.
    // When Supabase processes the confirmation link, it confirms the email in the DB *before* redirecting.
    // Since we require users to sign in manually anyway, a missing PKCE session cookie on a new browser/webview
    // does not prevent them from signing in. We can safely treat this as a confirmed email!
    const isPkceError = error.message?.includes('flow_state_not_found') || 
                        error.message?.includes('PKCE code verifier not found') ||
                        error.message?.includes('code_verifier')

    if (isPkceError) {
        await supabase.auth.signOut().catch(() => {})
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.delete('token_hash')
        redirectUrl.searchParams.delete('type')
        redirectUrl.searchParams.delete('code')
        redirectUrl.searchParams.delete('next')
        redirectUrl.searchParams.set('confirmed', 'true')
        return NextResponse.redirect(redirectUrl)
    }

    // Verification failed for another reason (e.g. invalid or expired token)
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('error', 'confirmation_failed')
    redirectUrl.searchParams.set('error_description', error.message || 'Email confirmation failed. The link may have expired.')
    return NextResponse.redirect(redirectUrl)
}
