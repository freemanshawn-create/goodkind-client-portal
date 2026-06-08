"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavigationProgress } from "@/components/layout/navigation-progress";

interface PortalShellProps {
  userCompany: string;
  companyLogoUrl?: string;
  isPlatformAdmin?: boolean;
  children: React.ReactNode;
}

export function PortalShell({
  userCompany,
  companyLogoUrl,
  isPlatformAdmin = false,
  children,
}: PortalShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <NavigationProgress />

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar isPlatformAdmin={isPlatformAdmin} />
      </div>

      {/* Mobile nav */}
      <MobileNav
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        isPlatformAdmin={isPlatformAdmin}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userCompany={userCompany}
          companyLogoUrl={companyLogoUrl}
          onMobileMenuToggle={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
