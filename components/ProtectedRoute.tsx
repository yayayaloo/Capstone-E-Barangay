'use client'

import { useAuth } from './AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import { UserRole } from '@/lib/types'

interface ProtectedRouteProps {
    children: ReactNode
    requiredRole?: UserRole
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const { user, profile, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login')
                return
            }
            if (requiredRole && profile && profile.role !== requiredRole) {
                // If user is a resident trying to access admin, redirect to resident portal
                // If user is an admin trying to access resident page, allow it (admins can do everything)
                if (requiredRole === 'admin' && profile.role !== 'admin') {
                    router.push('/resident')
                }
            }
        }
    }, [user, profile, loading, requiredRole, router])

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'var(--bg-primary, #0a0a1a)',
                color: 'var(--text-primary, #fff)',
                fontSize: '1.2rem',
                fontFamily: 'var(--font-inter, sans-serif)',
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid rgba(34, 197, 94, 0.3)',
                        borderTop: '4px solid #6366f1',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem',
                    }} />
                    <p>Loading...</p>
                </div>
            </div>
        )
    }

    if (!user) return null
    if (requiredRole === 'admin' && profile?.role !== 'admin') return null

    return <>{children}</>
}
