'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Info } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import styles from './login.module.css'

function LoginContent() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [unconfirmedEmail, setUnconfirmedEmail] = useState('')
    const [resending, setResending] = useState(false)
    const { signIn, resendOtp } = useAuth()
    const { showToast, updateToast } = useToast()
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectUrl = searchParams ? searchParams.get('redirect') : null

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

    const handleResendVerification = async () => {
        if (!unconfirmedEmail) return
        setResending(true)
        const toastId = showToast('Resending verification link...', 'loading')
        const { error: resendError } = await resendOtp(unconfirmedEmail)
        if (resendError) {
            setError(resendError)
            updateToast(toastId, resendError, 'error')
        } else {
            setSuccessMessage('Verification email has been resent successfully! Please check your inbox.')
            setUnconfirmedEmail('')
            setError('')
            updateToast(toastId, 'Verification email resent!', 'success')
        }
        setResending(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccessMessage('')
        setUnconfirmedEmail('')

        const trimmedEmail = email.trim()
        if (!trimmedEmail || !password.trim()) {
            setError('Please enter both email and password.')
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(trimmedEmail)) {
            setError('Please enter a valid email address.')
            return
        }

        setLoading(true)
        const toastId = showToast('Signing in...', 'loading')

        const { data, error: signInError } = await signIn(trimmedEmail, password)

        if (signInError) {
            let errorMsg = signInError;
            if (signInError.includes('Invalid login credentials')) {
                errorMsg = 'Incorrect email or password. Please try again.'
            } else if (signInError.includes('Email not confirmed')) {
                errorMsg = 'Please verify your email address before logging in. Check your inbox for the confirmation link.'
                setUnconfirmedEmail(trimmedEmail)
            }
            setError(errorMsg)
            updateToast(toastId, errorMsg, 'error')
            setLoading(false)
        } else {
            const session = data?.session

            if (!session?.user?.email_confirmed_at) {
                // Email not confirmed — block login and sign them out
                await supabase.auth.signOut()
                const msg = 'Please verify your email address before logging in. Check your inbox for the confirmation link.'
                setUnconfirmedEmail(trimmedEmail)
                setError(msg)
                updateToast(toastId, msg, 'error')
                setLoading(false)
                return
            }

            updateToast(toastId, 'Signed in successfully!', 'success')

            // Secure: Fetch true role from database profiles table rather than relying solely on user_metadata JWT claim
            let role = 'resident'
            try {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single()
                if (profileData?.role) {
                    role = profileData.role
                } else {
                    role = session.user.user_metadata?.role || 'resident'
                }
            } catch (err) {
                role = session.user.user_metadata?.role || 'resident'
            }

            const isValidLocalRedirect = (url: string) => {
                return url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')
            }

            if (redirectUrl && isValidLocalRedirect(redirectUrl)) {
                router.push(redirectUrl)
            } else if (role === 'admin') {
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
                        <p style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>Barangay Gordon Heights pledge and commit to deliver efficient and quality public service:</p>
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
                    Back to Home
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
                        {redirectUrl && redirectUrl.startsWith('/request/') && (
                            <div style={{
                                padding: '0.875rem 1rem',
                                borderRadius: '12px',
                                backgroundColor: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#1e3a8a',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}>
                                <Info size={16} style={{ flexShrink: 0 }} />
                                <span>Please sign in to complete your document request. You will be redirected back to the form immediately after.</span>
                            </div>
                        )}
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
                                {successMessage}
                            </div>
                        )}
                        {error && (
                            <div className={styles.errorMessage} role="alert">
                                <div>{error}</div>
                                {unconfirmedEmail && email.trim() === unconfirmedEmail && (
                                    <button
                                        type="button"
                                        className={styles.resendButton}
                                        onClick={handleResendVerification}
                                        disabled={resending}
                                    >
                                        {resending ? 'Resending verification link...' : 'Resend verification email'}
                                    </button>
                                )}
                            </div>
                        )}

                        <div className={styles.inputGroup}>
                            <label htmlFor="email">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value)
                                    if (error) setError('')
                                }}
                                placeholder="you@example.com"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="password">Password</label>
                            <div className={styles.passwordInputWrapper}>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value)
                                        if (error) setError('')
                                    }}
                                    placeholder="••••••••"
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className={styles.passwordToggle}
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={loading}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    aria-pressed={showPassword}
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
                            {loading ? (
                                <>
                                    <span className={styles.spinner}></span>
                                    Signing In...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className={styles.footer}>
                        <p>Don&apos;t have an account?{' '}
                            <Link href={searchParams.get('redirect') ? `/register?redirect=${searchParams.get('redirect')}` : "/register"} className={styles.link}>Sign up here</Link>
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
                <div className={styles.brandingPanel}>
                    <div className={styles.brandingBackground} />
                    <div className={styles.brandingContent}>
                        {/* Static visual layout structure placeholder to prevent layout shifts */}
                    </div>
                </div>
                <div className={styles.formPanel}>
                    <div className={styles.loginCard} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                        <span className={styles.spinner} style={{ width: '2.5rem', height: '2.5rem', borderWidth: '3px', borderTopColor: '#059669', borderColor: 'rgba(5, 150, 105, 0.15)' }}></span>
                        <p style={{ marginTop: '1.25rem', color: '#6b7280', fontSize: '0.9rem', fontWeight: 500 }}>Loading E-Barangay portal...</p>
                    </div>
                </div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    )
}
