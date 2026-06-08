"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPlatformAdmin?: boolean;
}

export function MobileNav({
  open,
  onOpenChange,
  isPlatformAdmin = false,
}: MobileNavProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0">
        <Sidebar isPlatformAdmin={isPlatformAdmin} />
      </SheetContent>
    </Sheet>
  );
}
