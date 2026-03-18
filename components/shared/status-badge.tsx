import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  // Project statuses
  planning: "bg-blue-100 text-blue-700 border-blue-200",
  "in-progress": "bg-amber-100 text-amber-700 border-amber-200",
  review: "bg-purple-100 text-purple-700 border-purple-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  "on-hold": "bg-gray-100 text-gray-600 border-gray-200",

  // Order statuses
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  "in-production": "bg-amber-100 text-amber-700 border-amber-200",
  "quality-check": "bg-purple-100 text-purple-700 border-purple-200",
  shipped: "bg-emerald-100 text-emerald-700 border-emerald-200",
  delivered: "bg-green-100 text-green-700 border-green-200",

  // Milestone statuses
  pending: "bg-gray-100 text-gray-600 border-gray-200",

  // Batch schedule statuses
  locked: "bg-green-100 text-green-700 border-green-200",
  "pending-lock": "bg-amber-100 text-amber-700 border-amber-200",
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
};

const statusLabels: Record<string, string> = {
  planning: "Planning",
  "in-progress": "In Progress",
  review: "In Review",
  completed: "Completed",
  "on-hold": "On Hold",
  confirmed: "Confirmed",
  "in-production": "In Production",
  "quality-check": "Quality Check",
  shipped: "Shipped",
  delivered: "Delivered",
  pending: "Pending",
  locked: "Locked",
  "pending-lock": "Pending Lock",
  scheduled: "Scheduled",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        statusStyles[status] ?? "bg-gray-100 text-gray-600 border-gray-200",
        className
      )}
    >
      {statusLabels[status] ?? status}
    </Badge>
  );
}
