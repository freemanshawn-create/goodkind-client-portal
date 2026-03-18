"use client";

import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardsProps {
  totalDocuments: number;
}

export function StatsCards({ totalDocuments }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-light">{totalDocuments}</p>
            <p className="text-xs text-muted-foreground">Documents</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
