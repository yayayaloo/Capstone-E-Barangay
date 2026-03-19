'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import styles from '../login/login.module.css'

function ResetPasswordContent() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const { showToast } = useToast()

    useEffect(() => {
        const code = searchParams.get('code')
        
        // If there's a code in the URL, we might need to exchange it
        // Supabase usually handles this, but we can verify session
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session && !code) {
                // If no session and no code, this is an invalid access
                // But we'll let them try anyway or they'll get an error on submit
            }
        }
        checkSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === "PASSWORD_RECOVERY") {
                console.log("Password recovery event triggered")
            }
        })

        return () => subscription.unsubscribe()
    }, [searchParams])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            const msg = 'Passwords do not match'
            setError(msg)
            showToast(msg, 'error')
            return
        }

        if (password.length < 6) {
            const msg = 'Password must be at least 6 characters'
            setError(msg)
            showToast(msg, 'error')
            return
        }

        setLoading(true)

        try {
            const { error } = await supabase.auth.updateUser({ password })

            if (error) {
                setError(error.message)
                showToast(error.message, 'error')
                setLoading(false)
            } else {
                // Explicitly sign out to ensure they have to log in with the new password
                await supabase.auth.signOut()
                setSuccess(true)
                showToast('Password updated! Please sign in with your new password.', 'success')
                setTimeout(() => router.push('/login'), 3000)
            }
        } catch (err: any) {
            const msg = err.message || 'An unexpected error occurred'
            setError(msg)
            showToast(msg, 'error')
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className={styles.loginContainer}>
                <div className={styles.loginCard}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                        <h2>Password Updated!</h2>
                        <p>Your password has been successfully reset. You will be redirected to the login page shortly.</p>
                        <Link href="/login" className={styles.link}>Go to Login →</Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.loginContainer}>
            <div className={styles.loginBackground}>
                <div className={styles.gradientOrb1} />
                <div className={styles.gradientOrb2} />
            </div>

            <div className={styles.loginCard}>
                <div className={styles.logoSection}>
                    <div className={styles.logoIcon}>🛡️</div>
                    <h1>Reset Password</h1>
                    <p>Enter your new password below</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && (
                        <div className={styles.errorMessage}>
                            ⚠️ {error}
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <label htmlFor="password">New Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={loading}
                    >
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className={styles.loginContainer}>
                <div className={styles.loginCard}>
                    <p>Loading...</p>
                </div>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    )
}
