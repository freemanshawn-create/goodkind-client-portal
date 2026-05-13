import Link from "next/link";
import {
  ShoppingCart,
  Package,
  CalendarClock,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";

interface StatsCardsProps {
  openPoCount: number;
  unitsRemaining: number;
  upcomingBatchCount: number;
  documentsCount: number;
}

export function StatsCards({
  openPoCount,
  unitsRemaining,
  upcomingBatchCount,
  documentsCount,
}: StatsCardsProps) {
  const stats = [
    {
      label: "Open POs",
      value: openPoCount.toLocaleString(),
      sub: "Active orders",
      icon: ShoppingCart,
      href: ROUTES.PURCHASE_ORDERS,
    },
    {
      label: "Units to deliver",
      value: unitsRemaining.toLocaleString(),
      sub: "Across open POs",
      icon: Package,
      href: ROUTES.PURCHASE_ORDERS,
    },
    {
      label: "Upcoming batches",
      value: upcomingBatchCount.toLocaleString(),
      sub: "Next 45 days",
      icon: CalendarClock,
      href: ROUTES.SCHEDULE,
    },
    {
      label: "Documents",
      value: documentsCount.toLocaleString(),
      sub: "Shared files",
      icon: FileText,
      href: ROUTES.DOCUMENTS,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Link key={stat.label} href={stat.href}>
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="flex items-start gap-4 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                <stat.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-light tabular-nums">{stat.value}</p>
                <p className="text-xs font-medium">{stat.label}</p>
                <p className="text-xs text-muted-foreground">{stat.sub}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
