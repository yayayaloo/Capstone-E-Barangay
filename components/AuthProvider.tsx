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
    signUp: (email: string, password: string, fullName: string, address?: string, phone?: string) => Promise<{ error: string | null }>
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
    }, [])

    const fetchProfile = async (userId: string, mountedRef: { current: boolean }) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) {
                console.error('Error fetching profile from DB:', error)
                // FALLBACK: Use user metadata if profile table row is missing
                const currentUser = userRef.current
                if (currentUser && mountedRef.current) {
                    setProfile({
                        id: currentUser.id,
                        full_name: currentUser.user_metadata?.full_name || 'Resident',
                        email: currentUser.email || '',
                        address: currentUser.user_metadata?.address || '',
                        phone: currentUser.user_metadata?.phone || '',
                        role: currentUser.user_metadata?.role || 'resident',
                        created_at: currentUser.created_at,
                        updated_at: currentUser.created_at
                    } as Profile)
                } else {
                    setProfile(null)
                }
            } else {
                if (mountedRef.current) setProfile(data as Profile)
            }
        } catch (error) {
            console.error('Exception fetching profile', error)
            setProfile(null)
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

    const signUp = async (
        email: string,
        password: string,
        fullName: string,
        address?: string,
        phone?: string
    ) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        address: address || null,
                        phone: phone || null,
                        role: 'resident', // By default new signups are residents
                    }
                }
            })

            return { error: error?.message || null }
        } catch (error: any) {
            return { error: error.message || 'An error occurred during sign up' }
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
        <AuthContext.Provider value={{ user, profile, session, loading, signIn, signUp, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    )
}
