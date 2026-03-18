"use client";

import { useState } from "react";
import {
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Download,
  Upload,
  FolderOpen,
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
import type { Document, Folder, Project, User } from "@/data/types";

const typeIcons: Record<string, typeof FileText> = {
  spec: FileText,
  artwork: Image,
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
  projects: Project[];
  users: User[];
}

export function DocumentsView({
  documents,
  folders,
  projects,
  users,
}: DocumentsViewProps) {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const filteredDocs = selectedFolder
    ? documents.filter((d) => d.folderId === selectedFolder)
    : documents;

  const getUserName = (id: string) =>
    users.find((u) => u.id === id)?.name ?? "Unknown";

  const getProjectName = (id?: string) =>
    id ? projects.find((p) => p.id === id)?.name : undefined;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Folder sidebar */}
      <div className="w-full shrink-0 lg:w-48">
        <div className="space-y-1">
          <button
            onClick={() => setSelectedFolder(null)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
              !selectedFolder
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <FolderOpen className="h-4 w-4" />
            All Files
          </button>
          {folders.map((folder) => {
            const count = documents.filter(
              (d) => d.folderId === folder.id
            ).length;
            return (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  selectedFolder === folder.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <span className="flex items-center gap-2 truncate">
                  <FolderOpen className="h-4 w-4 shrink-0" />
                  {folder.name}
                </span>
                <span className="text-xs">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Documents table */}
      <Card className="flex-1">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {filteredDocs.length} file{filteredDocs.length !== 1 && "s"}
            </p>
            <Button variant="outline" size="sm" disabled>
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Upload
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden sm:table-cell">Project</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Uploaded By
                </TableHead>
                <TableHead className="hidden sm:table-cell">Size</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.map((doc) => {
                const Icon = typeIcons[doc.type] ?? File;
                const projectName = getProjectName(doc.projectId);
                return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm font-medium">
                          {doc.name}
                        </span>
                      </div>
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
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {projectName ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {getUserName(doc.uploadedBy)}
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
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
