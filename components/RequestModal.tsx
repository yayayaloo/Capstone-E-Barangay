'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import styles from './RequestModal.module.css'

interface RequestModalProps {
    onClose: () => void
    onSubmit: (documentType: string, purpose: string, attachments: File[], formData?: Record<string, any>) => Promise<void>
    initialType?: string
    profile?: any
}

const documentTypes = [
    { value: 'Barangay Clearance', label: ' Barangay Clearance', desc: 'Verification of residency, good moral character, no derogatory record.', reqs: 'Valid ID (Php 50.00)' },
    { value: 'Certificate of Residency', label: ' Certificate of Residency', desc: 'Proof of address and duration of stay in the barangay.', reqs: 'Valid ID (Php 50.00)' },
    { value: 'Business Clearance', label: ' Business Clearance', desc: 'Compliance for business permit within Gordon Heights.', reqs: 'DTI Certificate (Free)' },
    { value: 'Lot Certification', label: ' Lot / Building Certification', desc: 'Issued to actual lot occupants for compliance to government agencies.', reqs: 'Purok Cert, Tax Dec, Latest Tax Payment, etc. (Php 1.00/sqm)' },
    { value: 'First Time Job Seeker', label: ' First Time Job Seeker', desc: 'Waives fees for pre-employment requirements (Ages 18-30).', reqs: 'Valid ID (Free)' },
    { value: 'Certificate of Indigency', label: ' Certificate of Indigency', desc: 'Certification of financial status.', reqs: 'Valid ID (Free)' },
]

export default function RequestModal({ onClose, onSubmit, initialType, profile }: RequestModalProps) {
    const [selectedType, setSelectedType] = useState(initialType || '')
    const [purposeCategory, setPurposeCategory] = useState('')
    const [purposeOther, setPurposeOther] = useState('')
    
    let initialAge = ''
    if (profile?.birthdate) {
        const today = new Date()
        const born = new Date(profile.birthdate)
        if (!isNaN(born.getTime())) {
            let a = today.getFullYear() - born.getFullYear()
            const m = today.getMonth() - born.getMonth()
            if (m < 0 || (m === 0 && today.getDate() < born.getDate())) a--
            initialAge = a.toString()
        }
    }

    let initialYearsOfResidency = ''
    if (profile?.resident_since) {
        if (profile.resident_since === 'Since Birth') {
            initialYearsOfResidency = initialAge
        } else {
            const year = parseInt(profile.resident_since)
            if (!isNaN(year)) {
                initialYearsOfResidency = (new Date().getFullYear() - year).toString()
            }
        }
    }

    const [formData, setFormData] = useState<Record<string, any>>({
        address: profile?.address || '',
        birthdate: profile?.birthdate || '',
        civilStatus: profile?.relationship_status || '',
        age: initialAge,
        residentSince: profile?.resident_since || '',
        yearsOfResidency: initialYearsOfResidency,
        isRenewal: true
    })
    const [attachments, setAttachments] = useState<File[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files)
            const MAX_SIZE = 5 * 1024 * 1024 // 5MB
            const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
            const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf']

            const invalidFile = newFiles.find(file => {
                const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
                return (!file.type || !ALLOWED_TYPES.includes(file.type)) && !ALLOWED_EXTENSIONS.includes(ext)
            })

            if (invalidFile) {
                setError(`Invalid file format: ${invalidFile.name}. Only image files (JPG, PNG, WEBP) and PDF documents are allowed.`)
                e.target.value = ''
                return
            }

            const oversized = newFiles.filter(file => file.size > MAX_SIZE)

            if (oversized.length > 0) {
                setError(`File too large: ${oversized.map(f => f.name).join(', ')}. Maximum limit per file is 5MB.`)
                e.target.value = ''
                return
            }

            setAttachments(prev => [...prev, ...newFiles])
            setError('')
            // Reset input so user can select again
            e.target.value = ''
        }
    }

    const removeFile = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!selectedType) {
            setError('Please select a document type')
            return
        }

        const finalPurpose = purposeCategory === 'Others' ? purposeOther.trim() : purposeCategory

        if (!finalPurpose) {
            setError('Please specify the purpose of your request')
            return
        }

        if (attachments.length === 0) {
            setError('Please upload at least one valid ID or requirement before submitting')
            return
        }

        setSubmitting(true)
        try {
            await onSubmit(selectedType, finalPurpose, attachments, formData)
            onClose()
        } catch (err: any) {
            setError(err?.message || 'Failed to submit request. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Request a Document</h2>
                    <button className={styles.closeButton} onClick={onClose}>✕</button>
                </div>
                {!profile?.is_verified ? (
                    <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', color: '#ea580c', marginBottom: '1.2rem' }}>
                            <AlertTriangle size={56} />
                        </div>
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: 600 }}>Residency Verification Required</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                            Your account is currently under review by Barangay Administrators. You will be able to request certificates and clearances online once your account is fully verified.
                        </p>
                        <button type="button" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} onClick={onClose}>
                            Close
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && (
                            <div className={styles.errorMessage}> {error}</div>
                        )}

                    <div className={styles.inputGroup}>
                        <label>Document Type *</label>
                        <div className={styles.typeGrid}>
                            {documentTypes.map((doc) => (
                                <button
                                    key={doc.value}
                                    type="button"
                                    className={`${styles.typeCard} ${selectedType === doc.value ? styles.typeSelected : ''}`}
                                    onClick={() => setSelectedType(doc.value)}
                                >
                                    <span className={styles.typeLabel}>{doc.label}</span>
                                    <span className={styles.typeDesc}>{doc.desc}</span>
                                    <div className={styles.typeReqs}>
                                        <strong>Requirements:</strong> {doc.reqs}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Purpose / Reason *</label>
                        <select
                            value={purposeCategory}
                            onChange={(e) => setPurposeCategory(e.target.value)}
                            required
                            style={{ padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%', marginTop: '0.2rem', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        >
                            <option value="">Select Purpose</option>
                            <option value="Employment Requirement">Employment Requirement</option>
                            <option value="Business Registration">Business Registration</option>
                            <option value="School Enrollment">School Enrollment</option>
                            <option value="Loan Application">Loan Application</option>
                            <option value="Record Purposes">Record Purposes</option>
                            <option value="Financial Assistance">Financial Assistance</option>
                            <option value="Others">Others</option>
                        </select>
                        {purposeCategory === 'Others' && (
                            <textarea
                                value={purposeOther}
                                onChange={(e) => setPurposeOther(e.target.value)}
                                placeholder="Please specify your purpose..."
                                rows={2}
                                style={{ padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%', marginTop: '0.5rem', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                required
                            />
                        )}
                    </div>

                    {(() => {
                        if (!selectedType) return null

                        const type = selectedType.toLowerCase()

                        const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                            setFormData({
                                ...formData,
                                [e.target.name]: e.target.value
                            })
                        }

                        const inputStyle = { padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%', marginTop: '0.2rem' }

                        if (type.includes('job seeker') || type.includes('first time')) {
                            return (
                                <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Additional Information Required</h4>
                                    <div className={styles.inputGroup}>
                                        <label>Complete Address *</label>
                                        <input type="text" name="address" value={formData.address || ''} onChange={handleFormChange} required placeholder="Block 1, Lot 2, Gordon Heights..." style={inputStyle} readOnly={!!profile?.address} />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>Years of Residency *</label>
                                        <input type="number" name="yearsOfResidency" value={formData.yearsOfResidency || ''} onChange={handleFormChange} required placeholder="e.g. 5" style={inputStyle} readOnly={!!profile?.resident_since} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className={styles.inputGroup}>
                                            <label>Type of ID Presented *</label>
                                            <input type="text" name="idType" value={formData.idType || ''} onChange={handleFormChange} required placeholder="e.g. National ID" style={inputStyle} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label>ID Number *</label>
                                            <input type="text" name="idNumber" value={formData.idNumber || ''} onChange={handleFormChange} required placeholder="ID No." style={inputStyle} />
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        if (type.includes('indigency') || type.includes('residency') || (type.includes('clearance') && !type.includes('business'))) {
                            return (
                                <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Additional Information Required</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                        <div className={styles.inputGroup}>
                                            <label>Age *</label>
                                            <input type="number" name="age" value={formData.age || ''} readOnly style={{ ...inputStyle, backgroundColor: 'var(--bg-secondary)' }} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label>Civil Status *</label>
                                            <select name="civilStatus" value={formData.civilStatus || ''} onChange={handleFormChange} required style={inputStyle} disabled={!!profile?.relationship_status}>
                                                <option value="">Select</option>
                                                <option value="Single">Single</option>
                                                <option value="Married">Married</option>
                                                <option value="Widowed">Widowed</option>
                                                <option value="Separated">Separated</option>
                                            </select>
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label>Date of Birth *</label>
                                            <input type="date" name="birthdate" value={formData.birthdate || ''} max={new Date().toISOString().split('T')[0]} onChange={(e) => {
                                                const newBirthdate = e.target.value;
                                                let newAge = '';
                                                if (newBirthdate) {
                                                    const today = new Date();
                                                    const born = new Date(newBirthdate);
                                                    let a = today.getFullYear() - born.getFullYear();
                                                    const m = today.getMonth() - born.getMonth();
                                                    if (m < 0 || (m === 0 && today.getDate() < born.getDate())) a--;
                                                    newAge = a.toString();
                                                }
                                                setFormData({ ...formData, birthdate: newBirthdate, age: newAge });
                                            }} required style={inputStyle} readOnly={!!profile?.birthdate} />
                                        </div>
                                    </div>
                                    {type.includes('residency') && (
                                        <div className={styles.inputGroup}>
                                            <label>Resident Since *</label>
                                            {profile?.resident_since ? (
                                                <input type="text" name="residentSince" value={formData.residentSince || ''} readOnly style={inputStyle} />
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <select
                                                        value={formData.residentSinceMode || ''}
                                                        onChange={(e) => setFormData({ ...formData, residentSinceMode: e.target.value, residentSince: e.target.value === 'Since Birth' ? 'Since Birth' : '' })}
                                                        required
                                                        style={inputStyle}
                                                    >
                                                        <option value="">Select Option</option>
                                                        <option value="Since Birth">Since Birth</option>
                                                        <option value="Specify Year">Specify Year</option>
                                                    </select>
                                                    {formData.residentSinceMode === 'Specify Year' && (
                                                        <input type="number" min="1900" max={new Date().getFullYear()} name="residentSince" value={formData.residentSince || ''} onChange={handleFormChange} required placeholder="Year (e.g. 2015)" style={inputStyle} />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className={styles.inputGroup}>
                                        <label>Complete Address *</label>
                                        <input type="text" name="address" value={formData.address || ''} onChange={handleFormChange} required placeholder="Block 1, Lot 2, Gordon Heights..." style={inputStyle} readOnly={!!profile?.address} />
                                    </div>
                                </div>
                            )
                        }

                        if (type.includes('lot') || type.includes('occupancy') || type.includes('building')) {
                            return (
                                <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Property Details Required</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className={styles.inputGroup}>
                                            <label>Lot Area (sqm) *</label>
                                            <input type="number" name="lotArea" value={formData.lotArea || ''} onChange={handleFormChange} required placeholder="e.g. 200" style={inputStyle} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label>Tax Declaration No. *</label>
                                            <input type="text" name="taxDecNo" value={formData.taxDecNo || ''} onChange={handleFormChange} required placeholder="No." style={inputStyle} />
                                        </div>
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>Property Location *</label>
                                        <input type="text" name="propertyLocation" value={formData.propertyLocation || ''} onChange={handleFormChange} required placeholder="Complete address of lot" style={inputStyle} />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>Occupied Since (Year) *</label>
                                        <input type="text" name="occupiedSince" value={formData.occupiedSince || ''} onChange={handleFormChange} required placeholder="e.g. 1990" style={inputStyle} />
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                                        <div className={styles.inputGroup}>
                                            <label>Bounded North *</label>
                                            <input type="text" name="boundedNorth" value={formData.boundedNorth || ''} onChange={handleFormChange} required placeholder="e.g. Lot 2" style={inputStyle} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label>Bounded South *</label>
                                            <input type="text" name="boundedSouth" value={formData.boundedSouth || ''} onChange={handleFormChange} required placeholder="e.g. Road" style={inputStyle} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                                        <div className={styles.inputGroup}>
                                            <label>Bounded East *</label>
                                            <input type="text" name="boundedEast" value={formData.boundedEast || ''} onChange={handleFormChange} required placeholder="e.g. Lot 3" style={inputStyle} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label>Bounded West *</label>
                                            <input type="text" name="boundedWest" value={formData.boundedWest || ''} onChange={handleFormChange} required placeholder="e.g. Lot 4" style={inputStyle} />
                                        </div>
                                    </div>
                                    
                                    <h5 style={{ margin: '1.5rem 0 0.5rem', color: 'var(--text-secondary)' }}>Deed of Sale Details (Optional if N/A)</h5>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                                        <div className={styles.inputGroup}>
                                            <label>Doc No.</label>
                                            <input type="text" name="docNo" value={formData.docNo || ''} onChange={handleFormChange} style={inputStyle} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label>Page No.</label>
                                            <input type="text" name="pageNo" value={formData.pageNo || ''} onChange={handleFormChange} style={inputStyle} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label>Book No.</label>
                                            <input type="text" name="bookNo" value={formData.bookNo || ''} onChange={handleFormChange} style={inputStyle} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label>Series Of</label>
                                            <input type="text" name="seriesOf" value={formData.seriesOf || ''} onChange={handleFormChange} style={inputStyle} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                                        <div className={styles.inputGroup}>
                                            <label>Notarized By (Atty.)</label>
                                            <input type="text" name="notarizedBy" value={formData.notarizedBy || ''} onChange={handleFormChange} style={inputStyle} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label>Notarized On (Date)</label>
                                            <input type="text" name="notarizedOn" value={formData.notarizedOn || ''} onChange={handleFormChange} style={inputStyle} />
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        if (type.includes('business')) {
                            return (
                                <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Business Details Required</h4>
                                    <div className={styles.inputGroup}>
                                        <label>Business Name / Trade Activity *</label>
                                        <input type="text" name="businessName" value={formData.businessName || ''} onChange={handleFormChange} required placeholder="e.g. Chipai Taiwanese Chicken" style={inputStyle} />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>Application Type *</label>
                                        <select 
                                            name="isRenewal" 
                                            value={formData.isRenewal !== undefined ? String(formData.isRenewal) : 'true'} 
                                            onChange={(e) => setFormData({ ...formData, isRenewal: e.target.value === 'true' })}
                                            required 
                                            style={inputStyle}
                                        >
                                            <option value="true">Renewal</option>
                                            <option value="false">New Business</option>
                                        </select>
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>Business Location *</label>
                                        <input type="text" name="businessLocation" value={formData.businessLocation || ''} onChange={handleFormChange} required placeholder="Address of the business" style={inputStyle} />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>Operator / Manager Name *</label>
                                        <input type="text" name="operatorName" value={formData.operatorName || ''} onChange={handleFormChange} required placeholder="Name of operator" style={inputStyle} />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>Operator Address *</label>
                                        <input type="text" name="operatorAddress" value={formData.operatorAddress || ''} onChange={handleFormChange} required placeholder="Home address of operator" style={inputStyle} />
                                    </div>
                                </div>
                            )
                        }

                        return null
                    })()}

                    <div className={styles.inputGroup}>
                        <label>Upload Valid ID / Requirements *</label>
                        <div className={styles.fileUploadArea}>
                            <input
                                type="file"
                                id="attachment"
                                onChange={handleFileChange}
                                className={styles.fileInput}
                                accept="image/*,.pdf"
                                multiple
                            />
                            <label htmlFor="attachment" className={styles.fileLabel}>
                                <span className={styles.uploadIcon}></span>
                                <span>Click to upload your Valid ID and requirements</span>
                                <small>(You can select multiple files)</small>
                            </label>
                        </div>
                        {attachments.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                                {attachments.map((file, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg, #f8fafc)', padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--border-color, #e2e8f0)' }}>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>{file.name}</span>
                                        <button
                                            type="button"
                                            className={styles.clearFile}
                                            onClick={() => removeFile(idx)}
                                            style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={styles.actions}>
                        <button type="button" className="btn btn-outline" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting...' : ' Submit Request'}
                        </button>
                    </div>
                    </form>
                )}
            </div>
        </div>
    )
}
