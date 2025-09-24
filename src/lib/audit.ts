import { supabase } from "@/integrations/supabase/client";

export async function createAuditEntry(
  userId: string,
  action: string,
  description: string
) {
  try {
    const { error } = await supabase.rpc('create_audit_entry', {
      p_user_id: userId,
      p_action: action,
      p_description: description
    });
    
    if (error) {
      console.error('Error creating audit entry:', error);
    }
  } catch (err) {
    console.error('Audit entry error:', err);
  }
}