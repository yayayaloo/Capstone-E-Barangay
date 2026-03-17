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
        let mounted = true;

        const initializeAuth = async () => {
            try {
                // Get initial session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()
                
                if (sessionError) throw sessionError

                if (mounted) {
                    setSession(session)
                    setUser(session?.user ?? null)

                    if (session?.user) {
                        await fetchProfile(session.user.id)
                    } else {
                        setProfile(null)
                    }
                }
            } catch (error) {
                console.error('Error fetching session:', error)
            } finally {
                if (mounted) setLoading(false)
            }
        }

        initializeAuth()

        // Listen for auth changes
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                if (!mounted) return;
                
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
                        await fetchProfile(newSession.user.id)
                        if (mounted) setLoading(false)
                    } else {
                        // We already have the user and profile, so just update session quietly
                    }
                } else {
                    setProfile(null)
                    if (mounted) setLoading(false)
                }
            }
        )

        subscription = authSubscription

        return () => {
            mounted = false;
            if (subscription) {
                subscription.unsubscribe()
            }
        }
    }, [])

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) {
                console.error('Error fetching profile:', error)
                setProfile(null)
            } else {
                setProfile(data as Profile)
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
        if (user) await fetchProfile(user.id)
    }

    return (
        <AuthContext.Provider value={{ user, profile, session, loading, signIn, signUp, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    )
}
