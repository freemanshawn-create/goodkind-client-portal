import { auth, clerkClient } from "@clerk/nextjs/server";
import { isPlatformAdmin } from "@/lib/auth";

/**
 * Server-side helpers for the Goodkind platform-admin area.
 *
 * Every export here assumes the caller is a platform super-admin and must be
 * preceded by requirePlatformAdmin() (the pages and server actions do this).
 * These helpers talk to the Clerk Backend API; client orgs ARE the clients.
 */

export interface ClientSummary {
  id: string;
  name: string;
  slug: string | null;
  cardCode?: string;
  brands?: string[];
  driveFolderId?: string;
  scheduleWindowDays?: number;
  yieldAdjustmentPct?: number;
  imageUrl?: string;
  membersCount: number;
  createdAt: number;
}

export interface ClientMember {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  role: string;
}

export interface ClientDetail extends ClientSummary {
  members: ClientMember[];
}

interface OrgPublicMetadata {
  cardCode?: string;
  brands?: string[];
  driveFolderId?: string;
  scheduleWindowDays?: number;
  yieldAdjustmentPct?: number;
}

/**
 * Throws if the current user is not a platform super-admin. Server actions and
 * admin pages call this before doing anything else.
 */
export async function requirePlatformAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId || !(await isPlatformAdmin())) {
    throw new Error("Not authorized: platform admin access required.");
  }
  return userId;
}

function toSummary(org: {
  id: string;
  name: string;
  slug: string | null;
  publicMetadata: unknown;
  hasImage?: boolean;
  imageUrl?: string;
  membersCount?: number;
  createdAt: number;
}): ClientSummary {
  const meta = (org.publicMetadata ?? {}) as OrgPublicMetadata;
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    cardCode: meta.cardCode,
    brands: meta.brands,
    driveFolderId: meta.driveFolderId,
    scheduleWindowDays: meta.scheduleWindowDays,
    yieldAdjustmentPct: meta.yieldAdjustmentPct,
    imageUrl: org.hasImage ? org.imageUrl : undefined,
    membersCount: org.membersCount ?? 0,
    createdAt: org.createdAt,
  };
}

/** List every client organization, newest first. */
export async function listClients(): Promise<ClientSummary[]> {
  const client = await clerkClient();
  const res = await client.organizations.getOrganizationList({
    limit: 200,
    includeMembersCount: true,
  });
  return res.data
    .map((org) =>
      toSummary({
        id: org.id,
        name: org.name,
        slug: org.slug,
        publicMetadata: org.publicMetadata,
        hasImage: org.hasImage,
        imageUrl: org.imageUrl,
        membersCount: org.membersCount,
        createdAt: org.createdAt,
      })
    )
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Full detail for one client org, including its members. */
export async function getClientDetail(
  orgId: string
): Promise<ClientDetail | null> {
  const client = await clerkClient();

  const org = await client.organizations.getOrganization({
    organizationId: orgId,
  });

  const membership = await client.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    limit: 200,
  });

  const members: ClientMember[] = membership.data.map((m) => {
    const data = m.publicUserData;
    const name =
      [data?.firstName, data?.lastName].filter(Boolean).join(" ").trim() ||
      data?.identifier ||
      "Pending member";
    return {
      id: m.id,
      userId: data?.userId ?? null,
      name,
      email: data?.identifier ?? "",
      role: m.role,
    };
  });

  return {
    ...toSummary({
      id: org.id,
      name: org.name,
      slug: org.slug,
      publicMetadata: org.publicMetadata,
      hasImage: org.hasImage,
      imageUrl: org.imageUrl,
      membersCount: members.length,
      createdAt: org.createdAt,
    }),
    members,
  };
}
