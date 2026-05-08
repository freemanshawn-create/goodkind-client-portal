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
}

interface UserPublicMetadata {
  role?: string;
}

export async function getSession(): Promise<User | null> {
  const { userId, orgId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  // Platform admin? (set on the user's publicMetadata in Clerk dashboard)
  const platformRole = (user.publicMetadata as UserPublicMetadata | null)?.role;
  const isPlatformAdmin = platformRole === "admin";

  // Pull org metadata (cardCode, brands) from the user's active org.
  let cardCode: string | undefined;
  let brands: string[] | undefined;
  let company = "";

  if (orgId) {
    try {
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({
        organizationId: orgId,
      });
      company = org.name;
      const meta = org.publicMetadata as OrgPublicMetadata;
      cardCode = meta.cardCode;
      brands = meta.brands;
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
    avatar: user.imageUrl,
    role: isPlatformAdmin ? "admin" : "client",
    brands,
    cardCode,
    createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
  };
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
  return (
    (user?.publicMetadata as UserPublicMetadata | null)?.role === "admin"
  );
}
