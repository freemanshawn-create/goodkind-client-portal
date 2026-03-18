import { getDocuments } from "@/data/repositories/documents";
import { mockActivity } from "@/data/mock/activity";
import { PageHeader } from "@/components/layout/page-header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const documents = await getDocuments();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome back. Here's an overview of your account."
      />

      <StatsCards totalDocuments={documents.length} />

      <RecentActivityFeed activities={mockActivity} />
    </div>
  );
}
