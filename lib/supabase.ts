import { createBrowserClient } from '@supabase/ssr'

export function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        if (typeof window === 'undefined') {
            console.warn('BUILD-TIME WARNING: Supabase environment variables are missing. Using placeholders for static generation.')
        } else {
            console.error('RUNTIME ERROR: Supabase environment variables are missing! The application will not function.')
        }
    }

    return createBrowserClient(
        url || 'https://placeholder.supabase.co',
        key || 'placeholder_key'
    )
}

export const supabase = getSupabase()
