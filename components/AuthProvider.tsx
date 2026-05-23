'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'

interface AuthContextType {
    user: User | null
    profile: Profile | null
    session: Session | null
    loading: boolean
    profileLoading: boolean
    signIn: (email: string, password?: string) => Promise<{ data?: any, error: string | null }>
    verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>
    resendOtp: (email: string) => Promise<{ error: string | null }>
    signUp: (
        email: string,
        password: string,
        metadata: {
            fullName: string
            firstName: string
            middleName?: string
            lastName: string
            suffix?: string
            gender: 'Male' | 'Female'
            relationshipStatus: string
            address?: string
            phone?: string
            birthdate?: string
        },
        emailRedirectTo?: string
    ) => Promise<{ error: string | null; userId: string | null }>
    signOut: () => Promise<void>
    refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const [profileLoading, setProfileLoading] = useState(false)
    const router = useRouter()
    const { showToast, updateToast } = useToast()
    const userRef = useRef<User | null>(null)
    const profileRef = useRef<Profile | null>(null)
    const initCompleteRef = useRef(false)

    // Keep refs updated
    useEffect(() => {
        userRef.current = user
        profileRef.current = profile
    }, [user, profile])

    useEffect(() => {
        let subscription: { unsubscribe: () => void } | null = null;
        const mountedRef = { current: true };

        const initializeAuth = async () => {
            // Safety timeout to prevent infinite spinner
            const timeoutId = setTimeout(() => {
                if (mountedRef.current) {
                    console.error('Auth initialization timed out. Check your Supabase connection.')
                    setLoading(false)
                    initCompleteRef.current = true
                }
            }, 5000)

            try {
                // Check if Supabase is actually configured
                if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
                    console.error('Supabase credentials missing in this environment.')
                    if (mountedRef.current) setLoading(false)
                    clearTimeout(timeoutId)
                    initCompleteRef.current = true
                    return
                }

                // Get initial session (reads from memory/cookie — fast)
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()
                
                if (sessionError) throw sessionError

                if (mountedRef.current) {
                    setSession(session)
                    setUser(session?.user ?? null)

                    if (session?.user) {
                        await fetchProfile(session.user.id, mountedRef)
                    } else {
                        setProfile(null)
                    }
                }
            } catch (error) {
                console.error('Error fetching session:', error)
            } finally {
                clearTimeout(timeoutId)
                initCompleteRef.current = true
                if (mountedRef.current) setLoading(false)
            }
        }

        initializeAuth()

        // Listen for auth changes
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, newSession: Session | null) => {
                if (!mountedRef.current) return;

                // Skip the INITIAL_SESSION event if initializeAuth already handled it.
                // This prevents a double profile fetch on page load.
                if (event === 'INITIAL_SESSION' && initCompleteRef.current) {
                    return
                }
                
                const currentUser = userRef.current
                const currentProfile = profileRef.current
                
                setSession(newSession)
                setUser(newSession?.user ?? null)

                if (event === 'SIGNED_OUT') {
                    setProfile(null)
                    setLoading(false)
                    return
                }

                // Skip redundant fetches for token refresh events
                if (event === 'TOKEN_REFRESHED' && currentProfile && currentUser?.id === newSession?.user?.id) {
                    return
                }

                if (newSession?.user) {
                    // Only fetch profile if user changed or we don't have a profile yet
                    if (!currentProfile || currentUser?.id !== newSession.user.id) {
                        // Don't block the UI with a full-page spinner on SIGNED_IN.
                        // The page can render immediately; profile loads in background.
                        setProfileLoading(true)
                        await fetchProfile(newSession.user.id, mountedRef)
                        if (mountedRef.current) setProfileLoading(false)
                    }
                } else {
                    setProfile(null)
                    if (mountedRef.current) setLoading(false)
                }
            }
        )

        subscription = authSubscription

        return () => {
            mountedRef.current = false;
            if (subscription) {
                subscription.unsubscribe()
            }
        }
    }, [])    // Real-time Profile Synchronization
    // This allows the resident's portal to unlock instantly when an admin verifies them
    useEffect(() => {
        if (!user?.id) return

        const profileChannel = supabase
            .channel(`profile_realtime_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`
                },
                (payload: any) => {
                    console.log('Profile update received:', payload.new)
                    // We call fetchProfile to get the full updated row safely
                    // This prevents any "partial record" mess from before
                    if (user?.id) fetchProfile(user.id, { current: true })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(profileChannel)
        }
    }, [user?.id])

    const fetchProfile = async (userId: string, mountedRef: { current: boolean }) => {
        try {
            const { data: dbData, error: dbError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (dbError) {
                console.warn('DB Profile error, attempting metadata fallback:', dbError.message)
                
                // Fallback: use the session's user_metadata (already in memory, no network call)
                const { data: { session: currentSession } } = await supabase.auth.getSession()
                const currentUser = currentSession?.user

                // FALLBACK: Use session user metadata if profile table row or columns are missing
                if (currentUser && mountedRef.current) {
                    const fallbackProfile: Profile = {
                        id: currentUser.id,
                        full_name: currentUser.user_metadata?.full_name || 'Resident',
                        first_name: currentUser.user_metadata?.first_name || null,
                        middle_name: currentUser.user_metadata?.middle_name || null,
                        last_name: currentUser.user_metadata?.last_name || null,
                        suffix: currentUser.user_metadata?.suffix || null,
                        gender: currentUser.user_metadata?.gender || null,
                        relationship_status: currentUser.user_metadata?.relationship_status || null,
                        id_document_url: currentUser.user_metadata?.id_document_url || null,
                        profile_picture_url: currentUser.user_metadata?.profile_picture_url || null,
                        email: currentUser.email || '',
                        address: currentUser.user_metadata?.address || '',
                        phone: currentUser.user_metadata?.phone || '',
                        birthdate: currentUser.user_metadata?.birthdate || null,
                        role: currentUser.user_metadata?.role || 'resident',
                        is_verified: false,
                        is_rejected: false,
                        resident_id_number: null,
                        resident_qr_id: null,
                        sectors: currentUser.user_metadata?.sectors || [],
                        created_at: currentUser.created_at,
                        updated_at: currentUser.created_at
                    }
                    setProfile(fallbackProfile)
                }
            } else {
                if (mountedRef.current && dbData) {
                    // Only fetch user metadata as fallback if critical fields are truly missing
                    const needsFallback = !dbData.full_name || !dbData.email;
                    
                    let sessionUser = null;
                    if (needsFallback) {
                        // Use getSession (in-memory) instead of getUser (network call)
                        const { data: { session: s } } = await supabase.auth.getSession();
                        sessionUser = s?.user;
                    }

                    // Merge DB data with user_metadata in case the DB row is missing registration fields
                    const mergedProfile: Profile = {
                        ...(dbData as Profile),
                        full_name: dbData.full_name || sessionUser?.user_metadata?.full_name || 'Resident',
                        email: dbData.email || sessionUser?.email || ''
                    }
                    setProfile(mergedProfile)
                }
            }
        } catch (error) {
            console.error('Critical exception fetching profile', error)
        }
    }

    const signIn = async (email: string, password?: string) => {
        if (!password) {
            return { error: 'Please enter a password' }
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            return { data, error: error?.message || null }
        } catch (error: any) {
            return { error: error.message || 'An error occurred during sign in' }
        }
    }

    const verifyOtp = async (email: string, token: string) => {
        try {
            const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })
            return { error: error?.message || null }
        } catch (error: any) {
            return { error: error.message || 'An error occurred during verification' }
        }
    }

    const resendOtp = async (email: string) => {
        try {
            const { error } = await supabase.auth.resend({ type: 'signup', email, options: {
                emailRedirectTo: window.location.origin + '/auth/confirm'
            } })
            return { error: error?.message || null }
        } catch (error: any) {
            return { error: error.message || 'An error occurred while resending the OTP' }
        }
    }

    const signUp = async (
        email: string,
        password: string,
        metadata: {
            fullName: string
            firstName: string
            middleName?: string
            lastName: string
            suffix?: string
            gender: 'Male' | 'Female'
            relationshipStatus: string
            address?: string
            phone?: string
            birthdate?: string
        },
        emailRedirectTo?: string
    ) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo,
                    data: {
                        full_name: metadata.fullName,
                        first_name: metadata.firstName,
                        middle_name: metadata.middleName || null,
                        last_name: metadata.lastName,
                        suffix: metadata.suffix || null,
                        gender: metadata.gender,
                        relationship_status: metadata.relationshipStatus,
                        address: metadata.address || null,
                        phone: metadata.phone || null,
                        birthdate: metadata.birthdate || null,
                        role: 'resident', // By default new signups are residents
                    }
                }
            })

            return { error: error?.message || null, userId: data?.user?.id || null }
        } catch (error: any) {
            return { error: error.message || 'An error occurred during sign up', userId: null }
        }
    }

    const signOut = async () => {
        const toastId = showToast('Signing out...', 'loading')

        // 1. Call the server-side logout route to clear HTTP-only session cookies.
        //    Without this, the middleware still sees a stale cookie after logout
        //    and blocks navigation to the home page (redirects back to dashboard).
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
        } catch {
            // Non-fatal — proceed with client-side signout regardless
        }

        // 2. Clear client-side session state
        await supabase.auth.signOut()

        // Update toast to success
        updateToast(toastId, 'Signed out successfully!', 'success')

        // 3. Navigate to login
        router.push('/login')
    }

    const refreshProfile = async () => {
        if (user) await fetchProfile(user.id, { current: true })
    }

    return (
        <AuthContext.Provider value={{ user, profile, session, loading, profileLoading, signIn, signUp, verifyOtp, resendOtp, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    )
}
