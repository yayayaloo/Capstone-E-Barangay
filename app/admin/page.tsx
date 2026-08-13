'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { FileText, LayoutDashboard, Settings, UserCircle, RefreshCcw, Search, Clock, Activity, CheckCircle, Users, ArrowRight, Printer, AlertTriangle, ChevronRight, X, ShieldAlert, BookOpen, User, Phone, CheckSquare, XSquare, MessageSquare, QrCode, LogOut, Check, Megaphone, Trash2, Camera, UserMinus, Plus, BarChart3, History } from 'lucide-react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import ProtectedRoute from '@/components/ProtectedRoute'
import Header from '@/components/Header'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { ServiceRequest, Announcement, Profile, AuditLog, BlotterReport, BlotterStatus, Complaint, ComplaintStatus, ComplaintComment } from '@/lib/types'
import { logAdminAction } from '@/lib/audit'
import { QRCodeCanvas } from 'qrcode.react'
import CertificateTemplate, { CertificateData } from '@/components/CertificateTemplate'
import { updateRequestStatus } from '@/app/actions/requestActions'
import { verifyResidentAction, rejectResidentAction, deleteAnnouncementAction, saveBlotterReportAction, updateComplaintStatusAction } from '@/app/actions/adminActions'
const WeeklyPerformanceChart = dynamic(() => import('@/components/WeeklyPerformanceChart'), { ssr: false })
const SectoralChart = dynamic(() => import('@/components/SectoralChart'), { ssr: false })
const AgeDemographicChart = dynamic(() => import('@/components/AgeDemographicChart'), { ssr: false })
import ConfirmDialog from '@/components/ConfirmDialog'
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
        emergency_alert: 'badge badge-error',
        emergency_announcement: 'badge badge-warning',
        emergency: 'badge badge-error',
        general: 'badge badge-info',
    }
    return map[cat] || 'badge badge-info'
}

function categoryLabel(cat: string) {
    const map: Record<string, string> = {
        community_event: 'Community Event',
        important: 'Important',
        emergency_alert: 'Emergency Alert',
        emergency_announcement: 'Emergency Announcement',
        emergency: 'Emergency',
        general: 'General',
    }
    return map[cat] || cat
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function cleanDocType(type: string | undefined | null) {
    if (!type) return ''
    const trimmed = type.trim()
    if (trimmed.toLowerCase() === 'indigency') return 'Certificate of Indigency'
    return trimmed
}

function toLocalISOString(dateString?: string) {
    if (!dateString) return ''
    const date = new Date(dateString)
    const tzOffset = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

const DOCUMENTS = [
    { slug: 'barangay-clearance', name: 'Barangay Clearance', fee: 'Php 50.00', reqs: 'Valid ID' },
    { slug: 'certificate-of-residency', name: 'Certificate of Residency', fee: 'Php 50.00', reqs: 'Valid ID' },
    { slug: 'business-clearance', name: 'Business Clearance', fee: 'Free', reqs: 'DTI Certificate' },
    { slug: 'lot-certification', name: 'Lot / Building Certification', fee: 'Php 1.00/sqm', reqs: 'Purok Cert, Tax Dec, Latest Tax Payment' },
    { slug: 'first-time-job-seeker', name: 'First Time Job Seeker', fee: 'Free', reqs: 'Valid ID' },
    { slug: 'indigency', name: 'Certificate of Indigency', fee: 'Free', reqs: 'Valid ID' },
]

// ─── Main Component ───────────────────────────────────────────────────────────

function AdminDashboardContent() {
    const { profile, signOut } = useAuth()
    const { showToast } = useToast()
    const [activeTab, setActiveTab] = useState('overview')
    const [analyticsView, setAnalyticsView] = useState<'overview' | 'trends' | 'demographics'>('overview')
    const [loading, setLoading] = useState(true)
    const loadedTabs = useRef<Record<string, boolean>>({})
    const commentTimelineEndRef = useRef<HTMLDivElement | null>(null)

    const [requests, setRequests] = useState<ServiceRequest[]>([])
    const [residents, setResidents] = useState<Profile[]>([])
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
    const [residentSearch, setResidentSearch] = useState('')
    const [requestSearch, setRequestSearch] = useState('')
    const [isSearchScannerOpen, setIsSearchScannerOpen] = useState(false)
    const [cameraError, setCameraError] = useState<string | null>(null)
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

    // PDF Generation
    const certRef = useRef<HTMLDivElement>(null)
    const [certData, setCertData] = useState<CertificateData | null>(null)
    const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null)
    const [pdfConfigModal, setPdfConfigModal] = useState<{
        isOpen: boolean;
        request: any;
        documentType: string;
        residentName: string;
        purpose: string;
        sequenceNumber?: string;
        checkCompliant?: boolean;
        checkNonCompliant?: boolean;
        checkNoObjection?: boolean;
        checkNonIssuance?: boolean;
        checkNewBusiness?: boolean;
        checkRenewal?: boolean;
        formData: Record<string, any>;
    } | null>(null)

    const [stats, setStats] = useState({ pending: 0, processing: 0, completed: 0, rejected: 0, totalRequests: 0, totalResidents: 0 })
    const [demographicsData, setDemographicsData] = useState<any[] | null>(null)
    const [loadingDemographics, setLoadingDemographics] = useState(false)

    // Resident detail modal
    const [selectedResident, setSelectedResident] = useState<Profile | null>(null)
    // Request detail modal
    const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null)
    const [manualQrInput, setManualQrInput] = useState('')

    // Blotter Reports state
    const [blotterReports, setBlotterReports] = useState<BlotterReport[]>([])
    const [blotterSearch, setBlotterSearch] = useState('')
    const [blotterStatusFilter, setBlotterStatusFilter] = useState('all')
    const [blotterModal, setBlotterModal] = useState<{ isOpen: boolean, report: Partial<BlotterReport> | null }>({ isOpen: false, report: null })
    const [savingBlotter, setSavingBlotter] = useState(false)

    // Complaints state (merged into Blotter tab)
    const [blotterView, setBlotterView] = useState<'reports' | 'complaints'>('reports')
    const [complaints, setComplaints] = useState<Complaint[]>([])
    const [complaintSearch, setComplaintSearch] = useState('')
    const [complaintStatusFilter, setComplaintStatusFilter] = useState('all')
    const [complaintModal, setComplaintModal] = useState<{ isOpen: boolean, complaint: Complaint | null }>({ isOpen: false, complaint: null })
    const [complaintNotes, setComplaintNotes] = useState('')
    const [complaintNewStatus, setComplaintNewStatus] = useState<ComplaintStatus>('Received')
    const [savingComplaint, setSavingComplaint] = useState(false)
    const [complaintComments, setComplaintComments] = useState<ComplaintComment[]>([])
    const [loadingComplaintComments, setLoadingComplaintComments] = useState(false)
    const [newComplaintComment, setNewComplaintComment] = useState('')
    const [blotterLimit, setBlotterLimit] = useState(100)
    const [complaintsLimit, setComplaintsLimit] = useState(100)
    const [showArchivedBlotters, setShowArchivedBlotters] = useState(false)
    const [showArchivedComplaints, setShowArchivedComplaints] = useState(false)

    // ─── Custom Confirm Dialog ───────────────────────────────────────────────────
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean
        title: string
        message: string
        confirmLabel: string
        variant: 'danger' | 'warning' | 'info'
        onConfirm: () => void
    }>({
        isOpen: false,
        title: '',
        message: '',
        confirmLabel: 'Confirm',
        variant: 'danger',
        onConfirm: () => { }
    })
    const [filePreview, setFilePreview] = useState<{ url: string; name: string } | null>(null)

    const closeConfirmDialog = useCallback(() => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }))
    }, [])

    useEffect(() => {
        fetchDataForTab(activeTab, true)
    }, [activeTab])

    useEffect(() => {
        if (activeTab === 'blotter') {
            fetchDataForTab('blotter', true)
        }
    }, [blotterLimit, complaintsLimit, showArchivedBlotters, showArchivedComplaints])

    const fetchOverviewStats = async () => {
        try {
            const [
                { count: pending },
                { count: processing },
                { count: completed },
                { count: rejected },
                { count: totalRequests },
                { count: totalResidents }
            ] = await Promise.all([
                supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
                supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
                supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
                supabase.from('service_requests').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'resident')
            ])

            setStats({
                pending: pending || 0,
                processing: processing || 0,
                completed: completed || 0,
                rejected: rejected || 0,
                totalRequests: totalRequests || 0,
                totalResidents: totalResidents || 0
            })
        } catch (error) {
            console.error('Error fetching stats:', error)
        }
    }

    const fetchDataForTab = async (tab: string, forceRefresh = false) => {
        if (!forceRefresh && loadedTabs.current[tab]) return;

        setLoading(true)
        try {
            if (tab === 'overview') {
                await fetchOverviewStats()
                // Fetch recent top 5 requests & announcements
                const [reqRes, annRes, qrRes, demoRes] = await Promise.all([
                    supabase.from('service_requests').select('*, profiles!inner(full_name)').order('created_at', { ascending: false }).limit(5),
                    supabase.from('announcements').select('*').order('published_at', { ascending: false }).limit(5),
                    supabase.from('qr_verifications').select('*').order('verified_at', { ascending: false }).limit(5),
                    demographicsData ? Promise.resolve({ data: demographicsData }) : supabase.from('profiles').select('gender, birthdate, sectors').eq('role', 'resident')
                ])

                const mappedRequests = (reqRes.data || []).map((req: any) => ({
                    ...req, resident_name: req.profiles?.full_name || 'Unknown Resident'
                }))
                setRequests(mappedRequests as ServiceRequest[])
                setAnnouncements(annRes.data as Announcement[])
                if (qrRes.data) {
                    setRecentVerifications(qrRes.data.map((v: any) => ({
                        name: v.holder_name, doc: cleanDocType(v.document_type),
                        time: new Date(v.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        result: v.is_valid ? 'Valid' : 'Invalid'
                    })))
                }
                if (demoRes.data && !demographicsData) {
                    setDemographicsData(demoRes.data)
                }
            } else if (tab === 'requests') {
                const { data } = await supabase.from('service_requests').select('*, profiles!inner(full_name)').order('created_at', { ascending: false }).limit(100)
                const mappedRequests = (data || []).map((req: any) => ({
                    ...req, resident_name: req.profiles?.full_name || 'Unknown Resident'
                }))
                setRequests(mappedRequests as ServiceRequest[])
            } else if (tab === 'residents') {
                const { data } = await supabase.from('profiles').select('*').eq('role', 'resident').order('created_at', { ascending: false }).limit(100)
                setResidents(data as Profile[])
            } else if (tab === 'announcements') {
                const { data } = await supabase.from('announcements').select('*').order('published_at', { ascending: false }).limit(50)
                setAnnouncements(data as Announcement[])
            } else if (tab === 'audit') {
                const { data } = await supabase.from('audit_logs').select('*, profiles!inner(full_name)').order('created_at', { ascending: false }).limit(100)
                const mappedAudit = (data || []).map((log: any) => ({
                    ...log, admin_name: log.profiles?.full_name || 'Admin User'
                }))
                setAuditLogs(mappedAudit as AuditLog[])
            } else if (tab === 'blotter') {
                const [blotterRes, complaintsRes] = await Promise.all([
                    supabase.from('blotter_reports').select('*').eq('is_archived', showArchivedBlotters).order('created_at', { ascending: false }).limit(blotterLimit),
                    supabase.from('complaints').select('*, profiles!inner(full_name)').eq('is_archived', showArchivedComplaints).order('created_at', { ascending: false }).limit(complaintsLimit)
                ])
                if (blotterRes.error) throw blotterRes.error
                setBlotterReports(blotterRes.data as BlotterReport[])
                if (!complaintsRes.error) {
                    const mappedComplaints = (complaintsRes.data || []).map((c: any) => ({
                        ...c, resident_name: c.profiles?.full_name || 'Unknown Resident'
                    }))
                    setComplaints(mappedComplaints as Complaint[])
                }
            }
            loadedTabs.current[tab] = true;
        } catch (error: any) {
            console.error('Error fetching tab data:', error)
            showToast('Failed to load dashboard data', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (activeTab === 'analytics' && analyticsView === 'demographics' && !demographicsData) {
            fetchDemographics();
        }
    }, [activeTab, analyticsView, demographicsData]);

    const fetchDemographics = async () => {
        setLoadingDemographics(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('gender, birthdate, sectors')
                .eq('role', 'resident');
            if (!error) {
                setDemographicsData(data || []);
            } else {
                console.error("Error fetching demographics", error);
            }
        } finally {
            setLoadingDemographics(false);
        }
    }

    useEffect(() => {
        if (complaintModal.isOpen && complaintModal.complaint?.id) {
            fetchComplaintComments(complaintModal.complaint.id)
        } else {
            setComplaintComments([])
            setNewComplaintComment('')
        }
    }, [complaintModal.isOpen, complaintModal.complaint?.id])

    useEffect(() => {
        if (commentTimelineEndRef.current) {
            commentTimelineEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [complaintComments])


    const fetchComplaintComments = async (complaintId: string) => {
        setLoadingComplaintComments(true)
        try {
            const { data, error } = await supabase
                .from('complaint_comments')
                .select(`
                    id,
                    complaint_id,
                    sender_id,
                    comment,
                    created_at,
                    profiles:sender_id (full_name, role)
                `)
                .eq('complaint_id', complaintId)
                .order('created_at', { ascending: true })

            if (error) throw error

            const formatted = (data || []).map((c: any) => ({
                id: c.id,
                complaint_id: c.complaint_id,
                sender_id: c.sender_id,
                comment: c.comment,
                created_at: c.created_at,
                sender_name: c.profiles?.full_name || 'Resident',
                sender_role: c.profiles?.role || 'resident'
            }))
            setComplaintComments(formatted)
        } catch (err: any) {
            console.error('Error fetching comments:', err)
            showToast(err.message || 'Failed to load comments', 'error')
        } finally {
            setLoadingComplaintComments(false)
        }
    }

    const postComplaintComment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!complaintModal.complaint?.id || !newComplaintComment.trim() || !profile?.id) return

        const commentText = newComplaintComment.trim()
        try {
            const { data, error } = await supabase
                .from('complaint_comments')
                .insert({
                    complaint_id: complaintModal.complaint.id,
                    sender_id: profile.id,
                    comment: commentText
                })
                .select(`
                    id,
                    complaint_id,
                    sender_id,
                    comment,
                    created_at,
                    profiles:sender_id (full_name, role)
                `)
                .single()

            if (error) throw error

            const formatted = {
                id: data.id,
                complaint_id: data.complaint_id,
                sender_id: data.sender_id,
                comment: data.comment,
                created_at: data.created_at,
                sender_name: data.profiles?.full_name || profile.full_name,
                sender_role: data.profiles?.role || 'admin'
            }

            setComplaintComments(prev => [...prev, formatted])
            setNewComplaintComment('')
        } catch (err: any) {
            console.error('Error posting comment:', err)
            showToast(err.message || 'Failed to send message', 'error')
        }
    }


    const pendingCount = stats.pending
    const processingCount = stats.processing
    const completedCount = stats.completed
    const rejectedCount = stats.rejected
    const completionRate = stats.totalRequests > 0
        ? Math.round((stats.completed / stats.totalRequests) * 100)
        : 0

    const updateStatus = async (requestId: string, newStatus: string, note?: string) => {
        try {
            const request = requests.find(r => r.id === requestId)
            if (!request) return

            let qrCodeRef = null
            if (newStatus === 'ready' && !request.qr_code_ref) {
                qrCodeRef = crypto.randomUUID()
            }

            const updatedReq = await updateRequestStatus(
                requestId,
                newStatus,
                qrCodeRef,
                note ?? null,
                request.document_type
            )
            
            // Update local state with returned data
            if (updatedReq && newStatus === 'ready') {
                request.issued_at = updatedReq.issued_at
                request.expires_at = updatedReq.expires_at
                request.qr_code_ref = updatedReq.qr_code_ref
            }

            showToast(
                newStatus === 'ready'
                    ? `Request marked as ready — QR code generated for document verification`
                    : `Request marked as ${newStatus}`,
                'success'
            )

            if (profile?.id) {
                await logAdminAction('UPDATE_REQUEST', `Updated request ${requestId.slice(0, 8)} to ${newStatus}${newStatus === 'ready' ? ' (QR code generated)' : ''}`, profile.id);
            }

            fetchDataForTab(activeTab, true)
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

            if (profile?.id) {
                await logAdminAction('CREATE_ANNOUNCEMENT', `Published announcement: ${annTitle}`, profile.id);
            }
        } catch (error: any) {
            console.error('Error publishing announcement:', error)
            showToast('Failed to publish announcement', 'error')
        } finally {
            setPublishing(false)
        }
    }

    const handleGeneratePdf = async (req: ServiceRequest) => {
        const type = req.document_type.toLowerCase()
        
        // Parse form_data for defaults
        let parsed = req.form_data || {}
        if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed) } catch (e) {}
        }
        
        // Fetch resident profile for default fields
        let residentProfile: any = null
        try {
            const { data: profileData } = await supabase
                .from('profiles')
                .select('address, phone, birthdate, gender, relationship_status')
                .eq('id', req.resident_id)
                .single()
            residentProfile = profileData
        } catch (e) {
            console.warn('Could not fetch resident profile:', e)
        }
        
        let residentAge = ''
        if (residentProfile?.birthdate) {
            const today = new Date()
            const born = new Date(residentProfile.birthdate)
            let a = today.getFullYear() - born.getFullYear()
            const m = today.getMonth() - born.getMonth()
            if (m < 0 || (m === 0 && today.getDate() < born.getDate())) a--
            residentAge = a.toString()
        }

        let currentBlotters = blotterReports
        if (currentBlotters.length === 0) {
            try {
                const { data: fetchedBlotters } = await supabase.from('blotter_reports').select('*').neq('status', 'Resolved')
                if (fetchedBlotters) currentBlotters = fetchedBlotters as BlotterReport[]
            } catch (e) {}
        }

        const residentNameLower = (req.resident_name || '').trim().toLowerCase();
        const hasActiveBlotter = residentNameLower.length > 0 && currentBlotters.some(rep => {
            const respondentLower = (rep.respondent || '').trim().toLowerCase();
            if (respondentLower === residentNameLower) return rep.status !== 'Resolved';
            
            const words = residentNameLower.split(/\s+/).filter(w => w.length > 2);
            return words.length > 0 && words.every(word => new RegExp('\\b' + word + '\\b', 'i').test(respondentLower)) && rep.status !== 'Resolved';
        });

        // Standard fields defaults
        const addressDefault = parsed.address || residentProfile?.address || ''
        const birthdateDefault = parsed.birthdate || parsed.birthDate || residentProfile?.birthdate || ''
        const ageDefault = parsed.age || residentAge
        const civilStatusDefault = parsed.civilStatus || residentProfile?.relationship_status || ''
        const genderDefault = parsed.gender || residentProfile?.gender || ''

        // Initialize formData based on document type
        const modalFormData: Record<string, any> = {
            address: addressDefault,
            birthdate: birthdateDefault,
            age: ageDefault,
            civilStatus: civilStatusDefault,
            gender: genderDefault,
        }

        let seqNum = ''
        let checkCompliant = false
        let checkNonCompliant = false
        let checkNoObjection = false
        let checkNonIssuance = false
        let checkNewBusiness = false
        let checkRenewal = false

        if (type.includes('business') || type.includes('endorsement')) {
            const isRenewalDefault = parsed.isRenewal !== undefined ? parsed.isRenewal : true
            checkNewBusiness = parsed.checkNewBusiness !== undefined ? parsed.checkNewBusiness : !isRenewalDefault
            checkRenewal = parsed.checkRenewal !== undefined ? parsed.checkRenewal : isRenewalDefault

            const isCompliantDefault = parsed.isCompliant !== undefined ? parsed.isCompliant : !hasActiveBlotter
            const noObjectionDefault = parsed.noObjection !== undefined ? parsed.noObjection : !hasActiveBlotter

            checkCompliant = parsed.checkCompliant !== undefined ? parsed.checkCompliant : isCompliantDefault
            checkNonCompliant = parsed.checkNonCompliant !== undefined ? parsed.checkNonCompliant : !isCompliantDefault
            checkNoObjection = parsed.checkNoObjection !== undefined ? parsed.checkNoObjection : noObjectionDefault
            checkNonIssuance = parsed.checkNonIssuance !== undefined ? parsed.checkNonIssuance : !noObjectionDefault

            // Auto sequence number resolution
            try {
                const { data: bRequests } = await supabase
                    .from('service_requests')
                    .select('form_data')
                    .ilike('document_type', '%business%')
                
                let maxNum = 0
                if (bRequests && bRequests.length > 0) {
                    bRequests.forEach((r: any) => {
                        let fdParsed = r.form_data
                        if (typeof fdParsed === 'string') {
                            try { fdParsed = JSON.parse(fdParsed) } catch (e) {}
                        }
                        const num = parseInt(fdParsed?.sequenceNumber, 10)
                        if (!isNaN(num) && num > maxNum) {
                            maxNum = num
                        }
                    })
                }
                
                if (maxNum > 0) {
                    seqNum = String(maxNum + 1).padStart(3, '0')
                } else {
                    seqNum = String((bRequests?.length || 0) + 1).padStart(3, '0')
                }
            } catch (e) {
                console.error('Failed to compute auto sequence number:', e)
                seqNum = req.id.slice(0, 4).toUpperCase()
            }

            modalFormData.businessName = parsed.businessName || ''
            modalFormData.businessLocation = parsed.businessLocation || ''
            modalFormData.operatorName = parsed.operatorName || req.resident_name || ''
            modalFormData.operatorAddress = parsed.operatorAddress || residentProfile?.address || ''
        } else if (type.includes('lot') || type.includes('occupancy') || type.includes('building')) {
            modalFormData.lotArea = parsed.lotArea || ''
            modalFormData.taxDecNo = parsed.taxDecNo || ''
            modalFormData.propertyLocation = parsed.propertyLocation || ''
            modalFormData.occupiedSince = parsed.occupiedSince || ''
            modalFormData.docNo = parsed.docNo || ''
            modalFormData.pageNo = parsed.pageNo || ''
            modalFormData.bookNo = parsed.bookNo || ''
            modalFormData.seriesOf = parsed.seriesOf || ''
            modalFormData.notarizedBy = parsed.notarizedBy || ''
            modalFormData.notarizedOn = parsed.notarizedOn || ''
            modalFormData.orNo = parsed.orNo || ''
            modalFormData.amount = parsed.amount || ''
            modalFormData.orIssuedOn = parsed.orIssuedOn || ''
            modalFormData.proofType = parsed.proofType || 'Deed of Sale'
            modalFormData.boundedNorth = parsed.boundedNorth || 'OCCUPIED LOT'
            modalFormData.boundedSouth = parsed.boundedSouth || 'OCCUPIED LOT'
            modalFormData.boundedEast = parsed.boundedEast || 'OCCUPIED LOT'
            modalFormData.boundedWest = parsed.boundedWest || 'OCCUPIED LOT'
        } else if (type.includes('job seeker') || type.includes('first time')) {
            modalFormData.yearsOfResidency = parsed.yearsOfResidency || ''
            modalFormData.idType = parsed.idType || ''
            modalFormData.idNumber = parsed.idNumber || ''
        } else if (type.includes('residency') || (type.includes('certification') && !type.includes('lot'))) {
            modalFormData.residentSince = parsed.residentSince || ''
        }

        const residentNameDefault = parsed.customResidentName || req.resident_name || ''
        const purposeDefault = parsed.customPurpose || req.purpose || ''

        setPdfConfigModal({
            isOpen: true,
            request: req,
            documentType: req.document_type,
            residentName: residentNameDefault,
            purpose: purposeDefault,
            sequenceNumber: seqNum,
            checkCompliant,
            checkNonCompliant,
            checkNoObjection,
            checkNonIssuance,
            checkNewBusiness,
            checkRenewal,
            formData: modalFormData
        })
    }

    const generatePDFDirect = async (req: ServiceRequest, customFields?: {
        residentName: string;
        purpose: string;
        checkCompliant?: boolean;
        checkNonCompliant?: boolean;
        checkNoObjection?: boolean;
        checkNonIssuance?: boolean;
        checkNewBusiness?: boolean;
        checkRenewal?: boolean;
        sequenceNumber?: string;
        formData: Record<string, any>;
    }) => {
        const jsPDF = (await import('jspdf')).default;
        const html2canvas = (await import('html2canvas')).default;
        try {
            setGeneratingPdfId(req.id)

            // Set data for template rendering
            const issueDateObj = req.issued_at ? new Date(req.issued_at) : new Date()
            let expDateObj = req.expires_at ? new Date(req.expires_at) : new Date(issueDateObj)

            if (!req.expires_at) {
                const type = req.document_type.toLowerCase()
                if (type.includes('job seeker') || type.includes('business clearance')) {
                    expDateObj.setFullYear(expDateObj.getFullYear() + 1)
                } else {
                    expDateObj.setMonth(expDateObj.getMonth() + 6)
                }
            }

            // Fetch resident profile for certificate fields
            let residentProfile: any = null
            try {
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('address, phone, birthdate, gender, relationship_status')
                    .eq('id', req.resident_id)
                    .single()
                
                if (profileError) throw profileError
                residentProfile = profileData
            } catch (e) {
                console.warn('Could not fetch resident profile for PDF (missing columns or RLS):', e)
            }

            // Calculate age from birthdate
            let residentAge = ''
            if (residentProfile?.birthdate) {
                const today = new Date()
                const born = new Date(residentProfile.birthdate)
                let a = today.getFullYear() - born.getFullYear()
                const m = today.getMonth() - born.getMonth()
                if (m < 0 || (m === 0 && today.getDate() < born.getDate())) a--
                residentAge = a.toString()
            }

            // Parse form_data if it's a string
            let parsedFormData = req.form_data || {}
            if (typeof parsedFormData === 'string') {
                try {
                    parsedFormData = JSON.parse(parsedFormData)
                } catch (e) {
                    console.error('Failed to parse form_data', e)
                }
            }

            let currentBlottersDirect = blotterReports
            if (currentBlottersDirect.length === 0) {
                try {
                    const { data: fetchedBlotters } = await supabase.from('blotter_reports').select('*').neq('status', 'Resolved')
                    if (fetchedBlotters) currentBlottersDirect = fetchedBlotters as BlotterReport[]
                } catch (e) {}
            }

            // Smart check: Resident has unresolved blotters in the barangay records
            const residentNameLower = (req.resident_name || '').trim().toLowerCase();
            const hasActiveBlotter = residentNameLower.length > 0 && currentBlottersDirect.some(rep => {
                const respondentLower = (rep.respondent || '').trim().toLowerCase();
                if (respondentLower === residentNameLower) return rep.status !== 'Resolved';
                
                const words = residentNameLower.split(/\s+/).filter(w => w.length > 2);
                return words.length > 0 && words.every(word => new RegExp('\\b' + word + '\\b', 'i').test(respondentLower)) && rep.status !== 'Resolved';
            });

            // Resolve defaults based on legacy/new fields
            const isRenewalDefault = parsedFormData?.isRenewal !== undefined ? parsedFormData.isRenewal : true
            const isCompliantDefault = parsedFormData?.isCompliant !== undefined ? parsedFormData.isCompliant : !hasActiveBlotter
            const noObjectionDefault = parsedFormData?.noObjection !== undefined ? parsedFormData.noObjection : !hasActiveBlotter

            // Override defaults with custom configuration values if provided by admin in the modal (Application type is read directly from request data)
            const checkNewBusiness = customFields && customFields.checkNewBusiness !== undefined ? customFields.checkNewBusiness : (parsedFormData?.checkNewBusiness !== undefined ? parsedFormData.checkNewBusiness : !isRenewalDefault)
            const checkRenewal = customFields && customFields.checkRenewal !== undefined ? customFields.checkRenewal : (parsedFormData?.checkRenewal !== undefined ? parsedFormData.checkRenewal : isRenewalDefault)
            const checkCompliant = customFields && customFields.checkCompliant !== undefined ? customFields.checkCompliant : (parsedFormData?.checkCompliant !== undefined ? parsedFormData.checkCompliant : isCompliantDefault)
            const checkNonCompliant = customFields && customFields.checkNonCompliant !== undefined ? customFields.checkNonCompliant : (parsedFormData?.checkNonCompliant !== undefined ? parsedFormData.checkNonCompliant : !isCompliantDefault)
            const checkNoObjection = customFields && customFields.checkNoObjection !== undefined ? customFields.checkNoObjection : (parsedFormData?.checkNoObjection !== undefined ? parsedFormData.checkNoObjection : noObjectionDefault)
            const checkNonIssuance = customFields && customFields.checkNonIssuance !== undefined ? customFields.checkNonIssuance : (parsedFormData?.checkNonIssuance !== undefined ? parsedFormData.checkNonIssuance : !noObjectionDefault)
            const sequenceNumber = customFields && customFields.sequenceNumber !== undefined ? customFields.sequenceNumber : (parsedFormData?.sequenceNumber || req.id.slice(0, 4).toUpperCase())

            const finalResidentName = customFields ? customFields.residentName : (parsedFormData?.customResidentName || req.resident_name || 'Unknown Resident')
            const finalPurpose = customFields ? customFields.purpose : (parsedFormData?.customPurpose || req.purpose || 'General Requirement')

            setCertData({
                residentName: finalResidentName,
                documentType: req.document_type,
                purpose: finalPurpose,
                dateIssued: issueDateObj.toISOString(),
                expirationDate: expDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                formData: {
                    address: customFields ? customFields.formData.address : (parsedFormData?.address || residentProfile?.address || ''),
                    birthdate: customFields ? customFields.formData.birthdate : (parsedFormData?.birthdate || parsedFormData?.birthDate || residentProfile?.birthdate || 'NO_DATA'),
                    age: customFields ? customFields.formData.age : (parsedFormData?.age || residentAge),
                    civilStatus: customFields ? customFields.formData.civilStatus : (parsedFormData?.civilStatus || residentProfile?.relationship_status || ''),
                    gender: customFields ? customFields.formData.gender : (parsedFormData?.gender || residentProfile?.gender || ''),
                    // Business fields
                    businessName: customFields ? customFields.formData.businessName : (parsedFormData?.businessName || ''),
                    businessLocation: customFields ? customFields.formData.businessLocation : (parsedFormData?.businessLocation || ''),
                    operatorName: customFields ? customFields.formData.operatorName : (parsedFormData?.operatorName || req.resident_name || ''),
                    operatorAddress: customFields ? customFields.formData.operatorAddress : (parsedFormData?.operatorAddress || residentProfile?.address || ''),
                    checkNewBusiness,
                    checkRenewal,
                    checkCompliant,
                    checkNonCompliant,
                    checkNoObjection,
                    checkNonIssuance,
                    sequenceNumber,
                    // Lot fields
                    lotArea: customFields ? customFields.formData.lotArea : (parsedFormData?.lotArea || ''),
                    taxDecNo: customFields ? customFields.formData.taxDecNo : (parsedFormData?.taxDecNo || ''),
                    propertyLocation: customFields ? customFields.formData.propertyLocation : (parsedFormData?.propertyLocation || ''),
                    occupiedSince: customFields ? customFields.formData.occupiedSince : (parsedFormData?.occupiedSince || ''),
                    docNo: customFields ? customFields.formData.docNo : (parsedFormData?.docNo || ''),
                    pageNo: customFields ? customFields.formData.pageNo : (parsedFormData?.pageNo || ''),
                    bookNo: customFields ? customFields.formData.bookNo : (parsedFormData?.bookNo || ''),
                    seriesOf: customFields ? customFields.formData.seriesOf : (parsedFormData?.seriesOf || ''),
                    notarizedBy: customFields ? customFields.formData.notarizedBy : (parsedFormData?.notarizedBy || ''),
                    notarizedOn: customFields ? customFields.formData.notarizedOn : (parsedFormData?.notarizedOn || ''),
                    orNo: customFields ? customFields.formData.orNo : (parsedFormData?.orNo || ''),
                    amount: customFields ? customFields.formData.amount : (parsedFormData?.amount || ''),
                    orIssuedOn: customFields ? customFields.formData.orIssuedOn : (parsedFormData?.orIssuedOn || ''),
                    proofType: customFields ? customFields.formData.proofType : (parsedFormData?.proofType || 'Deed of Sale'),
                    boundedNorth: customFields ? customFields.formData.boundedNorth : (parsedFormData?.boundedNorth || 'OCCUPIED LOT'),
                    boundedSouth: customFields ? customFields.formData.boundedSouth : (parsedFormData?.boundedSouth || 'OCCUPIED LOT'),
                    boundedEast: customFields ? customFields.formData.boundedEast : (parsedFormData?.boundedEast || 'OCCUPIED LOT'),
                    boundedWest: customFields ? customFields.formData.boundedWest : (parsedFormData?.boundedWest || 'OCCUPIED LOT'),
                    // First time job seeker
                    yearsOfResidency: customFields ? customFields.formData.yearsOfResidency : (parsedFormData?.yearsOfResidency || ''),
                    idType: customFields ? customFields.formData.idType : (parsedFormData?.idType || ''),
                    idNumber: customFields ? customFields.formData.idNumber : (parsedFormData?.idNumber || ''),
                    // Residency
                    residentSince: customFields ? customFields.formData.residentSince : (parsedFormData?.residentSince || ''),
                }
            })

            // Wait for React to render the hidden component with new data
            await new Promise(resolve => setTimeout(resolve, 500))

            if (!certRef.current) {
                throw new Error("Certificate template not found")
            }

            // Capture the template
            const canvas = await html2canvas(certRef.current, {
                scale: 4, // Higher resolution for crisp text and logos
                useCORS: true,
                logging: false
            })

            // Setup PDF
            const imgData = canvas.toDataURL('image/jpeg', 0.8) // Use JPEG with 80% quality to reduce file size
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'in',
                format: [8.5, 13] // Long / Folio size
            })

            // Add image to PDF exactly fitting the bounds
            pdf.addImage(imgData, 'JPEG', 0, 0, 8.5, 13)

            // Trigger download
            const fileName = `${req.document_type.replace(/\s+/g, '_')}_${req.resident_name?.replace(/\s+/g, '_')}.pdf`
            pdf.save(fileName)

            // Persist settings in the database for auto-sequence increment and future prints
            const updatedFormData = {
                ...parsedFormData,
                ...(customFields ? customFields.formData : {}),
                checkCompliant,
                checkNonCompliant,
                checkNoObjection,
                checkNonIssuance,
                checkNewBusiness,
                checkRenewal,
                sequenceNumber,
                customResidentName: customFields ? customFields.residentName : (parsedFormData?.customResidentName || ''),
                customPurpose: customFields ? customFields.purpose : (parsedFormData?.customPurpose || '')
            }
            try {
                await supabase
                    .from('service_requests')
                    .update({ 
                        form_data: updatedFormData,
                        purpose: customFields ? customFields.purpose : req.purpose
                    })
                    .eq('id', req.id)
                setRequests(prev => prev.map(r => r.id === req.id ? { 
                    ...r, 
                    form_data: updatedFormData,
                    purpose: customFields ? customFields.purpose : r.purpose
                } : r))
            } catch (e) {
                console.error('Failed to auto-save generated settings:', e)
            }

            showToast('PDF Generated successfully!', 'success')

            if (profile?.id) {
                await logAdminAction('GENERATE_PDF', `Generated PDF for request ${req.id.slice(0, 8)}`, profile.id);
            }
        } catch (error: any) {
            console.error("PDF Generation error:", error)
            showToast("Failed to generate PDF. Check console.", "error")
        } finally {
            setGeneratingPdfId(null)
            setCertData(null) // clear template memory
        }
    }

    const deleteAnnouncement = (id: string) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Announcement',
            message: 'Are you sure you want to delete this announcement? This action cannot be undone.',
            confirmLabel: 'Delete',
            variant: 'danger',
            onConfirm: async () => {
                closeConfirmDialog()
                try {
                    setAnnouncements(prev => prev.filter(a => a.id !== id))
                    await deleteAnnouncementAction(id)
                    showToast('Announcement deleted', 'success')
                    if (profile?.id) {
                        await logAdminAction('DELETE_ANNOUNCEMENT', `Deleted announcement ID ${id.slice(0, 8)}`, profile.id)
                    }
                } catch (error) {
                    fetchDataForTab(activeTab, true)
                    console.error('Error deleting announcement:', error)
                    showToast('Failed to delete announcement', 'error')
                }
            }
        })
    }

    const verifyResident = (residentId: string) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Verify Resident',
            message: 'Are you sure you want to VERIFY this resident? This will grant them full resident status and generate their Resident ID.',
            confirmLabel: 'Verify',
            variant: 'info',
            onConfirm: async () => {
                closeConfirmDialog()
                try {
                    const updatedProfile = await verifyResidentAction(residentId)
                    setResidents(prev => prev.map(r => r.id === residentId ? { ...r, ...updatedProfile } : r))
                    showToast('Resident verified successfully! Resident ID has been generated.', 'success')
                    if (profile?.id) await logAdminAction('VERIFY_RESIDENT', `Verified resident ID ${residentId.slice(0, 8)}`, profile.id)
                } catch (error: any) {
                    fetchDataForTab(activeTab, true)
                    console.error('Error verifying resident:', error)
                    showToast('Failed to verify resident: ' + (error.message || error), 'error')
                }
            }
        })
    }

    const rejectResident = (residentId: string) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Reject Registration',
            message: 'Are you sure you want to REJECT this resident registration? They will need to re-register or contact the barangay office.',
            confirmLabel: 'Reject',
            variant: 'danger',
            onConfirm: async () => {
                closeConfirmDialog()
                try {
                    const updatedProfile = await rejectResidentAction(residentId)
                    setResidents(prev => prev.map(r => r.id === residentId ? { ...r, ...updatedProfile } : r))
                    showToast('Resident registration has been rejected.', 'error')
                    if (profile?.id) await logAdminAction('REJECT_RESIDENT', `Rejected resident registration ID ${residentId.slice(0, 8)}`, profile.id)
                } catch (error: any) {
                    fetchDataForTab(activeTab, true)
                    console.error('Error rejecting resident:', error)
                    showToast('Failed to reject resident: ' + (error.message || error), 'error')
                }
            }
        })
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _rejectResidentLegacy = async (residentId: string) => {
        const confirmed = true
        if (!confirmed) return
        try {
            // Optimistic update
            setResidents(prev => prev.map(r => r.id === residentId ? { ...r, is_verified: false, is_rejected: true } : r))

            const { error } = await supabase
                .from('profiles')
                .update({
                    is_verified: false,
                    is_rejected: true
                })
                .eq('id', residentId)

            if (error) {
                fetchDataForTab(activeTab, true) // Revert
                throw error
            }

            showToast('Resident registration has been rejected.', 'error')
            if (profile?.id) {
                await logAdminAction('REJECT_RESIDENT', `Rejected resident registration ID ${residentId.slice(0, 8)}`, profile.id);
            }
        } catch (error: any) {
            console.error('Error rejecting resident:', error)
            showToast('Failed to reject resident', 'error')
        }
    }

    const viewAttachment = async (path: string) => {
        if (!path) return
        try {
            const { data, error } = await supabase.storage
                .from('resident-requirements')
                .createSignedUrl(path, 3600, { download: false })

            if (error) {
                console.error('Supabase Signed URL Error:', error)
                throw new Error(`Storage access error: ${error.message}. Please check the Storage RLS policies in Supabase.`)
            }

            if (data?.signedUrl) {
                // Determine if it's a PDF or image
                const isPdf = path.toLowerCase().endsWith('.pdf')
                const fileName = path.split('/').pop() || 'Attachment'
                if (isPdf) {
                    // For PDFs open in new tab since iframes block them sometimes
                    window.open(data.signedUrl, '_blank')
                } else {
                    // For images show in-app preview modal
                    setFilePreview({ url: data.signedUrl, name: fileName })
                }
            } else {
                throw new Error('No signed URL returned from storage.')
            }
        } catch (error: any) {
            console.error('Error opening attachment:', error)
            showToast(`Failed to open file: ${error.message}`, 'error')
        }
    }


    const exportToPDF = async (data: Profile[], filename: string) => {
        if (data.length === 0) return

        const jsPDF = (await import('jspdf')).default;
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDF()

        // Header Title
        doc.setFontSize(18)
        doc.setTextColor(40, 40, 40)
        doc.text('Barangay Gordon Heights', 14, 22)

        doc.setFontSize(12)
        doc.setTextColor(100, 100, 100)
        doc.text('Resident Directory Report', 14, 30)
        doc.setFontSize(10)
        doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, 36)

        // Map data to tidy rows
        const tableColumn = ["Name", "Gender", "Email", "Phone", "Status", "Registered"]
        const tableRows: any[] = []

        data.forEach(res => {
            const resData = [
                res.full_name || 'N/A',
                res.gender || 'N/A',
                res.email || 'N/A',
                res.phone || 'N/A',
                res.is_verified ? 'Verified' : 'Pending',
                new Date(res.created_at).toLocaleDateString()
            ]
            tableRows.push(resData)
        })

        // Draw Table
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [63, 81, 181], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { top: 40 }
        })

        doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`)
        showToast('PDF Export generated successfully', 'success')
    }

    const exportRequestsToPDF = async (data: ServiceRequest[], filename: string) => {
        if (data.length === 0) return

        const jsPDF = (await import('jspdf')).default;
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDF()

        // Header Title
        doc.setFontSize(18)
        doc.setTextColor(40, 40, 40)
        doc.text('Barangay Gordon Heights', 14, 22)

        doc.setFontSize(12)
        doc.setTextColor(100, 100, 100)
        doc.text('Document Requests Report', 14, 30)
        doc.setFontSize(10)
        doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, 36)

        // Map data to tidy rows
        const tableColumn = ["Ref ID", "Applicant Name", "Document Type", "Purpose", "Status", "Date Applied"]
        const tableRows: any[] = []

        data.forEach(req => {
            const reqData = [
                req.id?.split('-')[0].toUpperCase() || 'N/A',
                req.resident_name || 'N/A',
                cleanDocType(req.document_type) || 'N/A',
                req.purpose || 'N/A',
                req.status.charAt(0).toUpperCase() + req.status.slice(1),
                new Date(req.created_at).toLocaleDateString()
            ]
            tableRows.push(reqData)
        })

        // Draw Table
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [63, 81, 181], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { top: 40 }
        })

        doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`)
        showToast('PDF Export generated successfully', 'success')
    }

    const exportAuditToPDF = async (data: AuditLog[], filename: string) => {
        if (data.length === 0) return

        const jsPDF = (await import('jspdf')).default;
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDF()

        // Header Title
        doc.setFontSize(18)
        doc.setTextColor(40, 40, 40)
        doc.text('Barangay Gordon Heights', 14, 22)

        doc.setFontSize(12)
        doc.setTextColor(100, 100, 100)
        doc.text('System Audit Trail', 14, 30)
        doc.setFontSize(10)
        doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, 36)

        // Map data to tidy rows
        const tableColumn = ["Date & Time", "Admin", "Action", "Description"]
        const tableRows: any[] = []

        data.forEach(log => {
            const logData = [
                new Date(log.created_at).toLocaleString(),
                log.admin_name || 'Admin User',
                log.action,
                log.description
            ]
            tableRows.push(logData)
        })

        // Draw Table
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [63, 81, 181], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { top: 40 }
        })

        doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`)
        showToast('PDF Export generated successfully', 'success')
    }

    const handlePrintAllQR = async () => {
        const jsPDF = (await import('jspdf')).default;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const pageW = 210
        const colW = pageW / 2
        const qrSize = 45
        const startY = 30
        const origin = typeof window !== 'undefined' ? window.location.origin : ''

        doc.setFontSize(18)
        doc.setTextColor(30, 58, 138)
        doc.text('Barangay Gordon Heights', pageW / 2, 15, { align: 'center' })
        doc.setFontSize(11)
        doc.setTextColor(100)
        doc.text('Scan any QR code below to request a document online', pageW / 2, 22, { align: 'center' })

        DOCUMENTS.forEach((d, i) => {
            const col = i % 2
            const row = Math.floor(i / 2)
            const x = col * colW + (colW - qrSize) / 2
            const y = startY + row * 85

            doc.setDrawColor(200)
            doc.setFillColor(250, 250, 252)
            doc.roundedRect(col * colW + 8, y - 5, colW - 16, 78, 4, 4, 'FD')

            const url = `${origin}/request/${d.slug}`
            const canvas = document.querySelector(`canvas[data-qr-slug="${d.slug}"]`) as HTMLCanvasElement

            if (canvas) {
                try {
                    const imgData = canvas.toDataURL('image/png')
                    doc.addImage(imgData, 'PNG', x, y, qrSize, qrSize)
                } catch (e) {
                    console.error("Failed to add image to PDF", e)
                }
            } else {
                // Fallback placeholder if canvas not found
                doc.setDrawColor(180)
                doc.rect(x, y, qrSize, qrSize)
                doc.setFontSize(7)
                doc.setTextColor(120)
                doc.text('[ Scan QR on website ]', x + qrSize / 2, y + qrSize / 2, { align: 'center' })
            }

            doc.setFontSize(11)
            doc.setTextColor(30, 30, 30)
            doc.text(d.name, col * colW + colW / 2, y + qrSize + 8, { align: 'center' })

            doc.setFontSize(8)
            doc.setTextColor(80)
            doc.text(`Fee: ${d.fee}  |  Req: ${d.reqs}`, col * colW + colW / 2, y + qrSize + 14, { align: 'center' })

            doc.setFontSize(6)
            doc.setTextColor(22, 163, 74)
            doc.text(url, col * colW + colW / 2, y + qrSize + 19, { align: 'center' })
        })

        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(`Generated: ${new Date().toLocaleDateString()}  |  E-Barangay Gordon Heights`, pageW / 2, 290, { align: 'center' })

        doc.save('E-Barangay_Document_QR_Codes.pdf')
    }

    // Blotter Operations
    const saveBlotterReport = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!blotterModal.report) return
        setSavingBlotter(true)

        try {
            const isEditing = !!blotterModal.report.id
            const payload = {
                complainant: blotterModal.report.complainant,
                respondent: blotterModal.report.respondent,
                incident_details: blotterModal.report.incident_details,
                incident_date: blotterModal.report.incident_date,
                location: blotterModal.report.location,
                status: blotterModal.report.status || 'Pending'
            }

            if (isEditing) {
                const { error } = await supabase
                    .from('blotter_reports')
                    .update(payload)
                    .eq('id', blotterModal.report.id)

                if (error) throw error
                showToast('Blotter report updated', 'success')
                if (profile?.id) {
                    await logAdminAction('UPDATE_BLOTTER', `Updated blotter report ID: ${blotterModal.report.id?.slice(0, 8)}`, profile.id)
                }
            } else {
                const { error } = await supabase
                    .from('blotter_reports')
                    .insert({ ...payload, created_by: profile?.id })

                if (error) throw error
                showToast('Blotter report created', 'success')
                if (profile?.id) {
                    await logAdminAction('CREATE_BLOTTER', `Created new blotter report against: ${payload.respondent}`, profile.id)
                }
            }

            fetchDataForTab('blotter')
            setBlotterModal({ isOpen: false, report: null })
        } catch (error: any) {
            console.error('Error saving blotter report:', error)
            showToast(`Failed to save blotter report: ${error.message || 'Unknown error'}`, 'error')
        } finally {
            setSavingBlotter(false)
        }
    }

    const deleteBlotterReport = (id: string) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Archive Blotter Report',
            message: 'Are you sure you want to archive this blotter report? It will be removed from active lists but kept in historical records.',
            confirmLabel: 'Archive',
            variant: 'warning',
            onConfirm: async () => {
                closeConfirmDialog()
                try {
                    const { error } = await supabase.from('blotter_reports').update({ is_archived: true }).eq('id', id)
                    if (error) throw error
                    showToast('Blotter report archived successfully', 'success')
                    if (profile?.id) await logAdminAction('ARCHIVE_BLOTTER', `Archived blotter report ID: ${id.slice(0, 8)}`, profile.id)
                    fetchDataForTab('blotter')
                } catch (error: any) {
                    console.error('Error archiving blotter report:', error)
                    showToast('Failed to archive blotter report', 'error')
                }
            }
        })
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _deleteBlotterLegacy = async (id: string) => {
        if (!true) return
        try {
            const { error } = await supabase
                .from('blotter_reports')
                .update({ is_archived: true })
                .eq('id', id)

            if (error) throw error
            showToast('Blotter report archived successfully', 'success')
            if (profile?.id) {
                await logAdminAction('ARCHIVE_BLOTTER', `Archived blotter report ID: ${id.slice(0, 8)}`, profile.id)
            }
            fetchDataForTab('blotter')
        } catch (error: any) {
            console.error('Error archiving blotter report:', error)
            showToast('Failed to archive blotter report', 'error')
        }
    }

    const exportBlotterToPDF = async (data: BlotterReport[], filename: string) => {
        if (data.length === 0) return

        const jsPDF = (await import('jspdf')).default;
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDF()

        // Header Title
        doc.setFontSize(18)
        doc.setTextColor(40, 40, 40)
        doc.text('Barangay Gordon Heights', 14, 22)

        doc.setFontSize(12)
        doc.setTextColor(100, 100, 100)
        doc.text('Blotter Reports Record', 14, 30)
        doc.setFontSize(10)
        doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, 36)

        // Map data to tidy rows
        const tableColumn = ["ID", "Complainant", "Respondent", "Location", "Incident Date", "Status"]
        const tableRows: any[] = []

        data.forEach(rep => {
            const repData = [
                rep.id.slice(0, 6).toUpperCase(),
                rep.complainant,
                rep.respondent,
                rep.location,
                new Date(rep.incident_date).toLocaleString(),
                rep.status
            ]
            tableRows.push(repData)
        })

        // Draw Table
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [63, 81, 181], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { top: 40 }
        })

        doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`)
        showToast('PDF Export generated successfully', 'success')
    }


    // Complaint Operations
    const updateComplaintStatus = async (complaintId: string, newStatus: ComplaintStatus, notes?: string) => {
        setSavingComplaint(true)
        try {
            const updatePayload: Record<string, any> = { status: newStatus }
            if (notes) updatePayload.admin_notes = notes
            const { error } = await supabase.from('complaints').update(updatePayload).eq('id', complaintId)
            if (error) throw error
            showToast(`Complaint status updated to ${newStatus}`, 'success')
            if (profile?.id) {
                await logAdminAction('UPDATE_COMPLAINT', `Updated complaint ${complaintId.slice(0, 8)} to ${newStatus}`, profile.id)
            }
            fetchDataForTab('blotter')
            setComplaintModal({ isOpen: false, complaint: null })
            setComplaintNotes('')
        } catch (error: any) {
            console.error('Error updating complaint:', error)
            showToast(error.message || 'Failed to update complaint', 'error')
        } finally {
            setSavingComplaint(false)
        }
    }

    const deleteComplaint = (id: string) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Archive Complaint',
            message: 'Are you sure you want to archive this complaint? It will be removed from active lists but kept in historical records.',
            confirmLabel: 'Archive',
            variant: 'warning',
            onConfirm: async () => {
                closeConfirmDialog()
                try {
                    const { error } = await supabase.from('complaints').update({ is_archived: true }).eq('id', id)
                    if (error) throw error
                    showToast('Complaint archived successfully', 'success')
                    if (profile?.id) await logAdminAction('ARCHIVE_COMPLAINT', `Archived complaint ID: ${id.slice(0, 8)}`, profile.id)
                    fetchDataForTab('blotter')
                } catch (error: any) {
                    console.error('Error archiving complaint:', error)
                    showToast('Failed to archive complaint', 'error')
                }
            }
        })
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _deleteComplaintLegacy = async (id: string) => {
        if (!true) return
        try {
            const { error } = await supabase.from('complaints').update({ is_archived: true }).eq('id', id)
            if (error) throw error
            showToast('Complaint archived successfully', 'success')
            if (profile?.id) {
                await logAdminAction('ARCHIVE_COMPLAINT', `Archived complaint ID: ${id.slice(0, 8)}`, profile.id)
            }
            fetchDataForTab('blotter')
        } catch (error: any) {
            console.error('Error archiving complaint:', error)
            showToast('Failed to archive complaint', 'error')
        }
    }

    const restoreBlotterReport = async (id: string) => {
        try {
            const { error } = await supabase.from('blotter_reports').update({ is_archived: false }).eq('id', id)
            if (error) throw error
            showToast('Blotter report restored successfully', 'success')
            if (profile?.id) await logAdminAction('RESTORE_BLOTTER', `Restored blotter report ID: ${id.slice(0, 8)}`, profile.id)
            fetchDataForTab('blotter')
        } catch (error: any) {
            console.error('Error restoring blotter report:', error)
            showToast('Failed to restore blotter report', 'error')
        }
    }

    const restoreComplaint = async (id: string) => {
        try {
            const { error } = await supabase.from('complaints').update({ is_archived: false }).eq('id', id)
            if (error) throw error
            showToast('Complaint restored successfully', 'success')
            if (profile?.id) await logAdminAction('RESTORE_COMPLAINT', `Restored complaint ID: ${id.slice(0, 8)}`, profile.id)
            fetchDataForTab('blotter')
        } catch (error: any) {
            console.error('Error restoring complaint:', error)
            showToast('Failed to restore complaint', 'error')
        }
    }

    const escalateToBlotter = async (complaint: Complaint) => {
        try {
            const { error } = await supabase.from('blotter_reports').insert({
                complainant: complaint.resident_name || 'Unknown',
                respondent: complaint.respondent_name,
                incident_details: `[Escalated from Complaint #${complaint.id.slice(0, 6).toUpperCase()}] Type: ${complaint.complaint_type} | Subject: ${complaint.subject} | ${complaint.description}`,
                incident_date: complaint.created_at,
                location: complaint.location,
                status: 'Pending',
                created_by: profile?.id
            })
            if (error) throw error
            await supabase.from('complaints').update({ status: 'Under Investigation', admin_notes: (complaint.admin_notes ? complaint.admin_notes + ' | ' : '') + '[Escalated to Blotter Report]' }).eq('id', complaint.id)
            showToast('Complaint escalated to Blotter Report', 'success')
            if (profile?.id) {
                await logAdminAction('ESCALATE_COMPLAINT', `Escalated complaint ${complaint.id.slice(0, 8)} to blotter report`, profile.id)
            }
            fetchDataForTab('blotter')
        } catch (error: any) {
            console.error('Error escalating complaint:', error)
            showToast('Failed to escalate complaint', 'error')
        }
    }

    const exportComplaintsToPDF = async (data: Complaint[], filename: string) => {
        if (data.length === 0) return
        const jsPDF = (await import('jspdf')).default;
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDF()
        doc.setFontSize(18)
        doc.setTextColor(40, 40, 40)
        doc.text('Barangay Gordon Heights', 14, 22)
        doc.setFontSize(12)
        doc.setTextColor(100, 100, 100)
        doc.text('Resident Complaints Report', 14, 30)
        doc.setFontSize(10)
        doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, 36)
        const tableColumn = ['ID', 'Resident', 'Type', 'Subject', 'Respondent', 'Location', 'Status', 'Date Filed']
        const tableRows: any[] = []
        data.forEach(c => {
            tableRows.push([c.id.slice(0, 6).toUpperCase(), c.resident_name || 'N/A', c.complaint_type, c.subject, c.respondent_name, c.location, c.status, new Date(c.created_at).toLocaleDateString()])
        })
        autoTable(doc, {
            head: [tableColumn], body: tableRows, startY: 45, theme: 'grid',
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [63, 81, 181], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 247, 250] }, margin: { top: 40 }
        })
        doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`)
        showToast('Complaints PDF exported successfully', 'success')
    }

    const verifyQrCode = async (scannedValue: string) => {
        if (!scannedValue) return;
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
                const isStatusValid = docData.status === 'ready' || docData.status === 'completed'
                const isExpired = isStatusValid && docData.expires_at && new Date(docData.expires_at) < new Date()
                const isValid = isStatusValid && !isExpired
                const holderName = (docData.profiles as any)?.full_name || 'Unknown'

                if (!isValid) {
                    setScanResult({
                        valid: false,
                        message: isExpired
                            ? `Document has expired (${new Date(docData.expires_at).toLocaleDateString()}).`
                            : `Document is still in ${docData.status} status.`,
                        holder: holderName,
                        docType: cleanDocType(docData.document_type)
                    })
                } else {
                    setScanResult({
                        valid: true,
                        isResident: false,
                        docType: cleanDocType(docData.document_type),
                        holder: holderName,
                        date: docData.updated_at
                    })

                    const log = { name: holderName, doc: cleanDocType(docData.document_type), time: new Date().toLocaleTimeString(), result: 'Valid Doc' }
                    setRecentVerifications(prev => [log, ...prev].slice(0, 5))
                }

                // Save to verification logs
                await supabase.from('qr_verifications').insert({
                    document_ref: scannedValue,
                    document_type: cleanDocType(docData.document_type),
                    holder_name: holderName,
                    is_valid: isValid,
                    verified_by: profile?.id
                })

                return
            }

            // 2. Try to find if it's a Resident ID
            let resData = null
            const { data: byId } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', scannedValue)
                .maybeSingle()
            resData = byId

            if (!resData) {
                const { data: byQrId } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('resident_qr_id', scannedValue)
                    .maybeSingle()
                resData = byQrId
            }

            if (resData) {
                const isVerified = resData.is_verified === true
                setScanResult({
                    valid: isVerified,
                    isResident: true,
                    holder: resData.full_name,
                    docType: 'Resident ID Card',
                    address: resData.address,
                    phone: resData.phone,
                    date: resData.created_at
                })

                const log = {
                    name: resData.full_name,
                    doc: 'Resident ID',
                    time: new Date().toLocaleTimeString(),
                    result: isVerified ? 'Verified Resident' : 'Unverified Account'
                }
                setRecentVerifications(prev => [log, ...prev].slice(0, 5))

                // Save to verification logs
                await supabase.from('qr_verifications').insert({
                    document_ref: scannedValue,
                    document_type: 'Resident ID Card',
                    holder_name: resData.full_name,
                    is_valid: isVerified,
                    verified_by: profile?.id
                })

                return
            }

            // 3. Fallback: If no match found
            setScanResult({
                valid: false,
                message: 'No record found. Please ensure this is an official E-Barangay QR Code.'
            })

        } catch (e: any) {
            console.error('Scan error:', e)
            setScanResult({ valid: false, message: 'Process error: Could not verify QR code.' })
        } finally {
            // Keep verifying state for 3 seconds to prevent immediate re-scan
            setTimeout(() => setVerifying(false), 3000)
        }
    }

    const handleScan = async (results: any[]) => {
        if (!results || results.length === 0) return;
        const scannedValue = results[0].rawValue?.trim();
        if (!scannedValue || verifying) return;
        await verifyQrCode(scannedValue);
    }

    const filteredRequests = requests.filter(r => {
        const reqName = r.resident_name || ''
        const matchSearch =
            reqName.toLowerCase().includes(requestSearch.toLowerCase()) ||
            cleanDocType(r.document_type).toLowerCase().includes(requestSearch.toLowerCase()) ||
            (r.qr_code_ref || '').toLowerCase().includes(requestSearch.toLowerCase()) ||
            r.id.toLowerCase().includes(requestSearch.toLowerCase())
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

    const filteredComplaints = complaints.filter(c => {
        const matchSearch = c.subject.toLowerCase().includes(complaintSearch.toLowerCase()) ||
            c.respondent_name.toLowerCase().includes(complaintSearch.toLowerCase()) ||
            (c.resident_name || '').toLowerCase().includes(complaintSearch.toLowerCase())
        const matchStatus = complaintStatusFilter === 'all' || c.status === complaintStatusFilter
        return matchSearch && matchStatus
    })

    const filteredBlotterReports = blotterReports.filter(rep => {
        const matchSearch = rep.complainant.toLowerCase().includes(blotterSearch.toLowerCase()) ||
            rep.respondent.toLowerCase().includes(blotterSearch.toLowerCase()) ||
            (rep.location || '').toLowerCase().includes(blotterSearch.toLowerCase())
        const matchStatus = blotterStatusFilter === 'all' || rep.status === blotterStatusFilter
        return matchSearch && matchStatus
    })

    const navItems = [
        { id: 'overview', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
        { id: 'requests', icon: <FileText size={20} />, label: 'Document Requests' },
        { id: 'residents', icon: <Users size={20} />, label: 'Residents' },
        { id: 'announcements', icon: <Megaphone size={20} />, label: 'Announcements' },
        { id: 'verify', icon: <QrCode size={20} />, label: 'QR Verification' },
        { id: 'analytics', icon: <BarChart3 size={20} />, label: 'Analytics' },
        { id: 'blotter', icon: <ShieldAlert size={20} />, label: 'Blotter Reports' },
        { id: 'audit', icon: <History size={20} />, label: 'Audit Trail' },
    ]

    return (
        <div className={styles.adminContainer}>
            {/* Hidden off-screen certificate template for html2canvas PDF generation */}
            <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none', zIndex: -1 }}>
                <CertificateTemplate ref={certRef} data={certData} />
            </div>
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
                        <div className={styles.brandIcon}>
                            <Image src="/logo.png" alt="Barangay Logo" width={32} height={32} />
                        </div>
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

                    <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ background: 'var(--primary-100)', color: 'var(--primary-700)', padding: '0.5rem', borderRadius: '50%' }}>
                                <UserCircle size={20} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{profile?.full_name || 'Admin'}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>System Administrator</span>
                            </div>
                        </div>
                        <button className="btn btn-outline" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '0.6rem' }} onClick={signOut}>
                            <LogOut size={16} /> Sign Out
                        </button>
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
                                        <h1>Admin Dashboard</h1>
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
                                                <div className={styles.statIcon}><Clock size={24} /></div>
                                                <div className={styles.statValue}>{pendingCount}</div>
                                                <div className={styles.statLabel}>Pending</div>
                                                <div className={styles.statTrend}>requires immediate action</div>
                                            </div>
                                            <div className={`glass-card ${styles.statCard} ${styles.statProcessing}`}>
                                                <div className={styles.statIcon}><Activity size={24} /></div>
                                                <div className={styles.statValue}>{processingCount}</div>
                                                <div className={styles.statLabel}>Processing</div>
                                                <div className={styles.statTrend}>in queue</div>
                                            </div>
                                            <div className={`glass-card ${styles.statCard} ${styles.statCompleted}`}>
                                                <div className={styles.statIcon}><CheckCircle size={24} /></div>
                                                <div className={styles.statValue}>{completedCount}</div>
                                                <div className={styles.statLabel}>Completed</div>
                                                <div className={styles.statTrend}>{completionRate}% efficiency</div>
                                            </div>
                                            <div className={`glass-card ${styles.statCard} ${styles.statResidents}`}>
                                                <div className={styles.statIcon}><Users size={24} /></div>
                                                <div className={styles.statValue}>{stats.totalResidents}</div>
                                                <div className={styles.statLabel}>Residents</div>
                                                <div className={styles.statTrend}>Total registered</div>
                                            </div>
                                        </div>

                                        {/* Activity Chart & Quick Actions Row */}
                                        <div className={styles.dashboardTopRow}>
                                            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                                                <div className={styles.cardHeader} style={{ marginBottom: '1rem' }}>
                                                    <h2>Weekly Performance</h2>
                                                </div>
                                                <div style={{ flex: 1, minHeight: '320px', position: 'relative' }}>
                                                    <WeeklyPerformanceChart />
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Quick Actions</h3>
                                                <div className={styles.quickCard} onClick={() => setActiveTab('requests')} style={{ flex: 1 }}>
                                                    <div>
                                                        <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} /> Review Requests</strong>
                                                        <span>{pendingCount} awaiting action</span>
                                                    </div>
                                                    <span className={styles.quickArrow}><ArrowRight size={16} /></span>
                                                </div>
                                                <div className={styles.quickCard} onClick={() => setActiveTab('announcements')} style={{ flex: 1 }}>
                                                    <div>
                                                        <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Megaphone size={18} /> Post Announcement</strong>
                                                        <span>Notify {stats?.totalResidents || 0} residents</span>
                                                    </div>
                                                    <span className={styles.quickArrow}><ArrowRight size={16} /></span>
                                                </div>
                                                <div className={styles.quickCard} onClick={() => setActiveTab('residents')} style={{ flex: 1 }}>
                                                    <div>
                                                        <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={18} /> Manage Residents</strong>
                                                        <span>View registered accounts</span>
                                                    </div>
                                                    <span className={styles.quickArrow}><ArrowRight size={16} /></span>
                                                </div>
                                                <div className={styles.quickCard} onClick={handlePrintAllQR} style={{ flex: 1 }}>
                                                    <div>
                                                        <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Printer size={18} /> Print QR Code Sheet</strong>
                                                        <span>Generate PDF for Document Services</span>
                                                    </div>
                                                    <span className={styles.quickArrow}><Printer size={16} /></span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sectoral Demographics & Recent Requests Row */}
                                        <div className={styles.dashboardMiddleRow}>
                                            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                                                <div className={styles.cardHeader} style={{ marginBottom: '1rem' }}>
                                                    <h2>Sectoral Demographics</h2>
                                                </div>
                                                <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                    <SectoralChart profiles={demographicsData || []} />
                                                </div>
                                            </div>
                                            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                                                <div className={styles.cardHeader}>
                                                    <h2>Recent Requests</h2>
                                                    <button className={styles.viewAll} onClick={() => setActiveTab('requests')}>View All</button>
                                                </div>
                                                <div className={styles.activityList}>
                                                    {requests.slice(0, 5).map(req => (
                                                        <div className={styles.activityItem} key={req.id}>

                                                            <div className={styles.activityDetails}>
                                                                <strong>{cleanDocType(req.document_type)}</strong>
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
                                        </div>

                                        {/* Hidden QR Codes for PDF generation */}
                                        <div style={{ display: 'none' }}>
                                            {DOCUMENTS.map(doc => (
                                                <QRCodeCanvas
                                                    key={doc.slug}
                                                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/request/${doc.slug}`}
                                                    size={200}
                                                    data-qr-slug={doc.slug}
                                                />
                                            ))}
                                        </div>

                                        <div className={styles.overviewGrid}>
                                            {/* Announcements Summary */}
                                            <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
                                                <div className={styles.cardHeader}>
                                                    <h2>Announcements</h2>
                                                    <button className={styles.viewAll} onClick={() => setActiveTab('announcements')}>Manage</button>
                                                </div>
                                                <div className={styles.activityList}>
                                                    {announcements.slice(0, 5).map(ann => (
                                                        <div className={styles.activityItem} key={ann.id}>

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
                                    <button className="btn btn-primary" style={{ gap: '0.5rem' }} onClick={() => exportRequestsToPDF(requests, 'Document_Requests')}>
                                        Export Requests PDF
                                    </button>
                                </div>

                                <div className={styles.filterBar}>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: '300px' }}>
                                        <input
                                            type="text"
                                            placeholder="Search by name, doc type, or scan QR..."
                                            value={requestSearch}
                                            onChange={e => setRequestSearch(e.target.value)}
                                            className={styles.searchInput}
                                            style={{ width: '100%' }}
                                        />
                                        <button 
                                            className="btn btn-outline" 
                                            style={{ position: 'absolute', right: '0.25rem', padding: '0.4rem 0.6rem', border: 'none', background: 'transparent', color: 'var(--primary-600)' }}
                                            onClick={() => setIsSearchScannerOpen(true)}
                                            title="Search via QR Code"
                                        >
                                            <QrCode size={20} />
                                        </button>
                                    </div>
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

                                {/* Scanner Modal for Search */}
                                {isSearchScannerOpen && (
                                    <div className={styles.modalOverlay}>
                                        <div className={styles.modalContent} style={{ maxWidth: '400px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Scan QR Code</h2>
                                                <button className={styles.closeModalBtn} onClick={() => setIsSearchScannerOpen(false)}><X size={20} /></button>
                                            </div>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Scan a resident's document QR code to instantly find their request.</p>
                                            <div style={{ background: '#000', borderRadius: '8px', overflow: 'hidden', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                                {cameraError ? (
                                                    <div style={{ color: '#f87171', textAlign: 'center', padding: '1.5rem' }}>
                                                        <QrCode size={40} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
                                                        <p style={{ fontSize: '0.85rem' }}>{cameraError}</p>
                                                        <button className="btn btn-outline" style={{ marginTop: '1rem', color: 'white', borderColor: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }} onClick={() => setCameraError(null)}>Try Again</button>
                                                    </div>
                                                ) : (
                                                <Scanner
                                                    onScan={(results) => {
                                                        if (results && results.length > 0) {
                                                            const val = results[0].rawValue?.trim();
                                                            if (val) {
                                                                setRequestSearch(val);
                                                                setIsSearchScannerOpen(false);
                                                            }
                                                        }
                                                    }}
                                                    onError={(err: unknown) => {
                                                        const msg = err instanceof Error ? err.message : String(err)
                                                        setCameraError(msg.includes('device not found') || msg.includes('NotFound') ? 'No camera found. Please allow camera access or use a device with a camera.' : msg)
                                                    }}
                                                    components={{ zoom: false }}
                                                    styles={{ container: { width: '100%', maxWidth: '400px', margin: '0 auto' } }}
                                                 />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

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
                                                        <td>{cleanDocType(req.document_type)}</td>
                                                        <td>
                                                            {req.attachment_url ? (
                                                                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                                                    {req.attachment_url.split(',').map((path, idx) => (
                                                                        <button
                                                                            key={idx}
                                                                            className="btn btn-outline"
                                                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#16a34a' }}
                                                                            onClick={() => viewAttachment(path.trim())}
                                                                        >
                                                                            File {req.attachment_url!.includes(',') ? idx + 1 : ''}
                                                                        </button>
                                                                    ))}
                                                                </div>
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
                                                                <button
                                                                    className={req.status === 'ready' || req.status === 'completed' ? "btn btn-primary" : "btn btn-outline"}
                                                                    style={{
                                                                        padding: '0.35rem 0.75rem',
                                                                        fontSize: '0.8rem',
                                                                        ...(req.status === 'ready' || req.status === 'completed' ? {
                                                                            backgroundColor: '#10b981',
                                                                            borderColor: '#10b981',
                                                                            color: '#fff',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '0.25rem'
                                                                        } : {})
                                                                    }}
                                                                    onClick={() => handleGeneratePdf(req)}
                                                                    disabled={generatingPdfId === req.id}
                                                                >
                                                                    {generatingPdfId === req.id 
                                                                        ? 'Generating...' 
                                                                        : (req.status === 'ready' || req.status === 'completed' ? 'PDF' : 'Details')
                                                                    }
                                                                </button>
                                                                {(req.status === 'pending' || req.status === 'processing') && (
                                                                    <button className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setNoteModal({ id: req.id, status: 'rejected' })}>Reject</button>
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
                                    <button className="btn btn-primary" style={{ gap: '0.5rem' }} onClick={() => exportToPDF(residents, 'Resident_List')}>
                                        Export Residents PDF
                                    </button>
                                </div>

                                <div className={styles.filterBar}>
                                    <input
                                        type="text"
                                        placeholder="Search by name, email, or address..."
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
                                                        <tr key={res.id} onClick={() => setSelectedResident(res)} style={{ cursor: 'pointer' }} title="Click to view full profile">
                                                            <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{String(i + 1).padStart(3, '0')}</td>
                                                            <td>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                    <div className={styles.avatarCircle}>
                                                                        {res.profile_picture_url ? (
                                                                            <img
                                                                                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resident-profile-pictures/${res.profile_picture_url}`}
                                                                                alt={res.full_name}
                                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                                onError={(e) => {
                                                                                    const target = e.target as HTMLImageElement;
                                                                                    target.onerror = null;
                                                                                    target.style.display = 'none';
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            res.full_name.charAt(0)
                                                                        )}
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <strong>{res.full_name}</strong>
                                                                        <div style={{ marginTop: '0.4rem' }}>
                                                                            {res.is_verified ? (
                                                                                <div className={styles.verifiedBadge}>
                                                                                    VERIFIED
                                                                                </div>
                                                                            ) : res.is_rejected ? (
                                                                                <div style={{ display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                                                                                    REJECTED
                                                                                </div>
                                                                            ) : (
                                                                                <button
                                                                                    className={styles.verifyBtn}
                                                                                    onClick={(e) => { e.stopPropagation(); setSelectedResident(res); }}
                                                                                >
                                                                                    Review
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

                        {/* Request Detail Modal */}
                        {selectedRequest && (() => {
                            const req = selectedRequest;
                            let parsedFormData = req.form_data || {}
                            if (typeof parsedFormData === 'string') {
                                try {
                                    parsedFormData = JSON.parse(parsedFormData)
                                } catch (e) {}
                            }


                            const viewAttachment = async (path: string) => {
                                try {
                                    const { data, error } = await supabase.storage
                                        .from('resident-requirements')
                                        .createSignedUrl(path.trim(), 3600);
                                    if (error) throw error;
                                    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                                } catch (err: any) {
                                    showToast(`Could not open attachment: ${err.message || 'Unknown error'}`, 'error');
                                }
                            }

                            return (
                                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: '1rem' }} onClick={() => setSelectedRequest(null)}>
                                    <div className="glass-card" style={{ maxWidth: '640px', width: '100%', padding: '2.5rem', background: 'var(--bg-secondary, #1a1a2e)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))', paddingBottom: '1rem' }}>
                                            <div>
                                                <h2 style={{ margin: 0 }}>Request Details</h2>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {req.id.toUpperCase()}</span>
                                            </div>
                                            <button style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setSelectedRequest(null)}>X</button>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div>
                                                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Resident Name</span>
                                                    <strong>{req.resident_name}</strong>
                                                </div>
                                                <div>
                                                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Document Type</span>
                                                    <strong>{cleanDocType(req.document_type)}</strong>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div>
                                                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Date Filed</span>
                                                    <strong>{new Date(req.created_at).toLocaleString()}</strong>
                                                </div>
                                                <div>
                                                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current Status</span>
                                                    <span className={statusBadge(req.status)} style={{ display: 'inline-block', marginTop: '0.2rem' }}>
                                                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div>
                                                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Purpose</span>
                                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{req.purpose}</p>
                                            </div>

                                            <div>
                                                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Requirements Attachment</span>
                                                {req.attachment_url ? (
                                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                        {req.attachment_url.split(',').map((path, idx) => (
                                                            <button
                                                                key={idx}
                                                                className="btn btn-outline"
                                                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}
                                                                onClick={() => viewAttachment(path.trim())}
                                                            >
                                                                View Attachment File {req.attachment_url!.includes(',') ? idx + 1 : ''}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No requirement files uploaded.</span>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))', paddingTop: '1.25rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                            {req.status === 'pending' && (
                                                <button className="btn btn-primary" onClick={() => { updateStatus(req.id, 'processing'); setSelectedRequest(null); }}>Process Request</button>
                                            )}
                                            {req.status === 'processing' && (
                                                <button className="btn btn-primary" onClick={() => { updateStatus(req.id, 'ready'); setSelectedRequest(null); }}>Mark as Ready</button>
                                            )}
                                            {req.status === 'ready' && (
                                                <button className="btn btn-secondary" onClick={() => { updateStatus(req.id, 'completed'); setSelectedRequest(null); }}>Complete Request</button>
                                            )}
                                            {(req.status === 'ready' || req.status === 'completed') && (
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                                                    onClick={() => { handleGeneratePdf(req); setSelectedRequest(null); }}
                                                    disabled={generatingPdfId === req.id}
                                                >
                                                    {generatingPdfId === req.id ? 'Generating...' : 'Generate PDF'}
                                                </button>
                                            )}
                                            {(req.status === 'pending' || req.status === 'processing') && (
                                                <button className="btn btn-outline" onClick={() => { setNoteModal({ id: req.id, status: 'rejected' }); setSelectedRequest(null); }}>Reject Request</button>
                                            )}
                                            <button className="btn btn-outline" style={{ borderColor: 'var(--border-color)' }} onClick={() => setSelectedRequest(null)}>Close</button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}

                        {/* Resident Detail Modal */}
                        {selectedResident && (() => {
                            const res = selectedResident;
                            const resRequests = requests.filter(r => r.resident_id === res.id);
                            const age = res.birthdate ? Math.floor((Date.now() - new Date(res.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
                            const idDocBucket = 'resident-requirements';

                            const viewIdDocument = async () => {
                                if (!res.id_document_url) return;
                                try {
                                    const { data, error } = await supabase.storage
                                        .from(idDocBucket)
                                        .createSignedUrl(res.id_document_url, 3600);
                                    if (error) throw error;
                                    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                                } catch (err: any) {
                                    showToast(`Could not open ID document: ${err.message || 'Unknown error'}`, 'error');
                                }
                            };

                            return (
                                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: '1rem' }} onClick={() => setSelectedResident(null)}>
                                    <div className="glass-card" style={{ maxWidth: '720px', width: '100%', padding: '2.5rem', background: 'var(--bg-secondary, #1a1a2e)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                                        {/* Header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                                            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Resident Profile</h2>
                                            <button style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setSelectedResident(null)}>X</button>
                                        </div>

                                        {/* Profile Header Card */}
                                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', padding: '1.5rem', background: 'rgba(34, 197, 94, 0.06)', borderRadius: '16px', border: '1px solid rgba(34, 197, 94, 0.15)', marginBottom: '1.5rem' }}>
                                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '3px solid rgba(34, 197, 94, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                                {res.profile_picture_url ? (
                                                    <img
                                                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resident-profile-pictures/${res.profile_picture_url}`}
                                                        alt="Profile"
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.onerror = null;
                                                            target.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%236366f1"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="50" font-family="sans-serif" font-weight="bold" fill="white">${res.full_name?.charAt(0)?.toUpperCase() || '?'}</text></svg>`;
                                                        }}
                                                    />
                                                ) : (
                                                    <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-600)' }}>{res.full_name?.charAt(0)?.toUpperCase() || '?'}</span>
                                                )}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem' }}>{res.full_name}</h3>
                                                <p style={{ margin: '0 0 0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                                                    ID: {res.resident_id_number || res.id?.slice(0, 12).toUpperCase()}
                                                </p>
                                                <span className={res.is_verified ? 'badge badge-success' : res.is_rejected ? 'badge badge-error' : 'badge badge-warning'} style={{ fontSize: '0.75rem' }}>
                                                    {res.is_verified ? 'Verified Resident' : res.is_rejected ? 'Registration Rejected' : 'Pending Verification'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Info Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>First Name</label>
                                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.95rem', fontWeight: 500 }}>{res.first_name || '—'}</p>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Middle Name</label>
                                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.95rem', fontWeight: 500 }}>{res.middle_name || '—'}</p>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Last Name</label>
                                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.95rem', fontWeight: 500 }}>{res.last_name || '—'}</p>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Suffix</label>
                                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.95rem', fontWeight: 500 }}>{res.suffix || '—'}</p>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Gender</label>
                                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.95rem', fontWeight: 500 }}>{res.gender || '—'}</p>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Birthdate</label>
                                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.95rem', fontWeight: 500 }}>
                                                    {res.birthdate
                                                        ? `${new Date(res.birthdate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} (${age} yrs old)`
                                                        : '—'}
                                                </p>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Relationship Status</label>
                                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.95rem', fontWeight: 500 }}>{res.relationship_status || '—'}</p>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Phone</label>
                                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.95rem', fontWeight: 500 }}>{res.phone || '—'}</p>
                                            </div>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Email Address</label>
                                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.95rem', fontWeight: 500 }}>{res.email}</p>
                                            </div>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Home Address</label>
                                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.95rem', fontWeight: 500 }}>{res.address || '—'}</p>
                                            </div>
                                        </div>

                                        {/* Sectoral Classification */}
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>Sectoral Classification</label>
                                            {res.sectors && res.sectors.length > 0 ? (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                    {res.sectors.map(s => (
                                                        <span key={s} style={{
                                                            padding: '0.3rem 0.7rem',
                                                            borderRadius: '99px',
                                                            fontSize: '0.72rem',
                                                            fontWeight: 600,
                                                            background: 'var(--primary-50)',
                                                            color: 'var(--primary-700)',
                                                            border: '1px solid var(--primary-200)',
                                                        }}>{s}</span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.5 }}>No sectors specified</p>
                                            )}
                                        </div>

                                        {/* ID Document Section */}
                                        <div style={{ padding: '1.25rem', background: 'rgba(22, 163, 74, 0.06)', borderRadius: '12px', border: '1px solid rgba(22, 163, 74, 0.15)', marginBottom: '1.5rem' }}>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                                Identity Verification Document
                                            </label>
                                            {res.id_document_url ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <span style={{ fontSize: '0.9rem', color: 'var(--success-500)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}> Document uploaded</span>
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                                                        onClick={viewIdDocument}
                                                    >
                                                        View ID Document
                                                    </button>
                                                </div>
                                            ) : (
                                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--warning-500)' }}>No ID document uploaded</p>
                                            )}
                                        </div>

                                        {/* Meta Info */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{resRequests.length}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Requests</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{fmtDate(res.created_at)}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Registered</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: res.is_verified ? 'var(--success-500)' : res.is_rejected ? '#ef4444' : 'var(--warning-500)' }}>
                                                    {res.is_verified ? 'Verified' : res.is_rejected ? 'Rejected' : 'Awaiting Review'}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</div>
                                            </div>
                                        </div>

                                        {/* Request History */}
                                        {resRequests.length > 0 && (
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, display: 'block', marginBottom: '0.75rem' }}>Request History</label>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                                                    {resRequests.map(req => (
                                                        <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                            <div>
                                                                <strong style={{ fontSize: '0.85rem' }}>{cleanDocType(req.document_type)}</strong>
                                                                <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fmtDate(req.created_at)}</p>
                                                            </div>
                                                            <span className={statusBadge(req.status)} style={{ fontSize: '0.7rem' }}>
                                                                {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                                            {!res.is_verified && !(res.is_rejected) && (
                                                <>
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{ flex: 1, minWidth: '140px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderColor: '#16a34a' }}
                                                        onClick={async () => { await verifyResident(res.id); setSelectedResident(null); fetchDataForTab('residents'); }}
                                                    >
                                                        Verify Resident
                                                    </button>
                                                    <button
                                                        className="btn btn-outline"
                                                        style={{ flex: 1, minWidth: '140px', borderColor: '#ef4444', color: '#ef4444' }}
                                                        onClick={async () => { await rejectResident(res.id); setSelectedResident(null); fetchDataForTab('residents'); }}
                                                    >
                                                        Reject Registration
                                                    </button>
                                                </>
                                            )}
                                            {res.is_rejected && (
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ flex: 1, minWidth: '140px' }}
                                                    onClick={async () => { await verifyResident(res.id); setSelectedResident(null); fetchDataForTab('residents'); }}
                                                >
                                                    Approve Instead
                                                </button>
                                            )}
                                            {res.is_verified && (
                                                <button
                                                    className="btn btn-outline"
                                                    style={{ flex: 1, minWidth: '140px', borderColor: '#ef4444', color: '#ef4444' }}
                                                    onClick={async () => { await rejectResident(res.id); setSelectedResident(null); fetchDataForTab('residents'); }}
                                                >
                                                    Revoke Verification
                                                </button>
                                            )}
                                            <button className="btn btn-outline" style={{ flex: 1, minWidth: '120px' }} onClick={() => setSelectedResident(null)}>
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* ── ANNOUNCEMENTS ── */}
                        {activeTab === 'announcements' && (
                            <div className="animate-fadeIn">
                                <div className={styles.pageHeader}>
                                    <div>
                                        <h1>Manage Announcements</h1>
                                        <p className={styles.pageSubtitle}>Publish & manage barangay announcements for all residents</p>
                                    </div>
                                </div>

                                <div className="glass-card" style={{ marginBottom: '2rem', borderLeft: annCategory === 'emergency_alert' ? '4px solid #ef4444' : annCategory === 'emergency_announcement' ? '4px solid #f59e0b' : annCategory === 'important' ? '4px solid #f97316' : annCategory === 'community_event' ? '4px solid #22c55e' : '4px solid #6b7280' }}>
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        Create New Announcement
                                        {annCategory === 'emergency_alert' && (
                                            <span className="badge badge-error animate-pulse" style={{ fontSize: '0.65rem', marginLeft: '0.25rem' }}>LIVE ALERT</span>
                                        )}
                                    </h3>

                                    {annCategory === 'emergency_alert' && (
                                        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#fca5a5' }}>
                                            <strong>Emergency Alert</strong> — This will be displayed prominently to all residents. The title is auto-set to "EMERGENCY ALERT".
                                        </div>
                                    )}
                                    {annCategory === 'emergency_announcement' && (
                                        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#fcd34d' }}>
                                            <strong>Emergency Announcement</strong> — Use this for planned or context-based emergency notices that residents should prepare for.
                                        </div>
                                    )}

                                    <div className={styles.announcementForm}>
                                        {annCategory !== 'emergency_alert' && (
                                            <input
                                                type="text"
                                                placeholder="Announcement Title"
                                                value={annTitle}
                                                onChange={e => setAnnTitle(e.target.value)}
                                            />
                                        )}
                                        <textarea
                                            rows={4}
                                            placeholder={
                                                annCategory === 'emergency_alert'
                                                    ? 'ALERT: What is happening NOW and where?'
                                                    : annCategory === 'emergency_announcement'
                                                        ? 'Describe the emergency details and what residents should prepare for.'
                                                        : 'Write the announcement content here...'
                                            }
                                            value={annContent}
                                            onChange={e => setAnnContent(e.target.value)}
                                            style={{
                                                borderColor: annCategory === 'emergency_alert' ? 'rgba(239,68,68,0.5)' : annCategory === 'emergency_announcement' ? 'rgba(245,158,11,0.5)' : annCategory === 'important' ? 'rgba(249,115,22,0.5)' : annCategory === 'community_event' ? 'rgba(34, 197, 94,0.5)' : 'rgba(107,114,128,0.4)'
                                            }}
                                        />
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <select
                                                value={annCategory}
                                                onChange={e => {
                                                    setAnnCategory(e.target.value)
                                                    if (e.target.value === 'emergency_alert') {
                                                        setAnnTitle('EMERGENCY ALERT')
                                                    } else if (annTitle === 'EMERGENCY ALERT') {
                                                        setAnnTitle('')
                                                    }
                                                }}
                                            >
                                                <option value="community_event">Community Event</option>
                                                <option value="important">Important</option>
                                                <option value="general">General</option>
                                                <option value="emergency_alert">Emergency Alert (Real-time)</option>
                                                <option value="emergency_announcement">Emergency Announcement (Planned)</option>
                                            </select>
                                            <button
                                                className="btn btn-primary"
                                                onClick={publishAnnouncement}
                                                disabled={publishing || !annContent.trim() || (annCategory !== 'emergency_alert' && !annTitle.trim())}
                                                style={{
                                                    background: annCategory === 'emergency_alert' ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : annCategory === 'emergency_announcement' ? 'linear-gradient(135deg, #d97706, #b45309)' : annCategory === 'important' ? 'linear-gradient(135deg, #ea580c, #c2410c)' : annCategory === 'community_event' ? 'linear-gradient(135deg, #16a34a, #15803d)' : undefined,
                                                    borderColor: annCategory === 'emergency_alert' ? '#dc2626' : annCategory === 'emergency_announcement' ? '#d97706' : annCategory === 'important' ? '#ea580c' : annCategory === 'community_event' ? '#16a34a' : undefined,
                                                    boxShadow: annCategory === 'emergency_alert' ? '0 0 16px rgba(239,68,68,0.4)' : annCategory === 'emergency_announcement' ? '0 0 16px rgba(217,119,6,0.3)' : annCategory === 'important' ? '0 0 16px rgba(234,88,12,0.3)' : annCategory === 'community_event' ? '0 0 16px rgba(22, 163, 74,0.3)' : undefined
                                                }}
                                            >
                                                {publishing ? 'Publishing...' : annCategory === 'emergency_alert' ? 'Publish Alert' : 'Publish'}
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
                                                <button className={styles.editButton} onClick={() => deleteAnnouncement(ann.id)}>Delete</button>
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
                                                    onError={(err: unknown) => {
                                                        const msg = err instanceof Error ? err.message : String(err)
                                                        console.warn('[QR Scanner]', msg)
                                                    }}
                                                    components={{ zoom: false }}
                                                    styles={{ container: { width: '100%', maxWidth: '400px', margin: '0 auto' } }}
                                                />
                                            ) : (
                                                <div style={{ color: 'white', textAlign: 'center', padding: '2rem' }}>
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
                                                    {scanResult.valid ? (scanResult.isResident ? ' VERIFIED RESIDENT' : ' VERIFIED DOCUMENT') : ' INVALID / WARNING'}
                                                </h4>
                                                {scanResult.holder && <p><strong>{scanResult.isResident ? 'Name' : 'Holder'}:</strong> {scanResult.holder}</p>}
                                                {scanResult.docType && <p><strong>Type:</strong> {cleanDocType(scanResult.docType)}</p>}
                                                {scanResult.isResident && (
                                                    <div style={{ marginTop: '0.35rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.35rem' }}>
                                                        {scanResult.address && <p style={{ fontSize: '0.85rem' }}> {scanResult.address}</p>}
                                                        {scanResult.phone && <p style={{ fontSize: '0.85rem' }}> {scanResult.phone}</p>}
                                                    </div>
                                                )}
                                                <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', opacity: 0.8 }}>
                                                    {scanResult.valid ? `${scanResult.isResident ? 'Registered' : 'Issued'}: ${fmtDate(scanResult.date)}` : scanResult.message}
                                                </p>
                                            </div>
                                        )}

                                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))', paddingTop: '1.5rem' }}>
                                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Manual Verification Lookup</h4>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                                                If the camera is not working, enter the QR reference code, document UUID, or resident ID below to verify authenticity manually.
                                            </p>
                                            <form onSubmit={(e) => {
                                                e.preventDefault();
                                                if (manualQrInput.trim()) {
                                                    verifyQrCode(manualQrInput.trim());
                                                }
                                            }} style={{ display: 'flex', gap: '0.5rem' }}>
                                                <input
                                                    type="text"
                                                    className={styles.searchInput}
                                                    placeholder="Enter QR Reference / ID..."
                                                    value={manualQrInput}
                                                    onChange={e => setManualQrInput(e.target.value)}
                                                    disabled={verifying}
                                                    style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                                                />
                                                <button
                                                    type="submit"
                                                    className="btn btn-primary"
                                                    disabled={verifying || !manualQrInput.trim()}
                                                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                                >
                                                    Verify
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                    <div className="glass-card">
                                        <h3>Recent Verifications</h3>
                                        <div className={styles.verificationList}>
                                            {recentVerifications.length === 0 ? (
                                                <p className={styles.emptyMessage} style={{ padding: '2rem 0' }}>No scans performed yet in this session.</p>
                                            ) : recentVerifications.map((v, i) => (
                                                <div key={i} className={styles.activityItem} style={{ padding: '1rem' }}>
                                                    <div className={styles.activityDetails}>
                                                        <strong>{v.name}</strong>
                                                        <p>{cleanDocType(v.doc)}</p>
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

                                {/* Analytics Sub-Navigation */}
                                <select
                                    value={analyticsView}
                                    onChange={(e) => setAnalyticsView(e.target.value as any)}
                                    style={{
                                        marginBottom: '1.75rem',
                                        padding: '0.65rem 2.5rem 0.65rem 1rem',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border-color)',
                                        background: '#ffffff',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        outline: 'none',
                                        appearance: 'none',
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='rgba(0,0,0,0.5)' viewBox='0 0 16 16'%3E%3Cpath d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 0.85rem center',
                                        boxShadow: 'var(--shadow-sm)',
                                    }}
                                >
                                    <option value="overview" style={{ background: '#ffffff', color: '#111827' }}>Overview — Stats & Breakdowns</option>
                                    <option value="trends" style={{ background: '#ffffff', color: '#111827' }}>Trends — Weekly Performance</option>
                                    <option value="demographics" style={{ background: '#ffffff', color: '#111827' }}>Demographics — Sectoral & Age</option>
                                </select>

                                {loading ? <LoadingSpinner text="Loading analytics..." /> : (
                                    <>
                                        {/* ── OVERVIEW SUB-VIEW ── */}
                                        {analyticsView === 'overview' && (
                                            <div className="animate-fadeIn">
                                                {/* Summary Cards */}
                                                <div className={styles.statsGrid}>
                                                    <div className={`glass-card ${styles.statCard}`}>
                                                        <div className={styles.statValue}>{requests.length}</div>
                                                        <div className={styles.statLabel}>Total Requests</div>
                                                        <div className={styles.statTrend}>All time</div>
                                                    </div>
                                                    <div className={`glass-card ${styles.statCard}`}>
                                                        <div className={styles.statValue}>{completionRate}%</div>
                                                        <div className={styles.statLabel}>Completion Rate</div>
                                                        <div className={styles.statTrend}>↑ Good performance</div>
                                                    </div>
                                                    <div className={`glass-card ${styles.statCard}`}>
                                                        <div className={styles.statValue}>{announcements.length}</div>
                                                        <div className={styles.statLabel}>Announcements</div>
                                                        <div className={styles.statTrend}>This month</div>
                                                    </div>
                                                    <div className={`glass-card ${styles.statCard}`}>
                                                        <div className={styles.statValue}>{rejectedCount}</div>
                                                        <div className={styles.statLabel}>Rejected</div>
                                                        <div className={styles.statTrend}>{requests.length > 0 ? Math.round(rejectedCount / requests.length * 100) : 0}% rejection rate</div>
                                                    </div>
                                                </div>

                                                {/* Document Type & Status Breakdown */}
                                                <div className="grid grid-2" style={{ marginTop: '1.5rem' }}>
                                                    <div className="glass-card">
                                                        <h3>Document Type Breakdown</h3>
                                                        {(['Barangay Clearance', 'Business Permit', 'Barangay ID', 'Certificate of Indigency', 'Certificate of Residency'] as const).map(type => {
                                                            const count = requests.filter(r => cleanDocType(r.document_type) === type).length
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
                                                        <h3>Status Breakdown</h3>
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
                                            </div>
                                        )}

                                        {/* ── TRENDS SUB-VIEW ── */}
                                        {analyticsView === 'trends' && (
                                            <div className="animate-fadeIn">
                                                <WeeklyPerformanceChart />
                                            </div>
                                        )}

                                        {/* ── DEMOGRAPHICS SUB-VIEW ── */}
                                        {analyticsView === 'demographics' && (
                                            <div className="animate-fadeIn">
                                                {loadingDemographics ? (
                                                    <LoadingSpinner text="Loading demographic data..." />
                                                ) : (
                                                    <>
                                                        <SectoralChart profiles={demographicsData || []} />
                                                        <AgeDemographicChart profiles={demographicsData || []} />
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── BLOTTER & COMPLAINTS ── */}
                        {activeTab === 'blotter' && (
                            <div className="animate-fadeIn">
                                <div className={styles.pageHeader}>
                                    <div>
                                        <h1>Blotter &amp; Complaints</h1>
                                        <p className={styles.pageSubtitle}>Manage official blotter reports and resident-submitted complaints.</p>
                                    </div>
                                </div>

                                {/* Sub-navigation */}
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                    <button
                                        className={`btn ${blotterView === 'reports' ? 'btn-primary' : 'btn-outline'}`}
                                        onClick={() => setBlotterView('reports')}
                                    >
                                        Blotter Reports ({blotterReports.length})
                                    </button>
                                    <button
                                        className={`btn ${blotterView === 'complaints' ? 'btn-primary' : 'btn-outline'}`}
                                        onClick={() => setBlotterView('complaints')}
                                    >
                                        Resident Complaints ({complaints.length})
                                    </button>
                                </div>

                                {/* ── BLOTTER REPORTS SUB-VIEW ── */}
                                {blotterView === 'reports' && (<>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'flex-end' }}>
                                        <button className="btn btn-secondary" onClick={() => setBlotterModal({ isOpen: true, report: { incident_date: new Date().toISOString().slice(0, 16) } })}>
                                            + New Report
                                        </button>
                                        <button className="btn btn-primary" onClick={() => exportBlotterToPDF(filteredBlotterReports, 'Blotter_Reports')}>
                                            Export PDF
                                        </button>
                                    </div>

                                    <div className={styles.filterBar}>
                                        <input type="text" placeholder="Search complainant or respondent..." value={blotterSearch} onChange={e => setBlotterSearch(e.target.value)} className={styles.searchInput} />
                                        <select value={blotterStatusFilter} onChange={e => setBlotterStatusFilter(e.target.value)} className={styles.filterSelect}>
                                            <option value="all">All Status</option>
                                            <option value="Pending">Pending</option>
                                            <option value="Ongoing">Ongoing</option>
                                            <option value="Resolved">Resolved</option>
                                            <option value="Referred">Referred</option>
                                        </select>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', marginLeft: '0.5rem' }}>
                                            <input type="checkbox" checked={showArchivedBlotters} onChange={e => { setShowArchivedBlotters(e.target.checked); setBlotterLimit(100); }} style={{ width: '1rem', height: '1rem', accentColor: 'var(--primary-600)' }} />
                                            <span>Show Archived</span>
                                        </label>
                                        <span className={styles.searchCount}>{filteredBlotterReports.length} report{filteredBlotterReports.length !== 1 ? 's' : ''}</span>
                                    </div>

                                    <div className={`${styles.tableContainer} ${styles.glassTable}`}>
                                        {loading ? <LoadingSpinner text="Loading reports..." /> : (
                                            <table className={styles.table}>
                                                <thead><tr><th>ID</th><th>Complainant</th><th>Incident Details</th><th>Respondent</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                                                <tbody>
                                                    {filteredBlotterReports.map(rep => (
                                                        <tr key={rep.id}>
                                                            <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{rep.id.slice(0, 6).toUpperCase()}</td>
                                                            <td><strong>{rep.complainant}</strong></td>
                                                            <td><span style={{ fontSize: '0.85rem' }}>{rep.location}</span></td>
                                                            <td><strong>{rep.respondent}</strong></td>
                                                            <td style={{ fontSize: '0.85rem' }}>{new Date(rep.incident_date).toLocaleDateString()}</td>
                                                            <td><span className={rep.status === 'Resolved' ? 'badge badge-success' : rep.status === 'Ongoing' ? 'badge badge-info' : rep.status === 'Pending' ? 'badge badge-warning' : 'badge badge-error'}>{rep.status}</span></td>
                                                            <td>
                                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                    {showArchivedBlotters ? (
                                                                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--success-500)', color: 'var(--success-500)' }} onClick={() => restoreBlotterReport(rep.id)}>Restore</button>
                                                                    ) : (
                                                                        <>
                                                                            <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setBlotterModal({ isOpen: true, report: rep })}>Review</button>
                                                                            <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--error-500)', color: 'var(--error-500)' }} onClick={() => deleteBlotterReport(rep.id)}>Archive</button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {blotterReports.length === 0 && (<tr><td colSpan={7} className={styles.emptyMessage}>No blotter reports found.</td></tr>)}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                    {blotterReports.length >= blotterLimit && (
                                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', marginBottom: '1rem' }}>
                                            <button className="btn btn-outline" onClick={() => setBlotterLimit(prev => prev + 100)}>
                                                Load More Reports
                                            </button>
                                        </div>
                                    )}
                                </>)}

                                {/* ── RESIDENT COMPLAINTS SUB-VIEW ── */}
                                {blotterView === 'complaints' && (<>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'flex-end' }}>
                                        <button className="btn btn-primary" onClick={() => exportComplaintsToPDF(filteredComplaints, 'Complaints_Report')}>Export PDF</button>
                                    </div>

                                    <div className={styles.filterBar}>
                                        <input type="text" placeholder="Search by subject, respondent, or resident..." value={complaintSearch} onChange={e => setComplaintSearch(e.target.value)} className={styles.searchInput} />
                                        <select value={complaintStatusFilter} onChange={e => setComplaintStatusFilter(e.target.value)} className={styles.filterSelect}>
                                            <option value="all">All Status</option>
                                            <option value="Received">Received</option>
                                            <option value="Under Investigation">Under Investigation</option>
                                            <option value="Resolved">Resolved</option>
                                            <option value="Dismissed">Dismissed</option>
                                        </select>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', marginLeft: '0.5rem' }}>
                                            <input type="checkbox" checked={showArchivedComplaints} onChange={e => { setShowArchivedComplaints(e.target.checked); setComplaintsLimit(100); }} style={{ width: '1rem', height: '1rem', accentColor: 'var(--primary-600)' }} />
                                            <span>Show Archived</span>
                                        </label>
                                        <span className={styles.searchCount}>{filteredComplaints.length} complaint{filteredComplaints.length !== 1 ? 's' : ''}</span>
                                    </div>

                                    <div className={`${styles.tableContainer} ${styles.glassTable}`}>
                                        {loading ? <LoadingSpinner text="Loading complaints..." /> : (
                                            <table className={styles.table}>
                                                <thead><tr><th>ID</th><th>Complainant</th><th>Incident Details</th><th>Respondent</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                                                <tbody>
                                                    {filteredComplaints.map(c => (
                                                        <tr key={c.id}>
                                                            <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{c.id.slice(0, 6).toUpperCase()}</td>
                                                            <td><strong>{c.resident_name}</strong></td>
                                                            <td>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                                    <span className="badge badge-info" style={{ fontSize: '0.65rem', alignSelf: 'flex-start' }}>{c.complaint_type}</span>
                                                                    <span style={{ fontSize: '0.85rem' }}>{c.subject}</span>
                                                                </div>
                                                            </td>
                                                            <td><strong>{c.respondent_name}</strong></td>
                                                            <td style={{ fontSize: '0.85rem' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                                                            <td><span className={c.status === 'Resolved' ? 'badge badge-success' : c.status === 'Under Investigation' ? 'badge badge-info' : c.status === 'Dismissed' ? 'badge badge-error' : 'badge badge-warning'}>{c.status}</span></td>
                                                            <td>
                                                                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                                                    {showArchivedComplaints ? (
                                                                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', borderColor: 'var(--success-500)', color: 'var(--success-500)' }} onClick={() => restoreComplaint(c.id)}>Restore</button>
                                                                    ) : (
                                                                        <>
                                                                            <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }} onClick={() => { setComplaintModal({ isOpen: true, complaint: c }); setComplaintNotes(c.admin_notes || ''); setComplaintNewStatus(c.status); }}>Review</button>
                                                                            {c.status !== 'Resolved' && c.status !== 'Dismissed' && c.status !== 'Under Investigation' && (
                                                                                <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', borderColor: 'var(--warning-500)', color: 'var(--warning-500)' }} onClick={() => escalateToBlotter(c)}>Escalate</button>
                                                                            )}
                                                                            <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', borderColor: 'var(--error-500)', color: 'var(--error-500)' }} onClick={() => deleteComplaint(c.id)}>Archive</button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {filteredComplaints.length === 0 && (<tr><td colSpan={8} className={styles.emptyMessage}>No complaints found.</td></tr>)}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                    {complaints.length >= complaintsLimit && (
                                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', marginBottom: '1rem' }}>
                                            <button className="btn btn-outline" onClick={() => setComplaintsLimit(prev => prev + 100)}>
                                                Load More Complaints
                                            </button>
                                        </div>
                                    )}
                                </>)}
                            </div>
                        )}

                        {/* ── AUDIT TRAIL ── */}
                        {activeTab === 'audit' && (
                            <div className="animate-fadeIn">
                                <div className={styles.pageHeader}>
                                    <div>
                                        <h1>System Audit Trail</h1>
                                        <p className={styles.pageSubtitle}>Log of all administrative actions in the E-Barangay system.</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button className="btn btn-primary" style={{ gap: '0.5rem' }} onClick={() => exportAuditToPDF(auditLogs, 'Audit_Logs')}>
                                            Export Logs PDF
                                        </button>
                                    </div>
                                </div>

                                <div className={`${styles.tableContainer} ${styles.glassTable}`}>
                                    {loading ? <LoadingSpinner text="Loading logs..." /> : (
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th>Date &amp; Time</th>
                                                    <th>Admin</th>
                                                    <th>Action</th>
                                                    <th>Description</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {auditLogs.map(log => (
                                                    <tr key={log.id}>
                                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                            {new Date(log.created_at).toLocaleString()}
                                                        </td>
                                                        <td><strong>{log.admin_name}</strong></td>
                                                        <td><span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{log.action}</span></td>
                                                        <td style={{ color: 'var(--text-muted)' }}>{log.description}</td>
                                                    </tr>
                                                ))}
                                                {auditLogs.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className={styles.emptyMessage}>No audit logs found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
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
            {/* Certificate Config & Preview Modal */}
            {pdfConfigModal && pdfConfigModal.isOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: '1rem' }} onClick={() => setPdfConfigModal(null)}>
                    <div style={{ maxWidth: '550px', width: '100%', padding: '2rem', background: 'var(--bg-primary, #ffffff)', color: 'var(--text-primary, #111827)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 'var(--radius-lg, 0.75rem)', boxShadow: 'var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1))', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary, #111827)' }}>Generate {pdfConfigModal.documentType}</h3>
                        <p style={{ color: 'var(--text-secondary, #4b5563)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Review and verify the certificate details below before printing or generating the PDF.</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                            {/* General Fields: Name & Purpose */}
                            <div className="grid grid-2" style={{ gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Applicant Name</label>
                                    <input 
                                        type="text" 
                                        value={pdfConfigModal.residentName} 
                                        onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, residentName: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Purpose</label>
                                    <input 
                                        type="text" 
                                        value={pdfConfigModal.purpose} 
                                        onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, purpose: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <hr style={{ border: '0', borderTop: '1px solid var(--border-color, #e5e7eb)', margin: '0.5rem 0' }} />

                            {/* Document-Specific Form Fields */}
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary, #111827)', margin: '0 0 -0.25rem 0' }}>Form Details</h4>
                            
                            {/* Business Fields */}
                            {(pdfConfigModal.documentType.toLowerCase().includes('business') || pdfConfigModal.documentType.toLowerCase().includes('endorsement')) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div className="grid grid-2" style={{ gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Business Name</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.businessName || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, businessName: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Business Location</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.businessLocation || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, businessLocation: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-2" style={{ gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Operator / Owner Name</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.operatorName || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, operatorName: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Operator Address</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.operatorAddress || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, operatorAddress: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Application Type Checkboxes */}
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.5rem' }}>Application Type</label>
                                        <div style={{ display: 'flex', gap: '1.5rem', background: 'var(--bg-secondary, #f9fafb)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color, #e5e7eb)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                <input 
                                                    type="checkbox"
                                                    id="check-new-business"
                                                    checked={pdfConfigModal.checkNewBusiness || false}
                                                    onChange={(e) => setPdfConfigModal({ 
                                                        ...pdfConfigModal, 
                                                        checkNewBusiness: e.target.checked, 
                                                        checkRenewal: e.target.checked ? false : pdfConfigModal.checkRenewal 
                                                    })}
                                                    style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer', accentColor: '#10b981' }}
                                                />
                                                <label htmlFor="check-new-business" style={{ fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-primary, #111827)' }}>New Business</label>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                <input 
                                                    type="checkbox"
                                                    id="check-renewal"
                                                    checked={pdfConfigModal.checkRenewal || false}
                                                    onChange={(e) => setPdfConfigModal({ 
                                                        ...pdfConfigModal, 
                                                        checkRenewal: e.target.checked, 
                                                        checkNewBusiness: e.target.checked ? false : pdfConfigModal.checkNewBusiness 
                                                    })}
                                                    style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer', accentColor: '#10b981' }}
                                                />
                                                <label htmlFor="check-renewal" style={{ fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-primary, #111827)' }}>Renewal</label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Compliance Status Checkboxes */}
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.5rem' }}>Barangay Ordinance Compliance Checkboxes</label>
                                        <div style={{ display: 'flex', gap: '1.5rem', background: 'var(--bg-secondary, #f9fafb)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color, #e5e7eb)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                <input 
                                                    type="checkbox"
                                                    id="check-compliant"
                                                    checked={pdfConfigModal.checkCompliant || false}
                                                    onChange={(e) => setPdfConfigModal({ 
                                                        ...pdfConfigModal, 
                                                        checkCompliant: e.target.checked, 
                                                        checkNonCompliant: e.target.checked ? false : pdfConfigModal.checkNonCompliant 
                                                    })}
                                                    style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer', accentColor: '#10b981' }}
                                                />
                                                <label htmlFor="check-compliant" style={{ fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-primary, #111827)' }}>Compliant</label>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                <input 
                                                    type="checkbox"
                                                    id="check-non-compliant"
                                                    checked={pdfConfigModal.checkNonCompliant || false}
                                                    onChange={(e) => setPdfConfigModal({ 
                                                        ...pdfConfigModal, 
                                                        checkNonCompliant: e.target.checked, 
                                                        checkCompliant: e.target.checked ? false : pdfConfigModal.checkCompliant 
                                                    })}
                                                    style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer', accentColor: '#10b981' }}
                                                />
                                                <label htmlFor="check-non-compliant" style={{ fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-primary, #111827)' }}>Non-Compliant</label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Barangay Recommendation Checkboxes */}
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.5rem' }}>Barangay Recommendation Checkboxes</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', background: 'var(--bg-secondary, #f9fafb)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color, #e5e7eb)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                <input 
                                                    type="checkbox"
                                                    id="check-no-objection"
                                                    checked={pdfConfigModal.checkNoObjection || false}
                                                    onChange={(e) => setPdfConfigModal({ 
                                                        ...pdfConfigModal, 
                                                        checkNoObjection: e.target.checked, 
                                                        checkNonIssuance: e.target.checked ? false : pdfConfigModal.checkNonIssuance 
                                                    })}
                                                    style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer', accentColor: '#10b981' }}
                                                />
                                                <label htmlFor="check-no-objection" style={{ fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-primary, #111827)' }}>Interposes No Objection</label>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                <input 
                                                    type="checkbox"
                                                    id="check-non-issuance"
                                                    checked={pdfConfigModal.checkNonIssuance || false}
                                                    onChange={(e) => setPdfConfigModal({ 
                                                        ...pdfConfigModal, 
                                                        checkNonIssuance: e.target.checked, 
                                                        checkNoObjection: e.target.checked ? false : pdfConfigModal.checkNoObjection 
                                                    })}
                                                    style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer', accentColor: '#10b981' }}
                                                />
                                                <label htmlFor="check-non-issuance" style={{ fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-primary, #111827)' }}>Recommends Non-Issuance</label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sequence Number */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)' }}>Certificate Sequence No.</label>
                                        <div style={{ padding: '0.75rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', background: 'var(--bg-secondary, #f9fafb)', color: 'var(--text-primary, #111827)', fontSize: '0.85rem', fontWeight: 500 }}>
                                            GDH-BPI-{new Date(pdfConfigModal.request.issued_at || Date.now()).getFullYear()}-{pdfConfigModal.sequenceNumber}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Lot Fields */}
                            {(pdfConfigModal.documentType.toLowerCase().includes('lot') || pdfConfigModal.documentType.toLowerCase().includes('occupancy') || pdfConfigModal.documentType.toLowerCase().includes('building')) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div className="grid grid-2" style={{ gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Property Location</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.propertyLocation || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, propertyLocation: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Lot Area (sqm)</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.lotArea || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, lotArea: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-2" style={{ gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Tax Declaration No.</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.taxDecNo || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, taxDecNo: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Occupied Since</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.occupiedSince || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, occupiedSince: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, borderBottom: '1px solid var(--border-color, #e5e7eb)', paddingBottom: '0.25rem', marginTop: '0.25rem' }}>Lot Boundaries Information</div>
                                    <div className="grid grid-2" style={{ gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Bounded On North by</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.boundedNorth || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, boundedNorth: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Bounded On South by</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.boundedSouth || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, boundedSouth: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-2" style={{ gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Bounded On East by</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.boundedEast || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, boundedEast: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Bounded On West by</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.boundedWest || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, boundedWest: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, borderBottom: '1px solid var(--border-color, #e5e7eb)', paddingBottom: '0.25rem', marginTop: '0.25rem' }}>Proof of Ownership Information</div>
                                    <div className="grid grid-2" style={{ gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Document Type</label>
                                            <select 
                                                value={pdfConfigModal.formData.proofType || 'Deed of Sale'} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, proofType: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            >
                                                <option value="Deed of Sale">Deed of Sale</option>
                                                <option value="Deed of Donation">Deed of Donation</option>
                                                <option value="Waiver of Rights">Waiver of Rights</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', marginTop: '0.5rem' }}>Document Registry Details</div>
                                    <div className="grid grid-4" style={{ gap: '0.5rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #4b5563)' }}>Doc No.</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.docNo || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, docNo: e.target.value } })}
                                                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '4px', fontSize: '0.8rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #4b5563)' }}>Page No.</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.pageNo || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, pageNo: e.target.value } })}
                                                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '4px', fontSize: '0.8rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #4b5563)' }}>Book No.</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.bookNo || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, bookNo: e.target.value } })}
                                                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '4px', fontSize: '0.8rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #4b5563)' }}>Series Of</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.seriesOf || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, seriesOf: e.target.value } })}
                                                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '4px', fontSize: '0.8rem' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-2" style={{ gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Notarized By</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.notarizedBy || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, notarizedBy: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Notarized On</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.notarizedOn || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, notarizedOn: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, borderBottom: '1px solid var(--border-color, #e5e7eb)', paddingBottom: '0.25rem', marginTop: '0.25rem' }}>Official Receipt (O.R.) Info</div>
                                    <div className="grid grid-3" style={{ gap: '0.5rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #4b5563)' }}>O.R. No.</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.orNo || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, orNo: e.target.value } })}
                                                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '4px', fontSize: '0.8rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #4b5563)' }}>Amount</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.amount || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, amount: e.target.value } })}
                                                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '4px', fontSize: '0.8rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #4b5563)' }}>Issued On</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.orIssuedOn || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, orIssuedOn: e.target.value } })}
                                                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '4px', fontSize: '0.8rem' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* First Time Job Seeker Fields */}
                            {(pdfConfigModal.documentType.toLowerCase().includes('job seeker') || pdfConfigModal.documentType.toLowerCase().includes('first time')) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Resident Address</label>
                                        <input 
                                            type="text" 
                                            value={pdfConfigModal.formData.address || ''} 
                                            onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, address: e.target.value } })}
                                            style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                        />
                                    </div>
                                    <div className="grid grid-2" style={{ gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Years of Residency</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.yearsOfResidency || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, yearsOfResidency: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Gender</label>
                                            <select 
                                                value={pdfConfigModal.formData.gender || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, gender: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            >
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-2" style={{ gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Type of ID Presented</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.idType || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, idType: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>ID Number</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.idNumber || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, idNumber: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Standard Residency/Clearance/Indigency Fields */}
                            {!pdfConfigModal.documentType.toLowerCase().includes('business') && 
                             !pdfConfigModal.documentType.toLowerCase().includes('endorsement') && 
                             !pdfConfigModal.documentType.toLowerCase().includes('lot') && 
                             !pdfConfigModal.documentType.toLowerCase().includes('occupancy') && 
                             !pdfConfigModal.documentType.toLowerCase().includes('building') && 
                             !pdfConfigModal.documentType.toLowerCase().includes('job seeker') && 
                             !pdfConfigModal.documentType.toLowerCase().includes('first time') && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Resident Address</label>
                                        <input 
                                            type="text" 
                                            value={pdfConfigModal.formData.address || ''} 
                                            onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, address: e.target.value } })}
                                            style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                        />
                                    </div>
                                    <div className="grid grid-3" style={{ gap: '0.75rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Birth Date</label>
                                            <input 
                                                type="text" 
                                                placeholder="YYYY-MM-DD"
                                                value={pdfConfigModal.formData.birthdate || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, birthdate: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Age</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.age || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, age: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Gender</label>
                                            <select 
                                                value={pdfConfigModal.formData.gender || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, gender: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                            >
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-2" style={{ gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Civil Status</label>
                                            <input 
                                                type="text" 
                                                value={pdfConfigModal.formData.civilStatus || ''} 
                                                onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, civilStatus: e.target.value } })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                        />
                                        </div>
                                        {pdfConfigModal.documentType.toLowerCase().includes('residency') && (
                                            <div>
                                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', display: 'block', marginBottom: '0.25rem' }}>Resident Since</label>
                                                <input 
                                                    type="text" 
                                                    value={pdfConfigModal.formData.residentSince || ''} 
                                                    onChange={(e) => setPdfConfigModal({ ...pdfConfigModal, formData: { ...pdfConfigModal.formData, residentSince: e.target.value } })}
                                                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', color: '#111827', outline: 'none' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setPdfConfigModal(null)}>Cancel</button>
                            <button 
                                className="btn btn-primary" 
                                style={{ flex: 1 }} 
                                onClick={async () => {
                                    const fields = {
                                        residentName: pdfConfigModal.residentName,
                                        purpose: pdfConfigModal.purpose,
                                        checkCompliant: pdfConfigModal.checkCompliant,
                                        checkNonCompliant: pdfConfigModal.checkNonCompliant,
                                        checkNoObjection: pdfConfigModal.checkNoObjection,
                                        checkNonIssuance: pdfConfigModal.checkNonIssuance,
                                        checkNewBusiness: pdfConfigModal.checkNewBusiness,
                                        checkRenewal: pdfConfigModal.checkRenewal,
                                        sequenceNumber: pdfConfigModal.sequenceNumber,
                                        formData: pdfConfigModal.formData
                                    }
                                    const req = pdfConfigModal.request
                                    setPdfConfigModal(null)
                                    await generatePDFDirect(req, fields)
                                }}
                            >
                                Generate PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Blotter Form Modal */}
            {blotterModal.isOpen && blotterModal.report && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: '1rem' }} onClick={() => setBlotterModal({ isOpen: false, report: null })}>
                    <div className="glass-card" style={{ maxWidth: '600px', width: '100%', padding: '2rem', background: 'var(--bg-secondary, #1a1a2e)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {blotterModal.report.id ? 'Edit Blotter Report' : 'New Blotter Report'}
                        </h3>
                        <form onSubmit={saveBlotterReport} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="grid grid-2">
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Complainant Name *</label>
                                    <input
                                        type="text"
                                        required
                                        className={styles.searchInput}
                                        style={{ width: '100%' }}
                                        value={blotterModal.report.complainant || ''}
                                        onChange={e => setBlotterModal({ ...blotterModal, report: { ...blotterModal.report, complainant: e.target.value } })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Respondent Name *</label>
                                    <input
                                        type="text"
                                        required
                                        className={styles.searchInput}
                                        style={{ width: '100%' }}
                                        value={blotterModal.report.respondent || ''}
                                        onChange={e => setBlotterModal({ ...blotterModal, report: { ...blotterModal.report, respondent: e.target.value } })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-2">
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Incident Date & Time *</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        disabled={!!blotterModal.report.id}
                                        className={styles.searchInput}
                                        style={{ width: '100%', opacity: blotterModal.report.id ? 0.6 : 1, cursor: blotterModal.report.id ? 'not-allowed' : 'auto' }}
                                        value={blotterModal.report.incident_date ? toLocalISOString(blotterModal.report.incident_date) : ''}
                                        onChange={e => setBlotterModal({ ...blotterModal, report: { ...blotterModal.report, incident_date: new Date(e.target.value).toISOString() } })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Location *</label>
                                    <input
                                        type="text"
                                        required
                                        className={styles.searchInput}
                                        style={{ width: '100%' }}
                                        value={blotterModal.report.location || ''}
                                        onChange={e => setBlotterModal({ ...blotterModal, report: { ...blotterModal.report, location: e.target.value } })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Incident Details *</label>
                                <textarea
                                    required
                                    rows={4}
                                    className={styles.searchInput}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', resize: 'vertical' }}
                                    value={blotterModal.report.incident_details || ''}
                                    onChange={e => setBlotterModal({ ...blotterModal, report: { ...blotterModal.report, incident_details: e.target.value } })}
                                />
                            </div>

                            {blotterModal.report.id && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Status</label>
                                    <select
                                        className={styles.filterSelect}
                                        style={{ width: '100%' }}
                                        value={blotterModal.report.status || 'Pending'}
                                        onChange={e => setBlotterModal({ ...blotterModal, report: { ...blotterModal.report, status: e.target.value as BlotterStatus } })}
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Ongoing">Ongoing</option>
                                        <option value="Resolved">Resolved</option>
                                        <option value="Referred">Referred (e.g. to PNP)</option>
                                    </select>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setBlotterModal({ isOpen: false, report: null })}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={savingBlotter}>
                                    {savingBlotter ? 'Saving...' : 'Save Report'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Complaint Detail Modal */}
            {complaintModal.isOpen && complaintModal.complaint && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: '1rem' }} onClick={() => setComplaintModal({ isOpen: false, complaint: null })}>
                    <div className="glass-card" style={{ maxWidth: '950px', width: '100%', padding: '2rem', background: 'var(--bg-secondary, #1a1a2e)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Complaint Details &amp; Discussion</h3>
                            <button 
                                type="button" 
                                onClick={() => setComplaintModal({ isOpen: false, complaint: null })}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                            {/* Left Column: Complaint details & Status actions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Complaint ID</label>
                                        <strong style={{ fontFamily: 'monospace' }}>{complaintModal.complaint.id.slice(0, 8).toUpperCase()}</strong>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Filed By</label>
                                        <strong>{complaintModal.complaint.resident_name}</strong>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Type</label>
                                        <span className="badge badge-info">{complaintModal.complaint.complaint_type}</span>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Date Filed</label>
                                        <span>{new Date(complaintModal.complaint.created_at).toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Respondent</label>
                                        <strong>{complaintModal.complaint.respondent_name}</strong>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Location</label>
                                        <span>{complaintModal.complaint.location}</span>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Subject</label>
                                    <strong>{complaintModal.complaint.subject}</strong>
                                </div>

                                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Description</label>
                                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.9rem' }}>{complaintModal.complaint.description}</p>
                                </div>

                                {complaintModal.complaint.attachment_url && (
                                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Attached Evidence</label>
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.5rem 1rem', fontSize: '0.85rem', alignSelf: 'flex-start' }}
                                            onClick={() => viewAttachment(complaintModal.complaint!.attachment_url!)}
                                        >
                                            <FileText size={16} />
                                            View Attached Evidence
                                        </button>
                                    </div>
                                )}

                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: 'auto' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>Update Status</label>
                                    <select
                                        className={styles.filterSelect}
                                        style={{ width: '100%', marginBottom: '1rem' }}
                                        value={complaintNewStatus}
                                        onChange={e => setComplaintNewStatus(e.target.value as any)}
                                    >
                                        <option value="Received">Received</option>
                                        <option value="Under Investigation">Under Investigation</option>
                                        <option value="Resolved">Resolved</option>
                                        <option value="Dismissed">Dismissed</option>
                                    </select>

                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>Admin Notes</label>
                                    <textarea
                                        rows={2}
                                        className={styles.searchInput}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem', resize: 'vertical' }}
                                        placeholder="Add notes for this complaint..."
                                        value={complaintNotes}
                                        onChange={e => setComplaintNotes(e.target.value)}
                                    />

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setComplaintModal({ isOpen: false, complaint: null })}>Cancel</button>
                                        <button className="btn btn-primary" style={{ flex: 1 }} disabled={savingComplaint} onClick={() => updateComplaintStatus(complaintModal.complaint!.id, complaintNewStatus, complaintNotes)}>
                                            {savingComplaint ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Discussion / Chat interface */}
                            <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem', height: '100%', minHeight: '400px' }}>
                                <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem', fontWeight: 600 }}>
                                    <MessageSquare size={18} style={{ color: 'var(--primary-400)' }} />
                                    Interactive Discussion
                                </h4>

                                <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', background: 'rgba(0,0,0,0.12)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px' }}>
                                    {loadingComplaintComments ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                                            <LoadingSpinner text="Loading discussion..." size="sm" />
                                        </div>
                                    ) : complaintComments.length === 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>
                                            <MessageSquare size={32} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
                                            <p style={{ margin: 0, fontSize: '0.85rem' }}>No messages in this discussion yet.</p>
                                            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', opacity: 0.7 }}>Send a message to request details or update the resident.</p>
                                        </div>
                                    ) : (
                                        complaintComments.map(c => {
                                            const isAdmin = c.sender_role === 'admin'
                                            return (
                                                <div 
                                                    key={c.id} 
                                                    style={{ 
                                                        alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                                                        maxWidth: '85%',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: isAdmin ? 'flex-end' : 'flex-start'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.15rem', padding: '0 0.2rem' }}>
                                                        <strong>{c.sender_name}</strong>
                                                        <span className={isAdmin ? 'badge badge-info' : 'badge-warning'} style={{ fontSize: '0.55rem', padding: '0.05rem 0.25rem', borderRadius: '4px' }}>
                                                            {isAdmin ? 'Admin' : 'Resident'}
                                                        </span>
                                                    </div>
                                                    <div 
                                                        style={{ 
                                                            padding: '0.6rem 0.85rem', 
                                                            borderRadius: '12px', 
                                                            borderBottomRightRadius: isAdmin ? '0' : '12px',
                                                            borderBottomLeftRadius: !isAdmin ? '0' : '12px',
                                                            background: isAdmin ? 'var(--primary-600, #4f46e5)' : 'rgba(255,255,255,0.06)',
                                                            color: isAdmin ? '#ffffff' : 'var(--text-primary)',
                                                            fontSize: '0.85rem',
                                                            lineHeight: 1.4,
                                                            wordBreak: 'break-word',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                                            border: isAdmin ? 'none' : '1px solid var(--border-color)'
                                                        }}
                                                    >
                                                        {c.comment}
                                                    </div>
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem', padding: '0 0.2rem' }}>
                                                        {new Date(c.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            )
                                        })
                                    )}
                                    <div ref={commentTimelineEndRef} />
                                </div>

                                <form onSubmit={postComplaintComment} style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                                    <input 
                                        type="text" 
                                        className={styles.searchInput}
                                        style={{ flex: 1, padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                                        placeholder="Type your response to the resident..."
                                        value={newComplaintComment}
                                        onChange={e => setNewComplaintComment(e.target.value)}
                                    />
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary" 
                                        style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}
                                        disabled={!newComplaintComment.trim()}
                                    >
                                        Send
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Custom Confirm Dialog ─────────────────────────────────────── */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel={confirmDialog.confirmLabel}
                variant={confirmDialog.variant}
                onConfirm={confirmDialog.onConfirm}
                onCancel={closeConfirmDialog}
            />

            {/* ─── File Preview Modal ──────────────────────────────────────────── */}
            {filePreview && (
                <div
                    onClick={() => setFilePreview(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.3)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '2rem',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#ffffff',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#1e293b', fontWeight: 600, fontSize: '0.95rem', wordBreak: 'break-all' }}>
                                {filePreview.name}
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <a
                                    href={filePreview.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-outline"
                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                >
                                    Open in New Tab
                                </a>
                                <button
                                    onClick={() => setFilePreview(null)}
                                    className="btn btn-outline"
                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#ef4444' }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={filePreview.url}
                            alt={filePreview.name}
                            style={{
                                maxWidth: '80vw',
                                maxHeight: '75vh',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                border: '1px solid rgba(0,0,0,0.1)',
                            }}
                            onError={(e) => {
                                // If image fails, it might be a PDF/doc - show open in new tab message
                                const target = e.currentTarget as HTMLImageElement
                                target.style.display = 'none'
                                const msg = document.createElement('p')
                                msg.textContent = 'This file cannot be previewed inline. Click "Open in New Tab" to view it.'
                                msg.style.color = '#94a3b8'
                                msg.style.textAlign = 'center'
                                target.parentNode?.appendChild(msg)
                            }}
                        />
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
