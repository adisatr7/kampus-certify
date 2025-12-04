import { UserRole } from "@/types/UserRole";

export interface DocumentAccessConfig {
  canCreate: boolean;
  canSign: boolean;
  canManageTemplate: boolean;
  allowedDocumentTypes: ("ijazah" | "sertifikat" | "surat")[];
}

export function getDocumentAccess(role: UserRole): DocumentAccessConfig {
  switch (role) {
    case "admin":
      return {
        canCreate: true,
        canSign: true,
        canManageTemplate: true,
        allowedDocumentTypes: ["ijazah", "sertifikat", "surat"],
      };

    case "rektor":
      return {
        canCreate: true,
        canSign: true,
        canManageTemplate: false,
        allowedDocumentTypes: ["ijazah", "sertifikat", "surat"],
      };

    case "dekan":
      return {
        canCreate: true,
        canSign: true,
        canManageTemplate: false,
        allowedDocumentTypes: ["ijazah", "sertifikat", "surat"],
      };

    case "dosen":
      return {
        canCreate: true,
        canSign: true,
        canManageTemplate: false,
        allowedDocumentTypes: ["sertifikat", "surat"],
      };

    default:
      return {
        canCreate: false,
        canSign: false,
        canManageTemplate: false,
        allowedDocumentTypes: [],
      };
  }
}

export function canCreateDocument(role: UserRole, documentType: string): boolean {
  const access = getDocumentAccess(role);
  return access.canCreate && access.allowedDocumentTypes.includes(documentType as any);
}

export function canSignDocument(role: UserRole): boolean {
  return getDocumentAccess(role).canSign;
}

export function canManageTemplate(role: UserRole): boolean {
  return getDocumentAccess(role).canManageTemplate;
}
