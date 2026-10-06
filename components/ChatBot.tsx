'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import styles from './ChatBot.module.css'
import { ServiceRequest, Profile } from '@/lib/types'

interface Message {
    id: number
    text: string
    sender: 'user' | 'bot'
    timestamp: Date
    isError?: boolean
}

interface ChatBotProps {
    onClose: () => void
    userProfile?: Profile | null
    userRequests?: ServiceRequest[]
}

const STORAGE_KEY = 'ebarangay_chat_history'

function cleanDocType(type: string | undefined | null) {
    if (!type) return ''
    const trimmed = type.trim()
    if (trimmed.toLowerCase() === 'indigency') return 'Certificate of Indigency'
    return trimmed
}

interface QuickChatOption {
    label: string
    prompt: string
}

const quickReplies: QuickChatOption[] = [
    { label: 'Account Verification', prompt: 'Paano magpa-verify ng account at maging verified resident?' },
    { label: 'Barangay Clearance', prompt: 'Paano makuha ang Barangay Clearance at ano ang mga requirements?' },
    { label: 'Certificate of Residency', prompt: 'Ano ang requirements at proseso para sa Certificate of Residency?' },
    { label: 'Certificate of Indigency', prompt: 'Paano mag-apply para sa Certificate of Indigency at ano ang kailangan?' },
    { label: 'Business Clearance', prompt: 'Ano ang requirements at bayad para sa Business Clearance?' },
    { label: 'First Time Job Seeker', prompt: 'Paano mag-avail ng First Time Job Seeker certificate (RA 11261)?' },
    { label: 'Lot Certification', prompt: 'Ano ang proseso at requirements para sa Lot o Building Certification?' },
    { label: 'Barangay ID', prompt: 'Paano makuha ang opisyal na Barangay ID at QR code?' },
    { label: 'Check Request Status', prompt: 'Maaari mo bang i-check ang status ng aking mga active request?' },
    { label: 'Office Hours & Hotline', prompt: 'Kailan bukas ang Barangay Hall at ano ang mga emergency hotline?' },
    { label: 'File a Complaint', prompt: 'Paano mag-file ng reklamo sa portal?' },
]

// Detect if message is Tagalog/Filipino
const isTagalog = (msg: string): boolean => {
    const tagalogWords = ['paano', 'ano', 'magkano', 'kailan', 'saan', 'kumusta', 'pwede', 'kailangan',
        'gusto', 'mayroon', 'wala', 'opo', 'hindi', 'salamat', 'tulungan', 'libre', 'bayad',
        'dokumento', 'clearance', 'makuha', 'kunin', 'gawin', 'araw', 'bukas', 'sarado',
        'piliin', 'ilagay', 'mag', 'nag', 'ng', 'sa', 'na', 'at', 'ang', 'mga', 'ko', 'mo']
    const lower = msg.toLowerCase()
    return tagalogWords.filter(w => lower.includes(w)).length >= 2
}

// Bilingual fallback responses if AI is unavailable
const getFallbackResponse = (message: string, userProfile?: Profile | null, userRequests?: ServiceRequest[]): string => {
    const lower = message.toLowerCase()
    const tl = isTagalog(message)

    // 1. My Requests / Status check
    if (/\b(status|track|tracking|pending|request|requests)\b/i.test(lower)) {
        if (!userRequests || userRequests.length === 0)
            return tl
                ? 'Wala ka pang aktibong request. I-click ang "Request Document" para magsimula!'
                : "You have no active requests yet. Click 'Request Document' to get started!"
        const pending = userRequests.filter(r => r.status === 'pending' || r.status === 'processing')
        if (pending.length === 0)
            return tl
                ? 'Lahat ng iyong request ay nakumpleto na! Tingnan ang "My Requests" tab para sa detalye.'
                : "All your requests are completed! Check the 'My Requests' tab for details."
        return tl
            ? `Mayroon kang ${pending.length} aktibong request:\n${pending.map(r => `• ${cleanDocType(r.document_type)} (${r.status})`).join('\n')}`
            : `You have ${pending.length} active request(s):\n${pending.map(r => `• ${cleanDocType(r.document_type)} (${r.status})`).join('\n')}`
    }

    // 2. Complaints in the System
    if (/\b(reklamo|blotter|complaint|complaints|alitan|mediation|hearing)\b/i.test(lower)) {
        return tl
            ? 'Para mag-file ng **Reklamo (Complaint)** sa E-Barangay portal:\n\n1. **Mag-login** sa iyong verified resident account.\n2. Pumunta sa **"Complaints"** tab sa iyong dashboard.\n3. I-click ang **"+ File a Complaint"** button.\n4. Punan ang mga sumusunod na detalye:\n   • **Uri ng Reklamo** (Noise, Property Dispute, Waste, Public Disturbance, atbp.)\n   • **Paksa at Detalye** ng pangyayari\n   • **Pangalan ng Inirereklamo** at **Lokasyon ng Insidente**\n   • **Katibayan o Evidence** (larawan o dokumento - optional)\n5. I-click ang **"Submit Complaint"**.\n\nMakikita ang status sa iyong Complaints tab (*Received*, *Under Investigation*, *Resolved*) at maaari mong gamitin ang **"Discuss"** button para direktang makipag-ugnayan sa mga opisyal ng barangay.\n*(Paalala: Kailangang verified ang account para makapag-file ng reklamo sa portal).*'
            : 'To file a **Complaint** in the E-Barangay portal:\n\n1. **Log in** to your verified resident account.\n2. Go to the **"Complaints"** tab on your dashboard.\n3. Click the **"+ File a Complaint"** button.\n4. Fill in the required details:\n   • **Complaint Type** (Noise, Property Dispute, Waste, Public Disturbance, etc.)\n   • **Subject & Incident Description**\n   • **Respondent Name** and **Incident Location**\n   • **Supporting Evidence / Photo** (optional attachment)\n5. Click **"Submit Complaint"**.\n\nYou can track the progress on your Complaints tab (*Received*, *Under Investigation*, *Resolved*) and use the **"Discuss"** button to communicate directly with barangay officials.\n*(Note: Your account must be verified to file a complaint online).*'
    }

    // 3. Lot / Building Certification (Strict word boundary to NEVER match "blotter")
    if (/\b(lot|lots|occupancy|fencing|building|lupa|sukat)\b/i.test(lower)) {
        return tl
            ? 'Para sa **Lot Certification (Occupancy / Fencing / Building)**, kailangan mo ng:\n• Certification mula sa Purok Leader\n• Titulo o Tax Declaration\n• Latest Tax Payment\n• Bayad: ₱1.00 per square meter\nI-click ang "Request Document" para mag-apply!'
            : 'For **Lot Certification (Occupancy / Fencing / Building)**, you need:\n• Certification from Purok Leader\n• Title or Tax Declaration\n• Latest Tax Payment\n• Fee: ₱1.00 per square meter\nClick "Request Document" to apply!'
    }

    // 4. Business Clearance
    if (/\b(business|negosyo|business permit|dti)\b/i.test(lower)) {
        return tl
            ? 'Para sa **Business Clearance**, kailangan mo ng:\n• DTI Certificate\n• Bayad: **Libre (Free)**\n• Para sa mga negosyante para sa compliance ng business permit.\nI-click ang "Request Document" para mag-apply!'
            : 'For **Business Clearance**, you need:\n• DTI Certificate\n• Fee: **Free**\n• For business owners for compliance with business permit.\nClick "Request Document" to apply!'
    }

    // 5. Barangay Clearance
    if (/\b(clearance|barangay clearance)\b/i.test(lower)) {
        return tl
            ? 'Para sa **Barangay Clearance**, kailangan mo ng:\n• Valid Government ID\n• Bayad: ₱50.00\nI-click ang "Request Document" para mag-apply!'
            : 'For **Barangay Clearance**, you need:\n• Valid Government ID\n• Fee: ₱50.00\nClick "Request Document" to apply!'
    }

    // 6. Certificate of Residency
    if (/\b(residency|residente|tirahan|good moral|certificate of residency)\b/i.test(lower)) {
        return tl
            ? 'Para sa **Certificate of Residency**, kailangan mo ng:\n• Valid Government ID\n• Layunin: Residency, Loan, o Good Moral Character\n• Bayad: ₱50.00\nI-click ang "Request Document" para mag-apply!'
            : 'For **Certificate of Residency**, you need:\n• Valid Government ID\n• Purpose: Residency, Loan, or Good Moral Character\n• Fee: ₱50.00\nClick "Request Document" to apply!'
    }

    // 7. First Time Job Seeker
    if (/\b(job seeker|jobseeker|first time job|ftjs|trabaho|ra 11261)\b/i.test(lower)) {
        return tl
            ? 'Ang **First Time Job Seeker** certificate ay:\n• Para sa mga 18–30 taong gulang\n• Libreng pagkuha ng pre-employment requirements (RA 11261)\n• Bayad: **Libre (Free)**\n• Kailangan: Valid ID\nI-click ang "Request Document" para mag-apply!'
            : 'The **First Time Job Seeker** certificate is:\n• For ages 18–30 years old\n• Free waiver for pre-employment requirements (RA 11261)\n• Fee: **Free**\n• Requirement: Valid ID\nClick "Request Document" to apply!'
    }

    // 8. Certificate of Indigency
    if (/\b(indigency|indigent|mahirap|financial|tulong)\b/i.test(lower)) {
        return tl
            ? 'Ang **Certificate of Indigency** ay:\n• Patunay ng financial status para sa tulong/assistance\n• Bayad: **Libre (Free)**\n• Kailangan: Valid ID\nI-click ang "Request Document" para mag-apply!'
            : 'The **Certificate of Indigency** is:\n• Proof of financial status for assistance\n• Fee: **Free**\n• Requirement: Valid ID\nClick "Request Document" to apply!'
    }

    // 9. Account Verification / How to become a verified resident
    if (/\b(verify|verified|verification|pagpapatunay|ma-verify|magpa-verify|unverified)\b/i.test(lower)) {
        if (userProfile?.is_verified) {
            return tl
                ? 'Ang iyong account ay **Verified Resident** na! Mayroon ka nang opisyal na **Resident ID Number** at **Verified Digital QR Pass**. Maaari ka nang mag-request ng mga dokumento at mag-file ng reklamo sa portal.'
                : 'Your account is already a **Verified Resident**! You have an official **Resident ID Number** and **Verified Digital QR Pass**, allowing you to request documents and submit complaints online.'
        }

        if (userProfile?.is_rejected) {
            return tl
                ? 'Ang iyong nakaraang verification ay **Declined / Rejected** ng Barangay Admin. Upang maayos ito:\n\n1. Pumunta sa iyong **Profile** tab.\n2. I-click ang **"Edit Information & Upload ID"**.\n3. Mag-upload ng bago at malinaw na kopya ng government-issued photo ID (hal. National ID, Driver\'s License, Voter\'s ID).\n4. Maaari ring bisitahin ang Barangay Gordon Heights Hall (Block 12 Long Road) para sa tulong.'
                : 'Your previous verification was **Declined / Rejected** by Barangay Administrators. To resolve this:\n\n1. Go to your **Profile** tab.\n2. Click **"Edit Information & Upload ID"**.\n3. Upload a new and clear copy of your government-issued ID (e.g., National ID, Driver\'s License, Voter\'s ID).\n4. You may also visit the Barangay Gordon Heights Hall (Block 12 Long Road) for assistance.'
        }

        return tl
            ? 'Para maging **Verified Resident** sa E-Barangay Gordon Heights portal, sundin ang 3 simpleng hakbang:\n\n1. **Kumpletuhin ang Profile (Step 1)**\n   • Pumunta sa **Profile** tab o i-click ang "Edit Profile".\n   • Tiyaking kumpleto at wasto ang iyong Full Name, Gordon Heights Address, Contact Number, at Petsa ng Kapanganakan.\n\n2. **Mag-upload ng Valid ID (Step 2)**\n   • Sa Account Verification card sa dashboard o sa Profile tab, i-click ang **"Upload Valid ID"** o **"Complete Verification & Upload ID"**.\n   • Mag-upload ng malinaw na litrato ng government-issued ID (National ID, Driver\'s License, Voter\'s ID, Postal ID, Passport) o katibayan ng paninirahan sa Gordon Heights.\n\n3. **Barangay Admin Approval (Step 3)**\n   • Susuriin ng Barangay Administrators ang iyong impormasyon (karaniwang 1–2 araw ng trabaho).\n   • Kapag na-approve, awtomatikong ibibigay ang iyong opisyal na **Resident ID Number** at **Verified Digital QR Pass** para makapag-request ng dokumento at mag-file ng reklamo.'
            : 'To become a **Verified Resident** in the E-Barangay Gordon Heights portal, follow these 3 steps:\n\n1. **Complete Your Profile (Step 1)**\n   • Go to your **Profile** tab or click "Edit Profile".\n   • Ensure your Full Name, Gordon Heights Address, Contact Number, and Birthdate are accurate.\n\n2. **Submit Valid ID (Step 2)**\n   • On the Account Verification card on your dashboard or Profile tab, click **"Upload Valid ID"** or **"Complete Verification & Upload ID"**.\n   • Upload a clear photo of a government-issued ID (National ID, Driver\'s License, Voter\'s ID, Postal ID, Passport) or proof of residency in Gordon Heights.\n\n3. **Barangay Admin Approval (Step 3)**\n   • Barangay Administrators will review your credentials (typically 1–2 business days).\n   • Once approved, you will be issued your official **Resident ID Number** and **Verified Digital QR Pass** to request documents and file complaints online.'
    }

    // 10. Barangay ID (Word boundary so "resident" or "valid" don't match)
    if (/\b(id|digital id|barangay id)\b/i.test(lower)) {
        return tl
            ? (userProfile?.is_verified ? 'Aktibo na ang iyong Digital ID! Tingnan ang QR code sa Profile tab.' : 'Para makuha ang Barangay ID, kumpletuhin ang iyong profile at mag-upload ng valid ID para sa admin verification.')
            : (userProfile?.is_verified ? 'Your Digital ID is active! View the QR code on your Profile tab.' : 'To get your Barangay ID, complete your profile and upload a valid ID for admin verification.')
    }

    // 10. Office Hours & Location
    if (/\b(hours|open|bukas|oras|schedule|location|hall|address|hotline|phone)\b/i.test(lower)) {
        return tl
            ? 'Bukas ang Barangay Hall tuwing Lunes–Biyernes, 8:00 AM – 5:00 PM. Sarado sa Sabado, Linggo, at mga holiday. Tel: 223-5497.'
            : 'Barangay Hall is open Monday–Friday, 8:00 AM – 5:00 PM. Closed on weekends and holidays. Tel: 223-5497.'
    }

    // 11. Greeting
    if (/\b(hello|hi|kumusta|hey|good morning|good afternoon)\b/i.test(lower)) {
        return tl
            ? `Kumusta, ${userProfile?.first_name || 'Residente'}! Paano kita matutulungan ngayon?`
            : `Hello ${userProfile?.first_name || 'Resident'}! How can I help you today?`
    }

    return tl
        ? 'Maaari akong tumulong sa mga dokumento, status ng request, at impormasyon ng barangay. Subukang tanungin: "Paano makuha ang Barangay Clearance?" o "Kailan bukas ang Barangay Hall?"'
        : "I can help with document requests, status tracking, and barangay info. Try asking: 'How to get Barangay Clearance?' or 'What are the office hours?'"
}

// Interactive Slidable Horizontal Row with Arrow Navigation, Mouse Wheel & Drag-to-Scroll
function SlidableRow({
    children,
    className = ''
}: {
    children: React.ReactNode
    className?: string
}) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)
    const isDragging = useRef(false)
    const startX = useRef(0)
    const scrollStart = useRef(0)
    const hasMoved = useRef(false)

    const checkScroll = useCallback(() => {
        if (!scrollRef.current) return
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
        setCanScrollLeft(scrollLeft > 4)
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4)
    }, [])

    useEffect(() => {
        checkScroll()
        const timer = setTimeout(checkScroll, 120)
        window.addEventListener('resize', checkScroll)
        return () => {
            clearTimeout(timer)
            window.removeEventListener('resize', checkScroll)
        }
    }, [children, checkScroll])

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return
        const scrollAmount = Math.max(scrollRef.current.clientWidth * 0.7, 180)
        scrollRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        })
        setTimeout(checkScroll, 280)
    }

    const handleWheel = (e: React.WheelEvent) => {
        if (!scrollRef.current) return
        // Translate vertical mouse wheel scroll to horizontal scroll
        if (e.deltaY !== 0 && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
            scrollRef.current.scrollLeft += e.deltaY
            checkScroll()
        }
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return
        isDragging.current = true
        hasMoved.current = false
        startX.current = e.pageX - scrollRef.current.offsetLeft
        scrollStart.current = scrollRef.current.scrollLeft
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current || !scrollRef.current) return
        const x = e.pageX - scrollRef.current.offsetLeft
        const walk = (x - startX.current) * 1.3
        if (Math.abs(walk) > 4) {
            hasMoved.current = true
        }
        scrollRef.current.scrollLeft = scrollStart.current - walk
        checkScroll()
    }

    const handleMouseUpOrLeave = () => {
        isDragging.current = false
        checkScroll()
    }

    const handleClickCapture = (e: React.MouseEvent) => {
        if (hasMoved.current) {
            e.stopPropagation()
            e.preventDefault()
            setTimeout(() => {
                hasMoved.current = false
            }, 60)
        }
    }

    return (
        <div className={styles.sliderWrapper}>
            {canScrollLeft && (
                <button
                    type="button"
                    className={`${styles.sliderArrow} ${styles.sliderArrowLeft}`}
                    onClick={() => scroll('left')}
                    aria-label="Slide left"
                    title="Slide left"
                >
                    <ChevronLeft size={16} />
                </button>
            )}
            <div
                ref={scrollRef}
                className={`${styles.sliderTrack} ${className}`}
                onScroll={checkScroll}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onClickCapture={handleClickCapture}
            >
                {children}
            </div>
            {canScrollRight && (
                <button
                    type="button"
                    className={`${styles.sliderArrow} ${styles.sliderArrowRight}`}
                    onClick={() => scroll('right')}
                    aria-label="Slide right"
                    title="Slide right"
                >
                    <ChevronRight size={16} />
                </button>
            )}
        </div>
    )
}

export default function ChatBot({ onClose, userProfile, userRequests }: ChatBotProps) {
    const defaultMessage: Message = {
        id: 1,
        text: `Hello ${userProfile?.first_name || 'Residente'}!  Ako ang iyong AI Assistant para sa E-Barangay Gordon Heights. Maaari akong tumulong sa iyong mga dokumento, requirements, at barangay information. Paano kita matutulungan ngayon?`,
        sender: 'bot',
        timestamp: new Date(),
    }

    const [messages, setMessages] = useState<Message[]>(() => {
        // Load from sessionStorage on mount so history survives closing/reopening
        try {
            const saved = sessionStorage.getItem(STORAGE_KEY)
            if (saved) {
                const parsed = JSON.parse(saved)
                // Revive Date objects and clean up old branding from history
                return parsed.map((m: any) => ({
                    ...m,
                    text: m.id === 1 ? m.text.replace(' — powered by Gemini AI', '') : m.text,
                    timestamp: new Date(m.timestamp)
                }))
            }
        } catch { }
        return [defaultMessage]
    })
    const [inputValue, setInputValue] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const handleNewChat = () => {
        try {
            sessionStorage.removeItem(STORAGE_KEY)
        } catch { }
        setMessages([defaultMessage])
    }

    // Save messages to sessionStorage whenever they change
    useEffect(() => {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
        } catch { }
    }, [messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const formatText = (text: string) => {
        // Convert **bold** and bullet points to proper formatting
        const lines = text.split('\n')
        return lines.map((line, lineIdx) => {
            const parts = line.split(/(\*\*.*?\*\*)/g)
            const formatted = parts.map((part, partIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={partIdx}>{part.slice(2, -2)}</strong>
                }
                return part
            })
            return (
                <span key={lineIdx}>
                    {formatted}
                    {lineIdx < lines.length - 1 && <br />}
                </span>
            )
        })
    }

    const handleSend = async (message?: string) => {
        const textToSend = message || inputValue.trim()
        if (!textToSend || isTyping) return

        const userMessage: Message = {
            id: Date.now(),
            text: textToSend,
            sender: 'user',
            timestamp: new Date(),
        }
        setMessages(prev => [...prev, userMessage])
        setInputValue('')
        setIsTyping(true)

        try {
            // Build user context for the AI
            const pendingRequests = userRequests
                ?.filter(r => r.status === 'pending' || r.status === 'processing')
                .map(r => `${cleanDocType(r.document_type)} (${r.status})`) || []

            // Send conversation history so AI remembers context
            const historyToSend = messages.slice(-10).map(m => ({
                sender: m.sender,
                text: typeof m.text === 'string' ? m.text : ''
            }))

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: textToSend,
                    conversationHistory: historyToSend,
                    userContext: {
                        name: userProfile?.first_name || userProfile?.full_name || 'Resident',
                        isVerified: userProfile?.is_verified || false,
                        isRejected: userProfile?.is_rejected || false,
                        hasIdUploaded: !!userProfile?.id_document_url,
                        pendingRequests
                    }
                })
            })


            const data = await response.json()

            if (!response.ok || data.error) {
                throw new Error(data.error || 'AI unavailable')
            }

            const botMessage: Message = {
                id: Date.now() + 1,
                text: data.reply,
                sender: 'bot',
                timestamp: new Date(),
            }
            setMessages(prev => [...prev, botMessage])

        } catch (error) {
            // Graceful fallback to keyword matching
            const fallback = getFallbackResponse(textToSend, userProfile, userRequests)
            const botMessage: Message = {
                id: Date.now() + 1,
                text: fallback,
                sender: 'bot',
                timestamp: new Date(),
            }
            setMessages(prev => [...prev, botMessage])
        } finally {
            setIsTyping(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div className={styles.chatContainer} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.chatHeader}>
                    <div className={styles.headerInfo}>
                        <div className={styles.botAvatar}>
                            <img src="/logo.png" alt="Barangay Logo" />
                        </div>
                        <div>
                            <h3>AI Assistant</h3>
                            <span className={styles.status}>
                                <span className={styles.statusDot}></span>
                                Online
                            </span>
                        </div>
                    </div>
                    <div className={styles.headerRight}>
                        {messages.length > 1 && (
                            <button
                                className={styles.newChatButton}
                                onClick={handleNewChat}
                                title="Bagong chat / I-reset ang usapan"
                            >
                                Bagong Chat
                            </button>
                        )}
                        <button className={styles.closeButton} onClick={onClose} aria-label="Close AI Assistant">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className={styles.messagesContainer}>
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`${styles.message} ${message.sender === 'user' ? styles.userMessage : styles.botMessage}`}
                        >
                            {message.sender === 'bot' && (
                                <div className={styles.messageAvatar}>
                                    <img src="/logo.png" alt="Bot" />
                                </div>
                            )}
                            <div className={styles.messageContent}>
                                <div className={styles.messageText}>
                                    {message.sender === 'bot' ? formatText(message.text) : message.text}
                                </div>
                                <div className={styles.messageTime}>
                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                            {message.sender === 'user' && (
                                <div className={styles.messageAvatar} style={{ background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                    {userProfile?.profile_picture_url ? (
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resident-profile-pictures/${userProfile.profile_picture_url}`}
                                            alt="You"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.onerror = null;
                                                target.style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        userProfile?.full_name?.charAt(0)?.toUpperCase() || 'U'
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {isTyping && (
                        <div className={`${styles.message} ${styles.botMessage}`}>
                            <div className={styles.messageAvatar}>
                                <img src="/logo.png" alt="Bot" />
                            </div>
                            <div className={styles.typingIndicator}>
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Unified Quick Chat Options Strip */}
                <div className={styles.quickChatStrip}>
                    <SlidableRow>
                        {quickReplies.map((reply, index) => (
                            <button
                                key={`quick-${index}`}
                                className={styles.quickChatButton}
                                onClick={() => handleSend(reply.prompt)}
                                disabled={isTyping}
                            >
                                {reply.label}
                            </button>
                        ))}
                    </SlidableRow>
                </div>

                {/* Input */}
                <div className={styles.inputContainer}>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Ask me anything about barangay services..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isTyping}
                    />
                    <button
                        className={styles.sendButton}
                        onClick={() => handleSend()}
                        disabled={!inputValue.trim() || isTyping}
                    >
                        ➤
                    </button>
                </div>
            </div>
        </div>
    )
}
