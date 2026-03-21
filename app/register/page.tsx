'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle2, XCircle, ShieldCheck, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import styles from './register.module.css'

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
            birthdate: birthdate || undefined
        })

        if (signUpError) {
            setError(signUpError)
            setLoading(false)
            return
        }

        try {
            const { data: { user: newUser }, error: userError } = await supabase.auth.getUser()
            
            if (userError || !newUser) {
                throw new Error('Failed to retrieve user ID for profile creation')
            }

            let filePath = null;

            if (idDocument) {
                // Upload ID Document
                const fileName = `id_verification_${Date.now()}_${idDocument.name.replace(/\s+/g, '_')}`
                filePath = `${newUser.id}/${fileName}`
                
                const { error: uploadError } = await supabase.storage
                    .from('resident-requirements')
                    .upload(filePath, idDocument)

                if (uploadError) {
                    throw new Error(`Failed to upload ID document: ${uploadError.message}`)
                }
            }

            // Create profile record
            const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                    id: newUser.id,
                    email: email,
                    full_name: fullName,
                    first_name: firstName,
                    middle_name: middleName || null,
                    last_name: lastName,
                    suffix: suffix || null,
                    gender: gender,
                    relationship_status: relationshipStatus,
                    address: address || null,
                    phone: phone || null,
                    role: 'resident',
                    is_verified: false,
                    id_document_url: filePath
                })

            if (insertError) {
                console.error('Failed to create profile record:', insertError.message)
                throw new Error(`Profile creation failed: ${insertError.message}`)
            }

            setSuccess(true)
            setTimeout(() => router.push('/login'), 3000)
        } catch (err: any) {
            console.error('Post-signup error:', err)
            setError(`Account created, but document upload failed: ${err.message}. Please contact support.`)
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className={styles.registerContainer}>
                <div className={styles.loginBackground}>
                    <div className={styles.gradientOrb1} />
                    <div className={styles.gradientOrb2} />
                </div>
                <div className={styles.registerCard}>
                    <div className={styles.successMessage}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                        <h2>Registration Successful!</h2>
                        <p>Your account has been created and is now under review. Please check your email to verify your account. You will be redirected to the login page shortly.</p>
                        <Link href="/login" className={styles.link}>Go to Login →</Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.registerContainer}>
            <div className={styles.loginBackground}>
                <div className={styles.gradientOrb1} />
                <div className={styles.gradientOrb2} />
            </div>

            <div className={styles.registerCard}>
                <div className={styles.logoSection}>
                    <Link href="/" className={styles.backLink} title="Back to Home">←</Link>
                    <div className={styles.logoIcon}>🏛️</div>
                    <h1>Create Account</h1>
                    <p>Join the E-Barangay community</p>
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
                            I have read and agree to the <Link href="/terms" className={styles.inlineLink}>Terms and Conditions</Link> and <Link href="/privacy" className={styles.inlineLink}>Privacy Policy</Link>
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
    )
}
