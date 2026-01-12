import { supabase } from "@/integrations/supabase/client";

// Define all audit event types for type safety and consistency
export type AuditEventType =
  | "LOGIN"
  | "LOGOUT"
  | "IJAZAH_CREATE"
  | "IJAZAH_DELETE"
  | "IJAZAH_SIGN"
  | "IJAZAH_VERIFY"
  | "IJAZAH_VIEW"
  | "IJAZAH_DOWNLOAD"
  | "SERTIFIKAT_CREATE"
  | "SERTIFIKAT_DELETE"
  | "SERTIFIKAT_SIGN"
  | "SERTIFIKAT_VERIFY"
  | "SERTIFIKAT_VIEW"
  | "SERTIFIKAT_DOWNLOAD"
  | "DOCUMENT_UPLOAD"
  | "DOCUMENT_DELETE"
  | "DOCUMENT_SIGN"
  | "DOCUMENT_VERIFY"
  | "DOCUMENT_VIEW"
  | "DOCUMENT_DOWNLOAD"
  | "CERTIFICATE_PUBLISH"
  | "CERTIFICATE_REVOKE"
  | "PASSPHRASE_CHANGE"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "TEMPLATE_CREATE"
  | "TEMPLATE_UPDATE"
  | "TEMPLATE_DELETE"
  | "CREATE_DOCUMENT"
  | "DELETE_DOCUMENT"
  | "SIGN_DOCUMENT_SERVER"
  | "SIGN_DOCUMENT_SERVER_FAILURE"
  | "VIEW_SIGNED_DOCUMENT"
  | "DOCUMENT_VERIFY"
  | "VERIFY_DOCUMENT"
  | "VERIFY_PORTAL"
  | "TEST_LOGIN"
  | "DOWNLOAD_DOCUMENT"
  | "REVOKE_CERTIFICATE";

export async function createAuditEntry(
  userId: string,
  action: AuditEventType,
  description: string
) {
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
