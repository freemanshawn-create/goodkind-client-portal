"use client";

import Link from "next/link";
import { FileUp, Package, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelative } from "@/lib/format";
import { ROUTES } from "@/lib/constants";
import type { ActivityItem, ActivityType } from "@/data/types";

const activityIcons: Partial<Record<ActivityType, typeof Package>> = {
  document_uploaded: FileUp,
  milestone_completed: CheckCircle2,
};

const activityColors: Partial<Record<ActivityType, string>> = {
  document_uploaded: "text-emerald-600 bg-emerald-50",
  milestone_completed: "text-green-600 bg-green-50",
};

function getActivityLink(item: ActivityItem): string {
  switch (item.entityType) {
    case "document":
      return ROUTES.DOCUMENTS;
    default:
      return ROUTES.DASHBOARD;
  }
}

interface RecentActivityFeedProps {
  activities: ActivityItem[];
}

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  // Filter to only activity types we still support
  const supported = activities.filter(
    (a) => a.type in activityIcons
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {supported.slice(0, 8).map((item) => {
          const Icon = activityIcons[item.type] ?? Package;
          const colorClass =
            activityColors[item.type] ?? "text-gray-600 bg-gray-50";

          return (
            <Link
              key={item.id}
              href={getActivityLink(item)}
              className="flex items-start gap-3 rounded-md p-1 transition-colors hover:bg-muted"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">
                  {item.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.description}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatRelative(item.createdAt)}
                </p>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
