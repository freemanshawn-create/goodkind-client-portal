"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  createClient,
  updateClient,
  type ActionState,
} from "@/app/(portal)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = { ok: false, message: "" };

interface ClientFormProps {
  /** Omit for create mode; provide for edit mode. */
  client?: {
    id: string;
    name: string;
    cardCode?: string;
    brands?: string[];
    driveFolderId?: string;
  };
}

export function ClientForm({ client }: ClientFormProps) {
  const isEdit = Boolean(client);
  const action = isEdit ? updateClient : createClient;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
      if (!isEdit) formRef.current?.reset();
    } else {
      toast.error(state.message);
    }
  }, [state, isEdit]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="orgId" value={client!.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Client name</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={client?.name ?? ""}
            placeholder="Dr. Squatch"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cardCode">SAP CardCode</Label>
          <Input
            id="cardCode"
            name="cardCode"
            required
            defaultValue={client?.cardCode ?? ""}
            placeholder="C0006"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="brands">Brands (optional, comma-separated)</Label>
        <Input
          id="brands"
          name="brands"
          defaultValue={client?.brands?.join(", ") ?? ""}
          placeholder="Dr. Squatch"
        />
        <p className="text-xs text-muted-foreground">
          Live data is scoped by CardCode; brands are kept for reference only.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="driveFolderId">Google Drive folder ID (optional)</Label>
        <Input
          id="driveFolderId"
          name="driveFolderId"
          defaultValue={client?.driveFolderId ?? ""}
          placeholder="1LSKE85wm..."
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving..."
            : isEdit
              ? "Save changes"
              : "Create client"}
        </Button>
      </div>
    </form>
  );
}
