"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteClient, type ActionState } from "@/app/(portal)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function DeleteClient({
  orgId,
  name,
}: {
  orgId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  // On success the action redirects, so we only ever surface error messages.
  const [state, formAction, pending] = useActionState(
    deleteClient,
    initialState
  );

  useEffect(() => {
    if (state.message && !state.ok) toast.error(state.message);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="destructive">Delete client</Button>}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {name}?</DialogTitle>
          <DialogDescription>
            This permanently removes the organization, its members, and its SAP
            CardCode linkage. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="orgId" value={orgId} />
          <input type="hidden" name="name" value={name} />
          <div className="space-y-2">
            <Label htmlFor="confirmName">
              Type <span className="font-semibold">{name}</span> to confirm
            </Label>
            <Input
              id="confirmName"
              name="confirmName"
              autoComplete="off"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={name}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={pending || confirm !== name}
            >
              {pending ? "Deleting..." : "Delete permanently"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
