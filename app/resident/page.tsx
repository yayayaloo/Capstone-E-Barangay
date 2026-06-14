'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
const ChatBot = dynamic(() => import('@/components/ChatBot'), { ssr: false })
import ProtectedRoute from '@/components/ProtectedRoute'

const Scanner = dynamic(
    () => import('@yudiel/react-qr-scanner').then(m => ({ default: m.Scanner })),
    { ssr: false }
)
import Header from '@/components/Header'
import LoadingSpinner from '@/components/LoadingSpinner'
import RequestModal from '@/components/RequestModal'
import ProfileModal from '@/components/ProfileModal'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { ServiceRequest, Announcement, Profile, Complaint, ComplaintType, ComplaintComment } from '@/lib/types'
import { QRCodeSVG } from 'qrcode.react'
import { FileCheck, FileBadge, Store, Home, Briefcase, HeartHandshake, MessageSquare, Send, FileText, X, ClipboardList, Bot } from 'lucide-react'
import styles from './resident.module.css'
import { saveOfflineSubmission, getOfflineSubmissions, deleteOfflineSubmission, OfflineSubmission } from '@/lib/offlineQueue'

function cleanDocType(type: string | undefined | null) {
    if (!type) return ''
    const trimmed = type.trim()
    if (trimmed.toLowerCase() === 'indigency') return 'Certificate of Indigency'
    return trimmed
}

function ResidentPortalContent() {
    const { user, profile, signOut, refreshProfile } = useAuth()
    const { showToast, updateToast } = useToast()
    const [activeTab, setActiveTab] = useState('overview')
    const [isOnline, setIsOnline] = useState(true)
    const [isSyncingOfflineQueue, setIsSyncingOfflineQueue] = useState(false)
    const [showChatBot, setShowChatBot] = useState(false)
    const [showRequestModal, setShowRequestModal] = useState(false)
    const [selectedServiceType, setSelectedServiceType] = useState('')
    const [showProfileModal, setShowProfileModal] = useState(false)
    const [showScanner, setShowScanner] = useState(false)
    const [scanning, setScanning] = useState(false)
    // M4+H2 FIX: Ref-based debounce to prevent duplicate scans across React re-renders
    const lastScanTimeRef = useRef<number>(0)
    const SCAN_COOLDOWN_MS = 3000
    const [scanResult, setScanResult] = useState<{
        isValid: boolean;
        type?: string;
        details?: any;
        message?: string;
    } | null>(null)
    const [requests, setRequests] = useState<ServiceRequest[]>([])
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [loadingRequests, setLoadingRequests] = useState(true)
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)
    const [selectedQR, setSelectedQR] = useState<{ ref: string, title: string } | null>(null)

    // Complaint State
    const [complaints, setComplaints] = useState<Complaint[]>([])
    const [loadingComplaints, setLoadingComplaints] = useState(false)
    const [showComplaintModal, setShowComplaintModal] = useState(false)
    const [submittingComplaint, setSubmittingComplaint] = useState(false)
    const [complaintForm, setComplaintForm] = useState<{
        type: ComplaintType | '', customType: string, subject: string, description: string, respondent: string, location: string, attachment: File | null
    }>({
        type: '',
        customType: '',
        subject: '',
        description: '',
        respondent: '',
        location: '',
        attachment: null
    })

    const [complaintModal, setComplaintModal] = useState<{ isOpen: boolean, complaint: Complaint | null }>({ isOpen: false, complaint: null })
    const [complaintComments, setComplaintComments] = useState<ComplaintComment[]>([])
    const [loadingComplaintComments, setLoadingComplaintComments] = useState(false)
    const [newComplaintComment, setNewComplaintComment] = useState('')
    const commentTimelineEndRef = useRef<HTMLDivElement | null>(null)

    // Offline status detection & Auto-Sync
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsOnline(navigator.onLine)
            
            const handleOnline = () => {
                setIsOnline(true)
                showToast('Back online! Syncing your changes...', 'success')
                runOfflineSync()
            }
            const handleOffline = () => {
                setIsOnline(false)
                showToast('You are offline. Showing cached information.', 'info')
            }

            window.addEventListener('online', handleOnline)
            window.addEventListener('offline', handleOffline)
            
            // Initial run of offline sync if online
            if (navigator.onLine) {
                runOfflineSync()
            }

            // Notification permissions request
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission()
            }

            return () => {
                window.removeEventListener('online', handleOnline)
                window.removeEventListener('offline', handleOffline)
            }
        }
    }, [profile?.id])

    const runOfflineSync = async () => {
        if (!navigator.onLine || !profile?.id || isSyncingOfflineQueue) return
        
        try {
            const queue = await getOfflineSubmissions()
            if (queue.length === 0) return

            setIsSyncingOfflineQueue(true)
            const syncToastId = showToast(`Syncing ${queue.length} offline submission(s)...`, 'loading')

            for (const item of queue) {
                try {
                    if (item.type === 'document_request') {
                        const uploadedPaths: string[] = []

                        for (const file of item.files) {
                            const fileObj = new File([file.data], file.name, { type: file.type })
                            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`
                            const filePath = `${profile.id}/${fileName}`

                            const { error: uploadError } = await supabase.storage
                                .from('resident-requirements')
                                .upload(filePath, fileObj, {
                                    cacheControl: '3600',
                                    upsert: false,
                                    contentType: file.type
                                })

                            if (uploadError) throw uploadError
                            uploadedPaths.push(filePath)
                        }

                        const attachmentUrl = uploadedPaths.length > 0 ? uploadedPaths.join(',') : null

                        const { error } = await supabase
                            .from('service_requests')
                            .insert({
                                resident_id: profile.id,
                                document_type: item.payload.documentType!,
                                purpose: item.payload.purpose!,
                                attachment_url: attachmentUrl,
                                status: 'pending',
                                form_data: item.payload.formData || {}
                            })

                        if (error) throw error

                    } else if (item.type === 'complaint') {
                        let attachmentUrl = null
                        if (item.files.length > 0) {
                            const file = item.files[0]
                            const fileObj = new File([file.data], file.name, { type: file.type })
                            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`
                            const filePath = `${profile.id}/complaints/${fileName}`

                            const { error: uploadError } = await supabase.storage
                                .from('resident-requirements')
                                .upload(filePath, fileObj, {
                                    cacheControl: '3600',
                                    upsert: false,
                                    contentType: file.type
                                })

                            if (uploadError) throw uploadError
                            attachmentUrl = filePath
                        }

                        const { error } = await supabase
                            .from('complaints')
                            .insert({
                                resident_id: profile.id,
                                complaint_type: item.payload.complaintType! as any,
                                subject: item.payload.subject!,
                                description: item.payload.description!,
                                respondent_name: item.payload.respondentName!,
                                location: item.payload.location!,
                                attachment_url: attachmentUrl
                            })

                        if (error) throw error
                    }

                    // Remove from queue on successful sync
                    await deleteOfflineSubmission(item.id)
                } catch (err: any) {
                    console.error(`Error syncing queue item ${item.id}:`, err)
                    showToast(`Failed to sync offline item: ${err.message || err}`, 'error')
                }
            }

            // Reload data
            await fetchRequests()
            await fetchComplaints()

            updateToast(syncToastId, 'Offline submissions synced successfully!', 'success')
        } catch (syncErr: any) {
            console.error('Offline sync error:', syncErr)
        } finally {
            setIsSyncingOfflineQueue(false)
        }
    }

    const triggerStatusChangeNotifications = (newRequests: ServiceRequest[]) => {
        if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted' || !profile?.id) {
            return
        }

        const cacheKey = `e_brgy_requests_${profile.id}`
        const cachedStr = localStorage.getItem(cacheKey)
        if (!cachedStr) return;

        try {
            const oldRequests = JSON.parse(cachedStr) as ServiceRequest[]
            newRequests.forEach(newReq => {
                const oldReq = oldRequests.find(r => r.id === newReq.id)
                if (oldReq && oldReq.status !== newReq.status && (newReq.status === 'ready' || newReq.status === 'completed')) {
                    const statusText = newReq.status === 'ready' ? 'Ready for Pickup' : 'Completed'
                    new Notification("E-Barangay Document Update", {
                        body: `Your request for ${cleanDocType(newReq.document_type)} is now ${statusText}!`,
                        icon: '/logo.png',
                        tag: newReq.id
                    })
                }
            })
        } catch (err) {
            console.error('Notification trigger error:', err)
        }
    }

    useEffect(() => {
        if (profile?.id) {
            if (activeTab === 'overview') {
                fetchAnnouncements()
            } else if (activeTab === 'requests') {
                fetchRequests()
            } else if (activeTab === 'complaints') {
                fetchComplaints()
            }
        }
    }, [profile?.id, activeTab])

    const fetchRequests = async () => {
        if (!profile?.id) return
        setLoadingRequests(true)

        // Read from local cache first for instant layout loading
        const cacheKey = `e_brgy_requests_${profile.id}`
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(cacheKey)
            if (cached) {
                try {
                    setRequests(JSON.parse(cached))
                } catch (e) {
                    console.error('Failed to parse cached requests', e)
                }
            }
        }

        try {
            const { data, error } = await supabase
                .from('service_requests')
                .select('*')
                .eq('resident_id', profile.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            const fetched = data as ServiceRequest[]
            
            // Check if status changed for notifications
            triggerStatusChangeNotifications(fetched)

            setRequests(fetched)

            if (typeof window !== 'undefined') {
                localStorage.setItem(cacheKey, JSON.stringify(fetched))
            }
        } catch (error: any) {
            console.error('Error fetching requests:', error)
            if (navigator.onLine) {
                showToast(error.message || 'Failed to load your requests', 'error')
            }
        } finally {
            setLoadingRequests(false)
        }
    }

    const fetchAnnouncements = async () => {
        setLoadingAnnouncements(true)

        // Read from local cache first
        const cacheKey = 'e_brgy_announcements'
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(cacheKey)
            if (cached) {
                try {
                    setAnnouncements(JSON.parse(cached))
                } catch {}
            }
        }

        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('published_at', { ascending: false })
                .limit(5)

            if (error) throw error
            const fetched = data as Announcement[]
            setAnnouncements(fetched)

            if (typeof window !== 'undefined') {
                localStorage.setItem(cacheKey, JSON.stringify(fetched))
            }
        } catch (error: any) {
            console.error('Error fetching announcements:', error)
            if (navigator.onLine) {
                showToast(error.message || 'Failed to load announcements', 'error')
            }
        } finally {
            setLoadingAnnouncements(false)
        }
    }

    const fetchComplaints = async () => {
        if (!profile?.id) return
        setLoadingComplaints(true)

        // Read from local cache first
        const cacheKey = `e_brgy_complaints_${profile.id}`
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(cacheKey)
            if (cached) {
                try {
                    setComplaints(JSON.parse(cached))
                } catch {}
            }
        }

        try {
            const { data, error } = await supabase
                .from('complaints')
                .select('*')
                .eq('resident_id', profile.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            const fetched = data as Complaint[]
            setComplaints(fetched)

            if (typeof window !== 'undefined') {
                localStorage.setItem(cacheKey, JSON.stringify(fetched))
            }
        } catch (error: any) {
            console.error('Error fetching complaints:', error)
            if (navigator.onLine) {
                showToast(error.message || 'Failed to load your complaints', 'error')
            }
        } finally {
            setLoadingComplaints(false)
        }
    }

    useEffect(() => {
        let channel: any = null

        if (complaintModal.isOpen && complaintModal.complaint?.id) {
            fetchComplaintComments(complaintModal.complaint.id)

            channel = supabase
                .channel(`complaint_comments_${complaintModal.complaint.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'complaint_comments',
                        filter: `complaint_id=eq.${complaintModal.complaint.id}`
                    },
                    () => {
                        if (complaintModal.complaint?.id) {
                            fetchComplaintComments(complaintModal.complaint.id)
                        }
                    }
                )
                .subscribe()
        } else {
            setComplaintComments([])
            setNewComplaintComment('')
        }

        return () => {
            if (channel) {
                supabase.removeChannel(channel)
            }
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
                sender_role: data.profiles?.role || 'resident'
            }

            setComplaintComments(prev => [...prev, formatted])
            setNewComplaintComment('')
        } catch (err: any) {
            console.error('Error posting comment:', err)
            showToast(err.message || 'Failed to send message', 'error')
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
                throw new Error(`Storage access error: ${error.message}`)
            }

            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank')
            } else {
                throw new Error('No signed URL returned from storage.')
            }
        } catch (error: any) {
            console.error('Error opening attachment:', error)
            showToast(`Failed to open file: ${error.message}`, 'error')
        }
    }


    const handleComplaintSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!profile?.id || !profile.is_verified) return

        if (!complaintForm.type || !complaintForm.subject || !complaintForm.description || !complaintForm.respondent || !complaintForm.location) {
            showToast('Please fill out all required fields', 'error')
            return
        }

        if (complaintForm.type === 'Others' && !complaintForm.customType.trim()) {
            showToast('Please specify the complaint type', 'error')
            return
        }

        const finalComplaintType = complaintForm.type === 'Others' ? complaintForm.customType.trim() : complaintForm.type;

        // Offline write queue logic
        if (!navigator.onLine) {
            try {
                const offlineFiles = []
                if (complaintForm.attachment) {
                    offlineFiles.push({
                        name: complaintForm.attachment.name,
                        type: complaintForm.attachment.type,
                        data: complaintForm.attachment as Blob
                    })
                }

                const tempId = `offline-comp-${Date.now()}`
                const offlineComp: OfflineSubmission = {
                    id: tempId,
                    type: 'complaint',
                    payload: {
                        complaintType: finalComplaintType,
                        subject: complaintForm.subject,
                        description: complaintForm.description,
                        respondentName: complaintForm.respondent,
                        location: complaintForm.location
                    },
                    files: offlineFiles,
                    created_at: new Date().toISOString()
                }

                await saveOfflineSubmission(offlineComp)

                const tempComplaintItem: Complaint = {
                    id: tempId,
                    resident_id: profile.id,
                    complaint_type: finalComplaintType as any,
                    subject: complaintForm.subject,
                    description: complaintForm.description,
                    respondent_name: complaintForm.respondent,
                    location: complaintForm.location,
                    status: 'Received',
                    admin_notes: 'Offline Pending Sync',
                    attachment_url: complaintForm.attachment ? 'Offline Files' : null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }

                setComplaints(prev => [tempComplaintItem, ...prev])
                showToast('Offline Mode: Complaint saved locally and queued for upload.', 'success')
                setShowComplaintModal(false)
                setComplaintForm({ type: '', customType: '', subject: '', description: '', respondent: '', location: '', attachment: null })
                setActiveTab('complaints')
            } catch (err: any) {
                console.error('Failed to queue complaint offline:', err)
                showToast(`Queue Error: ${err.message}`, 'error')
            }
            return
        }

        setSubmittingComplaint(true)
        try {
            let attachmentUrl = null
            if (complaintForm.attachment) {
                const fileName = `${Date.now()}_${complaintForm.attachment.name.replace(/\s+/g, '_')}`
                const filePath = `${profile.id}/complaints/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('resident-requirements')
                    .upload(filePath, complaintForm.attachment, {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: complaintForm.attachment.type
                    })

                if (uploadError) {
                    console.error('Complaint upload error:', uploadError)
                    throw new Error(`Failed to upload evidence file: ${uploadError.message}`)
                }
                attachmentUrl = filePath
            }

            const { data, error } = await supabase
                .from('complaints')
                .insert({
                    resident_id: profile.id,
                    complaint_type: finalComplaintType as any,
                    subject: complaintForm.subject,
                    description: complaintForm.description,
                    respondent_name: complaintForm.respondent,
                    location: complaintForm.location,
                    attachment_url: attachmentUrl
                })
                .select()
                .single()

            if (error) throw error

            setComplaints([data as Complaint, ...complaints])
            showToast('Complaint submitted successfully. It will be reviewed by barangay officials.', 'success')
            setShowComplaintModal(false)
            setComplaintForm({ type: '', customType: '', subject: '', description: '', respondent: '', location: '', attachment: null })
            setActiveTab('complaints')
        } catch (error: any) {
            console.error('Error submitting complaint:', error)
            showToast(error.message || 'Failed to submit complaint', 'error')
        } finally {
            setSubmittingComplaint(false)
        }
    }

    const handleRequestSubmit = async (documentType: string, purpose: string, attachments: File[], formData?: Record<string, any>) => {
        if (!profile?.id) return

        // Offline write queue logic
        if (!navigator.onLine) {
            try {
                const offlineFiles = await Promise.all(attachments.map(async (file) => {
                    return {
                        name: file.name,
                        type: file.type,
                        data: file as Blob
                    }
                }))

                const tempId = `offline-req-${Date.now()}`
                const offlineReq: OfflineSubmission = {
                    id: tempId,
                    type: 'document_request',
                    payload: {
                        documentType,
                        purpose,
                        formData: formData || {}
                    },
                    files: offlineFiles,
                    created_at: new Date().toISOString()
                }

                await saveOfflineSubmission(offlineReq)

                const tempRequestItem: ServiceRequest = {
                    id: tempId,
                    resident_id: profile.id,
                    document_type: documentType,
                    purpose: purpose,
                    status: 'pending',
                    notes: 'Offline Pending Sync',
                    qr_code_ref: null,
                    attachment_url: offlineFiles.length > 0 ? 'Offline Files' : null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    form_data: formData || {}
                }

                setRequests(prev => [tempRequestItem, ...prev])
                showToast('Offline Mode: Request saved locally and queued for upload.', 'success')
                setShowRequestModal(false)
                setActiveTab('requests')
            } catch (err: any) {
                console.error('Failed to queue request offline:', err)
                showToast(`Queue Error: ${err.message}`, 'error')
            }
            return
        }

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

                if (uploadError) {
                    console.error('Upload error:', uploadError)
                    throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
                }

                uploadedPaths.push(filePath)
            }

            const attachmentUrl = uploadedPaths.length > 0 ? uploadedPaths.join(',') : null

            const { data, error = null } = await supabase
                .from('service_requests')
                .insert({
                    resident_id: profile.id,
                    document_type: documentType,
                    purpose: purpose,
                    attachment_url: attachmentUrl,
                    status: 'pending',
                    form_data: formData || {}
                })
                .select()
                .single()

            if (error) throw error

            setRequests([data as ServiceRequest, ...requests])
            showToast(`${documentType} request submitted successfully! ${attachments.length} file(s) uploaded.`, 'success')
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

    const handleScan = async (result: any) => {
        if (!result || !result[0] || !result[0].rawValue || scanning) return;

        // M4+H2 FIX: Ref-based debounce — reject scans within cooldown window
        const now = Date.now();
        if (now - lastScanTimeRef.current < SCAN_COOLDOWN_MS) return;
        lastScanTimeRef.current = now;

        setScanning(true);
        const qrData = result[0].rawValue;

        try {
            // Securely verify QR Code via Postgres Function (bypasses RLS read-restrictions for known QRs)
            const { data: verificationResult, error: verificationError } = await supabase
                .rpc('verify_document_qr', { qr_code_string: qrData });

            if (verificationError) {
                console.error('RPC Error:', verificationError);
                throw new Error('Database verification failed.');
            }

            if (verificationResult && verificationResult.isValid !== undefined) {
                setScanResult({
                    isValid: verificationResult.isValid,
                    type: verificationResult.type,
                    details: verificationResult.details,
                    message: verificationResult.message
                });

                // Log scan to qr_verifications for audit trail
                try {
                    await supabase.rpc('log_qr_verification', {
                        p_document_ref: qrData,
                        p_document_type: verificationResult.type || 'Unknown',
                        p_holder_name: verificationResult.details?.['Holder Name'] || 'Unknown',
                        p_is_valid: verificationResult.isValid,
                    });
                } catch (logError) {
                    // Non-critical: don't block the UI if logging fails
                    console.warn('Could not log verification:', logError);
                }
            } else {
                setScanResult({
                    isValid: false,
                    message: 'QR Code format not recognized by the E-Barangay system.'
                });
            }

        } catch (error) {
            console.error('QR Scan error:', error);
            setScanResult({
                isValid: false,
                message: 'Error verifying QR code. It may be invalid or the system is offline.'
            });
        }
        setScanning(false);
    };

    const renderOverview = () => (
        <div className="animate-fadeIn">
            <section className={styles.welcome}>
                <div>
                    <h1 style={{ fontSize: '1.8rem' }}>Welcome back, {profile?.full_name?.split(' ')[0] || 'Resident'}!</h1>
                    <p>Access barangay services, track your requests, and stay updated</p>
                </div>
                <div
                    className={`${styles.idCard} ${profile?.is_verified ? styles.idCardVerified : ''}`}
                    style={{ flex: '1 1 auto', width: '100%', maxWidth: '450px', cursor: 'pointer' }}
                    onClick={() => setActiveTab('profile')}
                >
                    <div className={styles.idCardMain}>
                        {profile?.profile_picture_url && (
                            <div className={styles.idCardIcon}>
                                <img
                                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resident-profile-pictures/${profile.profile_picture_url}`}
                                    alt="Profile"
                                    className={styles.idCardImage}
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.onerror = null;
                                        target.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%236366f1"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="50" font-family="sans-serif" font-weight="bold" fill="white">${profile?.full_name?.charAt(0)?.toUpperCase() || '?'}</text></svg>`;
                                    }}
                                />
                            </div>
                        )}
                        <div className={styles.idCardDetails}>
                            <div className={styles.idCardLabel}>E-Barangay Digital ID</div>
                            <strong className={styles.idCardName}>{profile?.full_name || 'Resident'}</strong>
                            <div className={styles.idCardSub}>
                                <span>Gordon Heights Resident</span>
                                {profile?.is_verified ? (
                                    <span className={styles.verifiedBadge}>Verified Resident</span>
                                ) : profile?.is_rejected ? (
                                    <span className={styles.rejectedBadge} style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>Registration Rejected</span>
                                ) : (
                                    <span className={styles.pendingBadge}>Account for Review</span>
                                )}
                            </div>
                            <div className={styles.idCardFoot}>
                                {profile?.is_verified
                                    ? `ID NO: ${profile?.resident_id_number || 'Official Issued'}`
                                    : `USER REF: ${profile?.id?.slice(0, 8).toUpperCase() || 'UNVERIFIED'}`
                                }
                            </div>
                        </div>
                        <div className={styles.idCardQR}>
                            {/* C5 FIX: Only use resident_qr_id for ID card QR — never expose raw user UUID */}
                            {profile?.resident_qr_id ? (
                                <QRCodeSVG value={profile.resident_qr_id} size={60} level="M" />
                            ) : (
                                <div style={{ width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '0.6rem', textAlign: 'center' }}>QR Pending</div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Verification Restriction Notice */}
            {!profile?.is_verified && (
                <div className="glass-card" style={{ 
                    marginBottom: '2rem', 
                    borderLeft: profile?.is_rejected ? '4px solid #ef4444' : '4px solid #f59e0b', 
                    background: profile?.is_rejected ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)' 
                }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div>
                            <strong style={{ display: 'block', color: profile?.is_rejected ? '#ef4444' : 'inherit' }}>
                                {profile?.is_rejected ? 'Registration Rejected' : 'Account Under Review'}
                            </strong>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                {profile?.is_rejected 
                                    ? 'Your registration has been declined by the Barangay Admin. Please contact the barangay hall or re-submit your requirements to resolve this.' 
                                    : 'Some features are restricted. Please wait for the Barangay Admin to verify your account to access all digital services.'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <section className={styles.quickActions}>
                <h2>Quick Actions</h2>
                <div className="grid grid-3">
                    <button
                        className={`glass-card ${styles.actionCard} ${!profile?.is_verified ? styles.actionDisabled : ''}`}
                        onClick={() => profile?.is_verified ? setShowRequestModal(true) : showToast('Verification Required: Please wait for admin approval to request documents.', 'info')}
                    >
                        <span className={styles.actionIcon}><FileText /></span>
                        <div>
                            <h3>Request Document</h3>
                            <p>Apply for clearances, permits, and certificates</p>
                        </div>
                    </button>

                    <button className={`glass-card ${styles.actionCard}`} onClick={() => {
            setActiveTab('requests'); }}>
                        <span className={styles.actionIcon}><ClipboardList /></span>
                        <div>
                            <h3>Track Status</h3>
                            <p>Monitor your pending applications</p>
                        </div>
                    </button>

                    <button
                        className={`glass-card ${styles.actionCard}`}
                        onClick={() => setShowChatBot(true)}
                    >
                        <span className={styles.actionIcon}><Bot /></span>
                        <div>
                            <h3>Ask AI Assistant</h3>
                            <p>Get instant answers 24/7</p>
                        </div>
                    </button>

                </div>
            </section>

            {/* Emergency Hotlines */}
            <section style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>Emergency Hotlines</h2>
                    <span className="badge badge-error animate-pulse" style={{ fontSize: '0.7rem' }}>24/7 SUPPORT</span>
                </div>

                <div className="grid grid-2" style={{ gap: '1.5rem' }}>
                    {/* Barangay Gordon Heights Group */}
                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Barangay Gordon Heights
                        </h3>
                        <div className={styles.hotlineList}>
                            <a href="tel:2235497" className={styles.hotlineItem}>

                                <div className={styles.hotlineContent}>
                                    <strong>Barangay Hall</strong>
                                    <span>223-5497</span>
                                </div>
                            </a>
                            <a href="tel:09664632688" className={styles.hotlineItem}>

                                <div className={styles.hotlineContent}>
                                    <strong>Brgy. Mobile (Globe)</strong>
                                    <span>0966-463-2688</span>
                                </div>
                            </a>
                            <a href="tel:09208278618" className={styles.hotlineItem}>

                                <div className={styles.hotlineContent}>
                                    <strong>Brgy. Mobile (Smart)</strong>
                                    <span>0920-827-86-18</span>
                                </div>
                            </a>
                            <a href="tel:2220402" className={styles.hotlineItem}>

                                <div className={styles.hotlineContent}>
                                    <strong>Police Station 5</strong>
                                    <span>222-0402</span>
                                </div>
                            </a>
                            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className={styles.hotlineItem}>

                                <div className={styles.hotlineContent}>
                                    <strong>Official Facebook</strong>
                                    <span style={{ fontSize: '0.65rem' }}>Bago at progresibong Gordon Heights</span>
                                </div>
                            </a>
                            <a href="mailto:barangaygordonheights2018@gmail.com" className={styles.hotlineItem}>

                                <div className={styles.hotlineContent}>
                                    <strong>Email Address</strong>
                                    <span style={{ fontSize: '0.65rem' }}>barangaygordonheights...</span>
                                </div>
                            </a>
                        </div>
                    </div>

                    {/* Olongapo City Group */}
                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Olongapo City Central
                        </h3>
                        <div className={styles.hotlineList}>
                            <a href="tel:09985937446" className={styles.hotlineItem}>

                                <div className={styles.hotlineContent}>
                                    <strong>City Rescue (DRRMO)</strong>
                                    <span>0998-593-7446 | 0917-306-5966</span>
                                </div>
                            </a>
                            <a href="tel:2235731" className={styles.hotlineItem}>

                                <div className={styles.hotlineContent}>
                                    <strong>City Police Office</strong>
                                    <span>223-5731</span>
                                </div>
                            </a>
                            <a href="tel:2231415" className={styles.hotlineItem}>

                                <div className={styles.hotlineContent}>
                                    <strong>BFP Fire Station</strong>
                                    <span>223-1415</span>
                                </div>
                            </a>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <a href="tel:6114818" className={styles.hotlineItem} style={{ padding: '0.5rem 0.75rem' }}>

                                    <div className={styles.hotlineContent}>
                                        <strong style={{ fontSize: '0.75rem' }}>Traffic</strong>
                                        <span style={{ fontSize: '0.7rem' }}>611-4818</span>
                                    </div>
                                </a>
                                <a href="tel:2222565" className={styles.hotlineItem} style={{ padding: '0.5rem 0.75rem' }}>

                                    <div className={styles.hotlineContent}>
                                        <strong style={{ fontSize: '0.75rem' }}>Mayor</strong>
                                        <span style={{ fontSize: '0.7rem' }}>222-2565</span>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Announcements */}
            <section className={styles.announcements}>
                <h2>Latest Announcements</h2>
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
        </div>
    )

    const renderProfile = () => (
        <section className={styles.profileSection}>
            <div className="grid grid-2" style={{ gap: '2rem' }}>
                <div className={`glass-card ${styles.profileCard}`}>
                    <div className={styles.profileImageContainer}>
                        {profile?.profile_picture_url ? (
                            <img
                                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resident-profile-pictures/${profile.profile_picture_url}`}
                                alt="Profile"
                                className={styles.profileImage}
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.onerror = null;
                                    target.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%236366f1"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="50" font-family="sans-serif" font-weight="bold" fill="white">${profile?.full_name?.charAt(0)?.toUpperCase() || '?'}</text></svg>`;
                                }}
                            />
                        ) : (
                            <div className={styles.placeholderImage} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: '#ffffff',
                                fontSize: '3rem',
                                fontWeight: 800,
                                letterSpacing: '-1px',
                            }}>
                                {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                        )}
                    </div>
                    <h2 style={{ marginBottom: '0.5rem' }}>{profile?.full_name || 'Barangay Resident'}</h2>
                    <p style={{ color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '1.5rem' }}>
                        RESIDENT PASS | {profile?.resident_id_number || 'Pending ID'}
                    </p>

                    <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Resident Since</span>
                            <strong>{new Date(profile?.created_at || '').toLocaleDateString()}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Account ID</span>
                            <strong style={{ fontSize: '0.8rem' }}>{profile?.id?.split('-')[0] || 'REF'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Status</span>
                            <strong style={{ color: profile?.is_verified ? 'var(--success-600)' : profile?.is_rejected ? '#ef4444' : 'var(--warning-600)' }}>
                                {profile?.is_verified ? 'Verified Resident' : profile?.is_rejected ? 'Rejected' : 'Verification Pending'}
                            </strong>
                        </div>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Profile Information</h3>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoGroup}>
                            <label className={styles.infoLabel}>Full Name</label>
                            <p className={styles.infoValue}>{profile?.full_name}</p>
                        </div>
                        <div className={styles.infoGroup}>
                            <label className={styles.infoLabel}>Gender</label>
                            <p className={styles.infoValue}>{profile?.gender || 'Not specified'}</p>
                        </div>
                        <div className={styles.infoGroup}>
                            <label className={styles.infoLabel}>Relationship Status</label>
                            <p className={styles.infoValue}>{profile?.relationship_status || 'Not specified'}</p>
                        </div>
                        <div className={styles.infoGroup}>
                            <label className={styles.infoLabel}>Birthdate</label>
                            <p className={styles.infoValue}>
                                {profile?.birthdate
                                    ? `${new Date(profile.birthdate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} (${Math.floor((Date.now() - new Date(profile.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} yrs old)`
                                    : 'Not specified'}
                            </p>
                        </div>
                        <div className={styles.infoGroup}>
                            <label className={styles.infoLabel}>Email Address</label>
                            <p className={styles.infoValue}>{profile?.email}</p>
                        </div>
                        <div className={styles.infoGroup}>
                            <label className={styles.infoLabel}>Home Address</label>
                            <p className={styles.infoValue}>{profile?.address || 'Not specified'}</p>
                        </div>
                        <div className={styles.infoGroup}>
                            <label className={styles.infoLabel}>Phone Number</label>
                            <p className={styles.infoValue}>{profile?.phone || 'Not specified'}</p>
                        </div>
                        <div className={styles.infoGroup} style={{ gridColumn: '1 / -1' }}>
                            <label className={styles.infoLabel}>Sectoral Classification</label>
                            {profile?.sectors && profile.sectors.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.35rem' }}>
                                    {profile.sectors.map(s => (
                                        <span key={s} style={{
                                            padding: '0.3rem 0.7rem',
                                            borderRadius: '99px',
                                            fontSize: '0.72rem',
                                            fontWeight: 600,
                                            background: 'rgba(34, 197, 94, 0.12)',
                                            color: '#a5b4fc',
                                            border: '1px solid rgba(34, 197, 94, 0.2)',
                                        }}>
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className={styles.infoValue} style={{ opacity: 0.5 }}>Not specified — update your profile to add</p>
                            )}
                        </div>
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: '2.5rem', width: '100%' }} onClick={() => setShowProfileModal(true)}>
                        Edit Information
                    </button>
                </div>
            </div>
        </section>
    )

    const renderRequests = () => (
        <section className={`${styles.requestsSection} animate-fadeIn`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>My Service Requests</h2>
                <button className="btn btn-primary" onClick={() => setShowRequestModal(true)}>New Request</button>
            </div>

            <div className={`glass-card ${styles.applicationsCard}`}>
                {loadingRequests ? (
                    <LoadingSpinner text="Loading your requests..." size="sm" />
                ) : requests.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                        <h3>No requests yet</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Apply for documents using the button above.</p>
                        <button className="btn btn-primary" onClick={() => setShowRequestModal(true)}>Request Now</button>
                    </div>
                ) : (
                    requests.map((req) => (
                        <div className={styles.applicationItem} key={req.id}>
                            <div className={styles.appInfo}>
                                <div>
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        {cleanDocType(req.document_type)}
                                        {req.qr_code_ref && (
                                            <button
                                                className="btn btn-outline"
                                                style={{ padding: '0.15rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px' }}
                                                onClick={() => setSelectedQR({ ref: req.qr_code_ref as string, title: cleanDocType(req.document_type) })}
                                            >
                                                View QR
                                            </button>
                                        )}
                                    </h4>
                                    <p className={styles.appDate}>
                                        Applied: {new Date(req.created_at).toLocaleDateString()}
                                    </p>
                                    {req.status === 'completed' && req.expires_at && (() => {
                                        const isExpired = new Date(req.expires_at).getTime() < Date.now();
                                        return (
                                            <p className={styles.appDate} style={{ color: isExpired ? '#ef4444' : '#16a34a', fontWeight: isExpired ? 600 : 500, marginTop: '0.2rem' }}>
                                                {isExpired ? 'Expired: ' : 'Valid until: '}{new Date(req.expires_at).toLocaleDateString()}
                                            </p>
                                        );
                                    })()}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem', width: '100%' }}>
                                        {req.purpose && (
                                            <p className={styles.appPurpose}>Purpose: {req.purpose}</p>
                                        )}
                                        {req.attachment_url && (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--success-600)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                Requirement Attached
                                            </span>
                                        )}
                                    </div>
                                    {req.notes && renderAdminNote(req.notes)}
                                </div>
                            </div>
                            <div className={getStatusBadge(req.status)}>{getStatusLabel(req.status)}</div>
                        </div>
                    ))
                )}
            </div>

            <section className={styles.availableServices} style={{ marginTop: '4rem' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Available Services</h2>
                <div className="grid grid-3" style={{ gap: '1rem' }}>
                    {[
                        { type: 'Barangay Clearance', desc: 'Verification of residency & good moral character', fee: 'Php 50.00' },
                        { type: 'Certificate of Residency', desc: 'Residency, Loan, Good Moral Character', fee: 'Php 50.00' },
                        { type: 'Business Clearance', desc: 'Compliance for business permit within Gordon Heights', fee: 'Free' },
                        { type: 'Lot Certification', desc: 'Issued to lot occupants for government agencies', fee: 'Php 1.00/sqm' },
                        { type: 'First Time Job Seeker', desc: 'Waives pre-employment fees (Ages 18–30)', fee: 'Free' },
                        { type: 'Certificate of Indigency', desc: 'Certification of financial status for assistance', fee: 'Free' },
                    ].map(s => (
                        <div
                            className="glass-card"
                            key={s.type}
                            style={{ padding: '1.25rem', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}
                            onClick={() => { setSelectedServiceType(s.type); setShowRequestModal(true); }}
                        >
                            <div style={{ fontSize: '2rem' }}>{getDocIcon(s.type)}</div>
                            <h4 style={{ fontSize: '0.9rem', margin: 0 }}>{s.type}</h4>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>{s.desc}</p>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: s.fee === 'Free' ? '#10b981' : 'var(--primary-400)', background: s.fee === 'Free' ? '#10b98115' : 'var(--primary-50, #f0fdf4)', padding: '0.15rem 0.6rem', borderRadius: '999px', marginTop: '0.25rem' }}>
                                {s.fee}
                            </span>
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
        const iconMap: Record<string, React.ReactNode> = {
            'Barangay Clearance': <FileCheck />,
            'Certificate of Residency': <FileBadge />,
            'Business Clearance': <Store />,
            'Lot Certification': <Home />,
            'First Time Job Seeker': <Briefcase />,
            'Certificate of Indigency': <HeartHandshake />,
        }
        return iconMap[type] || <FileCheck />
    }

    const getCategoryBadge = (category: string) => {
        const badgeMap: Record<string, string> = {
            community_event: 'badge badge-info',
            important: 'badge badge-warning',
            emergency_alert: 'badge badge-error',
            emergency_announcement: 'badge badge-warning',
            emergency: 'badge badge-error',
            general: 'badge badge-info',
        }
        return badgeMap[category] || 'badge badge-info'
    }

    const getCategoryLabel = (category: string) => {
        const labelMap: Record<string, string> = {
            community_event: 'Community Event',
            important: 'Important',
            emergency_alert: 'Emergency Alert',
            emergency_announcement: 'Emergency Announcement',
            emergency: 'Emergency',
            general: 'General',
        }
        return labelMap[category] || category
    }

    const renderAdminNote = (note: string) => {
        if (!note) return null;

        const isAttachment = note.startsWith('ATTACHMENT:');
        const content = isAttachment ? note.replace('ATTACHMENT:', '') : note;

        return (
            <div className={styles.adminNote}>
                <div className={styles.adminNoteHeader}>
                    Official Admin Note
                </div>
                {isAttachment ? (
                    <a
                        href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resident-requirements/${content}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.adminNoteAttachment}
                    >
                        <span></span> View Attached File / Response
                    </a>
                ) : (
                    <p className={styles.adminNoteText}>{content}</p>
                )}
            </div>
        );
    }

    const renderComplaints = () => (
        <section className="animate-fadeIn">
            <div className={styles.pageHeader}>
                <div>
                    <h1>My Complaints</h1>
                    <p className={styles.pageSubtitle}>Track and manage your submitted complaints</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        if (!profile?.is_verified) {
                            showToast('You must be a verified resident to submit a complaint.', 'error');
                            return;
                        }
                        setShowComplaintModal(true);
                    }}
                >
                    + File a Complaint
                </button>
            </div>

            <div className={`${styles.tableContainer} ${styles.glassTable}`}>
                {loadingComplaints ? <LoadingSpinner text="Loading complaints..." /> : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Incident Details</th>
                                <th>Respondent</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Admin Notes</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {complaints.map((c) => (
                                <tr key={c.id}>
                                    <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{c.id.slice(0, 8).toUpperCase()}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                            <span className="badge badge-info" style={{ fontSize: '0.65rem', alignSelf: 'flex-start' }}>{c.complaint_type}</span>
                                            <span style={{ fontSize: '0.85rem' }}>{c.subject}</span>
                                            {c.attachment_url && (
                                                <span style={{ fontSize: '0.72rem', color: 'var(--success-600)', display: 'flex', alignItems: 'center', gap: '0.15rem', marginTop: '0.1rem' }}>
                                                    📎 Evidence Attached
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{c.respondent_name}</td>
                                    <td style={{ fontSize: '0.85rem' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <span className={c.status === 'Resolved' ? 'badge badge-success' : c.status === 'Under Investigation' ? 'badge badge-info' : c.status === 'Dismissed' ? 'badge badge-error' : 'badge badge-warning'}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td style={{ maxWidth: '300px', whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{c.admin_notes || <span style={{ color: 'var(--text-muted)' }}>None</span>}</td>
                                    <td>
                                        <button 
                                            className="btn btn-outline" 
                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                            onClick={() => setComplaintModal({ isOpen: true, complaint: c })}
                                        >
                                            Discuss
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {complaints.length === 0 && (
                                <tr>
                                    <td colSpan={7} className={styles.emptyMessage}>
                                        You haven't filed any complaints yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </section>
    )

    // Show a loading screen while the profile is being fetched to avoid the "Resident" flash
    if (!profile) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
                <LoadingSpinner text="Loading your profile..." />
            </div>
        )
    }

    return (
        <div className={styles.portalContainer}>
            {!isOnline && (
                <div style={{
                    background: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
                    color: '#ffffff',
                    padding: '0.65rem 1rem',
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 99999,
                    animation: 'fadeInDown 0.3s ease-out'
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.5"></path>
                        <path d="M5 12.5a10.94 10.94 0 0 1 5.17-2.39"></path>
                        <path d="M10.71 5.05A16 16 0 0 1 22.5 8"></path>
                        <path d="M1.5 8a15.91 15.91 0 0 1 7.79-2.95"></path>
                        <path d="M12 20h.01"></path>
                    </svg>
                    <span>Offline Mode: Showing cached information. Unsent requests will be queued locally.</span>
                </div>
            )}
            <div className={styles.stickyHeaderWrapper}>
                <Header
                    title="E-Barangay"
                    userName={profile?.full_name || 'Resident'}
                    onSignOut={signOut}
                    variant="resident"
                />

                <nav className={styles.tabNav}>
                    <div className={styles.tabInner}>
                        <button className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.activeTab : ''}`} onClick={() => setActiveTab('overview')}>
                            Overview
                        </button>
                        <button className={`${styles.tabBtn} ${activeTab === 'requests' ? styles.activeTab : ''}`} onClick={() => {
                setActiveTab('requests'); }}>
                            My Requests
                        </button>
                        <button className={`${styles.tabBtn} ${activeTab === 'complaints' ? styles.activeTab : ''}`} onClick={() => {
                setActiveTab('complaints'); }}>
                            My Complaints
                        </button>
                        <button className={`${styles.tabBtn} ${activeTab === 'profile' ? styles.activeTab : ''}`} onClick={() => setActiveTab('profile')}>
                            My Profile
                        </button>
                    </div>
                </nav>
            </div>

            <main className={styles.main}>
                <div className="container">
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'profile' && renderProfile()}
                    {activeTab === 'requests' && renderRequests()}
                    {activeTab === 'complaints' && renderComplaints()}
                </div>
            </main>

            {/* Floating AI Chat Button */}
            <button
                className={styles.chatButton}
                onClick={() => setShowChatBot(true)}
                aria-label="Open AI Assistant"
            >
                <img src="/logo.png" alt="Chat" style={{ width: '60%', height: '60%', objectFit: 'contain' }} />
            </button>

            {/* ChatBot Component */}
            {showChatBot && (
                <ChatBot
                    onClose={() => setShowChatBot(false)}
                    userProfile={profile}
                    userRequests={requests}
                />
            )}

            {/* Request Document Modal */}
            {showRequestModal && (
                <RequestModal
                    profile={profile}
                    initialType={selectedServiceType}
                    onClose={() => { setShowRequestModal(false); setSelectedServiceType(''); }}
                    onSubmit={handleRequestSubmit}
                />
            )}

            {/* Complaint Submission Modal */}
            {showComplaintModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: '1rem' }} onClick={() => setShowComplaintModal(false)}>
                    <div className="glass-card animate-fadeIn" style={{ maxWidth: '500px', width: '100%', padding: '2rem', background: 'var(--bg-secondary, #1a1a2e)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary-400)' }}>File a Complaint</h2>
                        <form onSubmit={handleComplaintSubmit}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Complaint Type *</label>
                                <select
                                    required
                                    className={styles.formInput}
                                    style={{ width: '100%' }}
                                    value={complaintForm.type}
                                    onChange={e => setComplaintForm({ ...complaintForm, type: e.target.value as ComplaintType })}
                                >
                                    <option value="" disabled>Select Type</option>
                                    <option value="Noise Disturbance">Noise Disturbance</option>
                                    <option value="Property Dispute">Property Dispute</option>
                                    <option value="Public Disturbance">Public Disturbance</option>
                                    <option value="Vandalism">Vandalism</option>
                                    <option value="Illegal Structures">Illegal Structures</option>
                                    <option value="Waste Disposal">Waste Disposal</option>
                                    <option value="Others">Others</option>
                                </select>
                            </div>
                            {complaintForm.type === 'Others' && (
                                <div style={{ marginBottom: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Specify Complaint Type *</label>
                                    <input
                                        type="text"
                                        required
                                        className={styles.formInput}
                                        style={{ width: '100%' }}
                                        placeholder="e.g. Stray Animals, Parking Issue"
                                        value={complaintForm.customType}
                                        onChange={e => setComplaintForm({ ...complaintForm, customType: e.target.value })}
                                    />
                                </div>
                            )}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Subject *</label>
                                <input
                                    type="text"
                                    required
                                    className={styles.formInput}
                                    style={{ width: '100%' }}
                                    placeholder="Brief summary of the complaint"
                                    value={complaintForm.subject}
                                    onChange={e => setComplaintForm({ ...complaintForm, subject: e.target.value })}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Respondent / Person Complained Of *</label>
                                <input
                                    type="text"
                                    required
                                    className={styles.formInput}
                                    style={{ width: '100%' }}
                                    placeholder="Name of the person or entity"
                                    value={complaintForm.respondent}
                                    onChange={e => setComplaintForm({ ...complaintForm, respondent: e.target.value })}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Location of Incident *</label>
                                <input
                                    type="text"
                                    required
                                    className={styles.formInput}
                                    style={{ width: '100%' }}
                                    placeholder="Where did it happen?"
                                    value={complaintForm.location}
                                    onChange={e => setComplaintForm({ ...complaintForm, location: e.target.value })}
                                />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Full Description *</label>
                                <textarea
                                    required
                                    rows={4}
                                    className={styles.formInput}
                                    style={{ width: '100%', resize: 'vertical' }}
                                    placeholder="Provide complete details of the incident..."
                                    value={complaintForm.description}
                                    onChange={e => setComplaintForm({ ...complaintForm, description: e.target.value })}
                                />
                            </div>
                            
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Attach Evidence (Optional - Image or PDF)</label>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    className={styles.formInput}
                                    style={{ width: '100%', padding: '0.5rem' }}
                                    onChange={e => {
                                        const file = e.target.files?.[0] || null
                                        if (file && file.size > 5 * 1024 * 1024) {
                                            showToast('File size exceeds the 5MB limit. Please upload a smaller file.', 'error')
                                             e.target.value = ''
                                             setComplaintForm({ ...complaintForm, attachment: null })
                                             return
                                        }
                                        setComplaintForm({ ...complaintForm, attachment: file })
                                    }}
                                />
                                {complaintForm.attachment && (
                                    <p style={{ fontSize: '0.75rem', color: 'var(--success-600)', marginTop: '0.25rem' }}>
                                        Selected: {complaintForm.attachment.name} ({(complaintForm.attachment.size / 1024 / 1024).toFixed(2)} MB)
                                    </p>
                                )}
                            </div>
                            
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowComplaintModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submittingComplaint}>
                                    {submittingComplaint ? 'Submitting...' : 'Submit Complaint'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Profile Edit Modal */}
            {showProfileModal && profile && (
                <ProfileModal
                    profile={profile}
                    onClose={() => setShowProfileModal(false)}
                    onSubmit={handleProfileUpdate}
                />
            )}

            {/* Complaint Detail & Discussion Modal */}
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

                        <div className={styles.complaintModalGrid}>
                            {/* Left Column: Complaint details & Status */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Complaint ID</label>
                                        <strong style={{ fontFamily: 'monospace' }}>{complaintModal.complaint.id.slice(0, 8).toUpperCase()}</strong>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Status</label>
                                        <span className={`badge ${complaintModal.complaint.status === 'Resolved' ? 'badge-success' : complaintModal.complaint.status === 'Under Investigation' ? 'badge-info' : complaintModal.complaint.status === 'Dismissed' ? 'badge-error' : 'badge-warning'}`}>
                                            {complaintModal.complaint.status}
                                        </span>
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
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Official Admin Notes</label>
                                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)', minHeight: '60px', display: 'flex', alignItems: 'center' }}>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: complaintModal.complaint.admin_notes ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: complaintModal.complaint.admin_notes ? 'normal' : 'italic' }}>
                                            {complaintModal.complaint.admin_notes || 'No notes added by administrators yet.'}
                                        </p>
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
                                            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', opacity: 0.7 }}>Send a message to update the admins or add detail.</p>
                                        </div>
                                    ) : (
                                        complaintComments.map(c => {
                                            const isMe = c.sender_id === profile.id
                                            const isAdmin = c.sender_role === 'admin'
                                            return (
                                                <div 
                                                    key={c.id} 
                                                    style={{ 
                                                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                                                        maxWidth: '85%',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: isMe ? 'flex-end' : 'flex-start'
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
                                                            borderBottomRightRadius: isMe ? '0' : '12px',
                                                            borderBottomLeftRadius: !isMe ? '0' : '12px',
                                                            background: isMe ? 'var(--primary-600, #4f46e5)' : 'rgba(255,255,255,0.06)',
                                                            color: isMe ? '#ffffff' : 'var(--text-primary)',
                                                            fontSize: '0.85rem',
                                                            lineHeight: 1.4,
                                                            wordBreak: 'break-word',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                                            border: isMe ? 'none' : '1px solid var(--border-color)'
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
                                        className={styles.formInput}
                                        style={{ flex: 1, padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.05)' }}
                                        placeholder="Type your message to the admins..."
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


            {/* QR Code Modal Display */}
            {selectedQR && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: '1rem' }} onClick={() => setSelectedQR(null)}>
                    <div className="glass-card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '2.5rem 1.5rem', background: 'var(--bg-secondary, #1a1a2e)' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '0.5rem' }}>E-Barangay Pass</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{selectedQR.title}</p>

                        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1.5rem' }}>
                            <QRCodeSVG value={selectedQR.ref} size={220} level="H" includeMargin={false} />
                        </div>

                        {/* M1 FIX: Show truncated QR ref instead of full UUID to reduce exposure */}
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace', margin: '0 0 1.5rem 0', wordBreak: 'break-all' }}>
                            REF: {selectedQR.ref.slice(0, 8).toUpperCase()}…{selectedQR.ref.slice(-4).toUpperCase()}
                        </p>

                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setSelectedQR(null)}>
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Scanner Modal */}
            {showScanner && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: '1rem' }} onClick={() => !scanning && setShowScanner(false)}>
                    <div className="glass-card" style={{ maxWidth: '450px', width: '100%', padding: '2rem', background: 'var(--bg-secondary, #1a1a2e)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Scan QR Code</h2>

                        {!scanResult ? (
                            <>
                                <div className={styles.scannerFrame} style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem', border: '2px solid var(--primary-500, #3b82f6)', position: 'relative' }}>
                                    <Scanner
                                        onScan={handleScan}
                                        onError={(error) => console.error(error)}
                                        styles={{ container: { width: '100%', paddingTop: '100%' } }}
                                    />
                                    
                                    <div className={styles.scannerOverlay} />
                                    <div className={styles.scannerLaser} />
                                    <div className={`${styles.scannerCorner} ${styles.cornerTL}`} />
                                    <div className={`${styles.scannerCorner} ${styles.cornerTR}`} />
                                    <div className={`${styles.scannerCorner} ${styles.cornerBL}`} />
                                    <div className={`${styles.scannerCorner} ${styles.cornerBR}`} />

                                    {scanning && (
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', color: 'white', zIndex: 10 }}>
                                            <LoadingSpinner />
                                        </div>
                                    )}
                                </div>
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Position the QR code within the frame to verify document authenticity.</p>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                                    {scanResult.isValid ? '' : ''}
                                </div>
                                <h3 style={{ color: scanResult.isValid ? 'var(--success-500)' : 'var(--error-500)', marginBottom: '0.5rem' }}>
                                    {scanResult.type || 'Unrecognized QR'}
                                </h3>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{scanResult.message}</p>

                                {scanResult.details && (
                                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1rem', textAlign: 'left', marginBottom: '1.5rem' }}>
                                        {/* M3 FIX: Coerce all values to string to prevent unexpected React rendering behavior */}
                                        {Object.entries(scanResult.details).map(([key, value]) => (
                                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>{key}:</span>
                                                <strong style={{ color: 'var(--text-primary)', textAlign: 'right' }}>{String(value ?? '')}</strong>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button className="btn btn-secondary" style={{ width: '100%', marginBottom: '0.5rem' }} onClick={() => setScanResult(null)}>
                                    Scan Another
                                </button>
                            </div>
                        )}

                        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setShowScanner(false)}>
                            Close Scanner
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
