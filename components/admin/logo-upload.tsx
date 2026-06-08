"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  uploadClientLogo,
  type ActionState,
} from "@/app/(portal)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: ActionState = { ok: false, message: "" };

export function LogoUpload({
  orgId,
  currentImageUrl,
  name,
}: {
  orgId: string;
  currentImageUrl?: string;
  name: string;
}) {
  const [state, formAction, pending] = useActionState(
    uploadClientLogo,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
      formRef.current?.reset();
    } else {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <input type="hidden" name="orgId" value={orgId} />

      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-muted">
        {currentImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentImageUrl}
            alt={`${name} logo`}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-[10px] text-muted-foreground">No logo</span>
        )}
      </div>

      <Input
        type="file"
        name="logo"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        required
        className="sm:max-w-xs"
      />

      <Button type="submit" disabled={pending}>
        {pending ? "Uploading..." : "Upload logo"}
      </Button>
    </form>
  );
}
