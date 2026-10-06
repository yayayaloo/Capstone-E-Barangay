'use client'

import React, { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
    Eye, 
    EyeOff, 
    Check, 
    X, 
    AlertCircle, 
    ArrowLeft, 
    Lock,
    RefreshCw
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { useToast } from '@/components/Toast'
import styles from './reset-password.module.css'

const SLIDES = [
    {
        id: 0,
        sectionTitle: "ACCOUNT SECURITY",
        description: "Barangay Gordon Heights utilizes modern cryptographic standards to safeguard your resident account and official civic records.",
        features: [
            "Encrypted end-to-end authentication",
            "Secure session verification",
            "Real-time fraud prevention",
            "Strict role-based access control"
        ]
    },
    {
        id: 1,
        sectionTitle: "STRONG PASSWORD TIPS",
        description: "Choose a memorable passphrase that combines uppercase and lowercase letters, numbers, and distinct symbols.",
        features: [
            "Avoid common dictionary words",
            "Never share your password with anyone",
            "Use a minimum of 8 characters",
            "Unique to Barangay E-Services"
        ]
    },
    {
        id: 2,
        sectionTitle: "SERVICE PLEDGE",
        description: "Barangay Gordon Heights commits to deliver secure, efficient, and quality public services to all residents.",
        features: [
            "Serve with honesty and integrity",
            "Protect personal resident data",
            "Provide accessible citizen services",
            "Prompt response to all concerns"
        ]
    }
]

function ResetPasswordContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { showToast } = useToast()

    // Query parameters
    const codeParam = searchParams.get('code')
    const tokenHashParam = searchParams.get('token_hash')
    const typeParam = searchParams.get('type')
    const errorParam = searchParams.get('error')
    const errorDescParam = searchParams.get('error_description')

    // Input States
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    // UI Status States
    const [loading, setLoading] = useState(false)
    const [verifyingSession, setVerifyingSession] = useState(true)
    const [sessionReady, setSessionReady] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [countdown, setCountdown] = useState(3)

    // Carousel States
    const [activeSlide, setActiveSlide] = useState(0)
    const [isPaused, setIsPaused] = useState(false)

    // Auto-advance showcase slides
    useEffect(() => {
        if (isPaused) return
        const timer = setInterval(() => {
            setActiveSlide((prev) => (prev + 1) % SLIDES.length)
        }, 6000)
        return () => clearInterval(timer)
    }, [isPaused])

    // Success redirect countdown
    useEffect(() => {
        if (!success) return
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer)
                    router.push('/login')
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [success, router])

    // Initial code exchange, OTP verify, and session check
    useEffect(() => {
        let isMounted = true

        const initializeRecovery = async () => {
            // 1. Check for incoming errors from Supabase or callback
            if (errorParam || errorDescParam) {
                const message = errorDescParam || 'Your reset link has expired or is invalid.'
                if (isMounted) {
                    setError(message)
                    setVerifyingSession(false)
                }
                return
            }

            // 2. If PKCE code exists in URL (direct redirect), exchange it now
            if (codeParam) {
                try {
                    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(codeParam)
                    if (exchangeError) {
                        console.warn('PKCE Code exchange error:', exchangeError.message)
                        if (isMounted) {
                            setError('The reset link has expired or is invalid. Please request a new link.')
                        }
                    } else if (data.session && isMounted) {
                        setSessionReady(true)
                        setError('')
                        // Clean the URL without triggering a router reload
                        window.history.replaceState({}, '', '/reset-password')
                    }
                } catch (err: any) {
                    console.error('Code exchange failed:', err)
                    if (isMounted) {
                        setError('Failed to verify reset link. Please request a new link.')
                    }
                }
            } 
            // 3. If token_hash exists (OTP link), verify it directly
            else if (tokenHashParam) {
                try {
                    const { data, error: tokenError } = await supabase.auth.verifyOtp({
                        token_hash: tokenHashParam,
                        type: (typeParam as any) || 'recovery'
                    })
                    if (tokenError) {
                        if (isMounted) {
                            setError(tokenError.message || 'The reset link has expired or is invalid.')
                        }
                    } else if (data.session && isMounted) {
                        setSessionReady(true)
                        setError('')
                        window.history.replaceState({}, '', '/reset-password')
                    }
                } catch (err: any) {
                    if (isMounted) {
                        setError('Verification error. Please request a new link.')
                    }
                }
            } 
            // 4. Check if we already have an active session (e.g., from /auth/callback)
            else {
                try {
                    const { data: { session } } = await supabase.auth.getSession()
                    if (session && isMounted) {
                        setSessionReady(true)
                    }
                } catch (err) {
                    console.warn('Session check warning:', err)
                }
            }

            if (isMounted) {
                setVerifyingSession(false)
            }
        }

        initializeRecovery()

        // 5. Listen to auth state changes (e.g. PASSWORD_RECOVERY event)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event: AuthChangeEvent, session: Session | null) => {
                if (!isMounted) return
                if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
                    setSessionReady(true)
                    setError('')
                }
            }
        )

        return () => {
            isMounted = false
            subscription.unsubscribe()
        }
    }, [codeParam, tokenHashParam, typeParam, errorParam, errorDescParam])

    // ========================================================
    // PASSWORD VALIDATION & STRENGTH LOGIC
    // ========================================================
    const hasMinLength = password.length >= 8
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[@$!%*#?&_\-\.]/.test(password)
    const allCriteriaMet = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial

    const passwordsMatch = password.length > 0 && password === confirmPassword
    const showMatchStatus = confirmPassword.length > 0

    // Calculate strength score (0 to 4)
    const calculateStrength = (): { score: number; label: string; color: string } => {
        if (!password) return { score: 0, label: 'None', color: '#e2e8f0' }

        let points = 0
        if (hasMinLength) points += 1
        if (hasUppercase && hasLowercase) points += 1
        if (hasNumber) points += 1
        if (hasSpecial) points += 1
        if (password.length >= 12 && allCriteriaMet) points += 1

        if (points <= 1) return { score: 1, label: 'Weak', color: '#ef4444' }
        if (points === 2) return { score: 2, label: 'Fair', color: '#f59e0b' }
        if (points === 3 || points === 4) return { score: 3, label: 'Good', color: '#10b981' }
        return { score: 4, label: 'Very Strong', color: '#047857' }
    }

    const strength = calculateStrength()

    // ========================================================
    // FORM SUBMISSION HANDLER
    // ========================================================
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        // Client-side validations
        if (!hasMinLength) {
            const msg = 'Password must be at least 8 characters long.'
            setError(msg)
            showToast(msg, 'error')
            return
        }

        if (!allCriteriaMet) {
            const msg = 'Please meet all password requirements before proceeding.'
            setError(msg)
            showToast(msg, 'error')
            return
        }

        if (!passwordsMatch) {
            const msg = 'Passwords do not match.'
            setError(msg)
            showToast(msg, 'error')
            return
        }

        setLoading(true)

        try {
            // Ensure active session exists
            const { data: { session: currentSession } } = await supabase.auth.getSession()
            
            if (!currentSession) {
                throw new Error('Your reset link has expired or is invalid. Please request a new link.')
            }

            // Update password via official Supabase Auth API
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            })

            if (updateError) {
                throw new Error(updateError.message || 'Failed to update password. Please try again.')
            }

            // SUCCESS PATH
            setSuccess(true)
            showToast('Password updated successfully! Redirecting to login...', 'success')

            // Safely sign out so the user signs in fresh with new credentials
            try {
                await supabase.auth.signOut({ scope: 'local' })
            } catch (signOutErr) {
                console.warn('Post-update signout warning:', signOutErr)
            }

        } catch (err: any) {
            console.error('Password reset error:', err)
            const msg = err.message || 'An unexpected error occurred while resetting your password.'
            setError(msg)
            showToast(msg, 'error')
        } finally {
            setLoading(false)
        }
    }

    // ========================================================
    // RENDER: SUCCESS VIEW
    // ========================================================
    if (success) {
        return (
            <div className={styles.pageWrapper}>
                <div className={styles.bgBlob1} />
                <div className={styles.bgBlob2} />

                <div className={styles.slidingCard} style={{ gridTemplateColumns: '1fr', maxWidth: '540px' }}>
                    <div className={styles.formPanel} style={{ padding: '3.5rem 2.5rem' }}>
                        <div className={styles.successCard}>
                            <div className={styles.successIconRing}>
                                <Check size={40} strokeWidth={3} />
                            </div>

                            <h1 className={styles.formTitle} style={{ fontSize: '1.6rem' }}>Password Reset Complete!</h1>
                            
                            <p className={styles.formSubtitle} style={{ marginTop: '0.65rem', maxWidth: '380px' }}>
                                Your password has been successfully updated. You can now use your new credentials to access the Barangay Gordon Heights portal.
                            </p>

                            <div className={styles.countdownPill}>
                                Redirecting to sign in page in <strong>{countdown}s</strong>...
                            </div>

                            <Link 
                                href="/login" 
                                className={styles.submitButton} 
                                style={{ textDecoration: 'none', maxWidth: '320px' }}
                            >
                                Return to Sign In Now →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // ========================================================
    // RENDER: MAIN FORM VIEW
    // ========================================================
    return (
        <div className={styles.pageWrapper}>
            <div className={styles.bgBlob1} />
            <div className={styles.bgBlob2} />

            <div className={styles.slidingCard}>
                {/* Left Showcase Panel */}
                <div 
                    className={styles.showcasePanel}
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                >
                    <div className={styles.showcaseTop}>
                        <div className={styles.brandingHeader}>
                            <div className={styles.logoRing}>
                                <Image 
                                    src="/logo.png" 
                                    alt="Barangay Logo" 
                                    width={50} 
                                    height={50} 
                                    priority
                                    style={{ objectFit: 'contain' }}
                                />
                            </div>
                            <div className={styles.brandTitles}>
                                <h2 className={styles.brandName}>Barangay Gordon Heights</h2>
                                <span className={styles.brandCity}>OLONGAPO CITY</span>
                            </div>
                        </div>

                        <div className={styles.carouselViewport}>
                            {SLIDES.map((slide, index) => (
                                <div 
                                    key={slide.id} 
                                    className={`${styles.slideContent} ${index === activeSlide ? styles.activeSlide : ''}`}
                                    aria-hidden={index !== activeSlide}
                                >
                                    <div className={styles.unifiedBox}>
                                        <div className={styles.sectionHeaderRow}>
                                            <span className={styles.sectionTag}>{slide.sectionTitle}</span>
                                        </div>
                                        
                                        <p className={styles.sectionDescription}>
                                            {slide.description}
                                        </p>

                                        <div className={styles.boxDivider} />

                                        <ul className={styles.featureGrid}>
                                            {slide.features.map((feature, fIdx) => (
                                                <li key={fIdx} className={styles.featureItem}>
                                                    <div className={styles.checkBadge}>
                                                        <Check size={11} strokeWidth={3} />
                                                    </div>
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.showcaseBottom}>
                        <div className={styles.indicatorContainer} role="tablist">
                            {SLIDES.map((slide, idx) => (
                                <button
                                    key={slide.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={idx === activeSlide}
                                    aria-label={`Go to ${slide.sectionTitle}`}
                                    className={`${styles.indicatorDot} ${idx === activeSlide ? styles.activeDot : ''}`}
                                    onClick={() => setActiveSlide(idx)}
                                />
                            ))}
                        </div>
                        <span className={styles.slideCounter}>
                            {SLIDES[activeSlide].sectionTitle}
                        </span>
                    </div>

                    <div className={styles.bottomWaveGraphic}>
                        <svg className={styles.bottomWaveSvg} viewBox="0 0 500 120" preserveAspectRatio="none" fill="none">
                            <path d="M0,80 C150,120 320,30 500,75 L500,120 L0,120 Z" fill="rgba(16, 185, 129, 0.12)" />
                            <path d="M0,50 C130,15 300,105 500,40 L500,120 L0,120 Z" fill="rgba(5, 150, 105, 0.18)" />
                            <path d="M0,70 C160,35 340,110 500,60 L500,120 L0,120 Z" fill="rgba(4, 120, 87, 0.22)" />
                        </svg>
                    </div>
                </div>

                {/* Right Form Panel */}
                <div className={styles.formPanel}>
                    <div className={styles.formTopRow}>
                        <Link href="/login" className={styles.backButton}>
                            <ArrowLeft size={16} />
                            <span>Back to Login</span>
                        </Link>
                    </div>

                    <div className={styles.formCenterWrapper}>
                        <div className={styles.formHeader}>
                            <div className={styles.formLogoBadge}>
                                <Image src="/logo.png" alt="Logo" width={56} height={56} priority style={{ objectFit: 'contain' }} />
                            </div>
                            <h1 className={styles.formTitle}>Set New Password</h1>
                            <p className={styles.formSubtitle}>
                                Create a secure new password for your resident account.
                            </p>
                        </div>

                        {/* Informative Error Banner */}
                        {error && (
                            <div className={`${styles.alertBox} ${styles.alertError}`} role="alert" style={{ marginBottom: '1rem' }}>
                                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                    <span>{error}</span>
                                </div>
                            </div>
                        )}

                        {/* Session Verification Status Notice */}
                        {verifyingSession && (
                            <div className={`${styles.alertBox} ${styles.alertInfo}`} style={{ marginBottom: '1rem' }}>
                                <RefreshCw size={15} className={styles.spinnerIcon} style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span>Verifying security authorization link...</span>
                            </div>
                        )}

                        {!verifyingSession && !sessionReady && !error && (
                            <div className={`${styles.alertBox} ${styles.alertWarning}`} style={{ marginBottom: '1rem' }}>
                                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                    <span>No active reset session detected. Please make sure you clicked the link from your email, or request a new link below.</span>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className={styles.form}>
                            {/* NEW PASSWORD FIELD */}
                            <div className={styles.inputGroup}>
                                <label htmlFor="new-password">NEW PASSWORD</label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        id="new-password"
                                        type={showPassword ? 'text' : 'password'}
                                        className={`${styles.inputField} ${styles.passwordInput}`}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        required
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        className={styles.eyeToggle}
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                {/* Dynamic Password Strength Meter */}
                                {password.length > 0 && (
                                    <div className={styles.strengthMeterContainer}>
                                        <div className={styles.strengthMeterHeader}>
                                            <span className={styles.strengthTitle}>Password Strength</span>
                                            <span className={styles.strengthBadge} style={{ color: strength.color }}>
                                                {strength.label}
                                            </span>
                                        </div>
                                        <div className={styles.strengthTracks}>
                                            {[1, 2, 3, 4].map((seg) => (
                                                <div 
                                                    key={seg} 
                                                    className={styles.strengthSegment}
                                                    style={{ 
                                                        background: seg <= strength.score ? strength.color : '#e2e8f0' 
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Real-time Requirement Checklist */}
                                <div className={styles.requirementBox}>
                                    <div className={styles.requirementGrid}>
                                        <div className={`${styles.requirementItem} ${hasMinLength ? styles.requirementValid : styles.requirementInvalid}`}>
                                            {hasMinLength ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={2.5} />}
                                            <span>At least 8 characters</span>
                                        </div>
                                        <div className={`${styles.requirementItem} ${hasUppercase ? styles.requirementValid : styles.requirementInvalid}`}>
                                            {hasUppercase ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={2.5} />}
                                            <span>Uppercase letter (A-Z)</span>
                                        </div>
                                        <div className={`${styles.requirementItem} ${hasLowercase ? styles.requirementValid : styles.requirementInvalid}`}>
                                            {hasLowercase ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={2.5} />}
                                            <span>Lowercase letter (a-z)</span>
                                        </div>
                                        <div className={`${styles.requirementItem} ${hasNumber ? styles.requirementValid : styles.requirementInvalid}`}>
                                            {hasNumber ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={2.5} />}
                                            <span>Number (0-9)</span>
                                        </div>
                                        <div className={`${styles.requirementItem} ${hasSpecial ? styles.requirementValid : styles.requirementInvalid}`}>
                                            {hasSpecial ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={2.5} />}
                                            <span>Special char (@$!%*#?&)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CONFIRM PASSWORD FIELD */}
                            <div className={styles.inputGroup}>
                                <label htmlFor="confirm-password">CONFIRM NEW PASSWORD</label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        id="confirm-password"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        className={`${styles.inputField} ${styles.passwordInput}`}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        required
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        className={styles.eyeToggle}
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                        tabIndex={-1}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                {showMatchStatus && (
                                    <div>
                                        <span className={`${styles.matchBadge} ${passwordsMatch ? styles.matchSuccess : styles.matchError}`}>
                                            {passwordsMatch ? (
                                                <>
                                                    <Check size={12} strokeWidth={3} />
                                                    <span>Passwords match</span>
                                                </>
                                            ) : (
                                                <>
                                                    <X size={12} strokeWidth={3} />
                                                    <span>Passwords do not match</span>
                                                </>
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* SUBMIT BUTTON */}
                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={
                                    loading || 
                                    !allCriteriaMet || 
                                    !passwordsMatch || 
                                    (!sessionReady && !codeParam && !tokenHashParam)
                                }
                            >
                                {loading ? (
                                    <>
                                        <span className={styles.spinnerIcon} />
                                        <span>Updating Password...</span>
                                    </>
                                ) : (
                                    <>
                                        <Lock size={16} />
                                        <span>Update Password</span>
                                    </>
                                )}
                            </button>

                            {/* Secondary Link to Forgot Password */}
                            <Link href="/forgot-password" className={styles.secondaryActionBtn}>
                                Request a New Reset Link
                            </Link>
                        </form>
                    </div>

                    <div>
                        <div className={styles.formDivider} />
                        <div className={styles.formFooter}>
                            <p className={styles.footerText}>
                                Remember your password?
                                <Link href="/login" className={styles.link}>Sign In</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f4fbf6' }}>
                <div style={{ textAlign: 'center', color: '#065f46', fontWeight: 600 }}>
                    <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        border: '3px solid #d1fae5', 
                        borderTopColor: '#059669', 
                        borderRadius: '50%', 
                        animation: 'spin 0.8s linear infinite',
                        margin: '0 auto 12px' 
                    }} />
                    Loading Password Reset...
                </div>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    )
}