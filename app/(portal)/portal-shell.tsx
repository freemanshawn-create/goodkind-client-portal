"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";

interface PortalShellProps {
  userCompany: string;
  isPlatformAdmin?: boolean;
  children: React.ReactNode;
}

export function PortalShell({
  userCompany,
  isPlatformAdmin = false,
  children,
}: PortalShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
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
          onMobileMenuToggle={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
