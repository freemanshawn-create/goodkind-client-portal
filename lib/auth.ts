import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import type { User } from "@/data/types";

/**
 * Auth helpers backed by Clerk.
 *
 * The portal scopes data per client by reading the user's *active organization*
 * public metadata. Each client's Clerk Organization should set:
 *
 *   {
 *     "cardCode": "C0006",          // SAP B1 customer CardCode for live data
 *     "brands":   ["Dr. Squatch"]    // brand names (kept for mock data fallback)
 *   }
 *
 * Goodkind staff can be flagged as platform admins via the Clerk *user*
 * publicMetadata: { "role": "admin" }. Admins see across all orgs.
 */

interface OrgPublicMetadata {
  cardCode?: string;
  brands?: string[];
  driveFolderId?: string;
  scheduleWindowDays?: number;
  yieldAdjustmentPct?: number;
}

interface UserPublicMetadata {
  role?: string;
}

/**
 * Goodkind platform super-admins are flagged on the *user's* Clerk
 * publicMetadata. The canonical value is "platform_admin"; the legacy "admin"
 * value is still accepted so existing staff accounts keep access.
 *
 * This is deliberately separate from a *client* org admin, which is Clerk's
 * built-in per-organization role `org:admin` (see isOrgAdmin). A platform admin
 * administers every client; an org admin only manages their own org's members.
 */
function isPlatformAdminRole(role: string | undefined): boolean {
  return role === "platform_admin" || role === "admin";
}

export async function getSession(): Promise<User | null> {
  const { userId, orgId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  // Platform admin? (set on the user's publicMetadata in Clerk dashboard)
  const platformRole = (user.publicMetadata as UserPublicMetadata | null)?.role;
  const isPlatformAdmin = isPlatformAdminRole(platformRole);

  // Pull org metadata (cardCode, brands, driveFolderId, settings) from the active org.
  let cardCode: string | undefined;
  let brands: string[] | undefined;
  let driveFolderId: string | undefined;
  let scheduleWindowDays: number | undefined;
  let yieldAdjustmentPct: number | undefined;
  let companyLogoUrl: string | undefined;
  let company = "";

  if (orgId) {
    try {
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({
        organizationId: orgId,
      });
      company = org.name;
      if (org.hasImage) companyLogoUrl = org.imageUrl;
      const meta = org.publicMetadata as OrgPublicMetadata;
      cardCode = meta.cardCode;
      brands = meta.brands;
      driveFolderId = meta.driveFolderId;
      scheduleWindowDays = meta.scheduleWindowDays;
      yieldAdjustmentPct = meta.yieldAdjustmentPct;
    } catch (err) {
      console.error("Failed to load Clerk organization metadata:", err);
    }
  }

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    user.emailAddresses[0]?.emailAddress ||
    "User";

  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress ?? "",
    name: fullName,
    company: company || (isPlatformAdmin ? "Goodkind Co" : ""),
    companyLogoUrl,
    avatar: user.imageUrl,
    role: isPlatformAdmin ? "admin" : "client",
    brands,
    cardCode,
    driveFolderId,
    scheduleWindowDays,
    yieldAdjustmentPct,
    createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
  };
}

/**
 * Returns true if the current user is a Goodkind platform super-admin
 * (can administer any client). Based solely on the user's publicMetadata role.
 */
export async function isPlatformAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;
  const user = await currentUser();
  return isPlatformAdminRole(
    (user?.publicMetadata as UserPublicMetadata | null)?.role
  );
}

/**
 * Returns true if the user can perform org-level admin actions
 * (manage members, etc.). Either platform admin OR org admin.
 */
export async function isOrgAdmin(): Promise<boolean> {
  const { orgRole, userId } = await auth();
  if (!userId) return false;
  if (orgRole === "org:admin") return true;

  const user = await currentUser();
  return isPlatformAdminRole(
    (user?.publicMetadata as UserPublicMetadata | null)?.role
  );
}
