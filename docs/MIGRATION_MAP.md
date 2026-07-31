# Migration Map — Go/pgx → Next.js Route Handlers + Supabase

Companion to `MASTER_PROMPT.md`. That document says *what* to build; this one
says *what the current Go backend does* and *exactly what it becomes*, so the
port is a translation rather than a rewrite-from-memory.

**The binding constraint:** `src/types.ts` and every `fetch()` call in `src/`
are the contract. The Go backend is being deleted; the JSON on the wire is not.
Every response literal in §5 must come out of the Next.js handler
byte-identical to what the Go handler emitted, with two explicitly-approved
exceptions called out in §5.9.

Source of truth for the "before" column: `backend/internal/handlers/handlers.go`
(1781 lines, 51 routes), `backend/internal/store/store.go`,
`backend/internal/db/db.go` (24 tables), `backend/internal/auth/auth.go`,
`backend/internal/payout/payout.go`.

---

## 1. What is deleted, what is kept

### 1.1 Deleted outright

| Path | Lines | Why it goes |
| --- | --- | --- |
| `backend/cmd/` | — | `net/http` server entrypoint; Next.js is the server now |
| `backend/internal/handlers/handlers.go` | 1781 | → `app/api/**/route.ts` (§5) |
| `backend/internal/store/store.go` | — | → Supabase queries + generated types (§3) |
| `backend/internal/db/db.go` | 417 | → `supabase/migrations/*.sql` (§3) |
| `backend/internal/auth/auth.go` | 140 | → Supabase Auth (§4) |
| `backend/internal/middleware/` | — | → `middleware.ts` + `@supabase/ssr` session refresh |
| `backend/go.mod`, `go.sum` | — | — |
| `backend/test/*_test.go` | — | → Vitest/Playwright against Route Handlers |
| `migrations/` (root, `001`–`006`) | — | superseded by `supabase/migrations/`; **read `006_games.sql` before deleting**, it holds the only copy of the seeded game levels |

### 1.2 Kept, ported in place

| Path | Disposition |
| --- | --- |
| `src/types.ts` | **Frozen contract.** Moves to `types/api.ts`. Do not change a field name or optionality without an operator decision. |
| `src/pages/*`, `src/components/*` | Become `app/**/page.tsx` + client components. Data-fetch calls change shape (Server Components), the JSON they consume does not. |
| `backend/internal/lunar/lunar.go` | **Reimplemented, not deleted-and-guessed.** → `lib/lunar.ts` on `astronomy-engine`. Outputs must match §6.1. |
| `backend/internal/payout/payout.go` | → `lib/payout.ts`. Signing must be byte-identical; see §6.4. |
| `docs/audit-findings.md` | Historical record. Findings stay open until §9 of `MASTER_PROMPT.md` closes them. |

### 1.3 Deleted *because Supabase makes it structurally unnecessary*

Not "dropped" — replaced by a platform guarantee. Recorded here so nobody
re-adds them:

- `sessions` table + 30-day HS256 JWT (`auth.go:GenerateToken`) → Supabase Auth
  refresh tokens, revocable server-side. Closes **B9**.
- `otp_codes` table + unsalted SHA-256 OTP hash → Supabase Auth OTP. Closes the
  brute-force half of **A8**.
- `net/smtp` + hand-rolled `buildMail` → Supabase Auth email provider.
- Per-handler `WHERE user_id = $1` filtering → RLS policies (§7). Closes
  **A4/A5/A6** by construction.

---

## 2. Translation hazards

These are the places where a mechanically-correct port still produces different
bytes on the wire. Each one has silently broken a frontend in some codebase;
read this section before writing any handler.

### 2.1 Column case vs. contract case

Postgres columns are `snake_case`. Every response body except two is
`camelCase`, because the Go handlers hand-built `map[string]interface{}`
literals (`"displayName": u.DisplayName`) rather than marshalling structs.

Supabase's client returns rows keyed by **column name**, so
`select('display_name')` gives you `{ display_name: ... }` and shipping that
straight to `NextResponse.json()` breaks the UI.

Rule: every table gets an explicit mapper in `lib/serializers/*.ts`, one per Go
`*Public` helper (§5.10). No spread of a raw Supabase row into a response.

```ts
// lib/serializers/user.ts  — mirrors handlers.go userResponse()
export function userResponse(p: ProfileRow & { email: string }) {
  return {
    id: p.id,
    email: p.email,
    displayName: p.display_name,
    authMethod: p.auth_method,
    preferredMethod: p.preferred_method,
    notificationsEnabled: p.notifications_enabled,
    streak: p.streak,
    longestStreak: p.longest_streak,
    isAdvertiser: p.is_advertiser,
    createdAt: toRFC3339(p.created_at),
  };
}
```

Two documented exceptions, both preserved as-is:

- `POST /api/game/levels/{id}/complete` request body is `{score, hints_used}` —
  snake_case, the only snake_case *request* body in the API.
- The Ed25519 signed claim is snake_case (§6.4). It is a signature payload, not
  a response body; changing it invalidates every issued token.

### 2.2 Timestamps

Go emitted `t.Format(time.RFC3339)` → `2026-07-29T14:03:05Z` (second
precision, `Z`). Postgres `timestamptz` comes back from PostgREST as
`2026-07-29T14:03:05.123456+00:00` (microseconds, offset form).

`new Date(x).toISOString()` gives `...T14:03:05.123Z` — milliseconds. Still not
a match.

```ts
// lib/serializers/time.ts
export const toRFC3339 = (v: string | Date) =>
  new Date(v).toISOString().replace(/\.\d{3}Z$/, 'Z');
```

Date-only fields used `Format("2006-01-02")`: `notebook.dueDate`,
`event.eventDate`, `challengeState.logDate`. These are Postgres `date` columns
and PostgREST already returns `YYYY-MM-DD` — pass through, do **not** run them
through `new Date()` (that reinterprets them as UTC midnight and can shift the
day for a non-UTC client).

`notebookPublic` sets `"dueDate": nil` and overwrites only when non-null, so the
key is **always present**, sometimes `null`. Same for `eventPublic.authorId`.
`undefined` disappears under `JSON.stringify` — use `null` explicitly.

### 2.3 Numeric precision

`ad_campaigns.reward_per_action` and `surveys.min_payout` are
`NUMERIC(18,8)`. Go scanned them into `float64` and emitted e.g. `0.05`.
PostgREST returns `NUMERIC` as a **JSON string** (`"0.05000000"`) to preserve
precision.

`src/types.ts` declares `rewardPerAction: number`. So the mapper must
`Number(row.reward_per_action)` — matching the Go behaviour, including its
float64 lossiness. This is the correct call for contract fidelity; the audit's
note about money-in-floats stays open as a separate item and is not fixed here.

`CampaignInput.RewardPerAction` was `float64` with **no JSON tag**, so Go's
case-insensitive decoder accepted `rewardPerAction`, `RewardPerAction`, and
`rewardperaction`. Zod is case-sensitive. Accept the camelCase key the frontend
actually sends and nothing else:

```ts
rewardPerAction: z.number().nonnegative().finite(),
```

### 2.4 Routing shape

Go's ServeMux registered method+path pairs independently:

```go
mux.HandleFunc("GET /api/challenges/{slug}", ...)
mux.HandleFunc("PUT /api/challenges/{slug}", ...)
```

Next.js exports named functions from a single file per path:

```
app/api/challenges/[slug]/route.ts  →  export async function GET/PUT
```

Consequences:

- **`params` is a Promise in Next.js 15.** `const { slug } = await params;`
  Forgetting the `await` yields `undefined` and a silent 404-equivalent.
- Unmatched methods auto-405. Go returned 404 for an unregistered pair. No
  frontend call depends on this.
- Two routes share a `[slug]` segment with a static sibling — `GET
  /api/challenges` (`app/api/challenges/route.ts`) and `GET
  /api/challenges/{slug}`. Static segments win in Next.js, same as Go's
  most-specific-wins. No conflict.
- `POST /api/advertiser/completions/{tokenId}/claim` uses `tokenId`, and
  `POST /api/challenges/{slug}/audit/{logId}/decision` uses `logId`. Keep the
  directory names `[tokenId]` and `[logId]` — the audit route's param is a
  **challenge_log id**, not an assignment id, and conflating them is the bug
  recorded in the findings report.

### 2.5 Caching

Route Handlers reading auth state must never be cached. A cached `/api/auth/me`
serves one user's profile to the next visitor.

Any handler that touches cookies or the Supabase server client is dynamic
automatically, but state it anyway in every authenticated route file:

```ts
export const dynamic = 'force-dynamic';
```

The four public GETs (`/api/events`, `/api/ads`, `/api/ads/{id}`,
`/api/public-key`) plus `/api/health` and the two `/api/lunar/*` routes may be
cached, but `/api/lunar/now` is time-dependent — leave it dynamic.

### 2.6 Two clients, one rule

- `lib/supabase/server.ts` — `createServerClient`, anon key, user's cookies.
  RLS applies. **Default for everything.**
- `lib/supabase/admin.ts` — service-role key, bypasses RLS. Starts with
  `import 'server-only'`. Used only for the operations in §6 that must be
  server-authoritative (badge award, completion-token issue, audit decision).

Leaking the service-role key to a client bundle removes the entire
authorization layer. `server-only` makes that a build error rather than a
production incident.

### 2.7 Error bodies

Every Go error path wrote `{"error": "..."}` with a meaningful status. Preserve
both the shape and the strings the frontend matches on (`"not your campaign"`,
`"unauthorized"`). One helper:

```ts
export const fail = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });
```

---

## 3. Data model: Go struct → Postgres table → TypeScript type

The 24 tables in `db.go`'s `schemaSQL` carry over almost unchanged — they are
already Postgres DDL. Three structural changes only, all forced by Supabase:

1. **`users` splits.** Supabase owns identity. `auth.users` holds
   `id`/`email`/`encrypted_password`. Everything else moves to
   `public.profiles` with `id UUID PRIMARY KEY REFERENCES auth.users(id) ON
   DELETE CASCADE`. Populated by an `AFTER INSERT ON auth.users` trigger, so a
   profile row always exists.
2. **`sessions` and `otp_codes` are dropped** (§1.3).
3. **Every table gains RLS** (§7). `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
   is not optional — an un-policied table in the `public` schema is readable by
   anyone with the anon key.

Types are **generated, never hand-written**:

```bash
npm run db:types   # supabase gen types typescript --local > types/database.ts
```

`types/api.ts` (the frozen `src/types.ts`) stays hand-written. The two are
deliberately separate: `database.ts` is snake_case and regenerates;
`api.ts` is camelCase and must not drift. The mappers in §2.1 are the seam.

### 3.1 Migration file layout

`db.go` did schema + `ALTER`-patches + seeds in one `RunMigrations()`. Split by
concern so `supabase db reset` is deterministic:

| File | Contents |
| --- | --- |
| `0001_extensions.sql` | `pgcrypto`, `uuid-ossp` |
| `0002_profiles.sql` | `public.profiles` + `handle_new_user()` trigger |
| `0003_core.sql` | challenges, challenge_logs, badges, user_badges, notebook_entries, events, user_calendar_events |
| `0004_portfolio.sql` | profile_fields, user_assets, user_favorites, user_links |
| `0005_ads.sql` | advertisers, ad_campaigns, surveys, completion_tokens, user_wallets |
| `0006_social.sql` | chat_rooms, chat_messages, audit_assignments |
| `0007_games.sql` | game_levels, user_game_progress |
| `0008_rls.sql` | every policy in §7, in one reviewable file |
| `0009_functions.sql` | the `SECURITY DEFINER` functions in §6 |
| `seed.sql` | 5 lunar challenges, 6 events, fallback advertiser + 2 campaigns, 4 game levels |

The three `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` blocks in
`RunMigrations()` (events tier/author_id/approved + backfill; users.is_advertiser;
advertisers.user_id) are **folded into the base DDL**. They existed only to
patch already-deployed databases; a fresh Supabase project has no such history.

Two seed bugs to fix rather than reproduce:

- The 6-event `INSERT` sat **inside** the per-challenge loop and ran 5×, saved
  only by `ON CONFLICT DO NOTHING`. In `seed.sql` it runs once.
- The fallback campaigns point at `https://cdn.moonbug.app/fallback/*` which
  does not resolve (finding C5). Seed them pointing at a local asset under
  `public/fallback/`, or leave the campaigns out of `seed.sql` entirely — this
  is an operator call, flagged in `MASTER_PROMPT.md` §8.

### 3.2 Table-by-table

`users` is the only table whose shape changes. Everything else keeps its column
names, so the generated `database.ts` rows line up with the old `store.go`
structs field-for-field.

| Go struct (`store.go`) | Postgres table | TS type (`types/api.ts`) | Notes |
| --- | --- | --- | --- |
| `User` | `auth.users` + `public.profiles` | `User` | split; see §3.3 |
| `Session` | — | — | deleted (§1.3) |
| `OTPCode` | — | — | deleted (§1.3) |
| `Challenge` | `challenges` | `ChallengeDefinition` | seeded, never user-written |
| `ChallengeState` | `challenge_logs` | `ChallengeState` | `UNIQUE (user_id, challenge_id, log_date)` |
| `Badge` | `badges`, `user_badges` | `Badge` | join flattened in `/api/profile` |
| `NotebookEntry` | `notebook_entries` | `NotebookEntry` | `entry_type` CHECK, 6 values |
| `Event` | `events` | `MoonEvent` | `tier` CHECK `astronomical\|community`; no visibility column (**B4**) |
| — | `user_calendar_events` | — | join table, `UNIQUE (user_id, event_id)` |
| `ProfileField` | `profile_fields` | `ProfileField` | self-referencing `parent_id` |
| `UserAsset` | `user_assets` | `UserAsset` | `kind` CHECK, 5 values |
| `UserFavorite` | `user_favorites` | `UserFavorite` | |
| `UserLink` | `user_links` | `UserLink` | |
| `Advertiser` | `advertisers` | `Advertiser` | `user_id` unique |
| `AdCampaign` | `ad_campaigns` | `AdCampaign` | `NUMERIC(18,8)` → §2.3 |
| `CampaignInput` | — | Zod schema | request-only; no JSON tags in Go (§2.3) |
| `Survey` | `surveys` | `AdSurvey` | `questions JSONB` |
| `CompletionToken` | `completion_tokens` | `CompletionToken` | `UNIQUE (user_id, campaign_id, nonce)` |
| `UserWallet` | `user_wallets` | `UserWallet` | `chain` CHECK `solana\|evm`, `UNIQUE (user_id, chain)` |
| `ChatRoom` | `chat_rooms` | `ChatRoom` | one per challenge |
| `ChatMessage` | `chat_messages` | `ChatMessage` | Realtime publication (§6.5) |
| `AuditAssignment` | `audit_assignments` | `AuditAssignment` | `UNIQUE (challenge_log_id)` |
| `GameLevel` | `game_levels` | *(none yet)* | no JSON tags → PascalCase + leaks answers (**B6**, §5.9) |
| `GameProgress` | `user_game_progress` | *(none yet)* | same; `hints_used` default 4 |

### 3.3 `users` → `auth.users` + `profiles`

The old `users` table held identity and app state together:

```
id, email, password_hash, display_name, auth_method, preferred_method,
notifications_enabled, streak, longest_streak, is_advertiser, created_at
```

`id`, `email`, `password_hash` become Supabase's. The rest becomes:

```sql
create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  display_name          text not null,
  auth_method           text not null default 'password',
  preferred_method      text not null default 'password',
  notifications_enabled boolean not null default true,
  streak                integer not null default 0,
  longest_streak        integer not null default 0,
  is_advertiser         boolean not null default false,
  created_at            timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, auth_method, preferred_method)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'auth_method', 'password'),
    coalesce(new.raw_user_meta_data->>'auth_method', 'password')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

The `coalesce(..., split_part(new.email, '@', 1))` fallback is
`handlers.go:displayNameFromEmail` moved into SQL — it fires for the OTP signup
path, which never supplies a display name.

`set search_path = ''` on a `SECURITY DEFINER` function is mandatory, not
stylistic: without it a caller can shadow `public` and get the function to
execute their own table. Every `SECURITY DEFINER` function in §6 carries it.

Consequence for §5: `userResponse` needs `email` from `auth.users` and the rest
from `profiles`. In a route handler that is
`supabase.auth.getUser()` for the email plus one `profiles` select — do not try
to join `auth.users` from the anon client, it is not exposed.

**`is_advertiser` must stay unwritable by the user.** The RLS policy on
`profiles` (§7) permits `UPDATE` of `display_name`,
`preferred_method`, and `notifications_enabled` only. Finding **A1** was exactly
this column being self-granted; a column-scoped policy closes it at the database
rather than in a handler that can be forgotten.

---

## 4. Auth translation

`auth.go` is 140 lines of hand-rolled auth, all of it replaced. The
`/api/auth/*` **contract does not change** — the frontend keeps calling the same
six endpoints with the same bodies. What changes is what happens inside.

| Go mechanism | Replacement |
| --- | --- |
| `jwtSecret = getEnv("JWT_SECRET", "moonbug-dev-secret-change-me")` | Supabase project JWT secret; no fail-open default (**A9**) |
| `GenerateToken` HS256, 30-day exp, `Claims{uid, sid}` | Supabase access token (1h) + refresh token, revocable (**B9**) |
| `ParseToken` | `supabase.auth.getUser()` — validates against the auth server |
| `sessions` table | Supabase-managed refresh tokens |
| `HashPassword`/`CheckPassword` (bcrypt) | Supabase Auth (`signUp`/`signInWithPassword`) |
| `GenerateOTP` + `HashOTP` (unsalted SHA-256 hex) | `signInWithOtp` / `verifyOtp` |
| `otp_codes` table | Supabase-managed, with expiry and attempt limits |
| `SendOTPEmail` + `buildMail` + `net/smtp` | Supabase Auth email provider |
| `middleware.RequireAuth` | `middleware.ts` (token refresh) + `getUser()` per handler |

Three Go behaviours worth naming before they disappear:

- **`HashOTP` was unsalted SHA-256 with no work factor.** A 6-digit code has a
  10⁶ preimage space; a DB dump reversed every live OTP in seconds. This sharpens
  **A8** beyond what the findings report states.
- **`SendOTPEmail` returned `nil` when `SMTP_HOST` was empty**, in production
  too. The OTP was issued and stored, the user never received it, and the caller
  saw success.
- **`buildMail` hand-assembled RFC822 headers with no CRLF guard on the
  recipient**, and `validEmail` only checked for `@`, `.`, and length ≤ 254. A
  recipient containing `\r\n` could inject arbitrary headers. **This is an
  email-header-injection vector not recorded in `audit-findings.md`.** It is
  mooted by deleting the code — logged here so the finding is not lost if
  anyone ever reintroduces hand-built mail.

### 4.1 Endpoint-by-endpoint

Bodies and responses below are unchanged from Go. Only the implementation
differs.

**`POST /api/auth/signup`** — `{email, password, displayName}` → `{user}`

```ts
const { data, error } = await supabase.auth.signUp({
  email, password,
  options: { data: { display_name: displayName, auth_method: 'password' } },
});
```

The `options.data` lands in `raw_user_meta_data`, which the §3.3 trigger reads.
Go inserted the user row itself; here the trigger owns it. Error mapping:
Supabase returns `User already registered`; Go returned 409
`{"error":"email already registered"}` — map it, do not pass Supabase's string
through.

**`POST /api/auth/login`** — `{email, password}` → `{user}`
`signInWithPassword`. Cookie set by `@supabase/ssr`; the frontend never read a
token from the body, so nothing changes for it.

**`POST /api/auth/request-otp`** — `{email}` → `{ok: true}`, plus `devCode` when
not production.

`signInWithOtp({ email, options: { shouldCreateUser: true } })`. The
`shouldCreateUser: true` preserves Go's behaviour of signing up on first OTP.

`devCode` **cannot be reproduced** — Supabase does not return the code to the
caller. In local dev the code is visible in Inbucket at
`http://127.0.0.1:54324`. The key must still be **absent** from the production
response, so:

```ts
const body: { ok: true; devCode?: string } = { ok: true };
// devCode intentionally omitted: Supabase never exposes the code.
// Local dev: read it from Inbucket at http://127.0.0.1:54324
```

Grep `src/` for `devCode` before shipping. If a dev-only UI path consumes it,
that path needs replacing with a pointer to Inbucket — recorded as a checklist
item in `MASTER_PROMPT.md` §11, not silently dropped.

**`POST /api/auth/verify-otp`** — `{email, code}` → `{user}`

```ts
await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
```

Note the rename: the wire field stays `code`, Supabase's parameter is `token`.

**`POST /api/auth/logout`** — `{}` → `{ok: true}`
`signOut()`. Go deleted the `sessions` row; Supabase revokes the refresh token —
which is the actual fix for **B9**, since the old 30-day JWT stayed valid after
logout.

**`GET /api/auth/me`** — → `{user}`
`getUser()` + `profiles` select, through `userResponse` (§2.1). 401
`{"error":"unauthorized"}` when there is no session, matching Go.

**`PUT /api/auth/settings`** — `{notificationsEnabled?, preferredMethod?}` → `{user}`
Partial update on `profiles`. Both fields optional; Go treated a missing field as
"leave unchanged", so the Zod schema uses `.optional()` and the update object is
built from present keys only. `undefined` in a Supabase `update()` payload still
writes the column — build the object conditionally.

### 4.2 `middleware.ts`

`@supabase/ssr` needs middleware to refresh the access token and write the
rotated cookie, otherwise a user is logged out an hour after sign-in. The
matcher excludes static assets and image optimisation. This replaces
`middleware/RequireAuth` in position only — it does **not** authorize. Each
handler still calls `getUser()`, and RLS is what actually enforces access.

<!-- CHUNK-2 -->
