import { createBrowserClient } from '@supabase/ssr'

let _supabase: ReturnType<typeof createBrowserClient> | null = null

export function getSupabase() {
    if (_supabase) return _supabase

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        if (typeof window === 'undefined') {
            console.warn('BUILD-TIME WARNING: Supabase environment variables are missing. Using placeholders for static generation.')
        } else {
            console.error('RUNTIME ERROR: Supabase environment variables are missing! The application will not function.')
        }
    }

    _supabase = createBrowserClient(
        url || 'https://placeholder.supabase.co',
        key || 'placeholder_key'
    )
    return _supabase
}

export const supabase = getSupabase()
