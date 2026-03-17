// Database types matching Supabase schema

export type UserRole = 'resident' | 'admin'

export type RequestStatus = 'pending' | 'processing' | 'ready' | 'completed' | 'rejected'

export type AnnouncementCategory = 'community_event' | 'important' | 'emergency' | 'general'

export interface Profile {
    id: string
    full_name: string
    email: string
    address: string | null
    phone: string | null
    role: UserRole
    resident_qr_id: string | null
    created_at: string
    updated_at: string
}

export interface ServiceRequest {
    id: string
    resident_id: string
    document_type: string
    purpose: string | null
    status: RequestStatus
    notes: string | null
    qr_code_ref: string | null
    attachment_url: string | null
    created_at: string
    updated_at: string
    // Joined fields
    resident_name?: string
}

export interface Announcement {
    id: string
    title: string
    content: string
    category: AnnouncementCategory
    author_id: string
    published_at: string
    updated_at: string
    // Joined fields
    author_name?: string
}

export interface QRVerification {
    id: string
    document_ref: string
    document_type: string
    holder_name: string
    is_valid: boolean
    verified_by: string | null
    verified_at: string
}
