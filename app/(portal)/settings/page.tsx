import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getSession();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account preferences."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={user?.name ?? ""} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                value={user?.company ?? ""}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value={user?.role === "client" ? "Client" : "Admin"}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Contact your Goodkind account manager to update profile information.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {[
              {
                label: "Project updates",
                description: "Milestone completions and status changes",
              },
              {
                label: "New messages",
                description: "When your Goodkind team sends a message",
              },
              {
                label: "Order status changes",
                description: "Shipping and delivery notifications",
              },
              {
                label: "New documents",
                description: "When files are shared with you",
              },
            ].map((pref) => (
              <div
                key={pref.label}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{pref.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {pref.description}
                  </p>
                </div>
                <div className="flex h-5 w-9 cursor-pointer items-center rounded-full bg-primary px-0.5">
                  <div className="h-4 w-4 translate-x-4 rounded-full bg-primary-foreground transition-transform" />
                </div>
              </div>
            ))}
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">
            Notification settings are for demonstration purposes only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
