import Link from "next/link";
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelative, formatFileSize } from "@/lib/format";
import { ROUTES } from "@/lib/constants";
import type { Document } from "@/data/types";

const typeIcons: Record<string, typeof FileText> = {
  spec: FileText,
  artwork: ImageIcon,
  certificate: FileText,
  invoice: FileSpreadsheet,
  report: FileText,
  other: File,
};

interface LatestDocumentsProps {
  documents: Document[];
}

export function LatestDocuments({ documents }: LatestDocumentsProps) {
  const latest = [...documents]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-medium">Latest Documents</CardTitle>
        <Link
          href={ROUTES.DOCUMENTS}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          View all →
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        {latest.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No documents uploaded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {latest.map((doc) => {
              const Icon = typeIcons[doc.type] ?? File;
              return (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 rounded-md p-1 transition-colors hover:bg-muted/40"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelative(doc.createdAt)}
                      {doc.size > 0 && ` · ${formatFileSize(doc.size)}`}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
