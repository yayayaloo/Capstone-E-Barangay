'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'
import { Check, Camera, AlertCircle, User, Plane, Accessibility, UserPlus, Heart, Briefcase, UserMinus, HandHeart, Baby, Zap, Users, BookX } from 'lucide-react'

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

interface ProfileModalProps {
    profile: Profile
    onClose: () => void
    onSubmit: (updates: Partial<Profile>) => Promise<void>
}

export default function ProfileModal({ profile, onClose, onSubmit }: ProfileModalProps) {
    const [email, setEmail] = useState(profile.email || '')
    const [phone, setPhone] = useState(profile.phone || '')
    const [sectors, setSectors] = useState<string[]>(profile.sectors || [])
    const [profilePicture, setProfilePicture] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState(profile.profile_picture_url ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resident-profile-pictures/${profile.profile_picture_url}` : null)
    
    // ID Document state
    const [idDocument, setIdDocument] = useState<File | null>(null)
    const [idDocumentUrl, setIdDocumentUrl] = useState<string | null>(profile.id_document_url || null)
    
    // Residency Information state
    const [residentSinceMode, setResidentSinceMode] = useState<'birth' | 'year'>(
        profile.resident_since === 'Since Birth' || !profile.resident_since ? 'birth' : 'year'
    )
    const [residentSinceYear, setResidentSinceYear] = useState(
        profile.resident_since && profile.resident_since !== 'Since Birth' ? profile.resident_since : ''
    )

    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('Profile picture size exceeds the 5MB limit. Please upload a smaller image.')
                e.target.value = ''
                return
            }
            setProfilePicture(file)
            setPreviewUrl(URL.createObjectURL(file))
            setError('')
        }
    }

    const handleIdDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('ID document size exceeds the 5MB limit. Please upload a smaller file.')
                e.target.value = ''
                return
            }
            setIdDocument(file)
            setError('')
        }
    }

    const viewCurrentIdDocument = async () => {
        if (!idDocumentUrl) return;
        try {
            let urlToOpen: string | null = null;

            const { data: reqData } = await supabase.storage
                .from('resident-requirements')
                .createSignedUrl(idDocumentUrl, 3600);

            if (reqData?.signedUrl) {
                urlToOpen = reqData.signedUrl;
            } else {
                const { data: picData } = await supabase.storage
                    .from('resident-profile-pictures')
                    .createSignedUrl(idDocumentUrl, 3600);

                if (picData?.signedUrl) {
                    urlToOpen = picData.signedUrl;
                } else {
                    const { data: pubData } = supabase.storage
                        .from('resident-profile-pictures')
                        .getPublicUrl(idDocumentUrl);
                    if (pubData?.publicUrl) urlToOpen = pubData.publicUrl;
                }
            }

            if (urlToOpen) {
                window.open(urlToOpen, '_blank');
            } else {
                setError('Could not open ID document.');
            }
        } catch (err: any) {
            setError(`Could not open ID document: ${err.message || 'Unknown error'}`);
        }
    };

    const toggleSector = (sector: string) => {
        setSectors(prev =>
            prev.includes(sector)
                ? prev.filter(s => s !== sector)
                : [...prev, sector]
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSubmitting(true)

        let photoUploadFailed = false

        try {
            let profile_picture_url = profile.profile_picture_url
            let updated_id_document_url = idDocumentUrl

            if (profilePicture) {
                try {
                    const fileExt = profilePicture.name.split('.').pop()
                    const fileName = `${profile.id}/${Date.now()}.${fileExt}`

                    const uploadTimeout = new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('Upload timed out. Please check your connection.')), 10000)
                    )

                    const uploadRequest = supabase.storage
                        .from('resident-profile-pictures')
                        .upload(fileName, profilePicture, { upsert: true })

                    const { error: uploadError } = await Promise.race([uploadRequest, uploadTimeout]) as any

                    if (uploadError) {
                        photoUploadFailed = true
                        setError(`Photo could not be uploaded (${uploadError.message}). Your other profile info will still be saved.`)
                    } else {
                        profile_picture_url = fileName
                    }
                } catch (uploadErr: any) {
                    photoUploadFailed = true
                    setError(`Photo upload failed: ${uploadErr.message}. Your other profile info will still be saved.`)
                }
            }

            if (idDocument) {
                try {
                    const fileName = `${profile.id}/id_verification_${Date.now()}_${idDocument.name.replace(/\s+/g, '_')}`
                    const { error: idUploadErr } = await supabase.storage
                        .from('resident-requirements')
                        .upload(fileName, idDocument, { upsert: true, contentType: idDocument.type })

                    if (idUploadErr) {
                        setError(`ID document upload failed: ${idUploadErr.message}`)
                        setSubmitting(false)
                        return
                    } else {
                        updated_id_document_url = fileName
                    }
                } catch (idErr: any) {
                    setError(`ID document upload failed: ${idErr.message}`)
                    setSubmitting(false)
                    return
                }
            }

            await onSubmit({
                email: email.trim(),
                phone: phone.trim(),
                sectors,
                profile_picture_url,
                id_document_url: updated_id_document_url,
                resident_since: residentSinceMode === 'birth' ? 'Since Birth' : residentSinceYear
            })

            if (!photoUploadFailed) {
                onClose()
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to update profile. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: '1rem', zIndex: 9999 }} onClick={onClose}>
            <div className="glass-card" style={{ maxWidth: '550px', width: '100%', padding: '2.5rem', background: 'var(--bg-secondary, #1a1a2e)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ margin: 0 }}>Update Profile</h2>
                    <button style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }} onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Profile Picture Upload Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <Camera size={40} color="var(--text-muted)" />
                            )}
                        </div>
                        <input
                            type="file"
                            id="profile-picture"
                            accept="image/*"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                        <label
                            htmlFor="profile-picture"
                            className="btn btn-outline"
                            style={{ cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                            Change Photo
                        </label>

                        <div style={{ padding: '1rem', background: 'rgba(22, 163, 74, 0.05)', borderRadius: '12px', border: '1px solid rgba(22, 163, 74, 0.1)', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary-600)', fontSize: '0.85rem', fontWeight: 700 }}>
                                <AlertCircle size={16} /> REQUIRED GUIDELINES:
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                <li><strong>2x2 size</strong> (Professional Headshot)</li>
                                <li><strong>White background</strong> only</li>
                                <li><strong>No earrings or necklaces</strong></li>
                                <li><strong>Proper attire</strong> (Semi-formal or Formal)</li>
                            </ul>
                        </div>
                    </div>

                    {error && (
                        <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Full Name</label>
                            <input
                                type="text"
                                value={profile.full_name}
                                disabled
                                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gender</label>
                            <input
                                type="text"
                                value={profile.gender || 'Not set'}
                                disabled
                                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Home Address</label>
                        <input
                            type="text"
                            value={profile.address || ''}
                            disabled
                            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Phone Number</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="09XXXXXXXXX"
                                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>

                    {/* Residency Information */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Residency Duration in Barangay</label>
                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                <input
                                    type="radio"
                                    checked={residentSinceMode === 'birth'}
                                    onChange={() => setResidentSinceMode('birth')}
                                    style={{ accentColor: 'var(--primary-500)' }}
                                />
                                Since Birth
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                <input
                                    type="radio"
                                    checked={residentSinceMode === 'year'}
                                    onChange={() => setResidentSinceMode('year')}
                                    style={{ accentColor: 'var(--primary-500)' }}
                                />
                                Specify Year
                            </label>
                        </div>
                        {residentSinceMode === 'year' && (
                            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Year Started Living in the Barangay</label>
                                <input
                                    type="number"
                                    min="1900"
                                    max={new Date().getFullYear()}
                                    value={residentSinceYear}
                                    onChange={(e) => setResidentSinceYear(e.target.value)}
                                    placeholder="e.g. 2015"
                                    required={residentSinceMode === 'year'}
                                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', maxWidth: '200px' }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Sectoral Information */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>
                                Sectoral Classification
                            </label>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', opacity: 0.7 }}>
                                Optional — select all that apply to you
                            </span>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                            gap: '0.5rem',
                        }}>
                            {SECTOR_OPTIONS.map(opt => {
                                const isSelected = sectors.includes(opt.value)
                                return (
                                    <div
                                        key={opt.value}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.6rem 0.75rem',
                                            borderRadius: '8px',
                                            border: `1.5px solid ${isSelected ? 'var(--primary-500, #059669)' : 'var(--border-color)'}`,
                                            background: isSelected ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            fontSize: '0.8rem',
                                            color: isSelected ? '#fff' : 'var(--text-secondary)',
                                            fontWeight: isSelected ? 600 : 400,
                                            userSelect: 'none',
                                        }}
                                        onClick={() => toggleSector(opt.value)}
                                    >
                                        <span style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '4px',
                                            border: `2px solid ${isSelected ? 'var(--primary-500, #059669)' : 'var(--border-color)'}`,
                                            background: isSelected ? 'var(--primary-500, #059669)' : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            fontSize: '0.65rem',
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

                    {/* Identity Verification Document Section */}
                    <div style={{
                        padding: '1.25rem',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                Identity Verification Document (Valid ID)
                            </label>
                            {idDocumentUrl ? (
                                <span style={{ fontSize: '0.75rem', color: 'var(--primary-500, #059669)', fontWeight: 600 }}>
                                    ✓ Document Uploaded
                                </span>
                            ) : (
                                <span style={{ fontSize: '0.75rem', color: '#eab308', fontWeight: 600 }}>
                                    ⚠️ No ID Uploaded
                                </span>
                            )}
                        </div>

                        {idDocumentUrl && (
                            <div>
                                <button
                                    type="button"
                                    onClick={viewCurrentIdDocument}
                                    className="btn btn-outline"
                                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                                >
                                    View Current ID Document
                                </button>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <label htmlFor="modal-id-document" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {idDocumentUrl ? 'Upload New ID / Update Document (Image or PDF):' : 'Upload Valid ID (Image or PDF):'}
                            </label>
                            <input
                                id="modal-id-document"
                                type="file"
                                accept="image/*,.pdf"
                                onChange={handleIdDocChange}
                                style={{
                                    fontSize: '0.8rem',
                                    padding: '0.5rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-primary)',
                                    color: 'var(--text-primary)'
                                }}
                            />
                            {idDocument && (
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--primary-500, #059669)' }}>
                                    Selected: {idDocument.name} ({(idDocument.size / 1024 / 1024).toFixed(2)} MB)
                                </p>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose} disabled={submitting}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ flex: 1 }}
                            disabled={submitting}
                        >
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
