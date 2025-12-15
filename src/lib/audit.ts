import { supabase } from "@/integrations/supabase/client";

export async function createAuditEntry(userId: string, action: string, description: string) {
  try {
    // Try RPC first
    const { error: rpcError } = await supabase.rpc("create_audit_entry", {
      p_user_id: userId,
      p_action: action,
      p_description: description,
    });

    if (rpcError) {
      console.error("RPC audit entry error:", rpcError);
      
      // Fallback: try direct insert
      const { error: insertError } = await supabase
        .from("audit_trail")
        .insert({
          user_id: userId,
          action: action,
          description: description,
        });
      
      if (insertError) {
        console.error("Direct insert audit entry error:", insertError);
      } else {
        console.log("Audit entry created via direct insert:", action);
      }
    } else {
      console.log("Audit entry created via RPC:", action);
    }
  } catch (err) {
    console.error("Audit entry error:", err);
    
    // Last resort fallback
    try {
      await supabase
        .from("audit_trail")
        .insert({
          user_id: userId,
          action: action,
          description: description,
        });
    } catch (fallbackErr) {
      console.error("Fallback audit entry error:", fallbackErr);
    }
  }
}
