"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/admin";

export interface ActionState {
  ok: boolean;
  message: string;
}

/** Parse a comma/newline-separated brands field into a clean string array. */
function parseBrands(raw: FormDataEntryValue | null): string[] {
  if (!raw) return [];
  return String(raw)
    .split(/[,\n]/)
    .map((b) => b.trim())
    .filter(Boolean);
}

function str(raw: FormDataEntryValue | null): string {
  return (raw == null ? "" : String(raw)).trim();
}

/** Parse an optional numeric field, clamped to [min, max]; blank → undefined. */
function parseOptionalNumber(
  raw: FormDataEntryValue | null,
  { min, max, integer }: { min: number; max: number; integer?: boolean }
): number | undefined {
  const s = str(raw);
  if (s === "") return undefined;
  let n = Number(s);
  if (Number.isNaN(n)) return undefined;
  if (integer) n = Math.round(n);
  return Math.min(max, Math.max(min, n));
}

/**
 * Create a new client organization with its SAP CardCode and brand metadata.
 * The platform admin who creates it becomes the org's first admin, which also
 * adds the client to their org switcher so they can view that client's portal.
 */
export async function createClient(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let createdBy: string;
  try {
    createdBy = await requirePlatformAdmin();
  } catch {
    return { ok: false, message: "Not authorized." };
  }

  const name = str(formData.get("name"));
  const cardCode = str(formData.get("cardCode"));
  const brands = parseBrands(formData.get("brands"));
  const driveFolderId = str(formData.get("driveFolderId"));
  const scheduleWindowDays = parseOptionalNumber(
    formData.get("scheduleWindowDays"),
    { min: 1, max: 365, integer: true }
  );
  const yieldAdjustmentPct = parseOptionalNumber(
    formData.get("yieldAdjustmentPct"),
    { min: 0, max: 100 }
  );

  if (!name) return { ok: false, message: "Client name is required." };
  if (!cardCode)
    return { ok: false, message: "SAP CardCode is required for live data." };

  try {
    const client = await clerkClient();
    await client.organizations.createOrganization({
      name,
      createdBy,
      publicMetadata: {
        cardCode,
        ...(brands.length ? { brands } : {}),
        ...(driveFolderId ? { driveFolderId } : {}),
        ...(scheduleWindowDays != null ? { scheduleWindowDays } : {}),
        ...(yieldAdjustmentPct != null ? { yieldAdjustmentPct } : {}),
      },
    });
    revalidatePath("/admin");
    return { ok: true, message: `Created client "${name}".` };
  } catch (err) {
    console.error("createClient failed:", err);
    return { ok: false, message: "Could not create client. Check the logs." };
  }
}

/** Update an existing client's name and SAP/Drive metadata. */
export async function updateClient(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requirePlatformAdmin();
  } catch {
    return { ok: false, message: "Not authorized." };
  }

  const orgId = str(formData.get("orgId"));
  const name = str(formData.get("name"));
  const cardCode = str(formData.get("cardCode"));
  const brands = parseBrands(formData.get("brands"));
  const driveFolderId = str(formData.get("driveFolderId"));
  const scheduleWindowDays = parseOptionalNumber(
    formData.get("scheduleWindowDays"),
    { min: 1, max: 365, integer: true }
  );
  const yieldAdjustmentPct = parseOptionalNumber(
    formData.get("yieldAdjustmentPct"),
    { min: 0, max: 100 }
  );

  if (!orgId) return { ok: false, message: "Missing organization id." };
  if (!name) return { ok: false, message: "Client name is required." };
  if (!cardCode)
    return { ok: false, message: "SAP CardCode is required for live data." };

  try {
    const client = await clerkClient();
    await client.organizations.updateOrganization(orgId, { name });
    await client.organizations.updateOrganizationMetadata(orgId, {
      publicMetadata: {
        cardCode,
        brands: brands.length ? brands : null,
        driveFolderId: driveFolderId || null,
        scheduleWindowDays: scheduleWindowDays ?? null,
        yieldAdjustmentPct: yieldAdjustmentPct ?? null,
      },
    });
    revalidatePath("/admin");
    revalidatePath(`/admin/${orgId}`);
    return { ok: true, message: "Client updated." };
  } catch (err) {
    console.error("updateClient failed:", err);
    return { ok: false, message: "Could not update client. Check the logs." };
  }
}

/**
 * Permanently delete a client organization. Destructive and irreversible:
 * removes the org, its memberships, and SAP/Drive linkage. Requires the admin
 * to retype the client's exact name as confirmation. On success, redirects
 * back to the client list.
 */
export async function deleteClient(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requirePlatformAdmin();
  } catch {
    return { ok: false, message: "Not authorized." };
  }

  const orgId = str(formData.get("orgId"));
  const name = str(formData.get("name"));
  const confirmName = str(formData.get("confirmName"));

  if (!orgId) return { ok: false, message: "Missing organization id." };
  if (confirmName !== name) {
    return {
      ok: false,
      message: "The name you typed does not match. Nothing was deleted.",
    };
  }

  try {
    const client = await clerkClient();
    await client.organizations.deleteOrganization(orgId);
  } catch (err) {
    console.error("deleteClient failed:", err);
    return { ok: false, message: "Could not delete client. Check the logs." };
  }

  revalidatePath("/admin");
  redirect("/admin");
}

/** Remove a member from a client org. */
export async function removeMember(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requirePlatformAdmin();
  } catch {
    return { ok: false, message: "Not authorized." };
  }

  const orgId = str(formData.get("orgId"));
  const userId = str(formData.get("userId"));

  if (!orgId || !userId)
    return { ok: false, message: "Missing organization or user id." };

  try {
    const client = await clerkClient();
    await client.organizations.deleteOrganizationMembership({
      organizationId: orgId,
      userId,
    });
    revalidatePath(`/admin/${orgId}`);
    return { ok: true, message: "Member removed." };
  } catch (err) {
    console.error("removeMember failed:", err);
    return { ok: false, message: "Could not remove member. Check the logs." };
  }
}

/** Upload/replace a client's logo (Clerk organization image). */
export async function uploadClientLogo(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let uploaderUserId: string;
  try {
    uploaderUserId = await requirePlatformAdmin();
  } catch {
    return { ok: false, message: "Not authorized." };
  }

  const orgId = str(formData.get("orgId"));
  const file = formData.get("logo");

  if (!orgId) return { ok: false, message: "Missing organization id." };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose an image file to upload." };
  }

  try {
    const client = await clerkClient();
    await client.organizations.updateOrganizationLogo(orgId, {
      file,
      uploaderUserId,
    });
    revalidatePath(`/admin/${orgId}`);
    return { ok: true, message: "Logo updated." };
  } catch (err) {
    console.error("uploadClientLogo failed:", err);
    return { ok: false, message: "Could not upload logo. Check the file and logs." };
  }
}

/** Invite a member into a client org by email. */
export async function inviteMember(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let inviterUserId: string;
  try {
    inviterUserId = await requirePlatformAdmin();
  } catch {
    return { ok: false, message: "Not authorized." };
  }

  const orgId = str(formData.get("orgId"));
  const emailAddress = str(formData.get("email"));
  const role = str(formData.get("role")) || "org:member";

  if (!orgId) return { ok: false, message: "Missing organization id." };
  if (!emailAddress)
    return { ok: false, message: "An email address is required." };

  try {
    const client = await clerkClient();
    await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress,
      role,
      inviterUserId,
    });
    revalidatePath(`/admin/${orgId}`);
    return { ok: true, message: `Invitation sent to ${emailAddress}.` };
  } catch (err) {
    console.error("inviteMember failed:", err);
    return {
      ok: false,
      message: "Could not send invitation. Check the email and logs.",
    };
  }
}
