'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Check, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import styles from './forgot-password.module.css'

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

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [activeSlide, setActiveSlide] = useState(0)
    const [isPaused, setIsPaused] = useState(false)
    const { showToast } = useToast()

    useEffect(() => {
        if (isPaused) return
        const timer = setInterval(() => {
            setActiveSlide((prev) => (prev + 1) % SLIDES.length)
        }, 6000)
        return () => clearInterval(timer)
    }, [isPaused])

    const [cooldown, setCooldown] = useState(0)

    useEffect(() => {
        if (cooldown <= 0) return
        const timer = setInterval(() => {
            setCooldown((prev) => prev - 1)
        }, 1000)
        return () => clearInterval(timer)
    }, [cooldown])

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!email.trim()) return

        setLoading(true)
        setError('')

        // Use /auth/callback?next=/reset-password so Next.js server exchanges the PKCE code and sets session cookies reliably
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        })

        setLoading(false)

        if (error) {
            setError(error.message)
            showToast(error.message, 'error')
        } else {
            setSubmitted(true)
            setCooldown(45)
            showToast('Reset instructions dispatched! Please check your inbox.', 'success')
        }
    }

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
                                <Image src="/logo.png" alt="Logo" width={64} height={64} priority style={{ objectFit: 'contain' }} />
                            </div>
                            <h1 className={styles.formTitle}>{submitted ? 'Check Your Inbox' : 'Forgot Password'}</h1>
                            <p className={styles.formSubtitle}>
                                {submitted
                                    ? `We've sent a password reset link to ${email}`
                                    : 'Enter your registered email address and we will send you a reset link.'}
                            </p>
                        </div>

                        {!submitted ? (
                            <form onSubmit={handleSubmit} className={styles.form}>
                                {error && (
                                    <div className={`${styles.alertBox} ${styles.alertError}`} role="alert">
                                        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className={styles.inputGroup}>
                                    <label htmlFor="email">EMAIL ADDRESS</label>
                                    <input
                                        id="email"
                                        type="email"
                                        className={styles.inputField}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className={styles.submitButton}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className={styles.spinnerIcon} />
                                            <span>Sending...</span>
                                        </>
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </button>
                            </form>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                                <div className={`${styles.alertBox} ${styles.alertSuccess}`}>
                                    <CheckCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span>Password reset instructions have been sent to <strong>{email}</strong>.</span>
                                </div>

                                <div style={{ 
                                    background: '#f8fafc', 
                                    border: '1px solid #e2e8f0', 
                                    borderRadius: '10px', 
                                    padding: '0.9rem 1rem', 
                                    fontSize: '0.82rem', 
                                    color: '#475569',
                                    lineHeight: 1.5 
                                }}>
                                    <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>💡 Haven't seen the email yet?</strong>
                                    • Check your <strong>Spam or Junk folder</strong> in case it was filtered.<br />
                                    • Click the secure reset link inside the email to set your new password.
                                </div>

                                <Link 
                                    href="/login" 
                                    className={styles.submitButton} 
                                    style={{ textDecoration: 'none', textAlign: 'center' }}
                                >
                                    Return to Sign In
                                </Link>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => handleSubmit()}
                                        disabled={loading || cooldown > 0}
                                        style={{ 
                                            background: 'none', 
                                            border: 'none', 
                                            color: cooldown > 0 ? '#94a3b8' : '#059669', 
                                            fontWeight: 600, 
                                            cursor: cooldown > 0 ? 'not-allowed' : 'pointer', 
                                            fontSize: '0.83rem',
                                            padding: 0
                                        }}
                                    >
                                        {cooldown > 0 ? `Resend email (${cooldown}s)` : 'Resend reset link'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setSubmitted(false)}
                                        style={{ 
                                            background: 'none', 
                                            border: 'none', 
                                            color: '#64748b', 
                                            fontWeight: 500, 
                                            cursor: 'pointer', 
                                            fontSize: '0.83rem',
                                            padding: 0
                                        }}
                                    >
                                        Change email
                                    </button>
                                </div>
                            </div>
                        )}
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
