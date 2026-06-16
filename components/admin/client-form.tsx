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
    brandCodes?: string[];
    driveFolderId?: string;
    scheduleWindowDays?: number;
    yieldAdjustmentPct?: number;
  };
}

export function ClientForm({ client }: ClientFormProps) {
  const isEdit = Boolean(client);
  const action = isEdit ? updateClient : createClient;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Remount the form whenever the persisted client values change (e.g. after a
  // successful save revalidates the page). This re-initializes the uncontrolled
  // inputs cleanly, avoiding "default value changed after init" warnings when a
  // previously-empty field — like Brand codes — gets its first value.
  const formKey = JSON.stringify({
    id: client?.id,
    name: client?.name,
    cardCode: client?.cardCode,
    brands: client?.brands,
    brandCodes: client?.brandCodes,
    driveFolderId: client?.driveFolderId,
    scheduleWindowDays: client?.scheduleWindowDays,
    yieldAdjustmentPct: client?.yieldAdjustmentPct,
  });

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
    <form key={formKey} ref={formRef} action={formAction} className="space-y-4">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="brands">Brands (optional, comma-separated)</Label>
          <Input
            id="brands"
            name="brands"
            defaultValue={client?.brands?.join(", ") ?? ""}
            placeholder="Dr. Squatch"
          />
          <p className="text-xs text-muted-foreground">
            Display names, kept for reference only.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="brandCodes">
            Brand codes (optional, comma-separated)
          </Label>
          <Input
            id="brandCodes"
            name="brandCodes"
            defaultValue={client?.brandCodes?.join(", ") ?? ""}
            placeholder="DRS"
          />
          <p className="text-xs text-muted-foreground">
            SAP item-code prefixes (the <code>DRS</code> in{" "}
            <code>90-DRS-…</code>). Limits orders &amp; schedule to this
            client&apos;s finished goods. Leave blank to show all of the
            CardCode&apos;s finished goods.
          </p>
        </div>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="scheduleWindowDays">
            Schedule window (days, optional)
          </Label>
          <Input
            id="scheduleWindowDays"
            name="scheduleWindowDays"
            type="number"
            min={1}
            max={365}
            step={1}
            defaultValue={client?.scheduleWindowDays ?? ""}
            placeholder="45"
          />
          <p className="text-xs text-muted-foreground">
            How many days of upcoming batches to show. Default 45; set 90 for a
            full quarter.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="yieldAdjustmentPct">
            Yield adjustment % (optional)
          </Label>
          <Input
            id="yieldAdjustmentPct"
            name="yieldAdjustmentPct"
            type="number"
            min={0}
            max={100}
            step={0.5}
            defaultValue={client?.yieldAdjustmentPct ?? ""}
            placeholder="5"
          />
          <p className="text-xs text-muted-foreground">
            Stored now; how it adjusts the displayed yield is pending sign-off
            on the exact calculation.
          </p>
        </div>
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
