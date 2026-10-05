'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Info, ArrowLeft, Check, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import styles from './login.module.css'

const SLIDES = [
    {
        id: 0,
        sectionTitle: "MANDATE",
        description: "Barangay Gordon Heights is responsible for delivering essential services, maintaining peace and order, implementing local governance and facilitating citizen's participation.",
        features: [
            "Delivering essential community services",
            "Maintaining peace and public order",
            "Implementing transparent local governance",
            "Facilitating citizen's active participation"
        ]
    },
    {
        id: 1,
        sectionTitle: "VISION",
        description: "Peaceful barangay, God fearing, productive with self-reliance and with law abiding citizens.",
        features: [
            "Peaceful, secure, and orderly barangay",
            "God fearing and values-driven community",
            "Productive citizens with self-reliance",
            "Law abiding and empowered residents"
        ]
    },
    {
        id: 2,
        sectionTitle: "MISSION",
        description: "To translate the convention on the rights of every Filipino into local policies, sustainable programs and services, and support the survival, protection, development and participation of the people in community building through the provision of good education, health and other institution with special protection, information, communication by legislating ordinances, formulating strategies, enforcing and implementing the same.",
        features: [
            "Translate Filipino rights into local policies",
            "Sustainable community programs & services",
            "Support education, health & special protection",
            "Legislate ordinances & enforce strategies"
        ]
    },
    {
        id: 3,
        sectionTitle: "SERVICE PLEDGE",
        description: "Barangay Gordon Heights pledge and commit to deliver efficient and quality public service:",
        features: [
            "Serve with honesty and integrity",
            "Be polite and courteous at all times",
            "Demonstrate appropriate behavior and professionalism",
            "Be prompt and timely",
            "Provide adequate and reliable information",
            "Be available during office hours",
            "Provide feedback mechanism and respond to complaints",
            "Equal treatment to all"
        ]
    }
]

function LoginContent() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [unconfirmedEmail, setUnconfirmedEmail] = useState('')
    const [resending, setResending] = useState(false)
    
    // Carousel State
    const [activeSlide, setActiveSlide] = useState(0)
    const [isPaused, setIsPaused] = useState(false)

    const { signIn, resendOtp } = useAuth()
    const { showToast, updateToast } = useToast()
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectUrl = searchParams ? searchParams.get('redirect') : null

    // Auto-advance slides with pause-on-hover
    useEffect(() => {
        if (isPaused) return
        const timer = setInterval(() => {
            setActiveSlide((prev) => (prev + 1) % SLIDES.length)
        }, 6000)
        return () => clearInterval(timer)
    }, [isPaused])

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

        const emailRegex = /^[^\s@]+@[^\s@]+$/
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

// Resolve role instantly from verified session metadata (0ms latency, no extra round-trip to Sydney)
let role = session.user.app_metadata?.role || session.user.user_metadata?.role
if (!role) {
    try {
        const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
        role = profileData?.role || 'resident'
    } catch {
        role = 'resident'
    }
}
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
        <div className={styles.pageWrapper}>
            {/* Ambient Background Accents */}
            <div className={styles.bgBlob1} />
            <div className={styles.bgBlob2} />

            <div className={styles.slidingCard}>
                {/* ------------------------------------------------------------- */}
                {/* LEFT PANEL: Deep Green Showcase with Unified Text Box         */}
                {/* ------------------------------------------------------------- */}
                <div 
                    className={styles.showcasePanel}
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                >
                    <div className={styles.showcaseTop}>
                        {/* Official Barangay Header */}
                        <div className={styles.brandingHeader}>
                            <div className={styles.logoRing}>
                                <Image 
                                    src="/logo.png" 
                                    alt="Barangay Gordon Heights Logo" 
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

                        {/* Carousel Slides Container with Unified Text Box */}
                        <div className={styles.carouselViewport}>
                            {SLIDES.map((slide, index) => (
                                <div 
                                    key={slide.id} 
                                    className={`${styles.slideContent} ${index === activeSlide ? styles.activeSlide : ''}`}
                                    aria-hidden={index !== activeSlide}
                                >
                                    {/* Single Unified Modern Card/Text Box */}
                                    <div className={styles.unifiedBox}>
                                        <div className={styles.sectionHeaderRow}>
                                            <span className={styles.sectionTag}>{slide.sectionTitle}</span>
                                        </div>
                                        
                                        <p className={styles.sectionDescription}>
                                            {slide.description}
                                        </p>

                                        <div className={styles.boxDivider} />

                                        {/* Neatly Aligned 2-Column Feature Grid */}
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

                    {/* Bottom Indicators & Wave Graphic */}
                    <div className={styles.showcaseBottom}>
                        <div className={styles.indicatorContainer} role="tablist" aria-label="Portal Highlights Carousel">
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

                    {/* Decorative Bottom Organic Waves */}
                    <div className={styles.bottomWaveGraphic}>
                        <svg 
                            className={styles.bottomWaveSvg} 
                            viewBox="0 0 500 120" 
                            preserveAspectRatio="none"
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path 
                                d="M0,80 C150,120 320,30 500,75 L500,120 L0,120 Z" 
                                fill="rgba(16, 185, 129, 0.12)" 
                            />
                            <path 
                                d="M0,50 C130,15 300,105 500,40 L500,120 L0,120 Z" 
                                fill="rgba(5, 150, 105, 0.18)" 
                            />
                            <path 
                                d="M0,70 C160,35 340,110 500,60 L500,120 L0,120 Z" 
                                fill="rgba(4, 120, 87, 0.22)" 
                            />
                        </svg>
                    </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* RIGHT PANEL: Clean Modern White Form                         */}
                {/* ------------------------------------------------------------- */}
                <div className={styles.formPanel}>
                    {/* Back to Home Link */}
                    <div className={styles.formTopRow}>
                        <Link href="/" className={styles.backButton}>
                            <ArrowLeft size={16} />
                            <span>Back to Home</span>
                        </Link>
                    </div>

                    {/* Centered Form Wrapper */}
                    <div className={styles.formCenterWrapper}>
                        {/* Center Logo & Title */}
                        <div className={styles.formHeader}>
                            <div className={styles.formLogoBadge}>
                                <Image 
                                    src="/logo.png" 
                                    alt="Barangay Gordon Heights Logo" 
                                    width={64} 
                                    height={64}
                                    priority
                                    style={{ objectFit: 'contain' }}
                                />
                            </div>
                            <h1 className={styles.formTitle}>Barangay Gordon Heights</h1>
                            <div className={styles.formSubtitle}>E-BARANGAY SYSTEM</div>
                        </div>

                        {/* Sign In Form */}
                        <form onSubmit={handleSubmit} className={styles.form}>
                            {redirectUrl && redirectUrl.startsWith('/request/') && (
                                <div className={`${styles.alertBox} ${styles.alertInfo}`}>
                                    <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span>Please sign in to complete your document request. You will be redirected back immediately.</span>
                                </div>
                            )}

                            {successMessage && (
                                <div className={`${styles.alertBox} ${styles.alertSuccess}`}>
                                    <CheckCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span>{successMessage}</span>
                                </div>
                            )}

                            {error && (
                                <div className={`${styles.alertBox} ${styles.alertError}`} role="alert">
                                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <div>
                                        <div>{error}</div>
                                        {unconfirmedEmail && email.trim() === unconfirmedEmail && (
                                            <button
                                                type="button"
                                                className={styles.resendBtn}
                                                onClick={handleResendVerification}
                                                disabled={resending}
                                            >
                                                {resending ? 'Resending verification link...' : 'Resend verification email'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Email Address Field */}
                            <div className={styles.inputGroup}>
                                <label htmlFor="email">EMAIL ADDRESS</label>
                                <input
                                    id="email"
                                    type="email"
                                    className={styles.inputField}
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value)
                                        if (error) setError('')
                                    }}
                                    placeholder="you@example.com"
                                    required
                                    disabled={loading}
                                    autoComplete="username"
                                />
                            </div>

                            {/* Password Field with Eye Toggle */}
                            <div className={styles.inputGroup}>
                                <label htmlFor="password">PASSWORD</label>
                                <div className={styles.passwordInputWrapper}>
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        className={styles.inputField}
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value)
                                            if (error) setError('')
                                        }}
                                        placeholder="••••••••"
                                        required
                                        disabled={loading}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className={styles.passwordToggle}
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={loading}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Forgot Password Row */}
                            <div className={styles.forgotPasswordRow}>
                                <Link href="/forgot-password" className={styles.forgotPasswordLink}>
                                    Forgot Password?
                                </Link>
                            </div>

                            {/* Primary Action Button */}
                            <button
                                type="submit"
                                className={styles.signInButton}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className={styles.spinnerIcon} />
                                        <span>Signing In...</span>
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Bottom Registration Row with Divider */}
                    <div>
                        <div className={styles.formDivider} />
                        <div className={styles.formFooter}>
                            <p className={styles.footerText}>
                                Don&apos;t have an account?
                                <Link 
                                    href={searchParams.get('redirect') ? `/register?redirect=${encodeURIComponent(searchParams.get('redirect')!)}` : "/register"} 
                                    className={styles.signupLink}
                                >
                                    Sign up here
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className={styles.pageWrapper}>
                <div className={styles.slidingCard} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '450px' }}>
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <span className={styles.spinnerIcon} style={{ borderColor: 'rgba(5, 150, 105, 0.2)', borderTopColor: '#059669', width: '2rem', height: '2rem', margin: '0 auto 1rem' }} />
                        <p style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: 500 }}>Loading E-Barangay Portal...</p>
                    </div>
                </div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    )
}
