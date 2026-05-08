import { OrganizationProfile } from "@clerk/nextjs";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Team" };

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Manage your team members. Admins can invite new users and remove existing members."
      />

      <div className="flex justify-center">
        <OrganizationProfile
          path="/team"
          routing="path"
          appearance={{
            elements: {
              rootBox: { width: "100%", maxWidth: "100%" },
              cardBox: { width: "100%", maxWidth: "100%" },
            },
          }}
        />
      </div>
    </div>
  );
}
