"use client";

import { useMemo, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
  Download,
  Upload,
  FolderOpen,
  Folder as FolderIcon,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Document, Folder, User } from "@/data/types";

const typeIcons: Record<string, typeof FileText> = {
  spec: FileText,
  artwork: ImageIcon,
  certificate: FileText,
  invoice: FileSpreadsheet,
  report: FileText,
  other: File,
};

const typeColors: Record<string, string> = {
  spec: "bg-blue-100 text-blue-700 border-blue-200",
  artwork: "bg-purple-100 text-purple-700 border-purple-200",
  certificate: "bg-green-100 text-green-700 border-green-200",
  invoice: "bg-amber-100 text-amber-700 border-amber-200",
  report: "bg-emerald-100 text-emerald-700 border-emerald-200",
  other: "bg-gray-100 text-gray-600 border-gray-200",
};

interface DocumentsViewProps {
  documents: Document[];
  folders: Folder[];
  /** Top-level folder for the current user (Drive folder ID). */
  rootFolderId?: string;
  users: User[];
}

export function DocumentsView({
  documents,
  folders,
  rootFolderId,
  users,
}: DocumentsViewProps) {
  // Current folder being viewed. null = root.
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(
    rootFolderId ?? null
  );

  // Lookup helpers
  const folderById = useMemo(() => {
    const m = new Map<string, Folder>();
    for (const f of folders) m.set(f.id, f);
    return m;
  }, [folders]);

  // Build breadcrumb trail from root → currentFolder
  const breadcrumbs = useMemo(() => {
    if (!currentFolderId) return [];
    const crumbs: Folder[] = [];
    let cur: Folder | undefined = folderById.get(currentFolderId);
    while (cur) {
      crumbs.unshift(cur);
      if (!cur.parentId) break;
      cur = folderById.get(cur.parentId);
    }
    return crumbs;
  }, [currentFolderId, folderById]);

  // Subfolders + files inside the current folder
  const visibleFolders = folders.filter(
    (f) => f.parentId === currentFolderId && f.id !== currentFolderId
  );
  const visibleDocs = documents.filter((d) => d.folderId === currentFolderId);

  const getUserName = (id: string) =>
    users.find((u) => u.id === id)?.name ?? id;

  const emptyState =
    visibleFolders.length === 0 && visibleDocs.length === 0;

  return (
    <Card>
      <CardContent className="p-0">
        {/* Breadcrumbs + actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            <button
              onClick={() => setCurrentFolderId(rootFolderId ?? null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <FolderOpen className="inline h-4 w-4 -translate-y-0.5" />{" "}
              Documents
            </button>
            {breadcrumbs.slice(1).map((crumb) => (
              <span key={crumb.id} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                <button
                  onClick={() => setCurrentFolderId(crumb.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {crumb.name}
                </button>
              </span>
            ))}
            {breadcrumbs.length > 0 && currentFolderId && (
              <span className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="font-medium">
                  {folderById.get(currentFolderId)?.name ?? ""}
                </span>
              </span>
            )}
          </nav>
          <Button variant="outline" size="sm" disabled>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Upload
          </Button>
        </div>

        {emptyState ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            This folder is empty.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Modified By
                </TableHead>
                <TableHead className="hidden sm:table-cell">Size</TableHead>
                <TableHead>Modified</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Subfolders first */}
              {visibleFolders.map((folder) => (
                <TableRow
                  key={folder.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setCurrentFolderId(folder.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FolderIcon className="h-4 w-4 shrink-0 text-amber-600" />
                      <span className="truncate text-sm font-medium">
                        {folder.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">
                      Folder
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell" />
                  <TableCell className="hidden sm:table-cell" />
                  <TableCell />
                  <TableCell>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}

              {/* Then files */}
              {visibleDocs.map((doc) => {
                const Icon = typeIcons[doc.type] ?? File;
                return (
                  <TableRow key={doc.id} className="hover:bg-muted/30">
                    <TableCell>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:underline"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm font-medium">
                          {doc.name}
                        </span>
                      </a>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs capitalize",
                          typeColors[doc.type]
                        )}
                      >
                        {doc.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {doc.uploadedBy || getUserName(doc.uploadedBy)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(doc.size)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(doc.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <a
                        href={doc.url}
                        download
                        aria-label={`Download ${doc.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
