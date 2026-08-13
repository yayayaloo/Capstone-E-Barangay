'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function logAdminAction(action: string, description: string, performedByParam?: string) {
    try {
        const supabase = createSupabaseServerClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        const performed_by = user?.id || performedByParam
        if (!performed_by) return;

        const { error } = await supabase
            .from('audit_logs')
            .insert({
                action,
                description,
                performed_by
            });
            
        if (error) {
            console.error('Failed to write audit log:', error);
        }
    } catch (e) {
        console.error('Error in logAdminAction:', e);
    }
}

