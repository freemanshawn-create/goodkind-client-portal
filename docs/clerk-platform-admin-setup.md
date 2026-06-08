# Clerk setup — Platform super-admin role

This portal has two distinct admin concepts. Don't mix them up:

| Concept | Who | Where it lives in Clerk | What it grants |
|---|---|---|---|
| **Platform super-admin** | Goodkind staff | A flag on the **user's** public metadata: `{ "role": "platform_admin" }` | Administer *every* client: the `/admin` area (create clients, edit CardCode, invite/remove members, delete clients) |
| **Client org admin** | A person at a client | Clerk's built-in **organization role** `org:admin` | Manage only *their own* org's members (the Team page) |

The code (`lib/auth.ts`) treats `role: "platform_admin"` as canonical and still
accepts the legacy `role: "admin"` so nobody is locked out mid-migration.

> Your portal currently uses the Clerk **Development** instance (keys are
> `pk_test…` / `sk_test…`). Do the steps below in that instance. When you stand
> up a Production instance, repeat them there — metadata does not carry over
> between instances.

---

## 1. Make a user a platform super-admin

1. Go to <https://dashboard.clerk.com> and select the application + the
   **Development** instance (top-left switcher).
2. Left nav → **Users**.
3. Click the user (e.g. `shawn@goodkindco.com`).
4. Scroll to the **Metadata** section → **Public** → **Edit**.
5. Set the JSON to include the role key. If the object is empty:
   ```json
   { "role": "platform_admin" }
   ```
   If other keys already exist, add `"role": "platform_admin"` alongside them —
   don't delete what's there.
6. **Save.**
7. Repeat for every Goodkind staffer who should administer clients.
8. Have them sign out and back in to the portal so the new session picks up the
   role. The **Admin** link appears in the sidebar once the role is set.

> Use `platform_admin`, not `admin`. The legacy value works, but standardizing
> on `platform_admin` is what prevents the "I'm an admin but see no data"
> confusion (that was the platform-vs-client-admin mix-up).

---

## 2. Confirm Organizations + roles are enabled

The portal already uses organizations, so this is usually already on. Verify:

1. Left nav → **Organizations settings** (under "Configure").
2. **Enable organizations** — on.
3. **Default roles** — confirm `org:admin` and `org:member` exist. The invite
   form offers exactly these two. If you've created custom org roles, update the
   `<SelectItem value="org:…">` values in
   `components/admin/invite-member-form.tsx` to match.
4. **Membership / invitations** — allow admins to invite members (default).

---

## 3. Client organizations need a SAP CardCode

Each client org's **public metadata** must carry its SAP B1 CardCode, because all
live data is scoped by it:

```json
{ "cardCode": "C0006", "brands": ["Dr. Squatch"], "driveFolderId": "…optional…" }
```

- For **new** clients: the `/admin` "Add a client" form sets this for you.
- For **existing** clients: confirm it on the org's public metadata
  (Organizations → pick the org → Metadata → Public), or edit it from
  `/admin/<org>`.
- `brands` is optional/reference-only; `cardCode` is required for any data to
  appear.

---

## 4. Backend API key (already configured)

The `/admin` actions call Clerk's Backend SDK (`clerkClient`), which uses
`CLERK_SECRET_KEY` from `.env.local`. It's already set. Two checks:

- The **secret key and publishable key must belong to the same instance**
  (both `…_test…` today, or both `…_live…` in production).
- No additional scopes or keys are required — the standard secret key can create
  organizations, manage memberships, and send invitations.

---

## 5. How a super-admin views a client's data

Creating a client through `/admin` makes you that org's first member, so it
appears in your **organization switcher**. To see a specific client's schedule /
POs, switch your active org to that client — the portal then scopes all data to
that org's CardCode. (There is no separate cross-client data dashboard.)

---

## Quick verification checklist

- [ ] Your user has `{ "role": "platform_admin" }` in **public** metadata.
- [ ] You signed out/in; the **Admin** link shows in the sidebar.
- [ ] `/admin` lists your clients; Dr. Squatch shows CardCode `C0006`.
- [ ] Creating a test client, inviting yourself, then deleting it all work.
- [ ] Switching your active org to a client shows that client's live data.
