import { getSession } from "@/lib/auth";
import { PortalShell } from "./portal-shell";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  return (
    <PortalShell
      userCompany={user?.company ?? ""}
      isPlatformAdmin={user?.role === "admin"}
    >
      {children}
    </PortalShell>
  );
}
