import { mockDocuments, mockFolders } from "@/data/mock/documents";
import type { Document, Folder } from "@/data/types";

export async function getDocuments(filters?: {
  projectId?: string;
  folderId?: string;
  type?: string;
}): Promise<Document[]> {
  let result = [...mockDocuments];
  if (filters?.projectId)
    result = result.filter((d) => d.projectId === filters.projectId);
  if (filters?.folderId)
    result = result.filter((d) => d.folderId === filters.folderId);
  if (filters?.type)
    result = result.filter((d) => d.type === filters.type);
  return result.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export async function getFolders(): Promise<Folder[]> {
  return [...mockFolders];
}
