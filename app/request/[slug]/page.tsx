'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { submitDocumentRequest } from '@/app/actions/requestActions'
import { FileCheck, FileBadge, Store, Home, Briefcase, HeartHandshake } from 'lucide-react'
import styles from './request.module.css'

/* ── Document Registry ── */
const DOCUMENTS: Record<string, {
    name: string; icon: React.ReactNode; desc: string; fee: string;
    feeType: 'free' | 'paid'; reqs: string;
}> = {
    'barangay-clearance': {
        name: 'Barangay Clearance', icon: <FileCheck size={24} />,
        desc: 'Verification of residency, good moral character, and no derogatory record.',
        fee: 'Php 50.00', feeType: 'paid', reqs: 'Valid ID',
    },
    'certificate-of-residency': {
        name: 'Certificate of Residency', icon: <FileBadge size={24} />,
        desc: 'Official certification for Residency, Loan, or Good Moral Character.',
        fee: 'Php 50.00', feeType: 'paid', reqs: 'Valid ID',
    },
    'business-clearance': {
        name: 'Business Clearance', icon: <Store size={24} />,
        desc: 'Compliance for business permit within Gordon Heights.',
        fee: 'Free', feeType: 'free', reqs: 'DTI Certificate',
    },
    'lot-certification': {
        name: 'Lot / Building Certification', icon: <Home size={24} />,
        desc: 'Issued to lot occupants for government compliance.',
        fee: 'Php 1.00/sqm', feeType: 'paid', reqs: 'Purok Cert, Tax Dec',
    },
    'first-time-job-seeker': {
        name: 'First Time Job Seeker', icon: <Briefcase size={24} />,
        desc: 'Waives pre-employment fees for ages 18-30.',
        fee: 'Free', feeType: 'free', reqs: 'Valid ID',
    },
    'indigency': {
        name: 'Certificate of Indigency', icon: <HeartHandshake size={24} />,
        desc: 'Certification of financial status for assistance.',
        fee: 'Free', feeType: 'free', reqs: 'Valid ID',
    },
}

/* ── Validation Helpers ── */
const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
const validatePhone = (v: string) => /^(09|\+639)\d{9}$/.test(v.replace(/[\s-]/g, ''))

interface FormData {
    fullName: string
    email: string
    phone: string
    address: string
    purpose: string
}

interface FormErrors {
    fullName?: string
    email?: string
    phone?: string
    address?: string
    purpose?: string
}

export default function RequestPage() {
    const params = useParams()
    const slug = params?.slug as string
    const doc = DOCUMENTS[slug]

    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [authChecked, setAuthChecked] = useState(false)

    const [form, setForm] = useState<FormData>({
        fullName: '', email: '', phone: '', address: '', purpose: ''
    })
    const [errors, setErrors] = useState<FormErrors>({})
    const [touched, setTouched] = useState<Record<string, boolean>>({})
    const [attachments, setAttachments] = useState<File[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [globalError, setGlobalError] = useState('')
    const [success, setSuccess] = useState<{ id: string; docType: string } | null>(null)

    // Check auth state
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.user) {
                    setUser(session.user)
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single()
                    if (profileData) {
                        setProfile(profileData)
                        setForm(prev => ({
                            ...prev,
                            fullName: profileData.full_name || prev.fullName,
                            email: profileData.email || prev.email,
                            phone: profileData.phone || prev.phone,
                            address: profileData.address || prev.address,
                        }))
                    }
                }
            } catch (e) {
                console.error('Auth check error:', e)
            } finally {
                setAuthChecked(true)
            }
        }
        checkAuth()
    }, [])

    // Real-time validation
    const validate = useCallback((data: FormData): FormErrors => {
        const errs: FormErrors = {}
        if (data.fullName.trim().length < 2) errs.fullName = 'Full name must be at least 2 characters'
        if (!validateEmail(data.email)) errs.email = 'Enter a valid email address'
        if (!validatePhone(data.phone)) errs.phone = 'Enter a valid PH number (e.g., 09171234567)'
        if (data.address.trim().length < 5) errs.address = 'Enter your complete address'
        if (data.purpose.trim().length < 10) errs.purpose = 'Purpose must be at least 10 characters'
        return errs
    }, [])

    useEffect(() => {
        if (Object.keys(touched).length > 0) {
            setErrors(validate(form))
        }
    }, [form, touched, validate])

    const updateField = (field: keyof FormData, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }))
        setTouched(prev => ({ ...prev, [field]: true }))
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files)
            setAttachments(prev => [...prev, ...newFiles])
            setGlobalError('')
            e.target.value = ''
        }
    }

    const removeFile = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setGlobalError('')

        // Mark all touched
        setTouched({ fullName: true, email: true, phone: true, address: true, purpose: true })

        const validationErrors = validate(form)
        setErrors(validationErrors)

        if (Object.keys(validationErrors).length > 0) {
            setGlobalError('Please fix the errors above before submitting.')
            return
        }

        if (attachments.length === 0) {
            setGlobalError('Please upload at least one valid ID or requirement before submitting.')
            return
        }

        if (!user || !profile) {
            setGlobalError('You must be logged in to submit a request.')
            return
        }

        setSubmitting(true)
        try {
            const uploadedPaths: string[] = []

            for (const file of attachments) {
                const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`
                const filePath = `${profile.id}/${fileName}`
                const { error: uploadError } = await supabase.storage
                    .from('resident-requirements')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: file.type
                    })
                if (uploadError) throw new Error(`Upload failed for ${file.name}: ${uploadError.message}`)
                uploadedPaths.push(filePath)
            }

            const attachmentUrl = uploadedPaths.length > 0 ? uploadedPaths.join(',') : null

            const data = await submitDocumentRequest({
                resident_id: profile.id,
                document_type: doc.name,
                purpose: form.purpose.trim(),
                attachment_url: attachmentUrl,
                status: 'pending'
            })

            setSuccess({ id: data.id, docType: doc.name })
        } catch (err: any) {
            console.error('Submit error:', err)
            setGlobalError(err.message || 'Failed to submit request. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    // ── Not Found ──
    if (!doc) {
        return (
            <div className={styles.pageWrapper}>
                <div className={styles.notFound}>
                    <div className={styles.notFoundIcon}></div>
                    <h2 className={styles.notFoundTitle}>Document Not Found</h2>
                    <p className={styles.notFoundDesc}>
                        The document type you&apos;re looking for doesn&apos;t exist. Please scan a valid QR code or browse available services.
                    </p>
                    <Link href="/services" className="btn btn-primary">Browse All Documents</Link>
                </div>
            </div>
        )
    }

    // ── Success Screen ──
    if (success) {
        return (
            <div className={styles.pageWrapper}>
                <header className={styles.header}>
                    <div className={styles.headerInner}>
                        <Link href="/services" className={styles.backBtn}>Back</Link>
                        <div className={styles.headerInfo}>
                            <h1 className={styles.headerTitle}>Request Submitted</h1>
                            <p className={styles.headerSub}>E-Barangay Gordon Heights</p>
                        </div>
                    </div>
                </header>
                <div className={styles.successWrapper}>
                    <div className={styles.successCard}>
                        <div className={styles.successIcon}>OK</div>
                        <h2 className={styles.successTitle}>Request Submitted!</h2>
                        <p className={styles.successMsg}>
                            Your {success.docType} request has been received. The Barangay will process it and notify you when it&apos;s ready.
                        </p>
                        <div className={styles.receiptBox}>
                            <div className={styles.receiptRow}>
                                <span className={styles.receiptLabel}>Reference No.</span>
                                <span className={styles.receiptValue}>{success.id.split('-')[0].toUpperCase()}</span>
                            </div>
                            <div className={styles.receiptRow}>
                                <span className={styles.receiptLabel}>Document</span>
                                <span className={styles.receiptValue}>{success.docType}</span>
                            </div>
                            <div className={styles.receiptRow}>
                                <span className={styles.receiptLabel}>Status</span>
                                <span className={styles.receiptValue} style={{ color: '#f59e0b' }}>Pending</span>
                            </div>
                            <div className={styles.receiptRow}>
                                <span className={styles.receiptLabel}>Date Filed</span>
                                <span className={styles.receiptValue}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                        </div>
                        <div className={styles.successActions}>
                            <Link href="/resident" className={styles.authBtnPrimary}>
                                Track My Request
                            </Link>
                            <Link href="/services" className={styles.authBtnOutline}>
                                Request Another Document
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // ── Auth Check Loading ──
    if (!authChecked) {
        return (
            <div className={styles.pageWrapper}>
                <header className={styles.header}>
                    <div className={styles.headerInner}>
                        <Link href="/services" className={styles.backBtn}>Back</Link>
                        <div className={styles.headerInfo}>
                            <h1 className={styles.headerTitle}>{doc.name}</h1>
                            <p className={styles.headerSub}>E-Barangay Gordon Heights</p>
                        </div>
                    </div>
                </header>
                <div className={styles.formContainer}>
                    <div className={styles.formCard} style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: 'var(--text-muted)' }}>Checking your account...</p>
                    </div>
                </div>
            </div>
        )
    }

    // ── Auth Required Prompt ──
    if (!user) {
        return (
            <div className={styles.pageWrapper}>
                <header className={styles.header}>
                    <div className={styles.headerInner}>
                        <Link href="/services" className={styles.backBtn}>Back</Link>
                        <div className={styles.headerInfo}>
                            <h1 className={styles.headerTitle}>{doc.name}</h1>
                            <p className={styles.headerSub}>E-Barangay Gordon Heights</p>
                        </div>
                    </div>
                </header>

                <div className={styles.docBanner}>
                    <span className={styles.docBannerIcon}>{doc.icon}</span>
                    <div className={styles.docBannerInfo}>
                        <h2 className={styles.docBannerName}>{doc.name}</h2>
                        <div className={styles.docBannerMeta}>
                            <span className={`${styles.metaBadge} ${doc.feeType === 'free' ? styles.metaFree : styles.metaPaid}`}>
                                {doc.fee}
                            </span>
                            <span className={`${styles.metaBadge} ${styles.metaReq}`}> {doc.reqs}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.authPrompt}>
                    <div className={styles.authCard}>
                        <div className={styles.authIcon}></div>
                        <h2 className={styles.authTitle}>Sign In Required</h2>
                        <p className={styles.authDesc}>
                            You need an E-Barangay account to request a {doc.name}. Login or register to continue — it only takes a minute.
                        </p>
                        <div className={styles.authButtons}>
                            <Link href={`/login?redirect=/request/${slug}`} className={styles.authBtnPrimary}>
                                Login to Continue
                            </Link>
                            <Link href={`/register?redirect=/request/${slug}`} className={styles.authBtnOutline}>
                                Create an Account
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // ── Main Form ──
    const isFieldValid = (field: keyof FormData) => touched[field] && !errors[field] && form[field].trim().length > 0
    const isFieldError = (field: keyof FormData) => touched[field] && !!errors[field]

    const getInputClass = (field: keyof FormData) => {
        let cls = styles.fieldInput
        if (isFieldValid(field)) cls += ` ${styles.fieldInputValid}`
        if (isFieldError(field)) cls += ` ${styles.fieldInputError}`
        return cls
    }

    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <Link href="/services" className={styles.backBtn}>Back</Link>
                    <div className={styles.headerInfo}>
                        <h1 className={styles.headerTitle}>{doc.name}</h1>
                        <p className={styles.headerSub}>E-Barangay Gordon Heights</p>
                    </div>
                </div>
            </header>

            {/* Document Info Banner */}
            <div className={styles.docBanner}>
                <span className={styles.docBannerIcon}>{doc.icon}</span>
                <div className={styles.docBannerInfo}>
                    <h2 className={styles.docBannerName}>{doc.name}</h2>
                    <div className={styles.docBannerMeta}>
                        <span className={`${styles.metaBadge} ${doc.feeType === 'free' ? styles.metaFree : styles.metaPaid}`}>
                            {doc.fee}
                        </span>
                        <span className={`${styles.metaBadge} ${styles.metaReq}`}>{doc.reqs}</span>
                    </div>
                </div>
            </div>

            {/* Request Form */}
            <div className={styles.formContainer}>
                <div className={styles.formCard}>
                    <h2 className={styles.formTitle}>Fill Out Your Request</h2>
                    <p className={styles.formSubtitle}>
                        Fields marked with * are required. Your information is pre-filled from your profile.
                    </p>

                    {globalError && (
                        <div className={styles.formError}>{globalError}</div>
                    )}

                    <form onSubmit={handleSubmit} noValidate>
                        {/* Full Name */}
                        <div className={styles.fieldGroup}>
                            <div className={styles.fieldLabel}>
                                <span className={styles.fieldLabelText}>Full Name</span>
                                <span className={styles.fieldRequired}>Required *</span>
                            </div>
                            <input
                                type="text"
                                className={getInputClass('fullName')}
                                value={form.fullName}
                                onChange={e => updateField('fullName', e.target.value)}
                                placeholder="Juan Dela Cruz"
                            />
                            {isFieldError('fullName') && <p className={styles.fieldError}>{errors.fullName}</p>}
                            {isFieldValid('fullName') && <p className={styles.fieldHint}>Looks good!</p>}
                        </div>

                        {/* Email */}
                        <div className={styles.fieldGroup}>
                            <div className={styles.fieldLabel}>
                                <span className={styles.fieldLabelText}>Email Address</span>
                                <span className={styles.fieldRequired}>Required *</span>
                            </div>
                            <input
                                type="email"
                                className={getInputClass('email')}
                                value={form.email}
                                onChange={e => updateField('email', e.target.value)}
                                placeholder="juan@email.com"
                            />
                            {isFieldError('email') && <p className={styles.fieldError}>{errors.email}</p>}
                            {isFieldValid('email') && <p className={styles.fieldHint}>Valid email</p>}
                        </div>

                        {/* Phone */}
                        <div className={styles.fieldGroup}>
                            <div className={styles.fieldLabel}>
                                <span className={styles.fieldLabelText}>Phone Number</span>
                                <span className={styles.fieldRequired}>Required *</span>
                            </div>
                            <input
                                type="tel"
                                className={getInputClass('phone')}
                                value={form.phone}
                                onChange={e => updateField('phone', e.target.value)}
                                placeholder="09171234567"
                            />
                            {isFieldError('phone') && <p className={styles.fieldError}>{errors.phone}</p>}
                            {isFieldValid('phone') && <p className={styles.fieldHint}>Valid PH number</p>}
                        </div>

                        {/* Address */}
                        <div className={styles.fieldGroup}>
                            <div className={styles.fieldLabel}>
                                <span className={styles.fieldLabelText}>Home Address</span>
                                <span className={styles.fieldRequired}>Required *</span>
                            </div>
                            <input
                                type="text"
                                className={getInputClass('address')}
                                value={form.address}
                                onChange={e => updateField('address', e.target.value)}
                                placeholder="Block 1, Lot 2, Gordon Heights, Olongapo City"
                            />
                            {isFieldError('address') && <p className={styles.fieldError}>{errors.address}</p>}
                            {isFieldValid('address') && <p className={styles.fieldHint}>Address provided</p>}
                        </div>

                        {/* Purpose */}
                        <div className={styles.fieldGroup}>
                            <div className={styles.fieldLabel}>
                                <span className={styles.fieldLabelText}>Purpose / Reason</span>
                                <span className={styles.fieldRequired}>Required *</span>
                            </div>
                            <textarea
                                className={getInputClass('purpose')}
                                value={form.purpose}
                                onChange={e => updateField('purpose', e.target.value)}
                                placeholder="e.g., Employment requirement for company application..."
                                rows={3}
                            />
                            {isFieldError('purpose') && <p className={styles.fieldError}>{errors.purpose}</p>}
                            {isFieldValid('purpose') && <p className={styles.fieldHint}>Purpose provided</p>}
                        </div>

                        {/* File Upload */}
                        <div className={styles.fieldGroup}>
                            <div className={styles.fieldLabel}>
                                <span className={styles.fieldLabelText}>Upload Valid ID / Requirements</span>
                                <span className={styles.fieldRequired}>Required *</span>
                            </div>
                            <div className={`${styles.fileArea} ${attachments.length > 0 ? styles.fileAreaActive : ''}`}>
                                <input
                                    type="file"
                                    className={styles.fileInput}
                                    onChange={handleFileChange}
                                    accept="image/*,.pdf,.doc,.docx"
                                    id="req-file"
                                    multiple
                                />
                                <>
                                    <div className={styles.fileIcon}></div>
                                    <p className={styles.fileText}>Tap to upload your requirements</p>
                                    <p className={styles.fileSmall}>You can select multiple files</p>
                                </>
                            </div>
                            {attachments.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                                    {attachments.map((file, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg, #f8fafc)', padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--border-color, #e2e8f0)' }}>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>{file.name}</span>
                                            <button
                                                type="button"
                                                className={styles.fileClear}
                                                onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                                style={{ fontSize: '0.75rem' }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting Request...' : `Submit ${doc.name} Request`}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
