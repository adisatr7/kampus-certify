import { UserDocument } from "@/types";

export function getWorkflowStatusText(document: UserDocument): string | null {
  if (!document.metadata) return null;
  
  const metadata = document.metadata as any;
  const workflowStage = metadata.workflow_stage;
  
  if (!workflowStage) return null;
  
  // General workflow status mapping
  switch (workflowStage) {
    case "pending":
      return "Menunggu Penandatanganan";
    
    case "partially_signed":
      return "Sebagian Ditandatangani";
    
    case "completed":
      return "Selesai Ditandatangani";
    
    // Legacy specific stages (for backward compatibility)
    case "dekan_pending":
      return "Menunggu Penandatanganan";
    
    case "rektor_pending":
      return "Menunggu Penandatanganan";
    
    case "dekan_signed_waiting_rektor":
      return "Sebagian Ditandatangani";
    
    default:
      // If it contains "pending", show as waiting
      if (workflowStage.includes("pending")) {
        return "Menunggu Penandatanganan";
      }
      
      // If it contains "signed" but not "completed", show as partial
      if (workflowStage.includes("signed") && !workflowStage.includes("completed")) {
        return "Sebagian Ditandatangani";
      }
      
      return null;
  }
}

export function getSigningProgress(document: UserDocument): { current: number; total: number } | null {
  if (!document.metadata) return null;
  
  const metadata = document.metadata as any;
  
  // Count total signers needed
  let totalSigners = 0;
  let currentSigners = 0;
  
  // Check for dekan
  if (metadata.dekan_id) {
    totalSigners++;
    if (metadata.dekan_signed) currentSigners++;
  }
  
  // Check for rektor
  if (metadata.rektor_id) {
    totalSigners++;
    if (metadata.rektor_signed) currentSigners++;
  }
  
  // Check for other signers (future extensibility)
  if (metadata.signers && Array.isArray(metadata.signers)) {
    totalSigners += metadata.signers.length;
    currentSigners += metadata.signers.filter((s: any) => s.signed).length;
  }
  
  // If no specific signers defined, assume single signer
  if (totalSigners === 0) {
    totalSigners = 1;
    currentSigners = document.status === "signed" ? 1 : 0;
  }
  
  return { current: currentSigners, total: totalSigners };
}

export function determineWorkflowStage(document: UserDocument, signerUserId: string): string {
  if (!document.metadata) return "pending";
  
  const metadata = document.metadata as any;
  const progress = getSigningProgress(document);
  
  if (!progress) return "pending";
  
  // If all signers have signed, it's completed
  if (progress.current >= progress.total) {
    return "completed";
  }
  
  // If some have signed but not all, it's partially signed
  if (progress.current > 0) {
    return "partially_signed";
  }
  
  // If none have signed, it's pending
  return "pending";
}