# Repo location & working with Cowork

## Where the repo lives

This repo lives on **local disk**, not Google Drive or iCloud:

```
~/Projects/goodkind-client-portal
```

**Do not** put it under `~/Documents` or `~/Desktop` — on a Mac those are synced
by iCloud Drive, and iCloud touching `.next/` and `node_modules/` while the dev
server runs makes Next.js recompile in an endless "Rendering / Compiling" loop.
Google Drive (`~/Library/CloudStorage/…`) is worse: its filesystem doesn't
support the operations git needs, so commits fail outright and the repo can get
corrupted when synced across machines.

Rule of thumb: code repos go in `~/Projects`, `~/Developer`, or `~/code` —
anywhere under home that **isn't** Desktop, Documents, Drive, or iCloud. Your
document/research projects (Stillwater, OTC-FDA, etc.) are fine on Drive; this
only applies to git repositories.

## How multi-computer sync works now

GitHub is the single source of truth — **not** Drive. On each computer:

```bash
mkdir -p ~/Projects && cd ~/Projects
git clone https://github.com/freemanshawn-create/goodkind-client-portal.git
cd goodkind-client-portal
# copy .env.local onto this machine by a safe route (password manager / AirDrop);
# it is gitignored and intentionally NOT on GitHub
npm install
```

Then:

- **Start of a work session:** `git pull`
- **End of a work session:** `git add -A && git commit -m "…" && git push`

## The `.env.local` secrets file

`.env.local` holds Clerk keys, the Azure SQL connection string, and Google
credentials. It is gitignored (never committed). If you set up a new machine,
copy it over manually — don't rely on git for it.

## GitHub credentials

Credentials live in the macOS Keychain, not in any file:

```bash
git config --global credential.helper osxkeychain
```

On your next `git push`, enter your GitHub **username** and a **personal access
token** (classic, `repo` scope) as the password — Keychain caches it after that.
Generate tokens at <https://github.com/settings/tokens>. Don't embed tokens in
the remote URL.

If a push fails with an auth error before prompting you, a stale token is cached;
clear it and retry:

```bash
printf "protocol=https\nhost=github.com\n\n" | git credential-osxkeychain erase
```

## Working with Cowork (Claude)

This folder is connected as a Cowork directory, so Claude can read and edit it
directly. The division of labor:

- **Claude edits** files in this local repo.
- **You review, then commit and push** from your Mac (`git add -A && git commit
  && git push`). Your Mac's git is healthy and uses your Keychain login, so this
  is fast and keeps tokens off disk.

Claude can also push via a temporary working clone if you ask, but that requires
handing it a valid token for the session — so you pushing from your Mac is the
simpler, more secure default.

## Status

- [x] Repo cloned locally to `~/Projects/goodkind-client-portal`
- [x] `.env.local` copied; `npm install` + `npm run dev` verified
- [x] Keychain credential helper set; old exposed token deleted
- [x] Drive copy retired
- [x] Cowork pointed at the local folder
- [ ] Create a new GitHub token and use it on the next push (stores in Keychain)
