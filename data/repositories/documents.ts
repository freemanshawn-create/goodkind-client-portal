import { mockDocuments, mockFolders } from "@/data/mock/documents";
import { getDriveDocuments } from "@/data/repositories/drive-documents";
import type { Document, Folder } from "@/data/types";

export interface DocumentsFilter {
  projectId?: string;
  folderId?: string;
  type?: string;
  /** Google Drive folder ID — when set and Google creds configured, uses Drive. */
  driveFolderId?: string;
}

function useDrive() {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY
  );
}

interface DocumentsResult {
  documents: Document[];
  folders: Folder[];
}

/**
 * Fetch documents + folders. When a driveFolderId is provided and Google
 * credentials are configured, pulls live data from Google Drive. Otherwise
 * falls back to mock data.
 */
export async function getDocumentsAndFolders(
  filter?: DocumentsFilter
): Promise<DocumentsResult> {
  if (useDrive() && filter?.driveFolderId) {
    const { documents, folders } = await getDriveDocuments(filter.driveFolderId);
    return {
      documents: applyFilters(documents, filter),
      folders,
    };
  }

  // Mock fallback
  return {
    documents: applyFilters(mockDocuments, filter),
    folders: [...mockFolders],
  };
}

function applyFilters(docs: Document[], filter?: DocumentsFilter): Document[] {
  let result = [...docs];
  if (filter?.projectId)
    result = result.filter((d) => d.projectId === filter.projectId);
  if (filter?.folderId)
    result = result.filter((d) => d.folderId === filter.folderId);
  if (filter?.type) result = result.filter((d) => d.type === filter.type);
  return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ---- Backwards-compatible exports for existing callers ----

export async function getDocuments(filter?: DocumentsFilter): Promise<Document[]> {
  const { documents } = await getDocumentsAndFolders(filter);
  return documents;
}

export async function getFolders(
  filter?: DocumentsFilter
): Promise<Folder[]> {
  const { folders } = await getDocumentsAndFolders(filter);
  return folders;
}
