"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { inviteMember, type ActionState } from "@/app/(portal)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: ActionState = { ok: false, message: "" };

export function InviteMemberForm({ orgId }: { orgId: string }) {
  const [state, formAction, pending] = useActionState(
    inviteMember,
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
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <input type="hidden" name="orgId" value={orgId} />

      <div className="flex-1 space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="person@client.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select name="role" defaultValue="org:member">
          <SelectTrigger id="role" className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="org:member">Member</SelectItem>
            <SelectItem value="org:admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Sending..." : "Invite"}
      </Button>
    </form>
  );
}
