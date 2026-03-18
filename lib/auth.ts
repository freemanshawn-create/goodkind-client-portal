import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, MOCK_CREDENTIALS } from "@/lib/constants";
import { mockUsers } from "@/data/mock/users";
import { getAsanaUserByEmail } from "@/lib/asana";
import type { User } from "@/data/types";

const ASANA_GID_COOKIE = "goodkind-asana-gid";

function useAsana() {
  return !!process.env.ASANA_PAT;
}

export async function login(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  if (
    email === MOCK_CREDENTIALS.email &&
    password === MOCK_CREDENTIALS.password
  ) {
    const cookieStore = await cookies();

    // Store the user's email as the session token
    cookieStore.set(SESSION_COOKIE_NAME, email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    // If Asana is configured, look up the user's Asana GID by email
    if (useAsana()) {
      const asanaUser = await getAsanaUserByEmail(email);
      if (asanaUser) {
        cookieStore.set(ASANA_GID_COOKIE, asanaUser.gid, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        });
      }
    }

    return { success: true };
  }
  return { success: false, error: "Invalid email or password" };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(ASANA_GID_COOKIE);
}

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionEmail = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionEmail) return null;

  // Handle old session format (backward compatibility)
  const OLD_TOKEN = "mock-session-token-sunrise-naturals";

  // Match against mock credentials (or old token format)
  if (
    sessionEmail === MOCK_CREDENTIALS.email ||
    sessionEmail === OLD_TOKEN
  ) {
    const user = { ...mockUsers[0] };

    // Attach Asana GID if available
    const asanaGid = cookieStore.get(ASANA_GID_COOKIE)?.value;
    if (asanaGid) {
      user.asanaUserId = asanaGid;
    }

    return user;
  }

  return null;
}

/**
 * Get the current user's Asana GID from the session cookie.
 * Returns null if not logged in or no Asana account linked.
 */
export async function getAsanaGid(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ASANA_GID_COOKIE)?.value ?? null;
}
