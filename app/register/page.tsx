'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, CheckCircle2, XCircle, ShieldCheck, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import styles from './register.module.css'
import loginStyles from '../login/login.module.css'

const SECTOR_OPTIONS = [
    { value: 'Solo Parent', icon: '🧑‍🍼' },
    { value: 'OFW', icon: '🌍' },
    { value: 'PWD', icon: '♿' },
    { value: 'Senior Citizen', icon: '👴' },
    { value: 'LGBTQ+', icon: '🏳️‍🌈' },
    { value: 'Employed', icon: '💼' },
    { value: 'Unemployed', icon: '📭' },
    { value: '4Ps Beneficiary', icon: '👩‍👧' },
    { value: 'Pregnant/Lactating', icon: '🤰' },
    { value: 'Youth (15-30)', icon: '🧑' },
    { value: 'Indigenous People', icon: '🌾' },
    { value: 'OSC', icon: '📕' },
    { value: 'OSY', icon: '📗' },
    { value: 'OSA', icon: '📘' },
]

export default function RegisterPage() {
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
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [passwordError, setPasswordError] = useState('')
    const { signUp } = useAuth()
    const router = useRouter()


    // Real-time validation logic
    const hasMinLength = password.length >= 6
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

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        if (!allCriteriaMet) {
            setError('Password does not meet all security requirements')
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

        /* Temporarily disabled for testing
        if (!idDocument) {
            setError('Please upload a valid ID to prove residency in Gordon Heights')
            return
        }
        */

        if (!agreedToTerms) {
            setError('Please agree to the Terms and Conditions and Privacy Policy')
            return
        }

        setLoading(true)

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
        }, `${window.location.origin}/register`)

        if (signUpError) {
            setError(signUpError)
            setLoading(false)
            return
        }

        try {
            // Use the userId from signUp response (works even without an active session)
            const userId = newUserId || (await supabase.auth.getSession()).data.session?.user?.id

            if (userId) {
                let filePath = null;

                if (idDocument) {
                    const fileName = `id_verification_${Date.now()}_${idDocument.name.replace(/\s+/g, '_')}`
                    filePath = `${userId}/${fileName}`

                    const { error: uploadError } = await supabase.storage
                        .from('resident-requirements')
                        .upload(filePath, idDocument)

                    if (uploadError) {
                        console.error(`Failed to upload ID document: ${uploadError.message}`)
                    }
                }

                // Update profile record with additional details (bypassing RLS via RPC)
                const { error: updateError } = await supabase.rpc('complete_registration', {
                    p_user_id: userId,
                    p_id_document_url: filePath,
                    p_sectors: sectors
                })

                if (updateError) {
                    console.error('Failed to update profile record:', updateError.message)
                }

                // Sign out if we had a session (email confirmation disabled case)
                const { data: { session: currentSession } } = await supabase.auth.getSession()
                if (currentSession) {
                    await supabase.auth.signOut()
                }
            }
        } catch (err) {
            console.error('Post-signup error:', err)
        }

        setSuccess(true)
        setLoading(false)
        setTimeout(() => router.push('/login'), 3000)
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
                            <div style={{ fontSize: '3rem', margin: '0 auto 1.5rem' }}>✅</div>
                            <h2 style={{ color: '#111827', fontSize: '1.75rem', marginBottom: '1rem', fontWeight: 'bold' }}>Registration Successful!</h2>
                            <p>Your account has been created and is now under review. You will be redirected to the login page shortly.</p>
                            <Link href="/login" className={styles.link}>Go to Login →</Link>
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
                    ← Back to Home
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
                        {error && (
                            <div className={styles.errorMessage}>
                                ⚠️ {error}
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
                                        <span>At least 6 characters</span>
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
                                    📋 Sectoral Classification
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
                                                        border: `1.5px solid ${isSelected ? '#6366f1' : '#e2e8f0'}`,
                                                        background: isSelected ? 'rgba(99, 102, 241, 0.06)' : '#fff',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease',
                                                        fontSize: '0.78rem',
                                                        color: isSelected ? '#4338ca' : '#475569',
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
                                                        border: `2px solid ${isSelected ? '#6366f1' : '#cbd5e1'}`,
                                                        background: isSelected ? '#6366f1' : '#fff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                        fontSize: '0.6rem',
                                                        color: '#fff',
                                                    }}>
                                                        {isSelected && '✓'}
                                                    </span>
                                                    <span>{opt.icon}</span>
                                                    {opt.value}
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
                                    onChange={(e) => setIdDocument(e.target.files?.[0] || null)}
                                    className={styles.fileInput}
                                    required
                                />
                                <div className={styles.fileInputPlaceholder}>
                                    {idDocument ? `📄 ${idDocument.name}` : '📁 Choose File (Image or PDF)'}
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
                                I have read and agree to the <Link href="/terms" className={styles.inlineLink} target="_blank" rel="noopener noreferrer">Terms and Conditions</Link> and <Link href="/privacy" className={styles.inlineLink} target="_blank" rel="noopener noreferrer">Privacy Policy</Link>
                            </label>
                        </div>

                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={loading}
                        >
                            {loading ? 'Creating Account and Uploading ID...' : 'Create Account'}
                        </button>
                    </form>

                    <div className={styles.footer}>
                        <p>Already have an account?{' '}
                            <Link href="/login" className={styles.link}>Sign in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
