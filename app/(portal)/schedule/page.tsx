import { getUpcomingBatches, getPastBatches } from "@/data/repositories/schedule";
import { getBomItemsForBatches } from "@/data/repositories/bom";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ScheduleTable } from "@/components/schedule/schedule-table";

export const metadata = { title: "Production Schedule" };

export default async function SchedulePage() {
  const user = await getSession();
  if (!user) redirect("/login");

  // Admins see all brands; clients only see their associated brands
  const brands = user.role === "admin" ? undefined : user.brands;

  const [upcoming, past] = await Promise.all([
    getUpcomingBatches(brands),
    getPastBatches(brands),
  ]);

  const allBatchIds = [...upcoming, ...past].map((b) => b.id);
  const bomItems = await getBomItemsForBatches(allBatchIds);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Schedule"
        description="View your batch production schedule, dates, and status."
      />

      <ScheduleTable upcoming={upcoming} past={past} bomItems={bomItems} />
    </div>
  );
}
