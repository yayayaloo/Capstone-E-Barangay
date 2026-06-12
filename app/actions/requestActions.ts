'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function submitDocumentRequest(payload: {
    resident_id: string
    document_type: string
    purpose: string
    attachment_url: string | null
    status: string
    form_data?: Record<string, any> | null
}) {
    const supabase = createSupabaseServerClient()

    // 1. Verify user session securely
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
        throw new Error('Unauthorized: You must be logged in to submit a request.')
    }

    // 2. Enforce ownership: matching logged-in user ID with resident_id
    if (user.id !== payload.resident_id) {
        throw new Error('Unauthorized: You cannot submit a request on behalf of another resident.')
    }

    const { data, error } = await supabase
        .from('service_requests')
        .insert({
            resident_id: payload.resident_id,
            document_type: payload.document_type,
            purpose: payload.purpose,
            attachment_url: payload.attachment_url,
            status: 'pending', // Force status to 'pending' regardless of client payload
            form_data: payload.form_data || {}
        })
        .select()
        .single()

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/resident')
    revalidatePath('/admin')
    return data
}

export async function updateRequestStatus(
    requestId: string,
    newStatus: string,
    qrCodeRef: string | null = null,
    note: string | null = null,
    documentType: string | null = null
) {
    const supabase = createSupabaseServerClient()

    // 1. Verify user session securely
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
        throw new Error('Unauthorized: You must be logged in to perform this action.')
    }

    // 2. Retrieve role from profiles (source of truth)
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        throw new Error('Forbidden: Only administrators can update request status.')
    }

    const updateData: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString()
    }

    // Always save admin note/reason if provided
    if (note !== null && note !== undefined) {
        updateData.notes = note || null
    }

    // When marking as ready, generate QR + issue/expiry dates
    if (newStatus === 'ready' && qrCodeRef) {
        updateData.qr_code_ref = qrCodeRef
        updateData.issued_at = new Date().toISOString()

        // Calculate expiration based on document type
        const expirationDate = new Date()
        const type = (documentType || '').toLowerCase()
        if (type.includes('job seeker') || type.includes('first time') || type.includes('business')) {
            // Job seeker & business = 1 year
            expirationDate.setFullYear(expirationDate.getFullYear() + 1)
        } else {
            // All others = 6 months
            expirationDate.setMonth(expirationDate.getMonth() + 6)
        }
        updateData.expires_at = expirationDate.toISOString()
    }

    const { data, error } = await supabase
        .from('service_requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single()

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/admin')
    revalidatePath('/resident')
    return data
}
