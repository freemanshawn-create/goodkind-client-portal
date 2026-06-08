"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { removeMember, type ActionState } from "@/app/(portal)/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: ActionState = { ok: false, message: "" };

export function RemoveMemberButton({
  orgId,
  userId,
  name,
  disabled = false,
}: {
  orgId: string;
  userId: string;
  name: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    removeMember,
    initialState
  );

  // On success the member row revalidates away and this dialog unmounts, so we
  // only need to surface the toast here (no setState inside the effect).
  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" disabled={disabled}>
            Remove
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {name}?</DialogTitle>
          <DialogDescription>
            They will lose access to this client&apos;s portal. You can invite
            them again later.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="orgId" value={orgId} />
          <input type="hidden" name="userId" value={userId} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Removing..." : "Remove member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
