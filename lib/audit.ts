import { supabase } from '@/lib/supabase'

export async function logAdminAction(action: string, description: string, performed_by: string) {
    if (!performed_by) return;
    
    try {
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
