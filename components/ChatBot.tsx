'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './ChatBot.module.css'

import { ServiceRequest, Profile } from '@/lib/types'

interface Message {
    id: number
    text: string | React.ReactNode
    sender: 'user' | 'bot'
    timestamp: Date
}

interface ChatBotProps {
    onClose: () => void
    userProfile?: Profile | null
    userRequests?: ServiceRequest[]
}

// Expert Knowledge Base
const KNOWLEDGE_BASE = {
    clearance: {
        keywords: ['clearance', 'barangay clearance', 'certificate of clearance'],
        response: (name: string) => `To apply for a **Barangay Clearance**, ${name ? name + ', ' : ''}you'll need:\n\n1. **Valid ID** (Government issued)\n2. **Recent Cedula** (Community Tax Certificate)\n3. **Application Fee** (approx. ₱50-100)\n\nYou can submit your request directly through the "Request Document" button on your dashboard.`,
        action: 'Request Document'
    },
    permits: {
        keywords: ['permit', 'business permit', 'construction', 'building permit'],
        response: () => `For **Business or Construction Permits**, the requirements include:\n\n• DTI/SEC Registration\n• Contract of Lease or Title\n• Detailed Plan (for construction)\n• Clearance from Barangay Office\n\nWould you like me to show you where to upload these documents?`,
    },
    id_request: {
        keywords: ['id', 'barangay id', 'digital id', 'identification'],
        response: (isVerified: boolean) => isVerified 
            ? `Your **E-Barangay Digital ID** is already active and verified! You can view the QR code on your profile tab for instant verification.`
            : `To get your **Barangay ID**, ensure your profile is complete with a valid ID upload. Once the Admin verifies your residency, your Digital ID will be automatically generated.`,
    },
    qr_verification: {
        keywords: ['qr', 'verify', 'verification', 'scan'],
        response: () => `Our **QR Verification system** ensures all documents are authentic. Each issued clearance or ID has a unique QR code that, when scanned by authorities, confirms your record in our secure database.`,
    },
    status_check: {
        keywords: ['status', 'my request', 'track', 'pending', 'check'],
        response: (requests?: ServiceRequest[]) => {
            if (!requests || requests.length === 0) return "You don't have any active service requests at the moment. Would you like to start one?";
            const pending = requests.filter(r => r.status === 'pending' || r.status === 'processing');
            if (pending.length === 0) return `All your recent requests are completed! You can view them in the "My Requests" tab.`;
            return `You have **${pending.length} pending request(s)**:\n${pending.map(r => `• ${r.document_type} (${r.status})`).join('\n')}\n\nYou'll get an update once they are ready for pickup!`;
        }
    },
    gordon_heights: {
        keywords: ['gordon heights', 'barangay info', 'location', 'hall'],
        response: () => `Barangay Gordon Heights is one of the largest barangays in Olongapo City. Our Barangay Hall is located at the heart of the community and is open Monday-Friday, 8AM to 5PM.`,
    }
}

const quickReplies = [
    'How to get Barangay Clearance?',
    'Check my request status',
    'What is QR Verification?',
    'Office hours and location',
]

export default function ChatBot({ onClose, userProfile, userRequests }: ChatBotProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            text: `Hello ${userProfile?.first_name || 'Resident'}! I'm your AI assistant for E-Barangay Gordon Heights. How can I assist you today?`,
            sender: 'bot',
            timestamp: new Date(),
        }
    ])
    const [inputValue, setInputValue] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const getBotResponse = (userMessage: string): string | React.ReactNode => {
        const lowerMessage = userMessage.toLowerCase()

        // 1. Check for specific status query
        if (lowerMessage.includes('status') || lowerMessage.includes('track') || lowerMessage.includes('my request')) {
            return KNOWLEDGE_BASE.status_check.response(userRequests)
        }

        // 2. Check for ID related query
        if (lowerMessage.includes('id') || lowerMessage.includes('identification')) {
            return KNOWLEDGE_BASE.id_request.response(userProfile?.is_verified || false)
        }

        // 3. General Keyword Matching
        if (lowerMessage.includes('clearance')) return KNOWLEDGE_BASE.clearance.response(userProfile?.first_name || '')
        if (lowerMessage.includes('permit')) return KNOWLEDGE_BASE.permits.response()
        if (lowerMessage.includes('qr') || lowerMessage.includes('verify')) return KNOWLEDGE_BASE.qr_verification.response()
        if (lowerMessage.includes('gordon') || lowerMessage.includes('hall')) return KNOWLEDGE_BASE.gordon_heights.response()
        
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return `Hello ${userProfile?.first_name || 'Resident'}! I'm your E-Barangay assistant. I can help you with documents, status updates, or general info. What's on your mind?`
        }

        if (lowerMessage.includes('help')) {
            return "I can help you with:\n• Requesting **Clearances & Permits**\n• Checking your **Application Status**\n• Understanding **QR Verification**\n• **Barangay ID** information\n\nJust type what you're looking for!"
        }

        // Default response
        return "I'm not quite sure about that specific query. Since I'm still learning, could you try asking about 'Clearance requirements', 'My request status', or 'QR verification'?"
    }

    // Simple formatter for bot messages
    const formatText = (text: string | React.ReactNode) => {
        if (typeof text !== 'string') return text;
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    }

    const handleSend = (message?: string) => {
        const textToSend = message || inputValue.trim()
        if (!textToSend) return

        // Add user message
        const userMessage: Message = {
            id: messages.length + 1,
            text: textToSend,
            sender: 'user',
            timestamp: new Date(),
        }
        setMessages(prev => [...prev, userMessage])
        setInputValue('')
        setIsTyping(true)

        // Simulate bot thinking and response
        setTimeout(() => {
            const botResponse: Message = {
                id: messages.length + 2,
                text: getBotResponse(textToSend),
                sender: 'bot',
                timestamp: new Date(),
            }
            setMessages(prev => [...prev, botResponse])
            setIsTyping(false)
        }, 1000 + Math.random() * 1000)
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
                        <div className={styles.botAvatar}>🤖</div>
                        <div>
                            <h3>AI Assistant</h3>
                            <span className={styles.status}>
                                <span className={styles.statusDot}></span>
                                Online
                            </span>
                        </div>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>
                        ✕
                    </button>
                </div>

                {/* Messages */}
                <div className={styles.messagesContainer}>
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`${styles.message} ${message.sender === 'user' ? styles.userMessage : styles.botMessage
                                }`}
                        >
                            {message.sender === 'bot' && (
                                <div className={styles.messageAvatar}>🤖</div>
                            )}
                            <div className={styles.messageContent}>
                                <div className={styles.messageText}>{formatText(message.text)}</div>
                                <div className={styles.messageTime}>
                                    {message.timestamp.toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                            {message.sender === 'user' && (
                                <div className={styles.messageAvatar}>👤</div>
                            )}
                        </div>
                    ))}

                    {isTyping && (
                        <div className={`${styles.message} ${styles.botMessage}`}>
                            <div className={styles.messageAvatar}>🤖</div>
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
                        placeholder="Type your message..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                    />
                    <button
                        className={styles.sendButton}
                        onClick={() => handleSend()}
                        disabled={!inputValue.trim()}
                    >
                        ➤
                    </button>
                </div>
            </div>
        </div>
    )
}
