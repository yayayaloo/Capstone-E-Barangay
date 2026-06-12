'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Check, CheckCircle2, XCircle, ShieldCheck, ShieldAlert, User, Plane, Accessibility, UserPlus, Heart, Briefcase, UserMinus, HandHeart, Baby, Zap, Users, BookX, Info, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import styles from './register.module.css'
import loginStyles from '../login/login.module.css'

const SECTOR_OPTIONS = [
    { value: 'Solo Parent', icon: <User size={16} /> },
    { value: 'OFW', icon: <Plane size={16} /> },
    { value: 'PWD', icon: <Accessibility size={16} /> },
    { value: 'Senior Citizen', icon: <UserPlus size={16} /> },
    { value: 'LGBTQ+', icon: <Heart size={16} /> },
    { value: 'Employed', icon: <Briefcase size={16} /> },
    { value: 'Unemployed', icon: <UserMinus size={16} /> },
    { value: '4Ps Beneficiary', icon: <HandHeart size={16} /> },
    { value: 'Pregnant/Lactating', icon: <Baby size={16} /> },
    { value: 'Youth (15-30)', icon: <Zap size={16} /> },
    { value: 'Indigenous People', icon: <Users size={16} /> },
    { value: 'OSC', label: 'OSC (Out-of-School Children)', icon: <BookX size={16} /> },
    { value: 'OSY', label: 'OSY (Out-of-School Youth)', icon: <BookX size={16} /> },
    { value: 'OSA', label: 'OSA (Out-of-School Adult)', icon: <BookX size={16} /> },
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
    const [idDocument, setIdDocument] = useState<File | null>(null)
    const [sectors, setSectors] = useState<string[]>([])
    const [showSectors, setShowSectors] = useState(false)
    const [agreedToTerms, setAgreedToTerms] = useState(false)
    const [showTermsModal, setShowTermsModal] = useState(false)
    const [showPrivacyModal, setShowPrivacyModal] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [passwordError, setPasswordError] = useState('')
    const [uploadFailed, setUploadFailed] = useState(false)
    const { signUp } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectUrl = searchParams ? searchParams.get('redirect') : null


    // Real-time validation logic
    const hasMinLength = password.length >= 8
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[@$!%*#?&]/.test(password)
    const allCriteriaMet = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial

    // Live confirmation logic
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0
    const showMatchStatus = confirmPassword.length > 0

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }

        if (!allCriteriaMet) {
            setError('Password does not meet all security requirements')
            return
        }

        const cleanedPhone = phone.replace(/[\s-]/g, '')
        const phoneRegex = /^(09|\+639)\d{9}$/
        if (!phoneRegex.test(cleanedPhone)) {
            setError('Please enter a valid Philippine mobile number (e.g., 09171234567).')
            return
        }

        if (!birthdate) {
            setError('Please enter your birthdate')
            return
        }
        const birthDateObj = new Date(birthdate)
        const today = new Date()
        if (birthDateObj >= today) {
            setError('Birthdate cannot be in the future')
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
        if (age > 120) {
            setError('Please enter a valid birthdate.')
            return
        }

        if (!gender) {
            setError('Please select your gender')
            return
        }

        if (!relationshipStatus) {
            setError('Please select your relationship status')
            return
        }

        if (!idDocument) {
            setError('Please upload a valid ID to prove residency in Gordon Heights')
            return
        }

        if (!agreedToTerms) {
            setError('Please agree to the Terms and Conditions and Privacy Policy')
            return
        }

        setLoading(true)

        // Check if email already exists to prevent duplicate accounts
        // This requires the 'check_email_exists' RPC to be added to the Supabase database
        const { data: emailExists, error: checkError } = await supabase.rpc('check_email_exists', { p_email: email })
        
        if (checkError) {
            console.error('Error checking email existence:', checkError.message)
            // If RPC is missing, it will fall through to normal signUp (which might silently fail due to enumeration protection)
        } else if (emailExists) {
            setError('This email address is already registered. Please use a different email or log in.')
            setLoading(false)
            return
        }

        const fullName = `${firstName}${middleName ? ' ' + middleName : ''} ${lastName}${suffix ? ' ' + suffix : ''}`.trim()

        const { error: signUpError, userId: newUserId } = await signUp(email, password, {
            fullName,
            firstName,
            middleName: middleName || undefined,
            lastName,
            suffix: suffix || undefined,
            gender: gender as 'Male' | 'Female',
            relationshipStatus,
            address: address || undefined,
            phone: phone || undefined,
            birthdate: birthdate || undefined
        }, `${window.location.origin}/auth/confirm`)

        if (signUpError) {
            setError(signUpError)
            setLoading(false)
            return
        }

        try {
            // Use the userId from signUp response (works even without an active session)
            const userId = newUserId

            if (userId) {
                let filePath = null;

                // Run file upload and profile update in parallel for speed
                const uploadPromise = (async () => {
                    if (idDocument) {
                        const fileName = `id_verification_${Date.now()}_${idDocument.name.replace(/\s+/g, '_')}`
                        filePath = `${userId}/${fileName}`

                        const { error: uploadError } = await supabase.storage
                            .from('resident-requirements')
                            .upload(filePath, idDocument, {
                                cacheControl: '3600',
                                upsert: false,
                                contentType: idDocument.type
                            })

                        if (uploadError) {
                            console.error(`Failed to upload ID document: ${uploadError.message}`)
                            filePath = null
                        }
                    }
                    return filePath
                })()

                const uploadedPath = await uploadPromise

                if (!uploadedPath) {
                    setUploadFailed(true)
                }

                // Update profile record with additional details (bypassing RLS via RPC)
                const { error: updateError } = await supabase.rpc('complete_registration', {
                    p_user_id: userId,
                    p_id_document_url: uploadedPath,
                    p_sectors: sectors
                })

                if (updateError) {
                    console.error('Failed to update profile record:', updateError.message)
                }

                // Sign out if we somehow got a session (email confirmation disabled case)
                try {
                    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
                    await supabase.auth.signOut()
                } catch {
                    // Non-fatal
                }
            }
        } catch (err) {
            console.error('Post-signup error:', err)
        }

        setSuccess(true)
        setLoading(false)
        // Removed auto-redirect so user has time to read the instructions
    }

    if (success) {
        return (
            <div className={loginStyles.loginContainer}>

                {/* Left Panel - Branding */}
                <div className={loginStyles.brandingPanel}>
                    <div className={loginStyles.brandingBackground} />
                    <div className={loginStyles.brandingContent}>
                        <div className={loginStyles.brandHeader}>
                            <Image src="/logo.png" alt="Logo" width={64} height={64} />
                            <div>
                                <h2 className={loginStyles.brandTitle}>Barangay Gordon Heights</h2>
                                <div className={loginStyles.brandSubtitle}>Olongapo City</div>
                            </div>
                        </div>

                        <div className={loginStyles.brandSection}>
                            <div className={loginStyles.sectionTitle}>Mandate</div>
                            <div className={loginStyles.sectionText}>
                                Barangay Gordon Heights is responsible for delivering essential services, maintaining peace and order, implementing local governance and facilitating citizen's participation.
                            </div>
                        </div>

                        <div className={loginStyles.brandSection}>
                            <div className={loginStyles.sectionTitle}>Vision</div>
                            <div className={loginStyles.sectionText}>
                                Peaceful barangay, God fearing, productive with self-reliance and with law abiding citizens.
                            </div>
                        </div>

                        <div className={loginStyles.brandSection}>
                            <div className={loginStyles.sectionTitle}>Mission</div>
                            <div className={loginStyles.sectionText}>
                                To translate the convention on the rights of every Filipino into local policies, sustainable programs and services, and support the survival, protection, development and participation of the people in community building through the provision of good education, health and other institution with special protection, information, communication by legislating ordinances, formulating strategies, enforcing and implementing the same.
                            </div>
                        </div>

                        <div className={loginStyles.brandSection}>
                            <div className={loginStyles.sectionTitle}>Service Pledge</div>
                            <p style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>Barangay Gordon Heights pledge and commit to deliver efficient and quality public service:</p>
                            <ul className={loginStyles.coreValues}>
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

                <div className={loginStyles.formPanel}>
                    <div className={styles.registerCard}>
                        <div className={styles.successMessage}>
                            <div style={{ fontSize: '3rem', margin: '0 auto 1.5rem' }}></div>
                            <h2 style={{ color: '#111827', fontSize: '1.75rem', marginBottom: '1rem', fontWeight: 'bold' }}>Registration Successful!</h2>
                            {uploadFailed ? (
                                <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309', padding: '1rem', borderRadius: '12px', fontSize: '0.85rem', marginBottom: '1.25rem', textAlign: 'left' }}>
                                    <strong style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                                        <AlertTriangle size={16} />
                                        <span>Warning: ID Document Upload Failed</span>
                                    </strong>
                                    <span>Your account was created successfully, but your ID verification document failed to upload. Please check your email inbox to confirm your account, and remember to bring a valid physical ID to the Barangay Hall to get your account manually verified.</span>
                                </div>
                            ) : (
                                <p>Please check your email inbox and click the verification link to confirm your account. Once verified, you can log in.</p>
                            )}
                            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.75rem' }}>Didn&apos;t receive the email? Check your spam folder.</p>
                            <Link href={searchParams.get('redirect') ? `/login?redirect=${searchParams.get('redirect')}` : "/login"} className={styles.link}>Go to Login</Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }



    return (
        <div className={loginStyles.loginContainer}>

            {/* Left Panel - Branding */}
            <div className={loginStyles.brandingPanel} style={{ justifyContent: 'flex-start', paddingTop: '3rem' }}>
                <div className={loginStyles.brandingBackground} />
                <div className={loginStyles.brandingContent}>
                    <div className={loginStyles.brandHeader}>
                        <Image src="/logo.png" alt="Logo" width={64} height={64} />
                        <div>
                            <h2 className={loginStyles.brandTitle}>Barangay Gordon Heights</h2>
                            <div className={loginStyles.brandSubtitle}>Olongapo City</div>
                        </div>
                    </div>

                    <div className={loginStyles.brandSection}>
                        <div className={loginStyles.sectionTitle}>Mandate</div>
                        <div className={loginStyles.sectionText}>
                            Barangay Gordon Heights is responsible for delivering essential services, maintaining peace and order, implementing local governance and facilitating citizen's participation.
                        </div>
                    </div>

                    <div className={loginStyles.brandSection}>
                        <div className={loginStyles.sectionTitle}>Vision</div>
                        <div className={loginStyles.sectionText}>
                            Peaceful barangay, God fearing, productive with self-reliance and with law abiding citizens.
                        </div>
                    </div>

                    <div className={loginStyles.brandSection}>
                        <div className={loginStyles.sectionTitle}>Mission</div>
                        <div className={loginStyles.sectionText}>
                            To translate the convention on the rights of every Filipino into local policies, sustainable programs and services, and support the survival, protection, development and participation of the people in community building through the provision of good education, health and other institution with special protection, information, communication by legislating ordinances, formulating strategies, enforcing and implementing the same.
                        </div>
                    </div>

                    <div className={loginStyles.brandSection}>
                        <div className={loginStyles.sectionTitle}>Service Pledge</div>
                        <p style={{ marginBottom: '0.5rem', fontSize: '0.8rem' }}>Barangay Gordon Heights pledge and commit to deliver efficient and quality public service:</p>
                        <ul className={loginStyles.coreValues}>
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

            {/* Right Panel - Form Container */}
            <div className={loginStyles.formPanel} style={{ overflowY: 'auto' }}>
                <Link href="/" className={loginStyles.backButton} style={{ position: 'sticky', background: '#fff', zIndex: 10, width: '100%', padding: '1.75rem 2rem', top: 0, left: 0, borderBottom: '1px solid #f1f5f9' }}>
                    Back to Home
                </Link>
                <div className={styles.registerCard}>
                    <div className={styles.logoSection}>
                        <div className={styles.logoIcon}>
                            <Image src="/logo.png" alt="Logo" width={72} height={72} />
                        </div>
                        <h1 style={{ color: '#111827', fontSize: '1.5rem', marginTop: '0.5rem' }}>Create Account</h1>
                        <p>Join the E-Barangay system</p>
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
                                <span>Please create an account to request this document. You will be redirected back to the form immediately after.</span>
                            </div>
                        )}
                        {error && (
                            <div className={styles.errorMessage}>
                                {error}
                            </div>
                        )}

                        <div className={styles.nameGrid}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="firstName">First Name *</label>
                                <input
                                    id="firstName"
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder="Juan"
                                    required
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="middleName">Middle Name</label>
                                <input
                                    id="middleName"
                                    type="text"
                                    value={middleName}
                                    onChange={(e) => setMiddleName(e.target.value)}
                                    placeholder="Luna"
                                />
                            </div>
                        </div>

                        <div className={styles.nameGrid}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="lastName">Last Name *</label>
                                <input
                                    id="lastName"
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder="Dela Cruz"
                                    required
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="suffix">Suffix</label>
                                <select
                                    id="suffix"
                                    value={suffix}
                                    onChange={(e) => setSuffix(e.target.value)}
                                    className={styles.select}
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

                        <div className={styles.inputGroup}>
                            <label htmlFor="email">Email Address *</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div className={styles.inputRow}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="password">Password *</label>
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
                                <div className={styles.requirementList}>
                                    <div className={`${styles.requirementItem} ${hasMinLength ? styles.validRequirement : styles.invalidRequirement}`}>
                                        {hasMinLength ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                        <span>At least 8 characters</span>
                                    </div>
                                    <div className={`${styles.requirementItem} ${hasUppercase ? styles.validRequirement : styles.invalidRequirement}`}>
                                        {hasUppercase ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                        <span>Uppercase letter</span>
                                    </div>
                                    <div className={`${styles.requirementItem} ${hasLowercase ? styles.validRequirement : styles.invalidRequirement}`}>
                                        {hasLowercase ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                        <span>Lowercase letter</span>
                                    </div>
                                    <div className={`${styles.requirementItem} ${hasNumber ? styles.validRequirement : styles.invalidRequirement}`}>
                                        {hasNumber ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                        <span>Number</span>
                                    </div>
                                    <div className={`${styles.requirementItem} ${hasSpecial ? styles.validRequirement : styles.invalidRequirement}`}>
                                        {hasSpecial ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                        <span>Special character (@$!%*#?&)</span>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="confirmPassword">Confirm Password *</label>
                                <div className={styles.passwordInputWrapper}>
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className={styles.passwordToggle}
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        tabIndex={-1}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {showMatchStatus && (
                                    <div className={`${styles.matchStatus} ${passwordsMatch ? styles.matchSuccess : styles.matchError}`}>
                                        {passwordsMatch ? (
                                            <>
                                                <ShieldCheck size={14} />
                                                <span>Passwords match</span>
                                            </>
                                        ) : (
                                            <>
                                                <ShieldAlert size={14} />
                                                <span>Passwords do not match</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="address">Full Home Address *</label>
                            <input
                                id="address"
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Street, Blk/Lot, Gordon Heights, Olongapo City"
                                required
                            />
                        </div>

                        <div className={styles.inputRow}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="phone">Phone Number *</label>
                                <input
                                    id="phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="09XX XXX XXXX"
                                    required
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="birthdate">Birthdate *</label>
                                <input
                                    id="birthdate"
                                    type="date"
                                    value={birthdate}
                                    onChange={(e) => setBirthdate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.inputRow}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="gender">Gender *</label>
                                <select
                                    id="gender"
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
                                    className={styles.select}
                                    required
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
                                    value={relationshipStatus}
                                    onChange={(e) => setRelationshipStatus(e.target.value)}
                                    className={styles.select}
                                    required
                                >
                                    <option value="">Select Status</option>
                                    <option value="Single">Single</option>
                                    <option value="Married">Married</option>
                                    <option value="Widowed">Widowed</option>
                                    <option value="Separated">Separated</option>
                                </select>
                            </div>
                        </div>

                        {/* Sectoral Classification */}
                        <div style={{
                            margin: '0.5rem 0',
                            background: '#f8faff',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                        }}>
                            <button
                                type="button"
                                onClick={() => setShowSectors(!showSectors)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '1rem 1.25rem',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    color: '#1e293b',
                                }}
                            >
                                <span>
                                    Sectoral Classification
                                    <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                                        (Optional{sectors.length > 0 ? ` • ${sectors.length} selected` : ''})
                                    </span>
                                </span>
                                <span style={{
                                    transform: showSectors ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease',
                                    fontSize: '0.75rem',
                                    color: '#94a3b8',
                                }}>▼</span>
                            </button>

                            {showSectors && (
                                <div style={{ padding: '0 1.25rem 1.25rem' }}>
                                    <p style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                                        Select all sectors that apply. You can update this later in your profile.
                                    </p>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gap: '0.4rem',
                                    }}>
                                        {SECTOR_OPTIONS.map(opt => {
                                            const isSelected = sectors.includes(opt.value)
                                            return (
                                                <div
                                                    key={opt.value}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.45rem',
                                                        padding: '0.5rem 0.65rem',
                                                        borderRadius: '8px',
                                                        border: `1.5px solid ${isSelected ? '#059669' : '#e2e8f0'}`,
                                                        background: isSelected ? 'rgba(34, 197, 94, 0.06)' : '#fff',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease',
                                                        fontSize: '0.78rem',
                                                        color: isSelected ? '#15803d' : '#475569',
                                                        fontWeight: isSelected ? 600 : 400,
                                                        userSelect: 'none',
                                                    }}
                                                    onClick={() => setSectors(prev =>
                                                        prev.includes(opt.value)
                                                            ? prev.filter(s => s !== opt.value)
                                                            : [...prev, opt.value]
                                                    )}
                                                >
                                                    <span style={{
                                                        width: '14px',
                                                        height: '14px',
                                                        borderRadius: '3px',
                                                        border: `2px solid ${isSelected ? '#059669' : '#cbd5e1'}`,
                                                        background: isSelected ? '#059669' : '#fff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                        fontSize: '0.6rem',
                                                        color: '#fff',
                                                    }}>
                                                        {isSelected && <Check size={10} strokeWidth={3} />}
                                                    </span>
                                                    <span>{opt.icon}</span>
                                                    {opt.label || opt.value}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles.idUploadSection}>
                            <label>Identity Verification *</label>
                            <p className={styles.uploadInfo}>Upload a valid ID (e.g., PhilID, Passport, Driver&apos;s License) to prove residency in Gordon Heights, Olongapo City.</p>
                            <div className={styles.fileInputWrapper}>
                                <input
                                    id="idDocument"
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null
                                        if (file && file.size > 5 * 1024 * 1024) {
                                            setError('Identity document exceeds the 5MB limit. Please upload a smaller image or PDF.')
                                            e.target.value = ''
                                            setIdDocument(null)
                                            return
                                        }
                                        setIdDocument(file)
                                    }}
                                    className={styles.fileInput}
                                    required
                                />
                                <div className={styles.fileInputPlaceholder}>
                                    {idDocument ? ` ${idDocument.name}` : ' Choose File (Image or PDF)'}
                                </div>
                            </div>
                        </div>

                        <div className={styles.checkboxGroup}>
                            <input
                                id="terms"
                                type="checkbox"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                required
                            />
                            <label htmlFor="terms">
                                I have read and agree to the <button type="button" onClick={() => setShowTermsModal(true)} className={styles.inlineButton}>Terms and Conditions</button> and <button type="button" onClick={() => setShowPrivacyModal(true)} className={styles.inlineButton}>Privacy Policy</button>
                            </label>
                        </div>

                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className={styles.spinner}></span>
                                    Creating Account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    <div className={styles.footer}>
                        <p>Already have an account?{' '}
                            <Link href={searchParams.get('redirect') ? `/login?redirect=${searchParams.get('redirect')}` : "/login"} className={styles.link}>Sign in</Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showTermsModal && (
                <div className={styles.modalOverlay} onClick={() => setShowTermsModal(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>Terms and Conditions</h3>
                            <button type="button" onClick={() => setShowTermsModal(false)} className={styles.closeButton}>&times;</button>
                        </div>
                        <div className={styles.modalBody}>
                            <p>These Terms and Conditions represent a binding contract between you (the user) and the E-Barangay application. By creating an account, you agree to:</p>
                            <ul>
                                <li>Provide accurate and truthful information during registration.</li>
                                <li>Use the application services solely for legitimate barangay-related transactions.</li>
                                <li>Maintain the confidentiality of your account credentials and not share them with others.</li>
                                <li>Comply with all local and national laws while using the platform.</li>
                                <li>Acknowledge that any misuse of the platform may lead to account suspension.</li>
                            </ul>
                            <h4>1. Acceptance of Terms</h4>
                            <p>By accessing or using E-Barangay, you agree to be bound by these terms. If you do not agree, please do not use our services.</p>
                            <h4>2. Account Responsibility</h4>
                            <p>You are responsible for all activities that occur under your account. You must notify us immediately of any unauthorized use.</p>
                        </div>
                    </div>
                </div>
            )}

            {showPrivacyModal && (
                <div className={styles.modalOverlay} onClick={() => setShowPrivacyModal(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>Privacy Policy</h3>
                            <button type="button" onClick={() => setShowPrivacyModal(false)} className={styles.closeButton}>&times;</button>
                        </div>
                        <div className={styles.modalBody}>
                            <p>We value your privacy and are committed to full compliance with Data Privacy Laws (e.g., Data Privacy Act of 2012). This policy explains our practices regarding your information.</p>
                            <h4>Data Collection & Storage</h4>
                            <p>We collect personal information such as your name, email, birthdate, phone number, and address to facilitate barangay services. This data is stored securely using industry-standard encryption protocols provided by Supabase.</p>
                            <h4>User Rights</h4>
                            <p>As a user, you have the following rights regarding your data:</p>
                            <ul>
                                <li><strong>Right to be Informed:</strong> Know how your data is collected and processed.</li>
                                <li><strong>Right to Access:</strong> View the information we have on file for you.</li>
                                <li><strong>Right to Rectification:</strong> Request corrections to inaccurate data.</li>
                                <li><strong>Right to Erasure:</strong> Request deletion of your account and associated data.</li>
                                <li><strong>Right to Object:</strong> Object to unauthorized data processing.</li>
                            </ul>
                            <h4>Compliance</h4>
                            <p>E-Barangay adheres to the standards set by the National Privacy Commission and ensures that all data handlers are trained in privacy best practices.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className={loginStyles.loginContainer}>Loading...</div>}>
            <RegisterContent />
        </Suspense>
    )
}
