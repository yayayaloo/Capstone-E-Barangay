'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import styles from './login.module.css'

function LoginContent() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const { signIn } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        // Handle email confirmation success
        if (searchParams.get('confirmed') === 'true') {
            setSuccessMessage('Your email has been verified successfully! You can now sign in.')
        }
        // Handle email confirmation errors
        const errorDesc = searchParams.get('error_description')
        if (errorDesc) {
            setError(errorDesc)
        }
    }, [searchParams])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccessMessage('')
        
        if (!email.trim() || !password.trim()) {
            setError('Please enter both email and password.')
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address.')
            return
        }

        setLoading(true)

        const { error } = await signIn(email, password)

        if (error) {
            if (error.includes('Invalid login credentials')) {
                setError('Incorrect email or password. Please try again.')
            } else if (error.includes('Email not confirmed')) {
                setError('Please verify your email address before logging in. Check your inbox for the confirmation link.')
            } else {
                setError(error)
            }
            setLoading(false)
        } else {
            // Once sign-in succeeds, use session metadata to dynamically route them. 
            // This is instantly available from the JWT without an extra DB query.
            const { data: { session } } = await supabase.auth.getSession()
            const role = session?.user?.user_metadata?.role || 'resident'
            
            if (role === 'admin') {
                router.push('/admin')
            } else {
                router.push('/resident')
            }
        }
    }

    return (
        <div className={styles.loginContainer}>
            
            {/* Left Panel - Branding */}
            <div className={styles.brandingPanel}>
                <div className={styles.brandingBackground} />
                <div className={styles.brandingContent}>
                    <div className={styles.brandHeader}>
                        <Image src="/logo.png" alt="Logo" width={64} height={64} />
                        <div>
                            <h2 className={styles.brandTitle}>Barangay Gordon Heights</h2>
                            <div className={styles.brandSubtitle}>Olongapo City</div>
                        </div>
                    </div>

                    <div className={styles.brandSection}>
                        <div className={styles.sectionTitle}>Mandate</div>
                        <div className={styles.sectionText}>
                            Barangay Gordon Heights is responsible for delivering essential services, maintaining peace and order, implementing local governance and facilitating citizen's participation.
                        </div>
                    </div>

                    <div className={styles.brandSection}>
                        <div className={styles.sectionTitle}>Vision</div>
                        <div className={styles.sectionText}>
                            Peaceful barangay, God fearing, productive with self-reliance and with law abiding citizens.
                        </div>
                    </div>

                    <div className={styles.brandSection}>
                        <div className={styles.sectionTitle}>Mission</div>
                        <div className={styles.sectionText}>
                            To translate the convention on the rights of every Filipino into local policies, sustainable programs and services, and support the survival, protection, development and participation of the people in community building through the provision of good education, health and other institution with special protection, information, communication by legislating ordinances, formulating strategies, enforcing and implementing the same.
                        </div>
                    </div>

                    <div className={styles.brandSection}>
                        <div className={styles.sectionTitle}>Service Pledge</div>
                        <p style={{marginBottom: '0.5rem', fontSize: '0.85rem'}}>Barangay Gordon Heights pledge and commit to deliver efficient and quality public service:</p>
                        <ul className={styles.coreValues}>
                            <li>• Serve with honesty and integrity</li>
                            <li>• Be polite and courteous at all times</li>
                            <li>• Demonstrate appropriate behavior and professionalism</li>
                            <li>• Be prompt and timely</li>
                            <li>• Provide adequate and reliable information</li>
                            <li>• Be available during office hours</li>
                            <li>• Provide feedback mechanism and respond to complaints</li>
                            <li>• Equal treatment to all</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className={styles.formPanel}>
                <Link href="/" className={styles.backButton}>
                    ← Back to Home
                </Link>
                <div className={styles.loginCard}>
                    <div className={styles.logoSection}>
                        <div className={styles.logoIcon}>
                            <Image src="/logo.png" alt="Logo" width={90} height={90} />
                        </div>
                        <h1 style={{ color: '#111827', fontSize: '1.4rem' }}>Barangay Gordon Heights</h1>
                        <p style={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '1px', marginTop: '0.25rem', fontWeight: 600 }}>E-Barangay System</p>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {successMessage && (
                            <div style={{
                                padding: '0.875rem 1rem',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                color: '#059669',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}>
                                ✅ {successMessage}
                            </div>
                        )}
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
                            <div className={styles.passwordInputWrapper}>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                                    <button
                                        type="button"
                                        className={styles.passwordToggle}
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                            </div>
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
                            <Link href="/register" className={styles.link}>Sign up here</Link>
                        </p>
                    </div>
                </div>
            </div>
            
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className={styles.loginContainer}>
                <div className={styles.formPanel}>
                    <div className={styles.loginCard}>
                        <p>Loading...</p>
                    </div>
                </div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    )
}
