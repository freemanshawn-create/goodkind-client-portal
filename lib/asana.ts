const ASANA_BASE = "https://app.asana.com/api/1.0";

function getToken(): string {
  const token = process.env.ASANA_PAT;
  if (!token) throw new Error("ASANA_PAT environment variable is not set");
  return token;
}

export async function asanaFetch<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${ASANA_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/json",
    },
    next: { revalidate: 60 }, // cache for 60 seconds
  });

  if (!res.ok) {
    throw new Error(`Asana API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  return json.data as T;
}

export function getWorkspaceId(): string {
  return process.env.ASANA_WORKSPACE_ID || "39418109315600";
}

interface AsanaUser {
  gid: string;
  name: string;
  email: string;
}

/**
 * Look up an Asana user by their email address.
 * Returns the user's GID and name, or null if not found.
 */
export async function getAsanaUserByEmail(
  email: string
): Promise<AsanaUser | null> {
  try {
    const user = await asanaFetch<AsanaUser>(`/users/${email}`, {
      opt_fields: "name,email",
    });
    return user;
  } catch {
    return null;
  }
}
