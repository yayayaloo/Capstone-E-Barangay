'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { ServiceRequest, Announcement, Profile } from '@/lib/types'
import styles from './admin.module.css'

const Scanner = dynamic(
    () => import('@yudiel/react-qr-scanner').then(m => ({ default: m.Scanner })),
    {
        ssr: false,
        loading: () => (
            <div style={{ color: 'white', textAlign: 'center', padding: '2rem', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Loading camera...
            </div>
        )
    }
)
import BottomNav from '@/components/BottomNav'

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
    { id: 'r1', full_name: 'Juan Dela Cruz', email: 'juan@example.com', role: 'resident', address: 'Block 4 Lot 12, Gordon Heights', phone: '09123456789', resident_qr_id: 'res-qr-001', created_at: new Date(Date.now() - 86400000 * 90).toISOString() },
    { id: 'r2', full_name: 'Maria Santos', email: 'maria@example.com', role: 'resident', address: 'Block 2 Lot 5, Gordon Heights', phone: '09987654321', resident_qr_id: 'res-qr-002', created_at: new Date(Date.now() - 86400000 * 60).toISOString() },
    { id: 'r3', full_name: 'Roberto Reyes', email: 'roberto@example.com', role: 'resident', address: 'Block 1 Lot 8, Gordon Heights', phone: '09171234567', resident_qr_id: 'res-qr-003', created_at: new Date(Date.now() - 86400000 * 45).toISOString() },
    { id: 'r4', full_name: 'Ana Lim', email: 'ana@example.com', role: 'resident', address: 'Block 7 Lot 3, Gordon Heights', phone: '09281234567', resident_qr_id: 'res-qr-004', created_at: new Date(Date.now() - 86400000 * 30).toISOString() },
    { id: 'r5', full_name: 'Carlos Mendoza', email: 'carlos@example.com', role: 'resident', address: 'Block 5 Lot 20, Gordon Heights', phone: '09391234567', resident_qr_id: 'res-qr-005', created_at: new Date(Date.now() - 86400000 * 20).toISOString() },
    { id: 'r6', full_name: 'Luisa Garcia', email: 'luisa@example.com', role: 'resident', address: 'Block 3 Lot 14, Gordon Heights', phone: '09501234567', resident_qr_id: 'res-qr-006', created_at: new Date(Date.now() - 86400000 * 15).toISOString() },
    { id: 'r7', full_name: 'Pedro Aquino', email: 'pedro@example.com', role: 'resident', address: 'Block 6 Lot 9, Gordon Heights', phone: '09611234567', resident_qr_id: 'res-qr-007', created_at: new Date(Date.now() - 86400000 * 10).toISOString() },
    { id: 'r8', full_name: 'Natividad Villanueva', email: 'nati@example.com', role: 'resident', address: 'Block 8 Lot 1, Gordon Heights', phone: '09721234567', resident_qr_id: 'res-qr-008', created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
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

    // Scanner state
    const [scanResult, setScanResult] = useState<any>(null)
    const [verifying, setVerifying] = useState(false)
    const [recentVerifications, setRecentVerifications] = useState<any[]>([])

    // Status update with note
    const [noteModal, setNoteModal] = useState<{ id: string, status: string } | null>(null)
    const [adminNote, setAdminNote] = useState('')

    useEffect(() => {
        fetchAdminData()
    }, [])

    const fetchAdminData = async () => {
        setLoading(true)
        try {
            // Fetch requests with joined resident data (if schema allows, otherwise fetch separately and merge)
            // Note: Since Supabase doesn't support complex joins without a view in plain select, we'll fetch separately
            const [reqRes, profilesRes, annRes] = await Promise.all([
                supabase.from('service_requests').select('*').order('created_at', { ascending: false }),
                supabase.from('profiles').select('*').order('created_at', { ascending: false }),
                supabase.from('announcements').select('*').order('published_at', { ascending: false })
            ])

            if (reqRes.error) throw reqRes.error
            if (profilesRes.error) throw profilesRes.error
            if (annRes.error) throw annRes.error

            const fetchedProfiles = profilesRes.data as Profile[]
            
            // Map resident names manually
            const mappedRequests = (reqRes.data as ServiceRequest[]).map(req => {
                const residentData = fetchedProfiles.find(p => p.id === req.resident_id)
                return {
                    ...req,
                    resident_name: residentData?.full_name || 'Unknown Resident'
                }
            })

            // Fetch recent verifications from DB
            const { data: qrligs } = await supabase
                .from('qr_verifications')
                .select('*')
                .order('verified_at', { ascending: false })
                .limit(5)

            setRequests(mappedRequests)
            setResidents(fetchedProfiles)
            setAnnouncements(annRes.data as Announcement[])
            
            if (qrligs) {
                setRecentVerifications(qrligs.map(v => ({
                    name: v.holder_name,
                    doc: v.document_type,
                    time: new Date(v.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    result: v.is_valid ? '✅ Valid' : '❌ Invalid'
                })))
            }
        } catch (error: any) {
            console.error('Error fetching admin data:', error)
            showToast('Failed to load dashboard data', 'error')
        } finally {
            setLoading(false)
        }
    }

    const pendingCount = requests.filter(r => r.status === 'pending').length
    const processingCount = requests.filter(r => r.status === 'processing').length
    const completedCount = requests.filter(r => r.status === 'completed').length
    const rejectedCount = requests.filter(r => r.status === 'rejected').length
    const completionRate = requests.length > 0
        ? Math.round((completedCount / requests.length) * 100)
        : 0

    const updateStatus = async (requestId: string, newStatus: string, note?: string) => {
        try {
            const request = requests.find(r => r.id === requestId)
            if (!request) return

            // 1. Update the request status
            const { error: reqError } = await supabase
                .from('service_requests')
                .update({ 
                    status: newStatus, 
                    notes: note || null, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', requestId)

            if (reqError) throw reqError

            showToast(`Request marked as ${newStatus}`, 'success')

            fetchAdminData()
            setNoteModal(null)
            setAdminNote('')
        } catch (error: any) {
            console.error('Error updating status:', error)
            showToast(error.message || 'Failed to update status', 'error')
        }
    }

    const publishAnnouncement = async () => {
        if (!annTitle.trim() || !annContent.trim()) return
        setPublishing(true)
        
        try {
            const { data, error } = await supabase
                .from('announcements')
                .insert({
                    title: annTitle,
                    content: annContent,
                    category: annCategory,
                    author_id: profile?.id
                })
                .select()
                .single()

            if (error) throw error

            setAnnouncements(prev => [data as Announcement, ...prev])
            setAnnTitle('')
            setAnnContent('')
            setAnnCategory('community_event')
            showToast('Announcement published!', 'success')
        } catch (error: any) {
            console.error('Error publishing announcement:', error)
            showToast('Failed to publish announcement', 'error')
        } finally {
            setPublishing(false)
        }
    }

    const deleteAnnouncement = async (id: string) => {
        try {
            // Optimistic deletion
            setAnnouncements(prev => prev.filter(a => a.id !== id))
            
            const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', id)

            if (error) {
                fetchAdminData()
                throw error
            }
            showToast('Announcement deleted', 'success')
        } catch (error) {
            console.error('Error deleting announcement:', error)
            showToast('Failed to delete announcement', 'error')
        }
    }



    const verifyResident = async (residentId: string) => {
        try {
            const idNumber = `GH-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`
            
            // Optimistic update
            setResidents(prev => prev.map(r => r.id === residentId ? { ...r, is_verified: true, resident_id_number: idNumber } : r))
            
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    is_verified: true, 
                    resident_id_number: idNumber 
                })
                .eq('id', residentId)

            if (error) {
                fetchAdminData() // Revert
                throw error
            }

            showToast('Resident verified successfully!', 'success')
        } catch (error: any) {
            console.error('Error verifying resident:', error)
            showToast('Failed to verify resident', 'error')
        }
    }

    const viewAttachment = async (path: string) => {
        if (!path) return
        try {
            const { data, error } = await supabase.storage
                .from('resident-requirements')
                .createSignedUrl(path, 3600) // Increased to 1 hour

            if (error) {
                console.error('Supabase Storage Error:', error)
                throw error
            }

            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank')
            }
        } catch (error: any) {
            console.error('Error opening attachment:', error)
            const msg = error.message || 'Unknown error'
            showToast(`Failed to open file: ${msg}. Make sure the "resident-requirements" bucket exists and RLS policies are set.`, 'error')
        }
    }

    const exportToCSV = (data: any[], filename: string) => {
        if (data.length === 0) return
        const headers = Object.keys(data[0]).join(',')
        const rows = data.map(obj => 
            Object.values(obj).map(val => 
                typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
            ).join(',')
        )
        const csvContent = [headers, ...rows].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleScan = async (results: any[]) => {
        if (!results || results.length === 0) return;
        const scannedValue = results[0].rawValue?.trim();
        if (!scannedValue || verifying) return;
        
        setVerifying(true)
        setScanResult(null)

        try {
            // 1. Try to find if it's a Document/Service Request QR
            const { data: docData } = await supabase
                .from('service_requests')
                .select('*, profiles!inner(full_name)')
                .eq('qr_code_ref', scannedValue)
                .maybeSingle()

            if (docData) {
                const isValid = docData.status === 'ready' || docData.status === 'completed'
                const holderName = (docData.profiles as any)?.full_name || 'Unknown'
                
                if (!isValid) {
                    setScanResult({ 
                        valid: false, 
                        message: `Document is still in ${docData.status} status.`, 
                        holder: holderName, 
                        docType: docData.document_type 
                    })
                } else {
                    setScanResult({ 
                        valid: true, 
                        isResident: false,
                        docType: docData.document_type, 
                        holder: holderName, 
                        date: docData.updated_at 
                    })
                    
                    const log = { name: holderName, doc: docData.document_type, time: new Date().toLocaleTimeString(), result: '✅ Valid Doc' }
                    setRecentVerifications(prev => [log, ...prev].slice(0, 5))
                }

                // SAVE TO DB LOGS
                await supabase.from('qr_verifications').insert({
                    document_ref: scannedValue,
                    document_type: docData.document_type,
                    holder_name: holderName,
                    is_valid: isValid,
                    verified_by: profile?.id
                })
                
                return
            }

            // 2. Try to find if it's a Resident ID (using ID or old Resident QR ID)
            const { data: resData } = await supabase
                .from('profiles')
                .select('*')
                .or(`id.eq."${scannedValue}",resident_qr_id.eq."${scannedValue}"`)
                .maybeSingle()

            if (resData) {
                setScanResult({
                    valid: true,
                    isResident: true,
                    holder: resData.full_name,
                    docType: 'Resident ID Card',
                    address: resData.address,
                    phone: resData.phone,
                    date: resData.created_at
                })
                
                const log = { name: resData.full_name, doc: 'Resident ID', time: new Date().toLocaleTimeString(), result: '✅ Verified Resident' }
                setRecentVerifications(prev => [log, ...prev].slice(0, 5))

                // SAVE TO DB LOGS
                await supabase.from('qr_verifications').insert({
                    document_ref: scannedValue,
                    document_type: 'Resident ID Card',
                    holder_name: resData.full_name,
                    is_valid: true,
                    verified_by: profile?.id
                })

                return
            }



            // 3. Fallback: If no match found
            setScanResult({ 
                valid: false, 
                message: 'No record found. Please ensure this is an official E-Barangay QR Code.' 
            })

        } catch(e: any) {
            console.error('Scan error:', e)
            setScanResult({ valid: false, message: 'Process error: Could not verify QR code.' })
        } finally {
            // Keep verifying state for 3 seconds to prevent immediate re-scan
            setTimeout(() => setVerifying(false), 3000)
        }
    }

    const filteredRequests = requests.filter(r => {
        const reqName = r.resident_name || ''
        const matchSearch =
            reqName.toLowerCase().includes(requestSearch.toLowerCase()) ||
            r.document_type.toLowerCase().includes(requestSearch.toLowerCase())
        const matchStatus = statusFilter === 'all' || r.status === statusFilter
        return matchSearch && matchStatus
    })

    const filteredResidents = residents.filter(r =>
        r.role === 'resident' && (
            r.full_name.toLowerCase().includes(residentSearch.toLowerCase()) ||
            r.email.toLowerCase().includes(residentSearch.toLowerCase()) ||
            (r.address ?? '').toLowerCase().includes(residentSearch.toLowerCase())
        )
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

                <BottomNav 
                    items={navItems} 
                    activeTab={activeTab} 
                    setActiveTab={setActiveTab} 
                />

                {/* Main Content */}
                <main className={styles.mainContent}>
                    <div className="container">
                        {/* ── OVERVIEW ── */}
                        {activeTab === 'overview' && (
                            <div className="animate-fadeIn">
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
                                                <div className={styles.statTrend}>requires immediate action</div>
                                            </div>
                                            <div className={`glass-card ${styles.statCard} ${styles.statProcessing}`}>
                                                <div className={styles.statIcon}>🔄</div>
                                                <div className={styles.statValue}>{processingCount}</div>
                                                <div className={styles.statLabel}>Processing</div>
                                                <div className={styles.statTrend}>in queue</div>
                                            </div>
                                            <div className={`glass-card ${styles.statCard} ${styles.statCompleted}`}>
                                                <div className={styles.statIcon}>✅</div>
                                                <div className={styles.statValue}>{completedCount}</div>
                                                <div className={styles.statLabel}>Completed</div>
                                                <div className={styles.statTrend}>{completionRate}% efficiency</div>
                                            </div>
                                            <div className={`glass-card ${styles.statCard} ${styles.statResidents}`}>
                                                <div className={styles.statIcon}>👥</div>
                                                <div className={styles.statValue}>{residents.length}</div>
                                                <div className={styles.statLabel}>Residents</div>
                                                <div className={styles.statTrend}>Total registered</div>
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
                                                    {requests.length === 0 && <p className={styles.emptyMessage}>No requests yet.</p>}
                                                </div>
                                            </div>

                                            {/* Announcements Summary */}
                                            <div className="glass-card">
                                                <div className={styles.cardHeader}>
                                                    <h2>Announcements</h2>
                                                    <button className={styles.viewAll} onClick={() => setActiveTab('announcements')}>Manage</button>
                                                </div>
                                                <div className={styles.activityList}>
                                                    {announcements.slice(0, 5).map(ann => (
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
                                                    {announcements.length === 0 && <p className={styles.emptyMessage}>No announcements yet.</p>}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── DOCUMENT REQUESTS ── */}
                        {activeTab === 'requests' && (
                            <div className="animate-fadeIn">
                                <div className={styles.pageHeader}>
                                    <div>
                                        <h1>Document Requests</h1>
                                        <p className={styles.pageSubtitle}>{requests.length} total requests — {pendingCount} pending action</p>
                                    </div>
                                    <button className="btn btn-primary" style={{ gap: '0.5rem' }} onClick={() => exportToCSV(requests, 'Document_Requests')}>
                                        📥 Export Requests CSV
                                    </button>
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

                                <div className={`${styles.tableContainer} ${styles.glassTable}`}>
                                    {loading ? <LoadingSpinner text="Loading requests..." /> : (
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Applicant</th>
                                                    <th>Document Type</th>
                                                    <th>Requirements</th>
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
                                                        <td>
                                                            {req.attachment_url ? (
                                                                <button 
                                                                    className="btn btn-outline" 
                                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#2563eb' }}
                                                                    onClick={() => viewAttachment(req.attachment_url!)}
                                                                >
                                                                    📎 View File
                                                                </button>
                                                            ) : (
                                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No Attachment</span>
                                                            )}
                                                        </td>
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
                                                                    <button className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setNoteModal({ id: req.id, status: 'rejected' })}>Reject</button>
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
                                                        <td colSpan={8} className={styles.emptyMessage}>No matching requests found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── RESIDENTS ── */}
                        {activeTab === 'residents' && (
                            <div className="animate-fadeIn">
                                <div className={styles.pageHeader}>
                                    <div>
                                        <h1>Registered Residents</h1>
                                        <p className={styles.pageSubtitle}>{residents.length} registered accounts in the system</p>
                                    </div>
                                    <button className="btn btn-primary" style={{ gap: '0.5rem' }} onClick={() => exportToCSV(residents, 'Resident_List')}>
                                        📥 Export Residents CSV
                                    </button>
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

                                <div className={`${styles.tableContainer} ${styles.glassTable}`}>
                                    {loading ? <LoadingSpinner text="Loading residents..." /> : (
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
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <strong>{res.full_name}</strong>
                                                                        <div style={{ marginTop: '0.4rem' }}>
                                                                            {res.is_verified ? (
                                                                                <div className={styles.verifiedBadge}>
                                                                                    🛡️ VERIFIED
                                                                                </div>
                                                                            ) : (
                                                                                <button 
                                                                                    className={styles.verifyBtn}
                                                                                    onClick={() => verifyResident(res.id)}
                                                                                >
                                                                                    Verify
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
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
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── ANNOUNCEMENTS ── */}
                        {activeTab === 'announcements' && (
                            <div className="animate-fadeIn">
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
                            </div>
                        )}

                        {/* ── QR VERIFY ── */}
                        {activeTab === 'verify' && (
                            <div className="animate-fadeIn">
                                <div className={styles.pageHeader}>
                                    <div>
                                        <h1>QR Code Verification</h1>
                                        <p className={styles.pageSubtitle}>Scan a document QR code to verify its authenticity</p>
                                    </div>
                                </div>
                                <div className="grid grid-2">
                                    <div className={`glass-card ${styles.qrScanner}`}>
                                        <h3>Scan QR Code</h3>
                                        <div style={{ marginTop: '1rem', background: '#000', borderRadius: '8px', overflow: 'hidden', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {(!scanResult || verifying) ? (
                                                <Scanner
                                                    onScan={handleScan}
                                                    components={{ zoom: false }}
                                                    styles={{ container: { width: '100%', maxWidth: '400px', margin: '0 auto' } }}
                                                />
                                            ) : (
                                                <div style={{ color: 'white', textAlign: 'center', padding: '2rem' }}>
                                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                                                    <p>Scan Complete</p>
                                                    <button 
                                                        className="btn btn-outline" 
                                                        style={{ marginTop: '1rem', color: 'white', borderColor: 'white' }}
                                                        onClick={() => setScanResult(null)}
                                                    >
                                                        Scan Another
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {verifying && <div style={{ marginTop: '1rem', textAlign: 'center' }}><LoadingSpinner text="Verifying..." size="sm" /></div>}
                                        {scanResult && !verifying && (
                                            <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', background: scanResult.valid ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${scanResult.valid ? '#22c55e' : '#ef4444'}` }}>
                                                <h4 style={{ color: scanResult.valid ? '#22c55e' : '#ef4444', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {scanResult.valid ? (scanResult.isResident ? '👤 VERIFIED RESIDENT' : '✅ VERIFIED DOCUMENT') : '❌ INVALID / WARNING'}
                                                </h4>
                                                {scanResult.holder && <p><strong>{scanResult.isResident ? 'Name' : 'Holder'}:</strong> {scanResult.holder}</p>}
                                                {scanResult.docType && <p><strong>Type:</strong> {scanResult.docType}</p>}
                                                {scanResult.isResident && (
                                                    <div style={{ marginTop: '0.35rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.35rem' }}>
                                                        {scanResult.address && <p style={{ fontSize: '0.85rem' }}>📍 {scanResult.address}</p>}
                                                        {scanResult.phone && <p style={{ fontSize: '0.85rem' }}>📞 {scanResult.phone}</p>}
                                                    </div>
                                                )}
                                                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', opacity: 0.8 }}>
                                                    {scanResult.valid ? `${scanResult.isResident ? 'Registered' : 'Issued'}: ${fmtDate(scanResult.date)}` : scanResult.message}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="glass-card">
                                        <h3>Recent Verifications</h3>
                                        <div className={styles.verificationList}>
                                            {recentVerifications.length === 0 ? (
                                                  <p className={styles.emptyMessage} style={{ padding: '2rem 0' }}>No scans performed yet in this session.</p>
                                            ) : recentVerifications.map((v, i) => (
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
                            </div>
                        )}

                        {/* ── ANALYTICS ── */}
                        {activeTab === 'analytics' && (
                            <div className="animate-fadeIn">
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
                            </div>
                        )}
                    </div>
                </main>
            </div>
            {/* Status Note Modal */}
            {noteModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: '1rem' }} onClick={() => setNoteModal(null)}>
                    <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '2rem', background: 'var(--bg-secondary, #1a1a2e)' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '1rem' }}>Reason for {noteModal.status === 'rejected' ? 'Rejection' : 'Update'}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Please provide a reason or note for the resident.</p>
                        
                        <textarea
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            placeholder="e.g., Missing valid ID, Requirements not met..."
                            rows={4}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white', marginBottom: '1.5rem' }}
                        />
                        
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setNoteModal(null)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => updateStatus(noteModal.id, noteModal.status, adminNote)}>Confirm Rejection</button>
                        </div>
                    </div>
                </div>
            )}
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
