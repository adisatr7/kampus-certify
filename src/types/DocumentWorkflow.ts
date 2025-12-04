export type WorkflowStage = "draft" | "dekan_pending" | "rektor_pending" | "completed";
export type SignerPosition = "signer1" | "signer2";

export interface DocumentWorkflowMetadata {
  workflow_stage: WorkflowStage;
  rektor_id?: string;
  signer1_id?: string;
  signer2_id?: string;
  signer1_signed_at?: string;
  signer2_signed_at?: string;
  created_by_id: string;
}

export interface IjazahWorkflow {
  document_id: string;
  dekan_id: string;
  rektor_id: string;
  dekan_signed_at?: string;
  rektor_signed_at?: string;
  status: "pending_dekan" | "pending_rektor" | "completed";
}

export interface SertifikatWorkflow {
  document_id: string;
  signer1_id: string;
  signer2_id?: string;
  signer1_signed_at?: string;
  signer2_signed_at?: string;
  status: "pending_signer1" | "pending_signer2" | "completed";
}
