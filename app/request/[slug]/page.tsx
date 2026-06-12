'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { submitDocumentRequest } from '@/app/actions/requestActions'
import { 
    FileCheck, FileBadge, Store, Home, Briefcase, HeartHandshake,
    ChevronLeft, Info, ShieldAlert, AlertTriangle, CheckCircle2, 
    UploadCloud, User, ClipboardList
} from 'lucide-react'
import styles from './request.module.css'

/* ── Document Registry ── */
const DOCUMENTS: Record<string, {
    name: string; icon: React.ReactNode; desc: string; fee: string;
    feeType: 'free' | 'paid'; reqs: string; validity: string;
}> = {
    'barangay-clearance': {
        name: 'Barangay Clearance', icon: <FileCheck size={24} />,
        desc: 'Verification of residency, good moral character, and no derogatory record within the barangay.',
        fee: 'Php 50.00', feeType: 'paid', reqs: 'Valid ID', validity: '6 months',
    },
    'certificate-of-residency': {
        name: 'Certificate of Residency', icon: <FileBadge size={24} />,
        desc: 'Official certification for Residency, Loan applications, or Good Moral Character purposes.',
        fee: 'Php 50.00', feeType: 'paid', reqs: 'Valid ID', validity: '6 months',
    },
    'business-clearance': {
        name: 'Business Clearance', icon: <Store size={24} />,
        desc: 'Compliance document required for business permit applications within Gordon Heights.',
        fee: 'Free', feeType: 'free', reqs: 'DTI Certificate', validity: 'Renewed annually',
    },
    'lot-certification': {
        name: 'Lot / Building Certification', icon: <Home size={24} />,
        desc: 'Issued to actual lot occupants for compliance to government agencies.',
        fee: 'Php 1.00/sqm', feeType: 'paid', reqs: 'Purok Cert, Tax Dec, Latest Tax Payment', validity: '6 months',
    },
    'first-time-job-seeker': {
        name: 'First Time Job Seeker', icon: <Briefcase size={24} />,
        desc: 'Waives fees for pre-employment requirements. Available for ages 18–30.',
        fee: 'Free', feeType: 'free', reqs: 'Valid ID', validity: '1 year',
    },
    'indigency': {
        name: 'Certificate of Indigency', icon: <HeartHandshake size={24} />,
        desc: 'Certification of financial status for medical, educational, or social assistance.',
        fee: 'Free', feeType: 'free', reqs: 'Valid ID', validity: '6 months',
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
    const [docSpecificData, setDocSpecificData] = useState<Record<string, any>>({ isRenewal: true })
    const [errors, setErrors] = useState<FormErrors>({})
    const [touched, setTouched] = useState<Record<string, boolean>>({})
    const [attachments, setAttachments] = useState<File[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [globalError, setGlobalError] = useState('')
    const [success, setSuccess] = useState<{ id: string; docType: string } | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)

    // Check auth state — C2 FIX: use getUser() for cryptographic verification instead of getSession()
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
                if (authUser && !authError) {
                    setUser(authUser)
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', authUser.id)
                        .single()
                    if (profileData) {
                        setProfile(profileData)
                        // H5 FIX: Detect admin role to show contextual message
                        if (profileData.role === 'admin') {
                            setIsAdmin(true)
                        }
                        setForm(prev => ({
                            ...prev,
                            fullName: profileData.full_name || prev.fullName,
                            email: profileData.email || prev.email,
                            phone: profileData.phone || prev.phone,
                            address: profileData.address || prev.address,
                        }))

                        let initialAge = ''
                        if (profileData.birthdate) {
                            const today = new Date()
                            const born = new Date(profileData.birthdate)
                            if (!isNaN(born.getTime())) {
                                let a = today.getFullYear() - born.getFullYear()
                                const m = today.getMonth() - born.getMonth()
                                if (m < 0 || (m === 0 && today.getDate() < born.getDate())) a--
                                initialAge = a.toString()
                            }
                        }

                        let initialYearsOfResidency = ''
                        if (profileData.resident_since) {
                            if (profileData.resident_since === 'Since Birth') {
                                initialYearsOfResidency = initialAge
                            } else {
                                const year = parseInt(profileData.resident_since)
                                if (!isNaN(year)) {
                                    initialYearsOfResidency = (new Date().getFullYear() - year).toString()
                                }
                            }
                        }

                        setDocSpecificData({
                            address: profileData.address || '',
                            birthdate: profileData.birthdate || '',
                            civilStatus: profileData.relationship_status || '',
                            age: initialAge,
                            residentSince: profileData.resident_since || '',
                            yearsOfResidency: initialYearsOfResidency,
                            isRenewal: true
                        })
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
    const validate = useCallback((data: FormData, dynamicData: Record<string, any>): FormErrors => {
        const errs: FormErrors = {}
        if (data.fullName.trim().length < 2) errs.fullName = 'Full name must be at least 2 characters'
        if (!validateEmail(data.email)) errs.email = 'Enter a valid email address'
        if (!validatePhone(data.phone)) errs.phone = 'Enter a valid PH number (e.g., 09171234567)'
        if (data.address.trim().length < 5) errs.address = 'Enter your complete address'
        if (data.purpose.trim().length < 10) errs.purpose = 'Purpose must be at least 10 characters'

        // Dynamic fields validation
        const type = (slug || '').toLowerCase()
        if (type.includes('job-seeker') || type.includes('first-time')) {
            if (!dynamicData.yearsOfResidency || parseInt(dynamicData.yearsOfResidency) < 0) {
                errs.address = 'Years of residency must be specified and non-negative'
            }
            if (!dynamicData.idType || !dynamicData.idType.trim()) {
                errs.fullName = 'Presented ID type is required'
            }
            if (!dynamicData.idNumber || !dynamicData.idNumber.trim()) {
                errs.phone = 'Presented ID Number is required'
            }
        } else if (type.includes('lot') || type.includes('occupancy') || type.includes('building')) {
            if (!dynamicData.lotArea || parseFloat(dynamicData.lotArea) <= 0) {
                errs.address = 'Valid Lot Area in sqm is required'
            }
            if (!dynamicData.taxDecNo || !dynamicData.taxDecNo.trim()) {
                errs.purpose = 'Tax Declaration No. is required'
            }
            if (!dynamicData.propertyLocation || !dynamicData.propertyLocation.trim()) {
                errs.address = 'Property location is required'
            }
            if (!dynamicData.occupiedSince || !dynamicData.occupiedSince.trim()) {
                errs.purpose = 'Occupied Since Year is required'
            }
        } else if (type.includes('business')) {
            if (!dynamicData.businessName || !dynamicData.businessName.trim()) {
                errs.fullName = 'Business Name is required'
            }
            if (!dynamicData.businessLocation || !dynamicData.businessLocation.trim()) {
                errs.address = 'Business location is required'
            }
            if (!dynamicData.operatorName || !dynamicData.operatorName.trim()) {
                errs.fullName = 'Operator / Manager Name is required'
            }
            if (!dynamicData.operatorAddress || !dynamicData.operatorAddress.trim()) {
                errs.address = 'Operator home address is required'
            }
        } else if (type.includes('indigency') || type.includes('residency') || type.includes('clearance')) {
            if (!dynamicData.civilStatus || !dynamicData.civilStatus.trim()) {
                errs.purpose = 'Civil Status is required'
            }
            if (!dynamicData.birthdate) {
                errs.purpose = 'Birthdate is required'
            }
            if (type.includes('residency') && (!dynamicData.residentSince || !dynamicData.residentSince.trim())) {
                errs.address = 'Resident Since year is required'
            }
        }

        return errs
    }, [slug])

    useEffect(() => {
        if (Object.keys(touched).length > 0) {
            setErrors(validate(form, docSpecificData))
        }
    }, [form, docSpecificData, touched, validate])

    const updateField = (field: keyof FormData, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }))
        setTouched(prev => ({ ...prev, [field]: true }))
    }

    const handleDocSpecificChange = (key: string, value: any) => {
        setDocSpecificData(prev => ({ ...prev, [key]: value }))
        setTouched(prev => ({ ...prev, fullName: true }))
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const newFiles = Array.from(e.dataTransfer.files)
            const MAX_SIZE = 5 * 1024 * 1024 // 5MB
            const oversized = newFiles.filter(file => file.size > MAX_SIZE)

            if (oversized.length > 0) {
                setGlobalError(`File too large: ${oversized.map(f => f.name).join(', ')}. Maximum limit per file is 5MB.`)
                return
            }

            setAttachments(prev => [...prev, ...newFiles])
            setGlobalError('')
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files)
            const MAX_SIZE = 5 * 1024 * 1024 // 5MB
            const oversized = newFiles.filter(file => file.size > MAX_SIZE)

            if (oversized.length > 0) {
                setGlobalError(`File too large: ${oversized.map(f => f.name).join(', ')}. Maximum limit per file is 5MB.`)
                e.target.value = ''
                return
            }

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

        const validationErrors = validate(form, docSpecificData)
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
                status: 'pending',
                form_data: docSpecificData
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
                    <div className={styles.alertIconWrapper} style={{ color: '#ef4444' }}>
                        <AlertTriangle size={56} />
                    </div>
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
                        <Link href="/services" className={styles.backBtn}>
                            <ChevronLeft size={16} />
                            <span>Back</span>
                        </Link>
                        <div className={styles.headerInfo}>
                            <h1 className={styles.headerTitle}>Request Submitted</h1>
                            <p className={styles.headerSub}>E-Barangay Gordon Heights</p>
                        </div>
                    </div>
                </header>
                <div className={styles.successWrapper}>
                    <div className={styles.successCard}>
                        <div className={styles.successIcon}>
                            <CheckCircle2 size={40} style={{ color: '#059669' }} />
                        </div>
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
                        <Link href="/services" className={styles.backBtn}>
                            <ChevronLeft size={16} />
                            <span>Back</span>
                        </Link>
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
                        <Link href="/services" className={styles.backBtn}>
                            <ChevronLeft size={16} />
                            <span>Back</span>
                        </Link>
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
                            <span className={`${styles.metaBadge} ${styles.metaReq}`}>
                                Valid: {doc.validity}
                            </span>
                        </div>
                    </div>
                </div>

                <div className={styles.authPrompt}>
                    <div className={styles.authCard}>
                        <div className={styles.alertIconWrapper} style={{ color: 'var(--primary-600)' }}>
                            <User size={56} />
                        </div>
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

    // ── H5 FIX: Admin Role Detection — redirect admins to their dashboard ──
    if (isAdmin) {
        return (
            <div className={styles.pageWrapper}>
                <header className={styles.header}>
                    <div className={styles.headerInner}>
                        <Link href="/admin" className={styles.backBtn}>
                            <ChevronLeft size={16} />
                            <span>Back to Admin</span>
                        </Link>
                        <div className={styles.headerInfo}>
                            <h1 className={styles.headerTitle}>{doc.name}</h1>
                            <p className={styles.headerSub}>E-Barangay Gordon Heights</p>
                        </div>
                    </div>
                </header>

                <div className={styles.authPrompt}>
                    <div className={styles.authCard}>
                        <div className={styles.alertIconWrapper} style={{ color: '#3b82f6' }}>
                            <ShieldAlert size={56} />
                        </div>
                        <h2 className={styles.authTitle}>Admin Account Detected</h2>
                        <p className={styles.authDesc}>
                            This page is for resident document requests. As an administrator, you can manage and approve requests from the Admin Dashboard.
                        </p>
                        <div className={styles.authButtons}>
                            <Link href="/admin" className={styles.authBtnPrimary}>
                                Go to Admin Dashboard
                            </Link>
                            <Link href="/services" className={styles.authBtnOutline}>
                                Back to Services
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // ── Verification Required Prompt ──
    if (user && !profile?.is_verified) {
        return (
            <div className={styles.pageWrapper}>
                <header className={styles.header}>
                    <div className={styles.headerInner}>
                        <Link href="/services" className={styles.backBtn}>
                            <ChevronLeft size={16} />
                            <span>Back</span>
                        </Link>
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
                            <span className={`${styles.metaBadge} ${styles.metaReq}`}>
                                Valid: {doc.validity}
                            </span>
                        </div>
                    </div>
                </div>

                <div className={styles.authPrompt}>
                    <div className={styles.authCard}>
                        <div className={styles.alertIconWrapper} style={{ color: '#ea580c' }}>
                            <AlertTriangle size={56} />
                        </div>
                        <h2 className={styles.authTitle}>Verification Required</h2>
                        <p className={styles.authDesc}>
                            Your account is currently under review by Barangay Administrators. You will be able to request a {doc.name} online once your account is fully verified.
                        </p>
                        <div className={styles.authButtons}>
                            <Link href="/resident" className={styles.authBtnPrimary}>
                                Go to Resident Dashboard
                            </Link>
                            <Link href="/services" className={styles.authBtnOutline}>
                                Back to Services
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

    const renderDynamicFields = () => {
        const type = (slug || '').toLowerCase()
        if (type.includes('job-seeker') || type.includes('first-time')) {
            return (
                <div className={styles.dynamicFieldsCard}>
                    <h3 className={styles.dynamicHeader}>
                        <ClipboardList size={18} style={{ color: 'var(--primary-500, #3b82f6)' }} />
                        <span>Additional Job Seeker Details</span>
                    </h3>
                    <div className={styles.dynamicGrid2}>
                        <div className={styles.fieldGroup}>
                            <div className={styles.fieldLabel}>
                                <span className={styles.fieldLabelText}>Years of Residency</span>
                                <span className={styles.fieldRequired}>Required *</span>
                            </div>
                            <input
                                type="number"
                                className={styles.fieldInput}
                                value={docSpecificData.yearsOfResidency || ''}
                                onChange={e => handleDocSpecificChange('yearsOfResidency', e.target.value)}
                                placeholder="e.g. 5"
                                min="0"
                            />
                        </div>
                        <div className={styles.fieldGroup}>
                            <div className={styles.fieldLabel}>
                                <span className={styles.fieldLabelText}>Presented ID Type</span>
                                <span className={styles.fieldRequired}>Required *</span>
                            </div>
                            <input
                                type="text"
                                className={styles.fieldInput}
                                value={docSpecificData.idType || ''}
                                onChange={e => handleDocSpecificChange('idType', e.target.value)}
                                placeholder="e.g. School ID, Birth Certificate"
                            />
                        </div>
                    </div>
                    <div className={styles.fieldGroup} style={{ marginTop: '0.5rem' }}>
                        <div className={styles.fieldLabel}>
                            <span className={styles.fieldLabelText}>Presented ID Number / Reference</span>
                            <span className={styles.fieldRequired}>Required *</span>
                        </div>
                        <input
                            type="text"
                            className={styles.fieldInput}
                            value={docSpecificData.idNumber || ''}
                            onChange={e => handleDocSpecificChange('idNumber', e.target.value)}
                            placeholder="e.g. ID No. or Certificate Registry No."
                        />
                    </div>
                </div>
            )
        } else if (type.includes('lot') || type.includes('occupancy') || type.includes('building')) {
            return (
                <div className={styles.dynamicFieldsCard}>
                    <h3 className={styles.dynamicHeader}>
                        <Home size={18} style={{ color: 'var(--primary-500, #3b82f6)' }} />
                        <span>Property & Lot Information</span>
                    </h3>
                    <div className={styles.dynamicGrid2}>
                        <div className={styles.fieldGroup}>
                            <div className={styles.fieldLabel}>
                                <span className={styles.fieldLabelText}>Lot Area (sqm)</span>
                                <span className={styles.fieldRequired}>Required *</span>
                            </div>
                            <input
                                type="number"
                                className={styles.fieldInput}
                                value={docSpecificData.lotArea || ''}
                                onChange={e => handleDocSpecificChange('lotArea', e.target.value)}
                                placeholder="e.g. 150"
                                min="1"
                            />
                        </div>
                        <div className={styles.fieldGroup}>
                            <div className={styles.fieldLabel}>
                                <span className={styles.fieldLabelText}>Tax Declaration No.</span>
                                <span className={styles.fieldRequired}>Required *</span>
                            </div>
                            <input
                                type="text"
                                className={styles.fieldInput}
                                value={docSpecificData.taxDecNo || ''}
                                onChange={e => handleDocSpecificChange('taxDecNo', e.target.value)}
                                placeholder="e.g. G-123-45678"
                            />
                        </div>
                    </div>
                    <div className={styles.dynamicGrid2}>
                        <div className={styles.fieldGroup}>
                            <div className={styles.fieldLabel}>
                                <span className={styles.fieldLabelText}>Property Location</span>
                                <span className={styles.fieldRequired}>Required *</span>
                            </div>
                            <input
                                type="text"
                                className={styles.fieldInput}
                                value={docSpecificData.propertyLocation || ''}
                                onChange={e => handleDocSpecificChange('propertyLocation', e.target.value)}
                                placeholder="e.g. Purok 1, Gordon Heights"
                            />
                        </div>
                        <div className={styles.fieldGroup}>
                            <div className={styles.fieldLabel}>
                                <span className={styles.fieldLabelText}>Occupied Since (Year)</span>
                                <span className={styles.fieldRequired}>Required *</span>
                            </div>
                            <input
                                type="number"
                                className={styles.fieldInput}
                                value={docSpecificData.occupiedSince || ''}
                                onChange={e => handleDocSpecificChange('occupiedSince', e.target.value)}
                                placeholder="e.g. 2015"
                            />
                        </div>
                    </div>
                </div>
            )
        } else if (type.includes('business')) {
            return (
                <div className={styles.dynamicFieldsCard}>
                    <h3 className={styles.dynamicHeader}>
                        <Store size={18} style={{ color: 'var(--primary-500, #3b82f6)' }} />
                        <span>Business & Operator Information</span>
                    </h3>
                    <div className={styles.dynamicGrid2}>
                        <div className={styles.fieldGroup}>
                            <div className={styles.fieldLabel}>
                                <span className={styles.fieldLabelText}>Business Name</span>
                                <span className={styles.fieldRequired}>Required *</span>
                            </div>
                            <input
                                type="text"
                                className={styles.fieldInput}
                                value={docSpecificData.businessName || ''}
                                onChange={e => handleDocSpecificChange('businessName', e.target.value)}
                                placeholder="e.g. Gordon Heights Sari-Sari Store"
                            />
                        </div>
                        <div className={styles.fieldGroup}>
                            <div className={styles.fieldLabel}>
                                <span className={styles.fieldLabelText}>Business Location / Address</span>
                                <span className={styles.fieldRequired}>Required *</span>
                            </div>
                            <input
                                type="text"
                                className={styles.fieldInput}
                                value={docSpecificData.businessLocation || ''}
                                onChange={e => handleDocSpecificChange('businessLocation', e.target.value)}
                                placeholder="e.g. Purok 2, Gordon Heights"
                            />
                        </div>
                    </div>
                    <div className={styles.dynamicGrid2}>
                        <div className={styles.fieldGroup}>
                            <div className={styles.fieldLabel}>
                                <span className={styles.fieldLabelText}>Operator / Manager Full Name</span>
                                <span className={styles.fieldRequired}>Required *</span>
                            </div>
                            <input
                                type="text"
                                className={styles.fieldInput}
                                value={docSpecificData.operatorName || ''}
                                onChange={e => handleDocSpecificChange('operatorName', e.target.value)}
                                placeholder="e.g. Maria Clara"
                            />
                        </div>
                        <div className={styles.fieldGroup}>
                            <div className={styles.fieldLabel}>
                                <span className={styles.fieldLabelText}>Operator Home Address</span>
                                <span className={styles.fieldRequired}>Required *</span>
                            </div>
                            <input
                                type="text"
                                className={styles.fieldInput}
                                value={docSpecificData.operatorAddress || ''}
                                onChange={e => handleDocSpecificChange('operatorAddress', e.target.value)}
                                placeholder="e.g. Purok 3, Gordon Heights"
                            />
                        </div>
                    </div>
                </div>
            )
        } else if (type.includes('indigency') || type.includes('residency') || type.includes('clearance')) {
            return (
                <div className={styles.dynamicFieldsCard}>
                    <h3 className={styles.dynamicHeader}>
                        <User size={18} style={{ color: 'var(--primary-500, #3b82f6)' }} />
                        <span>Personal Certification Details</span>
                    </h3>
                    <div className={styles.dynamicGrid2}>
                        <div className={styles.fieldGroup}>
                            <div className={styles.fieldLabel}>
                                <span className={styles.fieldLabelText}>Civil Status</span>
                                <span className={styles.fieldRequired}>Required *</span>
                            </div>
                            <select
                                className={styles.fieldInput}
                                value={docSpecificData.civilStatus || ''}
                                onChange={e => handleDocSpecificChange('civilStatus', e.target.value)}
                            >
                                <option value="">Select Status</option>
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                                <option value="Widowed">Widowed</option>
                                <option value="Divorced">Divorced</option>
                                <option value="Separated">Separated</option>
                            </select>
                        </div>
                        <div className={styles.fieldGroup}>
                            <div className={styles.fieldLabel}>
                                <span className={styles.fieldLabelText}>Birthdate</span>
                                <span className={styles.fieldRequired}>Required *</span>
                            </div>
                            <input
                                type="date"
                                className={styles.fieldInput}
                                value={docSpecificData.birthdate || ''}
                                onChange={e => handleDocSpecificChange('birthdate', e.target.value)}
                            />
                        </div>
                    </div>
                    {type.includes('residency') && (
                        <div className={styles.fieldGroup} style={{ marginTop: '0.5rem' }}>
                            <div className={styles.fieldLabel}>
                                <span className={styles.fieldLabelText}>Resident Since (Year or "Since Birth")</span>
                                <span className={styles.fieldRequired}>Required *</span>
                            </div>
                            <input
                                type="text"
                                className={styles.fieldInput}
                                value={docSpecificData.residentSince || ''}
                                onChange={e => handleDocSpecificChange('residentSince', e.target.value)}
                                placeholder='e.g., 2010 or "Since Birth"'
                            />
                        </div>
                    )}
                </div>
            )
        }
        return null
    }

    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <Link href="/services" className={styles.backBtn}>
                        <ChevronLeft size={16} />
                        <span>Back</span>
                    </Link>
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
                        <span className={`${styles.metaBadge} ${styles.metaReq}`}>
                            Valid: {doc.validity}
                        </span>
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

                        {/* Dynamic Fields */}
                        {renderDynamicFields()}

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
                            <div 
                                className={`${styles.fileArea} ${attachments.length > 0 ? styles.fileAreaActive : ''} ${isDragging ? styles.fileAreaDragging : ''}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <input
                                    type="file"
                                    className={styles.fileInput}
                                    onChange={handleFileChange}
                                    accept="image/*,.pdf,.doc,.docx"
                                    id="req-file"
                                    multiple
                                />
                                <div className={styles.fileIcon} style={{ color: 'var(--text-muted)' }}>
                                    <UploadCloud size={32} />
                                </div>
                                <p className={styles.fileText}>
                                    {isDragging ? 'Drop your files here' : 'Drag & drop or click to upload requirements'}
                                </p>
                                <p className={styles.fileSmall}>Supports images, PDF, and DOCX (Max 5MB per file)</p>
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
