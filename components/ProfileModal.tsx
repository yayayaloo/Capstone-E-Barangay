'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'
import { Camera, AlertCircle } from 'lucide-react'

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
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setProfilePicture(file)
            setPreviewUrl(URL.createObjectURL(file))
        }
    }

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

        try {
            let profile_picture_url = profile.profile_picture_url

            if (profilePicture) {
                const fileExt = profilePicture.name.split('.').pop()
                const fileName = `${profile.id}/${Date.now()}.${fileExt}`
                
                const { error: uploadError } = await supabase.storage
                    .from('resident-profile-pictures')
                    .upload(fileName, profilePicture, { upsert: true })

                if (uploadError) throw uploadError
                profile_picture_url = fileName
            }

            await onSubmit({
                email: email.trim(),
                phone: phone.trim(),
                sectors,
                profile_picture_url
            })
            onClose()
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
                    <h2 style={{ margin: 0 }}>Update Profile 👤</h2>
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
                        
                        <div style={{ padding: '1rem', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '12px', border: '1px solid rgba(37, 99, 235, 0.1)', width: '100%' }}>
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
                            ⚠️ {error}
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
                            gridTemplateColumns: 'repeat(2, 1fr)',
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
                                            border: `1.5px solid ${isSelected ? 'var(--primary-500, #6366f1)' : 'var(--border-color)'}`,
                                            background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
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
                                            border: `2px solid ${isSelected ? 'var(--primary-500, #6366f1)' : 'var(--border-color)'}`,
                                            background: isSelected ? 'var(--primary-500, #6366f1)' : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            fontSize: '0.65rem',
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
