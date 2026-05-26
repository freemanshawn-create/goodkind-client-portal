import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface TablePageSkeletonProps {
  /** Number of rows to render in the placeholder table */
  rows?: number;
  /** Number of columns to render in the placeholder table */
  columns?: number;
  /** Whether to render a secondary "completed" table section below */
  twoSections?: boolean;
}

/**
 * Shared loading skeleton for routes whose primary content is a data table —
 * Purchase Orders, Schedule, Documents, etc.
 */
export function TablePageSkeleton({
  rows = 8,
  columns = 6,
  twoSections = false,
}: TablePageSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Search / filters bar */}
      <Skeleton className="h-9 w-full max-w-md" />

      <TableSection rows={rows} columns={columns} />
      {twoSections && (
        <div className="pt-2">
          <Skeleton className="mb-3 h-5 w-40" />
          <TableSection rows={Math.max(3, Math.floor(rows / 2))} columns={columns} />
        </div>
      )}
    </div>
  );
}

function TableSection({
  rows,
  columns,
}: {
  rows: number;
  columns: number;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        {/* Section header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Column headers */}
        <div className="flex gap-4 border-b px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3">
              {Array.from({ length: columns }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
