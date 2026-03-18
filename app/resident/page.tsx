'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ChatBot from '@/components/ChatBot'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import LoadingSpinner from '@/components/LoadingSpinner'
import RequestModal from '@/components/RequestModal'
import ProfileModal from '@/components/ProfileModal'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { ServiceRequest, Announcement, Profile } from '@/lib/types'
import { QRCodeSVG } from 'qrcode.react'
import styles from './resident.module.css'

function ResidentPortalContent() {
    const { profile, signOut, refreshProfile } = useAuth()
    const { showToast } = useToast()
    const [activeTab, setActiveTab] = useState('overview')
    const [showChatBot, setShowChatBot] = useState(false)
    const [showRequestModal, setShowRequestModal] = useState(false)
    const [showProfileModal, setShowProfileModal] = useState(false)
    const [requests, setRequests] = useState<ServiceRequest[]>([])
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [loadingRequests, setLoadingRequests] = useState(true)
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)
    const [selectedQR, setSelectedQR] = useState<{ref: string, title: string} | null>(null)

    useEffect(() => {
        if (profile?.id) {
            fetchRequests()
            fetchAnnouncements()
        }
    }, [profile?.id])

    const fetchRequests = async () => {
        if (!profile?.id) return
        setLoadingRequests(true)
        try {
            const { data, error } = await supabase
                .from('service_requests')
                .select('*')
                .eq('resident_id', profile.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setRequests(data as ServiceRequest[])
        } catch (error: any) {
            console.error('Error fetching requests:', error)
            showToast(error.message || 'Failed to load your requests', 'error')
        } finally {
            setLoadingRequests(false)
        }
    }

    const fetchAnnouncements = async () => {
        setLoadingAnnouncements(true)
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('published_at', { ascending: false })
                .limit(5)

            if (error) throw error
            setAnnouncements(data as Announcement[])
        } catch (error: any) {
            console.error('Error fetching announcements:', error)
            showToast(error.message || 'Failed to load announcements', 'error')
        } finally {
            setLoadingAnnouncements(false)
        }
    }

    const handleRequestSubmit = async (documentType: string, purpose: string, attachment: File | null) => {
        if (!profile?.id) return
        
        try {
            let attachmentUrl = null
            
            if (attachment) {
                const fileName = `${Date.now()}_${attachment.name.replace(/\s+/g, '_')}`
                const filePath = `${profile.id}/${fileName}`
                
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('resident-requirements')
                    .upload(filePath, attachment)

                if (uploadError) {
                    console.error('Upload error:', uploadError)
                    throw new Error(`Failed to upload requirement: ${uploadError.message}`)
                }
                
                attachmentUrl = filePath
            }

            const { data, error } = await supabase
                .from('service_requests')
                .insert({
                    resident_id: profile.id,
                    document_type: documentType,
                    purpose: purpose,
                    attachment_url: attachmentUrl,
                    status: 'pending'
                })
                .select()
                .single()

            if (error) throw error

            setRequests([data as ServiceRequest, ...requests])
            showToast(`${documentType} request submitted successfully! ${attachment ? 'Requirement uploaded.' : ''}`, 'success')
            setShowRequestModal(false)
            setActiveTab('requests')
        } catch (error: any) {
            console.error('Error submitting request:', error)
            showToast(error.message || `Failed to submit request for ${documentType}`, 'error')
        }
    }

    const handleProfileUpdate = async (updates: Partial<Profile>) => {
        if (!profile?.id) return
        
        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', profile.id)

            if (error) throw error
            
            await refreshProfile()
            showToast('Profile updated successfully!', 'success')
            setShowProfileModal(false)
        } catch (error: any) {
            console.error('Error updating profile:', error)
            showToast(error.message || 'Failed to update profile', 'error')
        }
    }

    const renderOverview = () => (
        <>
            {/* Welcome & ID Section */}
            <section className={styles.welcome} style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem' }}>Welcome back, {profile?.full_name?.split(' ')[0] || 'Resident'}! 👋</h1>
                    <p>Access barangay services, track your requests, and stay updated</p>
                </div>
                <div className={styles.idCard} style={{ flex: '1 1 auto', minWidth: '300px', maxWidth: '450px', cursor: 'pointer' }} onClick={() => setActiveTab('profile')}>
                    <div className={styles.idCardMain}>
                        <div className={styles.idCardIcon}>🆔</div>
                        <div className={styles.idCardDetails}>
                            <h4 className={styles.idCardLabel}>E-Barangay ID</h4>
                            <strong className={styles.idCardName}>{profile?.full_name || 'Resident'}</strong>
                            <span className={styles.idCardSub}>RESIDENT | Gordon Heights</span>
                            <div className={styles.idCardFoot}>ID: {profile?.id?.slice(0, 8).toUpperCase() || 'REF-LOAD'}</div>
                        </div>
                        <div className={styles.idCardQR}>
                            {profile?.id ? (
                                <QRCodeSVG value={profile.id} size={55} level="M" />
                            ) : (
                                <div style={{ width: 55, height: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>...</div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick Actions */}
            <section className={styles.quickActions}>
                <h2>Quick Actions</h2>
                <div className="grid grid-3">
                    <button className={`glass-card ${styles.actionCard}`} onClick={() => setShowRequestModal(true)}>
                        <div className={styles.actionIcon}>📄</div>
                        <div>
                            <h3>Request Document</h3>
                            <p>Apply for clearances, permits, and certificates</p>
                        </div>
                    </button>

                    <button className={`glass-card ${styles.actionCard}`} onClick={() => setActiveTab('requests')}>
                        <div className={styles.actionIcon}>📊</div>
                        <div>
                            <h3>Track Status</h3>
                            <p>Monitor your pending applications</p>
                        </div>
                    </button>

                    <button
                        className={`glass-card ${styles.actionCard}`}
                        onClick={() => setShowChatBot(true)}
                    >
                        <div className={styles.actionIcon}>💬</div>
                        <div>
                            <h3>Ask AI Assistant</h3>
                            <p>Get instant answers 24/7</p>
                        </div>
                    </button>
                </div>
            </section>

            {/* Emergency Hotlines */}
            <section style={{ marginBottom: '3rem' }}>
                <h2>🚨 Emergency Hotlines</h2>
                <div className={styles.hotlineGrid}>
                    <a href="tel:911" className={styles.hotlineCard}>
                        <div className={styles.hotlineIcon}>🚓</div>
                        <strong>Police</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>911 / 166</span>
                    </a>
                    <a href="tel:160" className={styles.hotlineCard}>
                        <div className={styles.hotlineIcon}>🚒</div>
                        <strong>Fire Station</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>160</span>
                    </a>
                    <a href="tel:143" className={styles.hotlineCard}>
                        <div className={styles.hotlineIcon}>🚑</div>
                        <strong>Red Cross</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>143</span>
                    </a>
                    <a href="tel:09123456789" className={styles.hotlineCard}>
                        <div className={styles.hotlineIcon}>🏥</div>
                        <strong>Brgy. Health</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>0912-345-6789</span>
                    </a>
                </div>
            </section>

            {/* Announcements */}
            <section className={styles.announcements}>
                <h2>Latest Announcements 📢</h2>
                {loadingAnnouncements ? (
                    <LoadingSpinner text="Loading announcements..." size="sm" />
                ) : (
                    <div className="grid grid-2">
                        {announcements.length === 0 ? (
                            <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
                                <p className={styles.emptyMessage}>No announcements yet.</p>
                            </div>
                        ) : (
                            announcements.map((ann) => (
                                <div className={`glass-card ${styles.announcementCard}`} key={ann.id}>
                                    <div className={styles.announcementHeader}>
                                        <span className={getCategoryBadge(ann.category)}>
                                            {getCategoryLabel(ann.category)}
                                        </span>
                                        <span className={styles.announcementDate}>
                                            {new Date(ann.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <h3>{ann.title}</h3>
                                    <p>{ann.content}</p>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </section>
        </>
    )

    const renderProfile = () => (
        <section className={styles.profileSection}>
            <div className="grid grid-2" style={{ gap: '2rem' }}>
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 2rem' }}>
                    <div style={{ background: '#fff', padding: '1rem', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', marginBottom: '1.5rem', minWidth: '232px', minHeight: '232px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {profile?.id ? (
                            <QRCodeSVG value={profile.id} size={200} level="H" />
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <LoadingSpinner size="sm" text="Identifying user..." />
                            </div>
                        )}
                    </div>
                    <h2 style={{ marginBottom: '0.5rem' }}>{profile?.full_name || 'Barangay Resident'}</h2>
                    <p style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>RESIDENT PASS | {profile?.id?.slice(0, 8).toUpperCase() || 'UNLINKED'}</p>
                    <div style={{ marginTop: '2rem', width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Resident Since</span>
                            <strong>{new Date(profile?.created_at || '').toLocaleDateString()}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Account ID</span>
                            <strong style={{ fontSize: '0.8rem' }}>{profile?.id?.split('-')[0] || 'REF'}</strong>
                        </div>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>👤 Profile Information</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className={styles.infoGroup}>
                            <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '0.25rem' }}>Full Name</label>
                            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{profile?.full_name}</p>
                        </div>
                        <div className={styles.infoGroup}>
                            <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '0.25rem' }}>Email Address</label>
                            <p>{profile?.email}</p>
                        </div>
                        <div className={styles.infoGroup}>
                            <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '0.25rem' }}>Home Address</label>
                            <p>{profile?.address || 'Not specified'}</p>
                        </div>
                        <div className={styles.infoGroup}>
                            <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '0.25rem' }}>Phone Number</label>
                            <p>{profile?.phone || 'Not specified'}</p>
                        </div>
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: '2.5rem', width: '100%' }} onClick={() => setShowProfileModal(true)}>
                        Edit Profile Information
                    </button>
                </div>
            </div>
        </section>
    )

    const renderRequests = () => (
        <section className={styles.requestsSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>My Service Requests</h2>
                <button className="btn btn-primary" onClick={() => setShowRequestModal(true)}>+ New Request</button>
            </div>

            <div className={`glass-card ${styles.applicationsCard}`}>
                {loadingRequests ? (
                    <LoadingSpinner text="Loading your requests..." size="sm" />
                ) : requests.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📂</div>
                        <h3>No requests yet</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Apply for documents using the button above.</p>
                        <button className="btn btn-primary" onClick={() => setShowRequestModal(true)}>Request Now</button>
                    </div>
                ) : (
                    requests.map((req) => (
                        <div className={styles.applicationItem} key={req.id}>
                            <div className={styles.appInfo}>
                                <div className={styles.appIcon}>{getDocIcon(req.document_type)}</div>
                                <div>
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        {req.document_type}
                                        {req.qr_code_ref && (
                                            <button 
                                                className="btn btn-outline"
                                                style={{ padding: '0.15rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px' }}
                                                onClick={() => setSelectedQR({ ref: req.qr_code_ref as string, title: req.document_type })}
                                            >
                                                🔍 View QR
                                            </button>
                                        )}
                                    </h4>
                                    <p className={styles.appDate}>
                                        Applied: {new Date(req.created_at).toLocaleDateString()}
                                    </p>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                        {req.purpose && (
                                            <p className={styles.appPurpose}>Purpose: {req.purpose}</p>
                                        )}
                                        {req.notes && (
                                            <p className={styles.appNotes} style={{ color: 'var(--warning-600)', borderLeft: '2px solid' }}>
                                                Admin Note: {req.notes}
                                            </p>
                                        )}
                                        {req.attachment_url && (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--success-600)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                📎 Requirement Attached
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className={getStatusBadge(req.status)}>{getStatusLabel(req.status)}</div>
                        </div>
                    ))
                )}
            </div>

            <section className={styles.availableServices} style={{ marginTop: '4rem' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Available Services</h2>
                <div className="grid grid-4" style={{ gap: '1rem' }}>
                    {[
                        { type: 'Barangay Clearance', desc: 'Employment / Business' },
                        { type: 'Business Permit', desc: 'New / Renewal' },
                        { type: 'Barangay ID', desc: 'Citizen Identification' },
                        { type: 'Certificate', desc: 'Indigency / Residency' },
                    ].map(s => (
                        <div className="glass-card" key={s.type} style={{ padding: '1.25rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => setShowRequestModal(true)}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{getDocIcon(s.type)}</div>
                            <h4 style={{ fontSize: '0.95rem' }}>{s.type}</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.desc}</p>
                        </div>
                    ))}
                </div>
            </section>
        </section>
    )

    const getStatusBadge = (status: string) => {
        const badgeMap: Record<string, string> = {
            pending: 'badge badge-warning',
            processing: 'badge badge-info',
            ready: 'badge badge-success',
            completed: 'badge badge-success',
            rejected: 'badge badge-error',
        }
        return badgeMap[status] || 'badge badge-info'
    }

    const getStatusLabel = (status: string) => {
        const labelMap: Record<string, string> = {
            pending: 'Pending',
            processing: 'Processing',
            ready: 'Ready for Pickup',
            completed: 'Completed',
            rejected: 'Rejected',
        }
        return labelMap[status] || status
    }

    const getDocIcon = (type: string) => {
        const iconMap: Record<string, string> = {
            'Barangay Clearance': '📄',
            'Business Permit': '🏠',
            'Barangay ID': '🆔',
            'Certificate': '📝',
        }
        return iconMap[type] || '📄'
    }

    const getCategoryBadge = (category: string) => {
        const badgeMap: Record<string, string> = {
            community_event: 'badge badge-info',
            important: 'badge badge-warning',
            emergency: 'badge badge-error',
            general: 'badge badge-info',
        }
        return badgeMap[category] || 'badge badge-info'
    }

    const getCategoryLabel = (category: string) => {
        const labelMap: Record<string, string> = {
            community_event: 'Community Event',
            important: 'Important',
            emergency: 'Emergency',
            general: 'General',
        }
        return labelMap[category] || category
    }

    return (
        <div className={styles.portalContainer}>
            <Header
                title="E-Barangay"
                userName={profile?.full_name || 'Resident'}
                onSignOut={signOut}
                variant="resident"
            />

            <nav className={styles.tabNav}>
                <div className="container" style={{ display: 'flex', gap: '1rem' }}>
                    <button className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.activeTab : ''}`} onClick={() => setActiveTab('overview')}>
                        🏠 Overview
                    </button>
                    <button className={`${styles.tabBtn} ${activeTab === 'requests' ? styles.activeTab : ''}`} onClick={() => setActiveTab('requests')}>
                        📋 My Requests
                    </button>
                    <button className={`${styles.tabBtn} ${activeTab === 'profile' ? styles.activeTab : ''}`} onClick={() => setActiveTab('profile')}>
                        👤 My Profile
                    </button>
                </div>
            </nav>

            <main className={styles.main}>
                <div className="container">
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'profile' && renderProfile()}
                    {activeTab === 'requests' && renderRequests()}
                </div>
            </main>

            {/* Floating AI Chat Button */}
            <button
                className={styles.chatButton}
                onClick={() => setShowChatBot(true)}
                aria-label="Open AI Assistant"
            >
                🤖
            </button>

            {/* ChatBot Component */}
            {showChatBot && <ChatBot onClose={() => setShowChatBot(false)} />}

            {/* Request Document Modal */}
            {showRequestModal && (
                <RequestModal
                    onClose={() => setShowRequestModal(false)}
                    onSubmit={handleRequestSubmit}
                />
            )}

            {/* Profile Edit Modal */}
            {showProfileModal && profile && (
                <ProfileModal
                    profile={profile}
                    onClose={() => setShowProfileModal(false)}
                    onSubmit={handleProfileUpdate}
                />
            )}

            {/* QR Code Modal Display */}
            {selectedQR && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: '1rem' }} onClick={() => setSelectedQR(null)}>
                    <div className="glass-card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '2.5rem 1.5rem', background: 'var(--bg-secondary, #1a1a2e)' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '0.5rem' }}>E-Barangay Pass</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{selectedQR.title}</p>
                        
                        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1.5rem' }}>
                            <QRCodeSVG value={selectedQR.ref} size={220} level="H" includeMargin={false} />
                        </div>
                        
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace', margin: '0 0 1.5rem 0', wordBreak: 'break-all' }}>
                            {selectedQR.ref}
                        </p>
                        
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setSelectedQR(null)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function ResidentPortal() {
    return (
        <ProtectedRoute>
            <ResidentPortalContent />
        </ProtectedRoute>
    )
}
