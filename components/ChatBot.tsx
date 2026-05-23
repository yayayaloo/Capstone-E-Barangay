'use client'

import { useState, useRef, useEffect } from 'react'
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

const quickReplies = [
    'Paano makuha ang Barangay Clearance?',
    'Paano ang Barangay Certification?',
    'Ano ang Business Clearance?',
    'First Time Job Seeker - paano?',
    'Ano ang Certificate of Indigency?',
    'Paano ang Lot Certification?',
    'I-check ang aking request status',
    'Kailan bukas ang Barangay Hall?',
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

    if (lower.includes('status') || lower.includes('track') || lower.includes('request') || lower.includes('pending')) {
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
            ? `Mayroon kang ${pending.length} aktibong request:\n${pending.map(r => `• ${r.document_type} (${r.status})`).join('\n')}`
            : `You have ${pending.length} active request(s):\n${pending.map(r => `• ${r.document_type} (${r.status})`).join('\n')}`
    }

    if (lower.includes('clearance') && !lower.includes('business')) return tl
        ? 'Para sa **Barangay Clearance**, kailangan mo ng:\n• Valid Government ID\n• Bayad: ₱50.00\nI-click ang "Request Document" para mag-apply!'
        : 'For **Barangay Clearance**, you need:\n• Valid Government ID\n• Fee: ₱50.00\nClick "Request Document" to apply!'

    if (lower.includes('certification') || lower.includes('residency') || lower.includes('tirahan') || lower.includes('loan') || lower.includes('good moral')) return tl
        ? 'Para sa **Barangay Certification**, kailangan mo ng:\n• Valid Government ID\n• Layunin: Residency, Loan, o Good Moral Character\n• Bayad: ₱50.00\nI-click ang "Request Document" para mag-apply!'
        : 'For **Barangay Certification**, you need:\n• Valid Government ID\n• Purpose: Residency, Loan, or Good Moral Character\n• Fee: ₱50.00\nClick "Request Document" to apply!'

    if (lower.includes('business clearance') || lower.includes('negosyo') || lower.includes('business permit')) return tl
        ? 'Para sa **Business Clearance**, kailangan mo ng:\n• DTI Certificate\n• Bayad: **Libre (Free)**\n• Para sa mga negosyante para sa compliance ng business permit.\nI-click ang "Request Document" para mag-apply!'
        : 'For **Business Clearance**, you need:\n• DTI Certificate\n• Fee: **Free**\n• For business owners for compliance with business permit.\nClick "Request Document" to apply!'

    if (lower.includes('lot') || lower.includes('occupancy') || lower.includes('fencing') || lower.includes('building')) return tl
        ? 'Para sa **Lot Certification**, kailangan mo ng:\n• Certification mula sa Purok Leader\n• Titulo o Tax Declaration\n• Latest Tax Payment\n• Bayad: ₱1.00 per square meter\nI-click ang "Request Document" para mag-apply!'
        : 'For **Lot Certification**, you need:\n• Certification from Purok Leader\n• Title or Tax Declaration\n• Latest Tax Payment\n• Fee: ₱1.00 per square meter\nClick "Request Document" to apply!'

    if (lower.includes('first time') || lower.includes('job seeker') || lower.includes('ftjs') || lower.includes('trabaho')) return tl
        ? 'Ang **First Time Job Seeker** certificate ay:\n• Para sa mga 18–30 taong gulang\n• Libreng pagkuha ng pre-employment requirements (RA 11261)\n• Bayad: **Libre (Free)**\n• Kailangan: Valid ID\nI-click ang "Request Document" para mag-apply!'
        : 'The **First Time Job Seeker** certificate is:\n• For ages 18–30 years old\n• Free waiver for pre-employment requirements (RA 11261)\n• Fee: **Free**\n• Requirement: Valid ID\nClick "Request Document" to apply!'

    if (lower.includes('indigency') || lower.includes('mahirap') || lower.includes('financial')) return tl
        ? 'Ang **Certificate of Indigency** ay:\n• Patunay ng financial status para sa tulong/assistance\n• Bayad: **Libre (Free)**\n• Kailangan: Valid ID\nI-click ang "Request Document" para mag-apply!'
        : 'The **Certificate of Indigency** is:\n• Proof of financial status for assistance\n• Fee: **Free**\n• Requirement: Valid ID\nClick "Request Document" to apply!'

    if (lower.includes('hours') || lower.includes('open') || lower.includes('bukas') || lower.includes('oras') || lower.includes('location') || lower.includes('hall')) return tl
        ? 'Bukas ang Barangay Hall tuwing Lunes–Biyernes, 8:00 AM – 5:00 PM. Sarado sa Sabado, Linggo, at mga holiday. Tel: 223-5497.'
        : 'Barangay Hall is open Monday–Friday, 8:00 AM – 5:00 PM. Closed on weekends and holidays. Tel: 223-5497.'

    if (lower.includes('id')) return tl
        ? (userProfile?.is_verified ? 'Aktibo na ang iyong Digital ID! Tingnan ang QR code sa Profile tab.' : 'Para makuha ang Barangay ID, kumpletuhin ang iyong profile at hintayin ang verification ng admin.')
        : (userProfile?.is_verified ? 'Your Digital ID is active! View the QR code on your Profile tab.' : 'To get your Barangay ID, complete your profile and wait for admin verification.')

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('kumusta') || lower.includes('hey')) return tl
        ? `Kumusta, ${userProfile?.first_name || 'Residente'}! Paano kita matutulungan ngayon?`
        : `Hello ${userProfile?.first_name || 'Resident'}! How can I help you today?`

    return tl
        ? 'Maaari akong tumulong sa mga dokumento, status ng request, at impormasyon ng barangay. Subukang tanungin: "Paano makuha ang Barangay Clearance?" o "Kailan bukas ang Barangay Hall?"'
        : "I can help with document requests, status tracking, and barangay info. Try asking: 'How to get Barangay Clearance?' or 'What are the office hours?'"
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
                .map(r => `${r.document_type} (${r.status})`) || []

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
                    <button className={styles.closeButton} onClick={onClose}>✕</button>
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

                {/* Quick Replies */}
                {messages.length === 1 && (
                    <div className={styles.quickReplies}>
                        {quickReplies.map((reply, index) => (
                            <button
                                key={index}
                                className={styles.quickReplyButton}
                                onClick={() => handleSend(reply)}
                            >
                                {reply}
                            </button>
                        ))}
                    </div>
                )}

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
