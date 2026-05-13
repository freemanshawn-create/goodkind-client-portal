/**
 * Google Drive-backed Documents repository.
 *
 * Each Clerk organization stores its root folder ID in publicMetadata.driveFolderId.
 * This repo:
 *   - Lists all files + subfolders recursively under that root
 *   - Maps them to the portal's Document and Folder types
 *   - Categorizes documents by name/mime conventions
 *
 * Files are NOT downloaded directly from Drive on the client — they go through
 * /api/documents/[fileId]/download to keep the service account credentials
 * server-side.
 */

import { getDriveClient } from "@/lib/google-drive";
import type { Document, DocumentType, Folder } from "@/data/types";

const FOLDER_MIME = "application/vnd.google-apps.folder";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  parents?: string[];
  modifiedTime?: string;
  createdTime?: string;
  lastModifyingUser?: { displayName?: string };
}

async function listAllChildren(rootFolderId: string): Promise<DriveFile[]> {
  const drive = getDriveClient();
  const result: DriveFile[] = [];

  // BFS through subfolders so a deeply-nested tree still shows up
  const queue: string[] = [rootFolderId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const folderId = queue.shift()!;
    if (visited.has(folderId)) continue;
    visited.add(folderId);

    let pageToken: string | undefined;
    do {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields:
          "nextPageToken, files(id, name, mimeType, size, parents, modifiedTime, createdTime, lastModifyingUser/displayName)",
        pageSize: 200,
        pageToken,
        // Required to traverse shared drives
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      const files = (res.data.files ?? []) as DriveFile[];
      for (const f of files) {
        result.push(f);
        if (f.mimeType === FOLDER_MIME) {
          queue.push(f.id);
        }
      }
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
  }

  return result;
}

/**
 * Heuristic to bucket a file by name + mime into the portal's DocumentType.
 */
function categorize(file: DriveFile): DocumentType {
  const name = file.name.toLowerCase();
  const mime = file.mimeType.toLowerCase();

  if (/coa|certificate|cert\b/.test(name)) return "certificate";
  if (/invoice|po-|purchase\s?order/.test(name)) return "invoice";
  if (/spec|specification/.test(name)) return "spec";
  if (/report|summary/.test(name)) return "report";
  if (
    /artwork|label|design|render|mock|comp\b/.test(name) ||
    mime.startsWith("image/")
  ) {
    return "artwork";
  }
  return "other";
}

interface DriveDocumentsResult {
  documents: Document[];
  folders: Folder[];
}

export async function getDriveDocuments(
  rootFolderId: string
): Promise<DriveDocumentsResult> {
  const items = await listAllChildren(rootFolderId);

  const folders: Folder[] = [];
  const documents: Document[] = [];

  // Include the root as a synthetic top-level folder so the UI can render
  // breadcrumbs / a tree without special-casing the root.
  folders.push({ id: rootFolderId, name: "All Files" });

  for (const item of items) {
    const parentId = item.parents?.[0];
    if (item.mimeType === FOLDER_MIME) {
      folders.push({
        id: item.id,
        name: item.name,
        parentId,
      });
      continue;
    }

    documents.push({
      id: item.id,
      name: item.name,
      type: categorize(item),
      size: item.size ? Number(item.size) : 0,
      mimeType: item.mimeType,
      folderId: parentId,
      uploadedBy: item.lastModifyingUser?.displayName ?? "",
      // Internal download endpoint — keeps service account creds server-side
      url: `/api/documents/${item.id}/download`,
      createdAt: item.modifiedTime
        ? new Date(item.modifiedTime)
        : item.createdTime
          ? new Date(item.createdTime)
          : new Date(),
    });
  }

  return { documents, folders };
}
