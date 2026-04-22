'use client'

import { useState } from 'react'
import styles from './RequestModal.module.css'

interface RequestModalProps {
    onClose: () => void
    onSubmit: (documentType: string, purpose: string, attachment: File | null) => Promise<void>
    initialType?: string
}

const documentTypes = [
    { value: 'Barangay Clearance', label: '📄 Barangay Clearance', desc: 'Verification of residency, good moral character, no derogatory record.', reqs: 'Valid ID (Php 50.00)' },
    { value: 'Barangay Certification', label: '📝 Barangay Certification', desc: 'For Residency, Loan, Good Moral Character.', reqs: 'Valid ID (Php 50.00)' },
    { value: 'Business Clearance', label: '🏢 Business Clearance', desc: 'Compliance for business permit within Gordon Heights.', reqs: 'DTI Certificate (Free)' },
    { value: 'Lot Certification', label: '🏡 Lot / Building Certification', desc: 'Issued to actual lot occupants for compliance to government agencies.', reqs: 'Purok Cert, Tax Dec, Latest Tax Payment, etc. (Php 1.00/sqm)' },
    { value: 'First Time Job Seeker', label: '💼 First Time Job Seeker', desc: 'Waives fees for pre-employment requirements (Ages 18-30).', reqs: 'Valid ID (Free)' },
    { value: 'Indigency', label: '🤝 Certificate of Indigency', desc: 'Certification of financial status.', reqs: 'Valid ID (Free)' },
]

export default function RequestModal({ onClose, onSubmit, initialType }: RequestModalProps) {
    const [selectedType, setSelectedType] = useState(initialType || '')
    const [purpose, setPurpose] = useState('')
    const [attachment, setAttachment] = useState<File | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('File size must be less than 5MB')
                return
            }
            setAttachment(file)
            setError('')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!selectedType) {
            setError('Please select a document type')
            return
        }

        if (!purpose.trim()) {
            setError('Please enter the purpose of your request')
            return
        }

        setSubmitting(true)
        try {
            await onSubmit(selectedType, purpose.trim(), attachment)
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

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && (
                        <div className={styles.errorMessage}>⚠️ {error}</div>
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
                                    {selectedType === doc.value && (
                                        <div className={styles.typeReqs}>
                                            <strong>Requirements:</strong> {doc.reqs}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="purpose">Purpose / Reason *</label>
                        <textarea
                            id="purpose"
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            placeholder="e.g., Employment requirement, Business registration, School enrollment..."
                            rows={3}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Attach Requirements (Photos/Docs)</label>
                        <div className={styles.fileUploadArea}>
                            <input
                                type="file"
                                id="attachment"
                                onChange={handleFileChange}
                                className={styles.fileInput}
                                accept="image/*,.pdf,.doc,.docx"
                            />
                            <label htmlFor="attachment" className={styles.fileLabel}>
                                {attachment ? (
                                    <span className={styles.fileName}>✔️ {attachment.name}</span>
                                ) : (
                                    <>
                                        <span className={styles.uploadIcon}>📁</span>
                                        <span>Click to upload or drag requirements here</span>
                                        <small>(1x1 Photo, ID, or other supporting documents)</small>
                                    </>
                                )}
                            </label>
                            {attachment && (
                                <button 
                                    type="button" 
                                    className={styles.clearFile}
                                    onClick={() => setAttachment(null)}
                                >
                                    Remove
                                </button>
                            )}
                        </div>
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
                            {submitting ? 'Submitting...' : '📄 Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
