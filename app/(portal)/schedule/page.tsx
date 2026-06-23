import { getUpcomingBatches, getPastBatches } from "@/data/repositories/schedule";
import { getBomItemsForBatches } from "@/data/repositories/bom";
import { getSession } from "@/lib/auth";
import { safe } from "@/lib/safe";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ScheduleTable } from "@/components/schedule/schedule-table";
import type { BatchEntry, BomItem } from "@/data/types";

export const metadata = { title: "Production Schedule" };

export default async function SchedulePage() {
  const user = await getSession();
  if (!user) redirect("/login");

  // Everyone — admins included — is scoped to their active org's SAP CardCode.
  // A platform admin viewing the Dr. Squatch team sees Dr. Squatch's live data.
  // With no active org (no cardCode) there is nothing to show. The upcoming
  // window honors the client's per-org setting (default 45 days).
  const filter = {
    brands: user.brands,
    brandCodes: user.brandCodes,
    cardCode: user.cardCode,
    windowDays: user.scheduleWindowDays,
  };

  // Soft-fail: if Azure is unreachable, render an empty state, not an error page.
  const [upcoming, past] = await Promise.all([
    safe<BatchEntry[]>("Upcoming batches", () => getUpcomingBatches(filter), []),
    safe<BatchEntry[]>("Past batches", () => getPastBatches(filter), []),
  ]);

  const allBatches = [...upcoming, ...past];
  const bomItems = await safe<BomItem[]>(
    "BOM items",
    () => getBomItemsForBatches(allBatches, user.brandCodes, user.brands),
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Schedule"
        description="View your batch production schedule, dates, and status."
      />

      <ScheduleTable
        upcoming={upcoming}
        past={past}
        bomItems={bomItems}
        windowDays={user.scheduleWindowDays ?? 45}
      />
    </div>
  );
}
