'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
    Eye, EyeOff, Check, ArrowLeft, AlertCircle, CheckCircle, ChevronDown, ChevronUp,
    User, Plane, Accessibility, UserPlus, Heart, Briefcase, UserMinus, HandHeart, Baby, Zap, Users, BookX
} from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import styles from './register.module.css'

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

const SECTOR_OPTIONS = [
    { value: 'Solo Parent', icon: <User size={14} /> },
    { value: 'OFW', icon: <Plane size={14} /> },
    { value: 'PWD', icon: <Accessibility size={14} /> },
    { value: 'Senior Citizen', icon: <UserPlus size={14} /> },
    { value: 'LGBTQ+', icon: <Heart size={14} /> },
    { value: 'Employed', icon: <Briefcase size={14} /> },
    { value: 'Unemployed', icon: <UserMinus size={14} /> },
    { value: '4Ps Beneficiary', icon: <HandHeart size={14} /> },
    { value: 'Pregnant/Lactating', icon: <Baby size={14} /> },
    { value: 'Youth (15-30)', icon: <Zap size={14} /> },
    { value: 'Indigenous People', icon: <Users size={14} /> },
    { value: 'OSC', label: 'OSC (Out-of-School Children)', icon: <BookX size={14} /> },
    { value: 'OSY', label: 'OSY (Out-of-School Youth)', icon: <BookX size={14} /> },
    { value: 'OSA', label: 'OSA (Out-of-School Adult)', icon: <BookX size={14} /> },
]

function RegisterContent() {
    const [firstName, setFirstName] = useState('')
    const [middleName, setMiddleName] = useState('')
    const [lastName, setLastName] = useState('')
    const [suffix, setSuffix] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [address, setAddress] = useState('')
    const [phone, setPhone] = useState('')
    const [birthdate, setBirthdate] = useState('')
    const [gender, setGender] = useState<'Male' | 'Female' | ''>('')
    const [relationshipStatus, setRelationshipStatus] = useState('')
    const [sectors, setSectors] = useState<string[]>([])
    const [showSectors, setShowSectors] = useState(false)
    const [agreedToTerms, setAgreedToTerms] = useState(false)
    const [showTermsModal, setShowTermsModal] = useState(false)
    const [showPrivacyModal, setShowPrivacyModal] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    // Left Carousel state
    const [activeSlide, setActiveSlide] = useState(0)
    const [isPaused, setIsPaused] = useState(false)

    const { signUp } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    const rawRedirect = searchParams ? searchParams.get('redirect') : null
    const safeRedirect = (rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')) ? rawRedirect : null
    const redirectUrl = safeRedirect

    // Auto-advance slides
    useEffect(() => {
        if (isPaused) return
        const timer = setInterval(() => {
            setActiveSlide((prev) => (prev + 1) % SLIDES.length)
        }, 6000)
        return () => clearInterval(timer)
    }, [isPaused])

    // Password criteria validations
    const hasMinLength = password.length >= 8
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[@$!%*#?&]/.test(password)
    const allCriteriaMet = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial

    const handleSectorToggle = (val: string) => {
        setSectors(prev => 
            prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        if (!allCriteriaMet) {
            setError('Please fulfill all password security requirements.')
            return
        }

        const cleanedPhone = phone.replace(/[\s-]/g, '')
        const phoneRegex = /^(09|\+639)\d{9}$/
        if (!phoneRegex.test(cleanedPhone)) {
            setError('Please enter a valid Philippine mobile number (e.g., 09171234567).')
            return
        }

        if (!birthdate) {
            setError('Please enter your birthdate.')
            return
        }
        const birthDateObj = new Date(birthdate)
        const today = new Date()
        if (birthDateObj >= today) {
            setError('Birthdate cannot be in the future.')
            return
        }
        let age = today.getFullYear() - birthDateObj.getFullYear()
        const m = today.getMonth() - birthDateObj.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
            age--
        }
        if (age < 15) {
            setError('You must be at least 15 years old to register.')
            return
        }

        if (!gender) {
            setError('Please select your gender.')
            return
        }

        if (!relationshipStatus) {
            setError('Please select your relationship status.')
            return
        }

        if (!agreedToTerms) {
            setError('Please agree to the Terms and Conditions and Privacy Policy.')
            return
        }

        setLoading(true)

        // Prevent duplicate accounts
        try {
            const { data: emailExists, error: checkError } = await supabase.rpc('check_email_exists', { p_email: email })
            if (!checkError && emailExists) {
                setError('This email address is already registered. Please use a different email or log in.')
                setLoading(false)
                return
            }
        } catch (e) {
            console.warn('Email check error:', e)
        }

        const fullName = `${firstName}${middleName ? ' ' + middleName : ''} ${lastName}${suffix ? ' ' + suffix : ''}`.trim()

        const { error: signUpError } = await signUp(email, password, {
            fullName,
            firstName,
            middleName: middleName || undefined,
            lastName,
            suffix: suffix || undefined,
            gender: gender as 'Male' | 'Female',
            relationshipStatus,
            address: address || undefined,
            phone: phone || undefined,
            birthdate: birthdate || undefined,
            sectors: sectors
        }, `${window.location.origin}/auth/confirm`)

        if (signUpError) {
            setError(signUpError)
            setLoading(false)
            return
        }

        setSuccess(true)
        setLoading(false)
    }

    if (success) {
        return (
            <div className={styles.pageWrapper}>
                <div className={styles.bgBlob1} />
                <div className={styles.bgBlob2} />

                <div className={styles.slidingCard} style={{ maxWidth: '640px', height: 'auto', padding: '3.5rem 2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                        <CheckCircle size={38} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', color: '#111827', fontWeight: 700, marginBottom: '0.5rem' }}>Account Created Successfully!</h2>
                    <p style={{ color: '#4b5563', fontSize: '0.95rem', maxWidth: '440px', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                        We have sent a verification link to <strong>{email}</strong>. Please check your inbox and verify your email to activate your account.
                    </p>
                    <Link href={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : "/login"} className={styles.createButton} style={{ textDecoration: 'none', maxWidth: '280px' }}>
                        Proceed to Sign In
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.bgBlob1} />
            <div className={styles.bgBlob2} />

            <div className={styles.slidingCard}>
                {/* ------------------------------------------------------------- */}
                {/* LEFT PANEL: Deep Green Integrated Showcase (Matching Login)   */}
                {/* ------------------------------------------------------------- */}
                <div 
                    className={styles.showcasePanel}
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                >
                    <div className={styles.showcaseTop}>
                        {/* Branding Header */}
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

                    {/* Bottom Indicators & Waves */}
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

                    {/* Decorative Bottom Wave */}
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
                {/* RIGHT PANEL: Structured Scrollable Registration Form          */}
                {/* ------------------------------------------------------------- */}
                <div className={styles.formPanel}>
                    {/* Top Row: Back to Home */}
                    <div className={styles.formTopRow}>
                        <Link href="/" className={styles.backButton}>
                            <ArrowLeft size={15} />
                            <span>Back to Home</span>
                        </Link>
                    </div>

                    {/* Scrollable Form Content */}
                    <div className={styles.scrollableFormArea}>
                        {/* Header */}
                        <div className={styles.formHeader}>
                            <div className={styles.formLogoBadge}>
                                <Image 
                                    src="/logo.png" 
                                    alt="Barangay Logo" 
                                    width={56} 
                                    height={56}
                                    priority
                                    style={{ objectFit: 'contain' }}
                                />
                            </div>
                            <h1 className={styles.formTitle}>Create Account</h1>
                            <div className={styles.formSubtitle}>Join the E-Barangay system</div>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className={`${styles.alertBox} ${styles.alertError}`} role="alert" style={{ marginBottom: '1rem' }}>
                                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className={styles.form}>
                            {/* Row 1: First Name & Middle Name */}
                            <div className={styles.fieldRow}>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="firstName">First Name *</label>
                                    <input
                                        id="firstName"
                                        type="text"
                                        className={styles.inputField}
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Juan"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="middleName">Middle Name</label>
                                    <input
                                        id="middleName"
                                        type="text"
                                        className={styles.inputField}
                                        value={middleName}
                                        onChange={(e) => setMiddleName(e.target.value)}
                                        placeholder="Luna"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            {/* Row 2: Last Name & Suffix */}
                            <div className={styles.fieldRow}>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="lastName">Last Name *</label>
                                    <input
                                        id="lastName"
                                        type="text"
                                        className={styles.inputField}
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Dela Cruz"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="suffix">Suffix</label>
                                    <select
                                        id="suffix"
                                        className={styles.selectField}
                                        value={suffix}
                                        onChange={(e) => setSuffix(e.target.value)}
                                        disabled={loading}
                                    >
                                        <option value="">None</option>
                                        <option value="Jr.">Jr.</option>
                                        <option value="Sr.">Sr.</option>
                                        <option value="II">II</option>
                                        <option value="III">III</option>
                                        <option value="IV">IV</option>
                                        <option value="V">V</option>
                                    </select>
                                </div>
                            </div>

                            {/* Row 3: Email Address */}
                            <div className={styles.inputGroup}>
                                <label htmlFor="email">Email Address *</label>
                                <input
                                    id="email"
                                    type="email"
                                    className={styles.inputField}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    disabled={loading}
                                    autoComplete="username"
                                />
                            </div>

                            {/* Row 4: Password & Confirm Password */}
                            <div className={styles.fieldRow}>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="password">Password *</label>
                                    <div className={styles.passwordInputWrapper}>
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            className={styles.inputField}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            disabled={loading}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className={styles.passwordToggle}
                                            onClick={() => setShowPassword(!showPassword)}
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.inputGroup}>
                                    <label htmlFor="confirmPassword">Confirm Password *</label>
                                    <div className={styles.passwordInputWrapper}>
                                        <input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            className={styles.inputField}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            disabled={loading}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className={styles.passwordToggle}
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            tabIndex={-1}
                                        >
                                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Password Requirements Box */}
                            <div className={styles.passwordValidationBox}>
                                <div className={`${styles.ruleItem} ${hasMinLength ? styles.valid : ''}`}>
                                    <div className={styles.ruleIcon}>{hasMinLength ? <Check size={12} strokeWidth={3} /> : '•'}</div>
                                    <span>At least 8 characters</span>
                                </div>
                                <div className={`${styles.ruleItem} ${hasUppercase ? styles.valid : ''}`}>
                                    <div className={styles.ruleIcon}>{hasUppercase ? <Check size={12} strokeWidth={3} /> : '•'}</div>
                                    <span>Uppercase letter</span>
                                </div>
                                <div className={`${styles.ruleItem} ${hasLowercase ? styles.valid : ''}`}>
                                    <div className={styles.ruleIcon}>{hasLowercase ? <Check size={12} strokeWidth={3} /> : '•'}</div>
                                    <span>Lowercase letter</span>
                                </div>
                                <div className={`${styles.ruleItem} ${hasNumber ? styles.valid : ''}`}>
                                    <div className={styles.ruleIcon}>{hasNumber ? <Check size={12} strokeWidth={3} /> : '•'}</div>
                                    <span>Number</span>
                                </div>
                                <div className={`${styles.ruleItem} ${hasSpecial ? styles.valid : ''}`}>
                                    <div className={styles.ruleIcon}>{hasSpecial ? <Check size={12} strokeWidth={3} /> : '•'}</div>
                                    <span>Special character (@$!%*#?&)</span>
                                </div>
                            </div>

                            {/* Row 5: Full Home Address */}
                            <div className={styles.inputGroup}>
                                <label htmlFor="address">Full Home Address *</label>
                                <input
                                    id="address"
                                    type="text"
                                    className={styles.inputField}
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Street, Blk/Lot, Gordon Heights, Olongapo City"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            {/* Row 6: Phone Number & Birthdate */}
                            <div className={styles.fieldRow}>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="phone">Phone Number *</label>
                                    <input
                                        id="phone"
                                        type="tel"
                                        className={styles.inputField}
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="09XX XXX XXXX"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="birthdate">Birthdate *</label>
                                    <input
                                        id="birthdate"
                                        type="date"
                                        className={styles.inputField}
                                        value={birthdate}
                                        onChange={(e) => setBirthdate(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            {/* Row 7: Gender & Relationship Status */}
                            <div className={styles.fieldRow}>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="gender">Gender *</label>
                                    <select
                                        id="gender"
                                        className={styles.selectField}
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value as any)}
                                        required
                                        disabled={loading}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="relationshipStatus">Relationship Status *</label>
                                    <select
                                        id="relationshipStatus"
                                        className={styles.selectField}
                                        value={relationshipStatus}
                                        onChange={(e) => setRelationshipStatus(e.target.value)}
                                        required
                                        disabled={loading}
                                    >
                                        <option value="">Select Status</option>
                                        <option value="Single">Single</option>
                                        <option value="Married">Married</option>
                                        <option value="Widowed">Widowed</option>
                                        <option value="Separated">Separated</option>
                                        <option value="Divorced">Divorced</option>
                                    </select>
                                </div>
                            </div>

                            {/* Row 8: Sectoral Classification (Optional) */}
                            <div className={styles.sectorAccordion}>
                                <button
                                    type="button"
                                    className={styles.sectorHeader}
                                    onClick={() => setShowSectors(!showSectors)}
                                >
                                    <span>Sectoral Classification (Optional) {sectors.length > 0 && `(${sectors.length} selected)`}</span>
                                    {showSectors ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                {showSectors && (
                                    <div className={styles.sectorChipsGrid}>
                                        {SECTOR_OPTIONS.map((opt) => {
                                            const isSelected = sectors.includes(opt.value)
                                            return (
                                                <div
                                                    key={opt.value}
                                                    className={`${styles.sectorChip} ${isSelected ? styles.activeChip : ''}`}
                                                    onClick={() => handleSectorToggle(opt.value)}
                                                >
                                                    <span>{opt.icon}</span>
                                                    <span>{opt.label || opt.value}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Row 9: Terms and Conditions Agreement */}
                            <div className={styles.termsRow}>
                                <input
                                    id="terms"
                                    type="checkbox"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    required
                                />
                                <label htmlFor="terms">
                                    I have read and agree to the <button type="button" onClick={() => setShowTermsModal(true)} className={styles.modalLink}>Terms and Conditions</button> and <button type="button" onClick={() => setShowPrivacyModal(true)} className={styles.modalLink}>Privacy Policy</button>
                                </label>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className={styles.createButton}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className={styles.spinnerIcon} />
                                        <span>Creating Account...</span>
                                    </>
                                ) : (
                                    'Create Account'
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Bottom Registration Footer */}
                    <div className={styles.formDivider} />
                    <div className={styles.formFooter}>
                        <p className={styles.footerText}>
                            Already have an account?
                            <Link 
                                href={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : "/login"} 
                                className={styles.signinLink}
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Terms Modal */}
            {showTermsModal && (
                <div className={styles.modalOverlay} onClick={() => setShowTermsModal(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>Terms and Conditions</h3>
                            <button type="button" onClick={() => setShowTermsModal(false)} className={styles.closeButton}>&times;</button>
                        </div>
                        <div className={styles.modalBody}>
                            <p>These Terms and Conditions represent a binding agreement with Barangay Gordon Heights E-Barangay portal. By creating an account, you agree to:</p>
                            <ul>
                                <li>Provide accurate and truthful information during registration.</li>
                                <li>Use the portal services solely for legitimate barangay requests and transactions.</li>
                                <li>Maintain confidentiality of your login credentials.</li>
                                <li>Comply with local ordinances and national laws.</li>
                            </ul>
                            <h4>1. Acceptance of Terms</h4>
                            <p>By accessing or using E-Barangay, you agree to be bound by these terms. If you do not agree, please do not use our services.</p>
                            <h4>2. Account Responsibility</h4>
                            <p>You are responsible for all activities that occur under your account.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Privacy Modal */}
            {showPrivacyModal && (
                <div className={styles.modalOverlay} onClick={() => setShowPrivacyModal(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>Privacy Policy</h3>
                            <button type="button" onClick={() => setShowPrivacyModal(false)} className={styles.closeButton}>&times;</button>
                        </div>
                        <div className={styles.modalBody}>
                            <p>Barangay Gordon Heights is committed to protecting your privacy in full compliance with the Philippine Data Privacy Act of 2012 (RA 10173).</p>
                            <h4>Data Collection & Storage</h4>
                            <p>We collect personal information such as your name, email, birthdate, phone number, and address strictly to facilitate barangay services and official certificate requests.</p>
                            <h4>User Rights</h4>
                            <ul>
                                <li><strong>Right to be Informed:</strong> Know how your data is collected and processed.</li>
                                <li><strong>Right to Access:</strong> View information recorded in your citizen profile.</li>
                                <li><strong>Right to Rectification:</strong> Request corrections to outdated or inaccurate records.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className={styles.pageWrapper}>
                <div className={styles.slidingCard} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className={styles.spinnerIcon} style={{ borderColor: 'rgba(5, 150, 105, 0.2)', borderTopColor: '#059669', width: '2rem', height: '2rem' }} />
                </div>
            </div>
        }>
            <RegisterContent />
        </Suspense>
    )
}
