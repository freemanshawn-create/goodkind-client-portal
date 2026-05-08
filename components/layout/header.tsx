"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";

interface HeaderProps {
  userCompany: string;
  onMobileMenuToggle: () => void;
}

export function Header({ userCompany, onMobileMenuToggle }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMobileMenuToggle}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden lg:block">
        <p className="text-sm text-muted-foreground">{userCompany}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Org switcher only renders for users with multiple orgs (e.g. Goodkind admins) */}
        <OrganizationSwitcher
          hidePersonal
          afterSelectOrganizationUrl="/dashboard"
        />
        <UserButton userProfileMode="modal" />
      </div>
    </header>
  );
}
