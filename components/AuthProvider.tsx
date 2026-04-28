'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface AuthContextType {
    user: User | null
    profile: Profile | null
    session: Session | null
    loading: boolean
    signIn: (email: string, password?: string) => Promise<{ error: string | null }>
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
    const router = useRouter()
    const userRef = useRef<User | null>(null)
    const profileRef = useRef<Profile | null>(null)

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
                }
            }, 8000)

            try {
                // Check if Supabase is actually configured
                if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
                    console.error('Supabase credentials missing in this environment.')
                    if (mountedRef.current) setLoading(false)
                    clearTimeout(timeoutId)
                    return
                }

                // Get initial session
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
                if (mountedRef.current) setLoading(false)
            }
        }

        initializeAuth()

        // Listen for auth changes
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                if (!mountedRef.current) return;
                
                const currentUser = userRef.current
                const currentProfile = profileRef.current
                
                setSession(newSession)
                setUser(newSession?.user ?? null)

                if (event === 'SIGNED_OUT') {
                    setProfile(null)
                    setLoading(false)
                    return
                }

                if (newSession?.user) {
                    // Only fetch profile if user changed or we don't have a profile yet
                    if (!currentProfile || currentUser?.id !== newSession.user.id) {
                        // We only show loading screen if it's a completely new sign in
                        if (event === 'SIGNED_IN') setLoading(true)
                        await fetchProfile(newSession.user.id, mountedRef)
                        if (mountedRef.current) setLoading(false)
                    } else {
                        // We already have the user and profile, so just update session quietly
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
                (payload) => {
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
                
                const { data: { user: currentUser } } = await supabase.auth.getUser()

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
                    // Check if we need fallback data
                    const needsFallback = !dbData.gender || !dbData.relationship_status || !dbData.address || !dbData.phone || !dbData.full_name || !dbData.email;
                    
                    let currentUser = null;
                    if (needsFallback) {
                        const { data } = await supabase.auth.getUser();
                        currentUser = data.user;
                    }

                    // Merge DB data with user_metadata in case the DB row is missing registration fields
                    const mergedProfile: Profile = {
                        ...(dbData as Profile),
                        gender: dbData.gender || currentUser?.user_metadata?.gender || null,
                        relationship_status: dbData.relationship_status || currentUser?.user_metadata?.relationship_status || null,
                        address: dbData.address || currentUser?.user_metadata?.address || null,
                        phone: dbData.phone || currentUser?.user_metadata?.phone || null,
                        full_name: dbData.full_name || currentUser?.user_metadata?.full_name || 'Resident',
                        email: dbData.email || currentUser?.email || ''
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
            // Passwordless unsupported for now
            return { error: 'Please enter a password' }
        }

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            return { error: error?.message || null }
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
        await supabase.auth.signOut()
        router.push('/login')
    }

    const refreshProfile = async () => {
        if (user) await fetchProfile(user.id, { current: true })
    }

    return (
        <AuthContext.Provider value={{ user, profile, session, loading, signIn, signUp, verifyOtp, resendOtp, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    )
}
