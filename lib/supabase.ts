import { createBrowserClient } from '@supabase/ssr'

export function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        console.error('CRITICAL: Supabase environment variables are missing! Deployment will fail.')
        // In local dev, we might want to throw or fallback, but the server won't start anyway
    }

    return createBrowserClient(url!, key!)
}

export const supabase = getSupabase()
