'use client'

import { useState } from 'react'
import styles from './RequestModal.module.css' // Reuse modal styles
import { Profile } from '@/lib/types'

interface ProfileModalProps {
    profile: Profile
    onClose: () => void
    onSubmit: (updates: Partial<Profile>) => Promise<void>
}

export default function ProfileModal({ profile, onClose, onSubmit }: ProfileModalProps) {
    const [fullName, setFullName] = useState(profile.full_name || '')
    const [address, setAddress] = useState(profile.address || '')
    const [phone, setPhone] = useState(profile.phone || '')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSubmitting(true)

        try {
            await onSubmit({
                full_name: fullName.trim(),
                address: address.trim(),
                phone: phone.trim()
            })
            onClose()
        } catch (err: any) {
            setError(err?.message || 'Failed to update profile. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: '1rem' }} onClick={onClose}>
            <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '2.5rem', background: 'var(--bg-secondary, #1a1a2e)' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ margin: 0 }}>Update Profile 👤</h2>
                    <button style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }} onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Verification Status Banner */}
                    <div style={{ padding: '0.9rem 1.25rem', borderRadius: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <div style={{ width: '45px', height: '45px', borderRadius: '10px', background: profile.is_verified ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', border: `1px solid ${profile.is_verified ? '#2563eb' : 'var(--border-color)'}` }}>
                            {profile.is_verified ? '🛡️' : '👤'}
                        </div>
                        <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: profile.is_verified ? 'var(--primary-600)' : 'var(--text-muted)' }}>
                                {profile.is_verified ? '✨ Verified Account' : '⚪ Pending Review'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {profile.is_verified ? `ID: ${profile.resident_id_number || 'Official Issued'}` : 'Verify your profile at the Brgy. Hall'}
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444' }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Full Name</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Home Address</label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="e.g., Blk 1 Lot 2, Gordon Heights"
                            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Phone Number</label>
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="e.g., 09123456789"
                            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        />
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
