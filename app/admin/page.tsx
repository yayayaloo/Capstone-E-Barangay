'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/Toast'
import { ServiceRequest, Announcement, Profile } from '@/lib/types'
import styles from './admin.module.css'

// ─── Rich Mock Data ───────────────────────────────────────────────────────────

const MOCK_REQUESTS: ServiceRequest[] = [
    { id: 'req-001', resident_id: 'r1', resident_name: 'Juan Dela Cruz', document_type: 'Barangay Clearance', purpose: 'Employment Requirement', status: 'completed', created_at: new Date(Date.now() - 86400000 * 7).toISOString() },
    { id: 'req-002', resident_id: 'r2', resident_name: 'Maria Santos', document_type: 'Business Permit', purpose: 'New Sari-Sari Store', status: 'pending', created_at: new Date(Date.now() - 86400000 * 1).toISOString() },
    { id: 'req-003', resident_id: 'r3', resident_name: 'Roberto Reyes', document_type: 'Barangay ID', purpose: 'Official Identification', status: 'processing', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'req-004', resident_id: 'r4', resident_name: 'Ana Lim', document_type: 'Certificate of Indigency', purpose: 'Medical Assistance', status: 'ready', created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 'req-005', resident_id: 'r5', resident_name: 'Carlos Mendoza', document_type: 'Barangay Clearance', purpose: 'Bank Loan Requirement', status: 'completed', created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: 'req-006', resident_id: 'r6', resident_name: 'Luisa Garcia', document_type: 'Certificate of Residency', purpose: 'School Enrollment', status: 'rejected', created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
    { id: 'req-007', resident_id: 'r7', resident_name: 'Pedro Aquino', document_type: 'Business Permit', purpose: 'Food Cart Business', status: 'pending', created_at: new Date(Date.now() - 86400000 * 0.5).toISOString() },
    { id: 'req-008', resident_id: 'r8', resident_name: 'Natividad Villanueva', document_type: 'Barangay Clearance', purpose: 'Overseas Employment', status: 'processing', created_at: new Date(Date.now() - 86400000 * 1.5).toISOString() },
] as unknown as ServiceRequest[]

const MOCK_RESIDENTS: Profile[] = [
    { id: 'r1', full_name: 'Juan Dela Cruz', email: 'juan@example.com', role: 'resident', address: 'Block 4 Lot 12, Gordon Heights', phone: '09123456789', created_at: new Date(Date.now() - 86400000 * 90).toISOString() },
    { id: 'r2', full_name: 'Maria Santos', email: 'maria@example.com', role: 'resident', address: 'Block 2 Lot 5, Gordon Heights', phone: '09987654321', created_at: new Date(Date.now() - 86400000 * 60).toISOString() },
    { id: 'r3', full_name: 'Roberto Reyes', email: 'roberto@example.com', role: 'resident', address: 'Block 1 Lot 8, Gordon Heights', phone: '09171234567', created_at: new Date(Date.now() - 86400000 * 45).toISOString() },
    { id: 'r4', full_name: 'Ana Lim', email: 'ana@example.com', role: 'resident', address: 'Block 7 Lot 3, Gordon Heights', phone: '09281234567', created_at: new Date(Date.now() - 86400000 * 30).toISOString() },
    { id: 'r5', full_name: 'Carlos Mendoza', email: 'carlos@example.com', role: 'resident', address: 'Block 5 Lot 20, Gordon Heights', phone: '09391234567', created_at: new Date(Date.now() - 86400000 * 20).toISOString() },
    { id: 'r6', full_name: 'Luisa Garcia', email: 'luisa@example.com', role: 'resident', address: 'Block 3 Lot 14, Gordon Heights', phone: '09501234567', created_at: new Date(Date.now() - 86400000 * 15).toISOString() },
    { id: 'r7', full_name: 'Pedro Aquino', email: 'pedro@example.com', role: 'resident', address: 'Block 6 Lot 9, Gordon Heights', phone: '09611234567', created_at: new Date(Date.now() - 86400000 * 10).toISOString() },
    { id: 'r8', full_name: 'Natividad Villanueva', email: 'nati@example.com', role: 'resident', address: 'Block 8 Lot 1, Gordon Heights', phone: '09721234567', created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
] as Profile[]

const MOCK_ANNOUNCEMENTS: Announcement[] = [
    { id: 'ann-1', title: 'Upcoming Barangay Assembly', content: 'Please join us for the general assembly this Saturday at 8:00 AM at the Barangay Hall. Attendance is highly encouraged.', category: 'important', author_id: 'mock-admin', published_at: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'ann-2', title: 'Free Rabies Vaccination Drive', content: 'Bring your pets this Sunday for a free rabies vaccination at the covered court. Sponsored by the City Veterinary Office.', category: 'community_event', author_id: 'mock-admin', published_at: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: 'ann-3', title: 'Typhoon Preparedness Alert', content: 'A tropical storm is expected to pass by the end of the week. Please secure your homes and prepare emergency supplies.', category: 'emergency', author_id: 'mock-admin', published_at: new Date(Date.now() - 86400000 * 1).toISOString() },
] as unknown as Announcement[]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
    const map: Record<string, string> = {
        pending: 'badge badge-warning',
        processing: 'badge badge-info',
        ready: 'badge badge-success',
        completed: 'badge badge-success',
        rejected: 'badge badge-error',
    }
    return map[status] || 'badge badge-info'
}

function categoryBadge(cat: string) {
    const map: Record<string, string> = {
        community_event: 'badge badge-info',
        important: 'badge badge-warning',
        emergency: 'badge badge-error',
        general: 'badge badge-info',
    }
    return map[cat] || 'badge badge-info'
}

function categoryLabel(cat: string) {
    const map: Record<string, string> = {
        community_event: 'Community Event',
        important: 'Important',
        emergency: 'Emergency',
        general: 'General',
    }
    return map[cat] || cat
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Main Component ───────────────────────────────────────────────────────────

function AdminDashboardContent() {
    const { profile, signOut } = useAuth()
    const { showToast } = useToast()
    const [activeTab, setActiveTab] = useState('overview')
    const [loading, setLoading] = useState(true)

    const [requests, setRequests] = useState<ServiceRequest[]>([])
    const [residents, setResidents] = useState<Profile[]>([])
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [residentSearch, setResidentSearch] = useState('')
    const [requestSearch, setRequestSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    // Announcement form
    const [annTitle, setAnnTitle] = useState('')
    const [annContent, setAnnContent] = useState('')
    const [annCategory, setAnnCategory] = useState('community_event')
    const [publishing, setPublishing] = useState(false)

    useEffect(() => {
        setTimeout(() => {
            setRequests(MOCK_REQUESTS)
            setResidents(MOCK_RESIDENTS)
            setAnnouncements(MOCK_ANNOUNCEMENTS)
            setLoading(false)
        }, 600)
    }, [])

    const pendingCount = requests.filter(r => r.status === 'pending').length
    const processingCount = requests.filter(r => r.status === 'processing').length
    const completedCount = requests.filter(r => r.status === 'completed').length
    const rejectedCount = requests.filter(r => r.status === 'rejected').length
    const completionRate = requests.length > 0
        ? Math.round((completedCount / requests.length) * 100)
        : 0

    const updateStatus = (id: string, status: string) => {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status } as ServiceRequest : r))
        showToast(`Status updated to "${status}"`, 'success')
    }

    const publishAnnouncement = () => {
        if (!annTitle.trim() || !annContent.trim()) return
        setPublishing(true)
        setTimeout(() => {
            const newAnn = {
                id: `ann-${Date.now()}`,
                title: annTitle,
                content: annContent,
                category: annCategory,
                author_id: profile?.id ?? 'mock-admin',
                published_at: new Date().toISOString(),
            } as unknown as Announcement
            setAnnouncements(prev => [newAnn, ...prev])
            setAnnTitle('')
            setAnnContent('')
            setAnnCategory('community_event')
            setPublishing(false)
            showToast('Announcement published!', 'success')
        }, 800)
    }

    const deleteAnnouncement = (id: string) => {
        setAnnouncements(prev => prev.filter(a => a.id !== id))
        showToast('Announcement deleted', 'success')
    }

    const filteredRequests = requests.filter(r => {
        const matchSearch =
            r.resident_name.toLowerCase().includes(requestSearch.toLowerCase()) ||
            r.document_type.toLowerCase().includes(requestSearch.toLowerCase())
        const matchStatus = statusFilter === 'all' || r.status === statusFilter
        return matchSearch && matchStatus
    })

    const filteredResidents = residents.filter(r =>
        r.full_name.toLowerCase().includes(residentSearch.toLowerCase()) ||
        r.email.toLowerCase().includes(residentSearch.toLowerCase()) ||
        (r.address ?? '').toLowerCase().includes(residentSearch.toLowerCase())
    )

    const navItems = [
        { id: 'overview', icon: '📊', label: 'Overview' },
        { id: 'requests', icon: '📝', label: 'Document Requests' },
        { id: 'residents', icon: '👥', label: 'Residents' },
        { id: 'announcements', icon: '📢', label: 'Announcements' },
        { id: 'verify', icon: '🔐', label: 'QR Verification' },
        { id: 'analytics', icon: '📈', label: 'Analytics' },
    ]

    return (
        <div className={styles.adminContainer}>
            <Header
                title="E-Barangay Admin"
                userName={profile?.full_name || 'Admin'}
                onSignOut={signOut}
                variant="admin"
            />

            <div className={styles.dashboardLayout}>
                {/* Sidebar */}
                <aside className={styles.sidebar}>
                    <div className={styles.sidebarBrand}>
                        <div className={styles.brandIcon}>🏛️</div>
                        <div>
                            <div className={styles.brandName}>Admin Panel</div>
                            <div className={styles.brandSub}>Gordon Heights</div>
                        </div>
                    </div>
                    <nav className={styles.sidebarNav}>
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                className={activeTab === item.id ? styles.active : ''}
                                onClick={() => setActiveTab(item.id)}
                            >
                                <span className={styles.navIcon}>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </nav>
                    <div className={styles.sidebarFooter}>
                        <div className={styles.adminBadge}>🔑 Administrator</div>
                        <div className={styles.adminName}>{profile?.full_name || 'Admin User'}</div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className={styles.mainContent}>
                    <div className="container">

                        {/* ── OVERVIEW ── */}
                        {activeTab === 'overview' && (
                            <>
                                <div className={styles.pageHeader}>
                                    <div>
                                        <h1>Dashboard Overview</h1>
                                        <p className={styles.pageSubtitle}>Welcome back, {profile?.full_name || 'Admin'}! Here&apos;s what&apos;s happening today.</p>
                                    </div>
                                    <div className={styles.dateBadge}>
                                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                    </div>
                                </div>

                                {loading ? <LoadingSpinner text="Loading dashboard..." /> : (
                                    <>
                                        {/* Stats Row */}
                                        <div className={styles.statsGrid}>
                                            <div className={`glass-card ${styles.statCard} ${styles.statPending}`}>
                                                <div className={styles.statIcon}>⏳</div>
                                                <div className={styles.statValue}>{pendingCount}</div>
                                                <div className={styles.statLabel}>Pending</div>
                                                <div className={styles.statTrend}>↑ 2 new today</div>
                                            </div>
                                            <div className={`glass-card ${styles.statCard} ${styles.statProcessing}`}>
                                                <div className={styles.statIcon}>🔄</div>
                                                <div className={styles.statValue}>{processingCount}</div>
                                                <div className={styles.statLabel}>Processing</div>
                                                <div className={styles.statTrend}>In progress</div>
                                            </div>
                                            <div className={`glass-card ${styles.statCard} ${styles.statCompleted}`}>
                                                <div className={styles.statIcon}>✅</div>
                                                <div className={styles.statValue}>{completedCount}</div>
                                                <div className={styles.statLabel}>Completed</div>
                                                <div className={styles.statTrend}>↑ {completionRate}% rate</div>
                                            </div>
                                            <div className={`glass-card ${styles.statCard} ${styles.statResidents}`}>
                                                <div className={styles.statIcon}>👥</div>
                                                <div className={styles.statValue}>{residents.length}</div>
                                                <div className={styles.statLabel}>Residents</div>
                                                <div className={styles.statTrend}>↑ 3 this week</div>
                                            </div>
                                        </div>

                                        {/* Quick Action Cards */}
                                        <div className={styles.quickActions}>
                                            <div className={styles.quickCard} onClick={() => setActiveTab('requests')}>
                                                <span className={styles.quickIcon}>📋</span>
                                                <div>
                                                    <strong>Review Requests</strong>
                                                    <span>{pendingCount} awaiting action</span>
                                                </div>
                                                <span className={styles.quickArrow}>→</span>
                                            </div>
                                            <div className={styles.quickCard} onClick={() => setActiveTab('announcements')}>
                                                <span className={styles.quickIcon}>📢</span>
                                                <div>
                                                    <strong>Post Announcement</strong>
                                                    <span>Notify {residents.length} residents</span>
                                                </div>
                                                <span className={styles.quickArrow}>→</span>
                                            </div>
                                            <div className={styles.quickCard} onClick={() => setActiveTab('residents')}>
                                                <span className={styles.quickIcon}>👥</span>
                                                <div>
                                                    <strong>Manage Residents</strong>
                                                    <span>View registered accounts</span>
                                                </div>
                                                <span className={styles.quickArrow}>→</span>
                                            </div>
                                        </div>

                                        <div className={styles.overviewGrid}>
                                            {/* Recent Requests */}
                                            <div className="glass-card">
                                                <div className={styles.cardHeader}>
                                                    <h2>Recent Requests</h2>
                                                    <button className={styles.viewAll} onClick={() => setActiveTab('requests')}>View All</button>
                                                </div>
                                                <div className={styles.activityList}>
                                                    {requests.slice(0, 5).map(req => (
                                                        <div className={styles.activityItem} key={req.id}>
                                                            <div className={styles.activityIcon}>📄</div>
                                                            <div className={styles.activityDetails}>
                                                                <strong>{req.document_type}</strong>
                                                                <p>{req.resident_name}</p>
                                                                <span className={styles.activityTime}>{fmtDate(req.created_at)}</span>
                                                            </div>
                                                            <span className={statusBadge(req.status)}>
                                                                {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Announcements Summary */}
                                            <div className="glass-card">
                                                <div className={styles.cardHeader}>
                                                    <h2>Announcements</h2>
                                                    <button className={styles.viewAll} onClick={() => setActiveTab('announcements')}>Manage</button>
                                                </div>
                                                <div className={styles.activityList}>
                                                    {announcements.map(ann => (
                                                        <div className={styles.activityItem} key={ann.id}>
                                                            <div className={styles.activityIcon}>📢</div>
                                                            <div className={styles.activityDetails}>
                                                                <strong>{ann.title}</strong>
                                                                <p style={{ fontSize: '0.8rem', marginTop: '0.2rem', color: 'var(--text-muted)' }}>
                                                                    {ann.content.length > 60 ? ann.content.slice(0, 60) + '…' : ann.content}
                                                                </p>
                                                                <span className={styles.activityTime}>{fmtDate(ann.published_at)}</span>
                                                            </div>
                                                            <span className={categoryBadge(ann.category)}>{categoryLabel(ann.category)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {/* ── DOCUMENT REQUESTS ── */}
                        {activeTab === 'requests' && (
                            <>
                                <div className={styles.pageHeader}>
                                    <div>
                                        <h1>Document Requests</h1>
                                        <p className={styles.pageSubtitle}>{requests.length} total requests — {pendingCount} pending action</p>
                                    </div>
                                </div>

                                <div className={styles.filterBar}>
                                    <input
                                        type="text"
                                        placeholder="🔍 Search by name or document type..."
                                        value={requestSearch}
                                        onChange={e => setRequestSearch(e.target.value)}
                                        className={styles.searchInput}
                                    />
                                    <select
                                        value={statusFilter}
                                        onChange={e => setStatusFilter(e.target.value)}
                                        className={styles.filterSelect}
                                    >
                                        <option value="all">All Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="processing">Processing</option>
                                        <option value="ready">Ready</option>
                                        <option value="completed">Completed</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                    <span className={styles.searchCount}>{filteredRequests.length} result{filteredRequests.length !== 1 ? 's' : ''}</span>
                                </div>

                                <div className="glass-card">
                                    {loading ? <LoadingSpinner text="Loading requests..." /> : (
                                        <div className={styles.tableContainer}>
                                            <table className={styles.table}>
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Applicant</th>
                                                        <th>Document Type</th>
                                                        <th>Purpose</th>
                                                        <th>Date Applied</th>
                                                        <th>Status</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredRequests.map(req => (
                                                        <tr key={req.id}>
                                                            <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                                {req.id.slice(0, 7).toUpperCase()}
                                                            </td>
                                                            <td><strong>{req.resident_name}</strong></td>
                                                            <td>{req.document_type}</td>
                                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{req.purpose}</td>
                                                            <td>{fmtDate(req.created_at)}</td>
                                                            <td><span className={statusBadge(req.status)}>{req.status.charAt(0).toUpperCase() + req.status.slice(1)}</span></td>
                                                            <td>
                                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                                    {req.status === 'pending' && (
                                                                        <button className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => updateStatus(req.id, 'processing')}>Process</button>
                                                                    )}
                                                                    {req.status === 'processing' && (
                                                                        <button className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => updateStatus(req.id, 'ready')}>Mark Ready</button>
                                                                    )}
                                                                    {req.status === 'ready' && (
                                                                        <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => updateStatus(req.id, 'completed')}>Complete</button>
                                                                    )}
                                                                    {(req.status === 'pending' || req.status === 'processing') && (
                                                                        <button className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => updateStatus(req.id, 'rejected')}>Reject</button>
                                                                    )}
                                                                    {(req.status === 'completed' || req.status === 'rejected') && (
                                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {filteredRequests.length === 0 && (
                                                        <tr>
                                                            <td colSpan={7} className={styles.emptyMessage}>No matching requests found.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* ── RESIDENTS ── */}
                        {activeTab === 'residents' && (
                            <>
                                <div className={styles.pageHeader}>
                                    <div>
                                        <h1>Registered Residents</h1>
                                        <p className={styles.pageSubtitle}>{residents.length} registered accounts in the system</p>
                                    </div>
                                </div>

                                <div className={styles.filterBar}>
                                    <input
                                        type="text"
                                        placeholder="🔍 Search by name, email, or address..."
                                        value={residentSearch}
                                        onChange={e => setResidentSearch(e.target.value)}
                                        className={styles.searchInput}
                                    />
                                    <span className={styles.searchCount}>{filteredResidents.length} resident{filteredResidents.length !== 1 ? 's' : ''}</span>
                                </div>

                                <div className="glass-card">
                                    {loading ? <LoadingSpinner text="Loading residents..." /> : (
                                        <div className={styles.tableContainer}>
                                            <table className={styles.table}>
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Full Name</th>
                                                        <th>Email</th>
                                                        <th>Address</th>
                                                        <th>Phone</th>
                                                        <th>Registered</th>
                                                        <th>Requests</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredResidents.map((res, i) => {
                                                        const reqCount = requests.filter(r => r.resident_id === res.id).length
                                                        return (
                                                            <tr key={res.id}>
                                                                <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{String(i + 1).padStart(3, '0')}</td>
                                                                <td>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                        <div className={styles.avatarCircle}>
                                                                            {res.full_name.charAt(0)}
                                                                        </div>
                                                                        <strong>{res.full_name}</strong>
                                                                    </div>
                                                                </td>
                                                                <td style={{ color: 'var(--text-muted)' }}>{res.email}</td>
                                                                <td>{res.address || '—'}</td>
                                                                <td>{res.phone || '—'}</td>
                                                                <td>{fmtDate(res.created_at)}</td>
                                                                <td>
                                                                    <span className={reqCount > 0 ? 'badge badge-info' : 'badge'} style={{ minWidth: '2rem', textAlign: 'center' }}>
                                                                        {reqCount}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                    {filteredResidents.length === 0 && (
                                                        <tr>
                                                            <td colSpan={7} className={styles.emptyMessage}>
                                                                {residentSearch ? 'No residents match your search.' : 'No registered residents yet.'}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* ── ANNOUNCEMENTS ── */}
                        {activeTab === 'announcements' && (
                            <>
                                <div className={styles.pageHeader}>
                                    <div>
                                        <h1>Manage Announcements</h1>
                                        <p className={styles.pageSubtitle}>Publish & manage barangay announcements for all residents</p>
                                    </div>
                                </div>

                                <div className="glass-card" style={{ marginBottom: '2rem' }}>
                                    <h3>✏️ Create New Announcement</h3>
                                    <div className={styles.announcementForm}>
                                        <input
                                            type="text"
                                            placeholder="Announcement Title"
                                            value={annTitle}
                                            onChange={e => setAnnTitle(e.target.value)}
                                        />
                                        <textarea
                                            rows={4}
                                            placeholder="Write the announcement content here..."
                                            value={annContent}
                                            onChange={e => setAnnContent(e.target.value)}
                                        />
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <select value={annCategory} onChange={e => setAnnCategory(e.target.value)}>
                                                <option value="community_event">🎉 Community Event</option>
                                                <option value="important">⚠️ Important</option>
                                                <option value="emergency">🚨 Emergency</option>
                                                <option value="general">📌 General</option>
                                            </select>
                                            <button
                                                className="btn btn-primary"
                                                onClick={publishAnnouncement}
                                                disabled={publishing || !annTitle.trim() || !annContent.trim()}
                                            >
                                                {publishing ? 'Publishing...' : '📢 Publish'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <h3>Published Announcements ({announcements.length})</h3>
                                <div className="grid grid-2">
                                    {announcements.map(ann => (
                                        <div className="glass-card" key={ann.id}>
                                            <div className={styles.announcementHeader}>
                                                <span className={categoryBadge(ann.category)}>{categoryLabel(ann.category)}</span>
                                                <button className={styles.editButton} onClick={() => deleteAnnouncement(ann.id)}>🗑️ Delete</button>
                                            </div>
                                            <h4 style={{ margin: '0.75rem 0 0.5rem' }}>{ann.title}</h4>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{ann.content}</p>
                                            <span className={styles.publishDate}>Published: {fmtDate(ann.published_at)}</span>
                                        </div>
                                    ))}
                                    {announcements.length === 0 && (
                                        <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                                            <p className={styles.emptyMessage}>No announcements published yet.</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* ── QR VERIFY ── */}
                        {activeTab === 'verify' && (
                            <>
                                <div className={styles.pageHeader}>
                                    <div>
                                        <h1>QR Code Verification</h1>
                                        <p className={styles.pageSubtitle}>Scan a document QR code to verify its authenticity</p>
                                    </div>
                                </div>
                                <div className="grid grid-2">
                                    <div className={`glass-card ${styles.qrScanner}`}>
                                        <h3>Scan QR Code</h3>
                                        <div className={styles.scannerPlaceholder}>
                                            <div className={styles.scannerFrame}>
                                                <div className={styles.scannerCorner} style={{ top: 0, left: 0 }} />
                                                <div className={styles.scannerCorner} style={{ top: 0, right: 0 }} />
                                                <div className={styles.scannerCorner} style={{ bottom: 0, left: 0 }} />
                                                <div className={styles.scannerCorner} style={{ bottom: 0, right: 0 }} />
                                                <div className={styles.scannerLine} />
                                            </div>
                                            <p>Position QR code within frame</p>
                                        </div>
                                        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                                            📷 Activate Camera
                                        </button>
                                    </div>
                                    <div className="glass-card">
                                        <h3>Recent Verifications</h3>
                                        <div className={styles.verificationList}>
                                            {[
                                                { name: 'Juan Dela Cruz', doc: 'Barangay Clearance', time: '2 hrs ago', result: '✅ Valid' },
                                                { name: 'Ana Lim', doc: 'Certificate of Indigency', time: '5 hrs ago', result: '✅ Valid' },
                                                { name: 'Carlos Mendoza', doc: 'Barangay Clearance', time: 'Yesterday', result: '✅ Valid' },
                                            ].map((v, i) => (
                                                <div key={i} className={styles.activityItem} style={{ padding: '1rem' }}>
                                                    <div className={styles.activityIcon} style={{ fontSize: '1.25rem' }}>🔍</div>
                                                    <div className={styles.activityDetails}>
                                                        <strong>{v.name}</strong>
                                                        <p>{v.doc}</p>
                                                        <span className={styles.activityTime}>{v.time}</span>
                                                    </div>
                                                    <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>{v.result}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── ANALYTICS ── */}
                        {activeTab === 'analytics' && (
                            <>
                                <div className={styles.pageHeader}>
                                    <div>
                                        <h1>Analytics & Reports</h1>
                                        <p className={styles.pageSubtitle}>Service performance and resident activity overview</p>
                                    </div>
                                </div>

                                {loading ? <LoadingSpinner text="Loading analytics..." /> : (
                                    <>
                                        {/* Summary Cards */}
                                        <div className={styles.statsGrid}>
                                            <div className={`glass-card ${styles.statCard}`}>
                                                <div className={styles.statIcon}>📄</div>
                                                <div className={styles.statValue}>{requests.length}</div>
                                                <div className={styles.statLabel}>Total Requests</div>
                                                <div className={styles.statTrend}>All time</div>
                                            </div>
                                            <div className={`glass-card ${styles.statCard}`}>
                                                <div className={styles.statIcon}>⚡</div>
                                                <div className={styles.statValue}>{completionRate}%</div>
                                                <div className={styles.statLabel}>Completion Rate</div>
                                                <div className={styles.statTrend}>↑ Good performance</div>
                                            </div>
                                            <div className={`glass-card ${styles.statCard}`}>
                                                <div className={styles.statIcon}>📢</div>
                                                <div className={styles.statValue}>{announcements.length}</div>
                                                <div className={styles.statLabel}>Announcements</div>
                                                <div className={styles.statTrend}>This month</div>
                                            </div>
                                            <div className={`glass-card ${styles.statCard}`}>
                                                <div className={styles.statIcon}>❌</div>
                                                <div className={styles.statValue}>{rejectedCount}</div>
                                                <div className={styles.statLabel}>Rejected</div>
                                                <div className={styles.statTrend}>{requests.length > 0 ? Math.round(rejectedCount / requests.length * 100) : 0}% rejection rate</div>
                                            </div>
                                        </div>

                                        {/* Document Type Breakdown */}
                                        <div className="grid grid-2">
                                            <div className="glass-card">
                                                <h3>📊 Document Type Breakdown</h3>
                                                {(['Barangay Clearance', 'Business Permit', 'Barangay ID', 'Certificate of Indigency', 'Certificate of Residency'] as const).map(type => {
                                                    const count = requests.filter(r => r.document_type === type).length
                                                    const pct = requests.length > 0 ? Math.round(count / requests.length * 100) : 0
                                                    return (
                                                        <div key={type} className={styles.analyticsRow}>
                                                            <span className={styles.analyticsLabel}>{type}</span>
                                                            <div className={styles.progressBar}>
                                                                <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                                                            </div>
                                                            <span className={styles.analyticsCount}>{count}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            <div className="glass-card">
                                                <h3>🔢 Status Breakdown</h3>
                                                {(['pending', 'processing', 'ready', 'completed', 'rejected'] as const).map(status => {
                                                    const count = requests.filter(r => r.status === status).length
                                                    const pct = requests.length > 0 ? Math.round(count / requests.length * 100) : 0
                                                    return (
                                                        <div key={status} className={styles.analyticsRow}>
                                                            <span className={statusBadge(status)} style={{ minWidth: '90px', textAlign: 'center' }}>
                                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                                            </span>
                                                            <div className={styles.progressBar}>
                                                                <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                                                            </div>
                                                            <span className={styles.analyticsCount}>{count}</span>
                                                        </div>
                                                    )
                                                })}

                                                <div className={styles.analyticsSummary}>
                                                    <div>
                                                        <div className={styles.summaryValue}>{requests.length}</div>
                                                        <div className={styles.summaryLabel}>Total</div>
                                                    </div>
                                                    <div>
                                                        <div className={styles.summaryValue}>{residents.length}</div>
                                                        <div className={styles.summaryLabel}>Residents</div>
                                                    </div>
                                                    <div>
                                                        <div className={styles.summaryValue}>{completionRate}%</div>
                                                        <div className={styles.summaryLabel}>Rate</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                    </div>
                </main>
            </div>
        </div>
    )
}

export default function AdminDashboard() {
    return (
        <ProtectedRoute requiredRole="admin">
            <AdminDashboardContent />
        </ProtectedRoute>
    )
}
