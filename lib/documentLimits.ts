import { ServiceRequest } from './types'

/**
 * Configured cooldown periods (in days) per document type.
 * A resident must wait this many days after document issuance before
 * submitting another request for the same document type.
 */
export const DOCUMENT_COOLDOWN_DAYS: Record<string, number> = {
    'Barangay Clearance': 30, // 30-day cooldown after issuance
    'Certificate of Residency': 30, // 30-day cooldown after issuance
    'Certificate of Indigency': 30, // 30-day cooldown after issuance
    'Lot Certification': 90, // 90-day cooldown after issuance
    'Business Clearance': 90, // 90-day cooldown after issuance
    'First Time Job Seeker': 365, // 365-day cooldown (1 year under RA 11261)
}

export const DEFAULT_COOLDOWN_DAYS = 30

/**
 * Normalizes document type strings into standardized canonical keys
 * to ensure consistent comparisons regardless of minor formatting differences.
 */
export function normalizeDocumentType(type: string | undefined | null): string {
    if (!type) return ''
    const t = type.trim().toLowerCase()
    if (t.includes('indigency') || t.includes('indigent')) return 'Certificate of Indigency'
    if (t.includes('job seeker') || t.includes('jobseeker') || t.includes('first time')) return 'First Time Job Seeker'
    if (t.includes('business')) return 'Business Clearance'
    if (t.includes('lot') || t.includes('building') || t.includes('occupancy') || t.includes('fencing')) return 'Lot Certification'
    if (t.includes('residency') || t.includes('residente')) return 'Certificate of Residency'
    if (t.includes('clearance')) return 'Barangay Clearance'
    return type.trim()
}

/**
 * Returns a human-friendly display name for the document type.
 */
export function getDocumentDisplayName(type: string | undefined | null): string {
    const normalized = normalizeDocumentType(type)
    if (normalized === 'Lot Certification') return 'Lot / Building Certification'
    return normalized || type || 'Document'
}

/**
 * Returns the configured cooldown period (in days) for a given document type.
 */
export function getCooldownDays(documentType: string): number {
    const normalized = normalizeDocumentType(documentType)
    return DOCUMENT_COOLDOWN_DAYS[normalized] ?? DEFAULT_COOLDOWN_DAYS
}

export interface DocumentEligibility {
    allowed: boolean
    reason?: 'pending' | 'processing' | 'ready' | 'cooldown'
    message?: string
    availableAt?: Date
    daysRemaining?: number
    cooldownDays?: number
    activeRequest?: {
        id: string
        document_type: string
        status: string
        created_at: string
        issued_at?: string | null
    }
}

function formatDate(dateInput: string | Date | undefined | null): string {
    if (!dateInput) return ''
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    })
}

/**
 * Checks whether a resident is eligible to submit a request for a specific document type.
 *
 * Rules:
 * 1. If an active request exists with status 'pending' or 'processing', the resident cannot submit another.
 * 2. If a request is 'ready' (approved and waiting for pickup), the resident cannot submit another.
 * 3. If a request was recently issued ('completed' or 'ready' with issued_at), the configured cooldown period applies.
 * 4. Requests with status 'rejected' do NOT restrict new submissions.
 */
export function checkDocumentEligibility(
    existingRequests: Partial<ServiceRequest>[],
    requestedType: string,
    now: Date = new Date()
): DocumentEligibility {
    const normalizedTarget = normalizeDocumentType(requestedType)
    const displayName = getDocumentDisplayName(requestedType)

    if (!normalizedTarget) {
        return { allowed: true }
    }

    // Filter requests matching this document type, excluding rejected requests
    const relevantRequests = (existingRequests || []).filter(r => {
        if (!r.document_type) return false
        return normalizeDocumentType(r.document_type) === normalizedTarget
    })

    if (relevantRequests.length === 0) {
        return { allowed: true }
    }

    // 1. Check for Pending request
    const pendingReq = relevantRequests.find(r => r.status === 'pending')
    if (pendingReq) {
        const filedDate = formatDate(pendingReq.created_at)
        return {
            allowed: false,
            reason: 'pending',
            activeRequest: {
                id: pendingReq.id || '',
                document_type: pendingReq.document_type || requestedType,
                status: 'pending',
                created_at: pendingReq.created_at || '',
                issued_at: pendingReq.issued_at
            },
            message: `You already have an active request for ${displayName}${filedDate ? ` submitted on ${filedDate}` : ''}. Please wait for Barangay Administrators to review and process your current request before submitting another one.`
        }
    }

    // 2. Check for Processing request
    const processingReq = relevantRequests.find(r => r.status === 'processing')
    if (processingReq) {
        return {
            allowed: false,
            reason: 'processing',
            activeRequest: {
                id: processingReq.id || '',
                document_type: processingReq.document_type || requestedType,
                status: 'processing',
                created_at: processingReq.created_at || '',
                issued_at: processingReq.issued_at
            },
            message: `Your request for ${displayName} is currently being processed by the Barangay. You cannot submit another request for this document until processing is finalized.`
        }
    }

    // 3. Check for Ready request (waiting for pickup)
    const readyReq = relevantRequests.find(r => r.status === 'ready')
    if (readyReq) {
        return {
            allowed: false,
            reason: 'ready',
            activeRequest: {
                id: readyReq.id || '',
                document_type: readyReq.document_type || requestedType,
                status: 'ready',
                created_at: readyReq.created_at || '',
                issued_at: readyReq.issued_at
            },
            message: `Your ${displayName} has already been approved and is ready for pickup at the Barangay Gordon Heights Hall. Please claim your document before requesting a new one.`
        }
    }

    // 4. Check for Cooldown after issuance (completed or records with issued_at)
    const cooldownDays = getCooldownDays(normalizedTarget)
    const issuedRequests = relevantRequests.filter(r => {
        if (r.status === 'rejected') return false
        return r.status === 'completed' || !!r.issued_at
    })

    if (issuedRequests.length > 0) {
        // Sort by issuance date descending to check the most recent
        issuedRequests.sort((a, b) => {
            const dateA = new Date(a.issued_at || a.updated_at || a.created_at || 0).getTime()
            const dateB = new Date(b.issued_at || b.updated_at || b.created_at || 0).getTime()
            return dateB - dateA
        })

        const latestIssued = issuedRequests[0]
        const issueDateRaw = latestIssued.issued_at || latestIssued.updated_at || latestIssued.created_at
        if (issueDateRaw) {
            const issueDate = new Date(issueDateRaw)
            if (!isNaN(issueDate.getTime())) {
                const availableAt = new Date(issueDate.getTime() + cooldownDays * 24 * 60 * 60 * 1000)

                if (now.getTime() < availableAt.getTime()) {
                    const diffMs = availableAt.getTime() - now.getTime()
                    const daysRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
                    const formattedAvailableDate = formatDate(availableAt)
                    const formattedIssueDate = formatDate(issueDate)

                    return {
                        allowed: false,
                        reason: 'cooldown',
                        availableAt,
                        daysRemaining,
                        cooldownDays,
                        activeRequest: {
                            id: latestIssued.id || '',
                            document_type: latestIssued.document_type || requestedType,
                            status: latestIssued.status || 'completed',
                            created_at: latestIssued.created_at || '',
                            issued_at: latestIssued.issued_at
                        },
                        message: `You were issued a ${displayName}${formattedIssueDate ? ` on ${formattedIssueDate}` : ''}. A ${cooldownDays}-day cooldown period applies to this document to prevent duplicate issuances. You may request this document again on ${formattedAvailableDate} (in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}).`
                    }
                }
            }
        }
    }

    return { allowed: true }
}
