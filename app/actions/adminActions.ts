'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

async function assertAdmin() {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
        throw new Error('Unauthorized: You must be logged in to perform this action.')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        throw new Error('Forbidden: Only administrators can perform this action.')
    }

    return { supabase, user }
}

export async function verifyResidentAction(residentId: string, customIdNumber?: string) {
    const { supabase } = await assertAdmin()

    let resident_id_number = customIdNumber
    if (!resident_id_number) {
        try {
            const { data: generatedId } = await supabase.rpc('generate_resident_id')
            if (generatedId) resident_id_number = generatedId
        } catch {
            // fallback
        }
    }

    if (!resident_id_number) {
        resident_id_number = `GH-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`
    }

    const { data, error } = await supabase
        .from('profiles')
        .update({
            is_verified: true,
            is_rejected: false,
            resident_id_number: resident_id_number,
            updated_at: new Date().toISOString()
        })
        .eq('id', residentId)
        .select()
        .single()

    if (error) throw new Error(error.message)

    revalidatePath('/admin')
    revalidatePath('/resident')
    return data
}

export async function rejectResidentAction(residentId: string) {
    const { supabase } = await assertAdmin()

    const { data, error } = await supabase
        .from('profiles')
        .update({
            is_verified: false,
            is_rejected: true,
            updated_at: new Date().toISOString()
        })
        .eq('id', residentId)
        .select()
        .single()

    if (error) throw new Error(error.message)

    revalidatePath('/admin')
    revalidatePath('/resident')
    return data
}

export async function deleteAnnouncementAction(announcementId: string) {
    const { supabase } = await assertAdmin()

    const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcementId)

    if (error) throw new Error(error.message)

    revalidatePath('/admin')
    revalidatePath('/resident')
    return { success: true }
}

export async function saveBlotterReportAction(blotterData: any) {
    const { supabase, user } = await assertAdmin()

    let data, error
    if (blotterData.id) {
        const result = await supabase
            .from('blotter_reports')
            .update({
                complainant: blotterData.complainant,
                respondent: blotterData.respondent,
                incident_details: blotterData.incident_details,
                incident_date: blotterData.incident_date,
                location: blotterData.location,
                status: blotterData.status,
                updated_at: new Date().toISOString()
            })
            .eq('id', blotterData.id)
            .select()
            .single()
        data = result.data
        error = result.error
    } else {
        const result = await supabase
            .from('blotter_reports')
            .insert({
                complainant: blotterData.complainant,
                respondent: blotterData.respondent,
                incident_details: blotterData.incident_details,
                incident_date: blotterData.incident_date,
                location: blotterData.location,
                status: blotterData.status || 'Pending',
                created_by: user.id
            })
            .select()
            .single()
        data = result.data
        error = result.error
    }

    if (error) throw new Error(error.message)

    revalidatePath('/admin')
    return data
}

export async function updateComplaintStatusAction(complaintId: string, status: string, adminNotes: string | null) {
    const { supabase } = await assertAdmin()

    const { data, error } = await supabase
        .from('complaints')
        .update({
            status,
            admin_notes: adminNotes,
            updated_at: new Date().toISOString()
        })
        .eq('id', complaintId)
        .select()
        .single()

    if (error) throw new Error(error.message)

    revalidatePath('/admin')
    revalidatePath('/resident')
    return data
}
