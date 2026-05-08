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

  // Admins see everything; clients are scoped to their brands (mock) / cardCode (Azure)
  const filter =
    user.role === "admin"
      ? {}
      : { brands: user.brands, cardCode: user.cardCode };

  const [upcoming, past] = await Promise.all([
    getUpcomingBatches(filter),
    getPastBatches(filter),
  ]);

  const allBatches = [...upcoming, ...past];
  const bomItems = await getBomItemsForBatches(allBatches);

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
