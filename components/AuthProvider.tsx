'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'

interface AuthContextType {
    user: User | null
    profile: Profile | null
    session: Session | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error: string | null }>
    signUp: (email: string, password: string, fullName: string, address?: string, phone?: string) => Promise<{ error: string | null }>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

// MOCK DATA for local testing
const MOCK_RESIDENT_PROFILE: Profile = {
    id: 'mock-resident-123',
    full_name: 'Juan Dela Cruz',
    role: 'resident',
    address: 'Block 4 Lot 12, Gordon Heights',
    phone: '09123456789',
    created_at: new Date().toISOString()
}

const MOCK_ADMIN_PROFILE: Profile = {
    id: 'mock-admin-456',
    full_name: 'Admin User',
    role: 'admin',
    address: 'Barangay Hall, Gordon Heights',
    phone: '09987654321',
    created_at: new Date().toISOString()
}

// Generate base mock user
const getMockUser = (id: string, email: string) => ({
    id,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email
} as User)

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Read pseudo-session from cookies
        const checkMockSession = () => {
            const mockSession = document.cookie.split('; ').find(row => row.startsWith('mock_session='))
            const mockRole = document.cookie.split('; ').find(row => row.startsWith('mock_role='))

            if (mockSession && mockRole) {
                const role = mockRole.split('=')[1]
                const isResident = role === 'resident'
                const mockProfile = isResident ? MOCK_RESIDENT_PROFILE : MOCK_ADMIN_PROFILE
                const mockUser = getMockUser(mockProfile.id, isResident ? 'resident@demo.com' : 'admin@demo.com')

                setSession({
                    access_token: 'mock-token',
                    refresh_token: 'mock-refresh',
                    expires_in: 3600,
                    expires_at: 0,
                    token_type: 'bearer',
                    user: mockUser
                } as Session)
                setUser(mockUser)
                setProfile(mockProfile)
            }
            setLoading(false)
        }

        checkMockSession()
    }, [])

    const signIn = async (email: string, password?: string) => {
        // Mock SignIn bypass based on email keyword or fallback
        const role = email.includes('admin') ? 'admin' : 'resident'

        // Save mock state to cookies for middleware compatibility
        document.cookie = `mock_session=true; path=/`
        document.cookie = `mock_role=${role}; path=/`

        const mockProfile = role === 'admin' ? MOCK_ADMIN_PROFILE : MOCK_RESIDENT_PROFILE
        const mockUser = getMockUser(mockProfile.id, email)

        setSession({
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            expires_in: 3600,
            expires_at: 0,
            token_type: 'bearer',
            user: mockUser
        } as Session)
        setUser(mockUser)
        setProfile(mockProfile)

        return { error: null }
    }

    const signUp = async (
        email: string,
        password: string,
        fullName: string,
        address?: string,
        phone?: string
    ) => {
        // Fallback simulate signup logic
        return signIn(email)
    }

    const signOut = async () => {
        document.cookie = `mock_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        document.cookie = `mock_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        setUser(null)
        setProfile(null)
        setSession(null)
        window.location.href = '/login'
    }

    return (
        <AuthContext.Provider value={{ user, profile, session, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}
