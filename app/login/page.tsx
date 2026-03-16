'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import styles from './login.module.css'

export default function LoginPage() {
    const [email, setEmail] = useState('resident@demo.com')
    const [password, setPassword] = useState('password123')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { signIn } = useAuth()
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const { error } = await signIn(email, password)

        if (error) {
            setError(error)
            setLoading(false)
        } else {
            // Mock mode: role is determined by email keyword (see AuthProvider)
            if (email.toLowerCase().includes('admin')) {
                router.push('/admin')
            } else {
                router.push('/resident')
            }
        }
    }

    return (
        <div className={styles.loginContainer}>
            <div className={styles.loginBackground}>
                <div className={styles.gradientOrb1} />
                <div className={styles.gradientOrb2} />
            </div>

            <div className={styles.loginCard}>
                <div className={styles.logoSection}>
                    <Link href="/" className={styles.backLink}>← Back to Home</Link>
                    <div className={styles.logoIcon}>🏛️</div>
                    <h1>Welcome Back</h1>
                    <p>Sign in to your E-Barangay account</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && (
                        <div className={styles.errorMessage}>
                            ⚠️ {error}
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <label htmlFor="email">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div style={{ textAlign: 'right', marginTop: '-0.5rem' }}>
                        <Link href="/forgot-password" className={styles.link} style={{ fontSize: '0.85rem' }}>
                            Forgot Password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={loading}
                    >
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>


                </form>

                <div className={styles.footer}>
                    <p>Don&apos;t have an account?{' '}
                        <Link href="/register" className={styles.link}>Create one</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
