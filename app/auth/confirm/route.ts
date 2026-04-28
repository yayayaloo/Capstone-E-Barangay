import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Email confirmation handler.
 * 
 * When a user clicks the confirmation link in their email, Supabase redirects
 * them here with `token_hash` and `type` query parameters. This route exchanges
 * the token for a valid session, confirming the user's email address.
 * 
 * After successful confirmation, the user is redirected to the login page
 * with a success message. On failure, they are redirected with an error.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = searchParams.get('next') ?? '/login'

    if (!token_hash || !type) {
        // Missing required parameters — redirect with error
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.set('error', 'missing_params')
        redirectUrl.searchParams.set('error_description', 'Invalid confirmation link. Please request a new one.')
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

    const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
    })

    if (!error) {
        // Email confirmed successfully!
        // Sign out the user so they must log in with their credentials
        // (prevents auto-login before admin verification)
        await supabase.auth.signOut()

        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.delete('token_hash')
        redirectUrl.searchParams.delete('type')
        redirectUrl.searchParams.delete('next')
        redirectUrl.searchParams.set('confirmed', 'true')
        return NextResponse.redirect(redirectUrl)
    }

    // Verification failed
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('error', 'confirmation_failed')
    redirectUrl.searchParams.set('error_description', error.message || 'Email confirmation failed. The link may have expired.')
    return NextResponse.redirect(redirectUrl)
}
