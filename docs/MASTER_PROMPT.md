# Project Moon-Bird — Master Engineering Brief (v2, Next.js + Supabase)

**Supersedes:** the original "Engineering Brief for Claude Opus 5 / Claude Code" (Go backend + Vite SPA).
**Status of v1:** the *scope* (§6–§8 below) is carried over unchanged. The *architecture* is replaced.
**Companion document:** [`docs/MIGRATION_MAP.md`](./MIGRATION_MAP.md) — the mechanical Go → TypeScript translation.
**Prerequisite reading:** [`docs/audit-findings.md`](./audit-findings.md) — the §5 audit is still binding; its findings are logic-level, not Go-level, and every one of them survives the rewrite unless deliberately fixed.

---

## 0. Operating instructions — do in order

1. **The audit still gates feature work.** `docs/audit-findings.md` was produced against the Go implementation and committed as `audit-v1`. Its 25 findings describe *product logic* defects (self-granted privileges, client-declared completion, farmable payout tokens, missing tenancy checks), not language defects. Porting the same logic to TypeScript reproduces every one of them. **Section 9 below maps each finding to its fix in the new stack; that mapping is the acceptance criteria for the port.** Do not port a handler without applying its fix.
2. **Do not assume missing pieces are "fine as placeholders."** Anything in §8 (Cannot be completed by AI alone) must be surfaced to the human operator as a blocking question, not silently stubbed. Where a stub is unavoidable, it is a labeled `TODO(operator)` plus a `.env.example` entry — never invented data or a fake integration.
3. **Commit discipline (§10) is mandatory.** One logical change per commit, Conventional Commit messages, no direct pushes to `main`.
4. **UI/UX is not a "make it pretty later" task.** Every feature ships with its UI in the same PR — not "backend first, UI later." With Route Handlers and Server Components living in the same tree, there is no longer even a structural excuse to split them.
5. **If this document conflicts with the codebase, the codebase's existing architecture wins on structure and this document wins on scope and completeness — except where this document explicitly replaces the architecture (the entire server tier). Flag conflicts; do not silently resolve them.**
6. **Preserve the API contract byte-for-byte.** The React components and `src/lib/api.ts` are being kept. Every `/api/*` route must return the same JSON keys, casing, and nesting as the Go implementation did. `MIGRATION_MAP.md` §2 lists the four ways this silently breaks; read it before writing a single handler.

---

## 1. Architecture — definitive

A single Next.js application. There is no separate backend service.

| Concern | Choice |
|---|---|
| Framework | **Next.js 15, App Router**, React 19, TypeScript 5.8 (strict) |
| Styling | **Tailwind CSS v4** (already in use — `@tailwindcss/postcss`, CSS-first `@theme` config) |
| API layer | **Route Handlers** — `app/api/**/route.ts`. No Express, no separate server. |
| Database | **Supabase Postgres**, local-first via the **Supabase CLI** (Docker) |
| Auth | **Supabase Auth** — email OTP (primary) + password (fallback), cookie sessions via `@supabase/ssr` |
| Realtime | **Supabase Realtime** — Postgres Changes for chat; Broadcast for presence/typing |
| File storage | **Supabase Storage** — for Snapshot (§6.10) and advertiser media placements |
| Types | **Auto-generated** from the live local schema: `supabase gen types typescript --local` |
| Schema | **Versioned SQL migrations** in `supabase/migrations/` — the single source of truth |
| Validation | **Zod** at every Route Handler boundary |
| Astronomy | **`astronomy-engine`** (npm, MIT, offline, no API key) — replaces the hand-rolled Go lunar math |

### Why this shape

- **RLS is the authorization layer.** Postgres Row Level Security enforces tenancy in the database, so a forgotten `WHERE user_id = ...` in a handler is no longer a data breach. Three of the audit's high-severity findings (A4 survey ownership, A5 chat IDOR, A6 audit-assignment PII leak) are fixed *by construction* under RLS rather than by remembering to check.
- **Supabase Auth deletes an entire attack surface.** The custom `sessions` table, `otp_codes` table, bcrypt handling, JWT signing, and SMTP delivery all disappear along with findings A9 (weak `JWT_SECRET`) and B9 (unrevocable sessions).
- **Local-first means no shared dev database.** `supabase start` runs Postgres, Auth, Realtime, Storage, and Studio in Docker on the developer's machine. No cloud credentials are required to develop, and no developer can accidentally write to production.

### Server authority — the non-negotiable rule

Two Supabase clients exist and they are not interchangeable:

- **Anon client** (`@supabase/ssr`, user's cookie session, RLS enforced) — used in Server Components, Client Components, and any Route Handler doing user-scoped reads/writes.
- **Service-role client** (bypasses RLS) — used **only** inside Route Handlers, **only** for operations the user must not be able to perform on their own behalf: awarding badges, granting advertiser privilege, issuing signed completion tokens, moderation actions.

`SUPABASE_SERVICE_ROLE_KEY` is server-only. It must never appear in a `NEXT_PUBLIC_*` variable, a Client Component, or anything under `app/` that is not a `route.ts` or a `server-only` module. Import the shared helper from `lib/supabase/admin.ts`, which starts with `import 'server-only'`.

Where logic must be atomic and unforgeable (state transitions, streak/badge computation, privilege grants), prefer a **`SECURITY DEFINER` Postgres function** called via `supabase.rpc(...)` over multi-step handler logic. The database is the only place where "check then write" is genuinely race-free.

---

## 2. Local development workflow

```bash
npm install
supabase start                 # Postgres + Auth + Realtime + Storage + Studio in Docker
npm run db:types               # regenerate src/lib/database.types.ts from the live local schema
npm run dev                    # Next.js on :3000
```

Schema changes are **never** made by hand in Studio and then forgotten:

```bash
supabase migration new add_challenge_state_enum   # creates a timestamped empty SQL file
# write the SQL by hand into supabase/migrations/<timestamp>_add_challenge_state_enum.sql
supabase db reset                                  # replays every migration + seed from scratch
npm run db:types                                   # regenerate types — commit the result
```

`supabase db reset` must succeed from an empty database at every commit. That is the migration test.

Package scripts to define:

| Script | Command |
|---|---|
| `dev` | `next dev` |
| `build` | `next build` |
| `lint` | `next lint && tsc --noEmit` |
| `db:types` | `supabase gen types typescript --local > src/lib/database.types.ts` |
| `db:reset` | `supabase db reset` |
| `db:new` | `supabase migration new` |

---

## 3. Repository layout

```
supabase/
  config.toml                  # CLI config: ports, auth settings, SMTP for local inbucket
  migrations/                  # timestamped SQL — the single source of schema truth
  seed.sql                     # challenge catalogue, astronomical events, house ads
app/
  layout.tsx                   # root layout, fonts, Tailwind entry
  (marketing)/                 # public routes
  (app)/                       # authenticated routes
    moondial/ journal/ portfolio/ challenges/ events/ ads/ chat/ profile/
  advertiser/                  # advertiser portal
  admin/                       # moderation queue (gated on profiles.role)
  api/                         # Route Handlers — see MIGRATION_MAP.md §5 for the full map
components/                    # ported from src/components/
lib/
  supabase/
    client.ts                  # createBrowserClient
    server.ts                  # createServerClient (cookies())
    admin.ts                   # service-role client, `import 'server-only'`
    middleware.ts              # session refresh helper
  database.types.ts            # GENERATED — do not edit
  mappers.ts                   # snake_case row -> camelCase API payload. See MIGRATION_MAP.md §2.1
  schemas.ts                   # Zod schemas, one per request body
  lunar.ts                     # astronomy-engine wrapper
  api.ts                       # ported client fetch wrapper (largely unchanged)
types.ts                       # hand-written API contract types — unchanged from v1
middleware.ts                  # Next.js middleware: Supabase session refresh
docs/
  MASTER_PROMPT.md  MIGRATION_MAP.md  audit-findings.md
```

Deleted by this migration: `backend/` (entire Go module), `migrations/` (replaced by `supabase/migrations/`), `vite.config.ts`, `index.html`, and the `react-router-dom` dependency.

---

## 4. Dependencies

**Add:** `next`, `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `astronomy-engine`, `server-only`, `eslint-config-next`.
**Keep:** `react`, `react-dom`, `tailwindcss@4`, `@tailwindcss/postcss`, `motion`, `lucide-react`, `typescript`.
**Remove:** `vite`, `@vitejs/plugin-react`, `react-router-dom`.
**Dev tool (not an npm dependency of the app):** the Supabase CLI.

Removing Vite also removes the transitive `postcss` <8.4.31 path-traversal advisory (GHSA-r28c-9q8g-f849, audit finding A10) — **verify this with `npm audit` after the dependency swap rather than assuming it**, since Tailwind also pulls `postcss`.

---

## 5. Conventions

1. **Serialization boundary.** The database speaks `snake_case`; the API speaks `camelCase`. Every Route Handler converts explicitly via a mapper in `lib/mappers.ts`. Returning a raw Supabase row from a Route Handler is a bug — it silently changes the API contract and breaks the frontend. See `MIGRATION_MAP.md` §2.1.
2. **Validation.** Every request body is parsed with a Zod schema from `lib/schemas.ts` before use. Every free-text field has an explicit `.max()`. This is audit finding B7 fixed systematically instead of per-field.
3. **Generated types are read-only.** `lib/database.types.ts` is regenerated, never edited. Hand-written API contract types live in `types.ts`.
4. **Dynamic route params are async.** In Next.js 15, `params` is a `Promise`. See `MIGRATION_MAP.md` §2.3.
5. **Auth-dependent routes are dynamic.** Any Route Handler or page reading cookies must not be statically cached. See `MIGRATION_MAP.md` §2.4.
6. **RLS is on for every table.** A new table without `ENABLE ROW LEVEL SECURITY` and an explicit policy set is an incomplete migration.
7. **UI conventions.** Follow the `frontend-design` skill conventions. Default toward fewer, more visually distinctive screens over generic CRUD-style admin UI. A distinctive UI is a stated business requirement, not a nice-to-have.

---

## 6. Business framing and feature map (carried over from v1, unchanged)

**Monetizable core:** advertiser engagement via user-generated feedback, not impressions. Advertisers pay for structured responses — survey answers, comments, completion proof — because that is worth more than a view count. The **challenge system is the growth loop**: it produces the engaged users whose feedback is the product.

**Market:** Kenya / Africa first. Speed to market beats completeness. Default toward fewer screens, more visually distinctive ones.

### Feature map

**6.1 MoonDial** — lunar clock, calendar, full-moon-cycle counter between two arbitrary dates, perigee/apogee, user events with per-event and per-moon-phase visibility toggles. Offline-first.

**6.2 Events** — astronomical, community, holidays, and personal events. Personal events carry a user-controlled public/private toggle **enforced server-side** (audit finding B4: the column does not exist yet).

**6.3 MoonBird AI ("she")** — proactive, executes tasks on command with authorization, guides in a friendly rather than professional register. Persona: artist / singer / free spirit. See §8.7 — production dialogue is not AI-generated.

**6.4 Challenges** — see §7.

**6.5 Journal** — voice-to-text, read-aloud, and templates: log, scheduler, deadline-note, reminder, health.

**6.6 Portfolio** — custom nested fields, assets, favorites, links; publishable.

**6.7 Catalogues** — skills, books, companies/brands, astronomical events, diseases, charities/non-profits.

**6.8 Ads** — watch / like / comment / share. Skip privileges are earned or bought. Advertiser registration is open to any user, but **privileges are earned via challenges and can expire** (audit finding A1: currently self-granted and permanent).

**6.9 Chat** — real-time is the point. Chatting earns privileges, possibly gated to "new person" conversations to make farming harder.

**6.10 Snapshot** — screenshot-of-activity logging as progress proof. Backed by Supabase Storage; does not exist yet in any form.

---

## 7. Challenges specification (carried over from v1, unchanged)

Multi-stage; 30 minutes to multi-week; roles; remote or local; **"Roblox-easy" authoring**. Challenges are AI-authored and then human-refined — **build the moderation/refinement queue as a first-class admin feature, not an afterthought.**

### State model

Model this as an explicit enum with valid transitions, **not free-text status**:

```
Unfinished → Finished
Unfinished → Completed-Unaudited
Unfinished → Evolving
Completed-Unaudited → Finished        (on auditor approval)
Completed-Unaudited → Unfinished      (on auditor rejection)
```

Implement as a Postgres `ENUM` plus a transition-validating trigger, so the transition table lives in the database and cannot be bypassed by any client or handler. This is audit finding B3; the current schema has only a `completed BOOLEAN`.

**Scope** is a required field on every challenge: `Skills-Related` | `Self-Improvement-Wellbeing` | `Fun-Based`.

### Builder blocks

Mandatory: **Title**, **Completion Step**.
Optional: Category/Scope · Participation Mode · Participant Roles (+ optional leader) · Step Sequence · Dynamic/Addable Steps toggle · Checkpoints · Target Milestones · Bonus Steps · Auditor's Questionnaire · Creator-Sponsored Rewards · Media Asset Placements.

The **Completion Step is the server's definition of done.** It is what a Route Handler evaluates before allowing a transition to `Finished`. This is the fix for audit finding A2, where the client simply asserts `completed: true`.

### Seed challenges

Eight onboarding challenges, in order: **1** Sky Watcher L1 · **2** Who Am I · **3** The Seeker · **4** Up to Date · **5** Cut the Habit · **6** Vital Check · **7** Sky Watcher L2 · **8** Life Blueprint.

> ⚠️ **`TODO(operator)` — verbatim challenge copy.**
> The original brief specified the step-by-step content of all eight challenges and the exact wording of three surveys (The Seeker, 8 questions; Up to Date, 5 questions; Cut the Habit, 4 questions), with the instruction *"do not paraphrase or shorten their steps."*
> The question **labels** survive in this repo's history — The Seeker: Hook (1–5), Pacing & Flow, First Impression, Clarity & Tone, Expectations Set, Drop-Off Check (+ "where"), Cliffhanger Factor, Target Audience Fit · Up to Date: Source Reliability (1–5), Core Takeaway, Local Impact (Yes/No + why), Actionability, Discussion Value · Cut the Habit: Trigger Awareness (1–5), Friction Check, Identity Shift, Support Need.
> The **exact question wording does not.** It must be pasted back in from the original brief before `supabase/seed.sql` is authored. Inventing the wording would violate the "do not paraphrase" instruction, so the seed file will carry this TODO until the operator supplies the original text.

**Onboarding gate:** MoonDial, Events, Journal, Ads, and Portfolio basics are mandatory before the broader catalogue unlocks.

---

## 8. Cannot be completed by AI alone — blocking questions

Unchanged from v1 except where the stack choice has resolved an item. Stub these clearly (`TODO(operator)` + a `.env.example` entry) rather than inventing fake data or fake integrations.

1. **Ad network / advertiser inventory.** House ads drawn from the Catalogues are acceptable as an explicit placeholder; a real ad-network API key or a curated house-ad set is an operator decision. *Currently the only inventory is two seeded campaigns pointing at a dead CDN (`cdn.moonbug.app`), which contradicts the README's "no placeholder data" claim.*
2. **Payment / reward fulfillment.** The brief specifies **M-Pesa** (Kenya); the v1 code implemented **non-custodial crypto payouts** (Ed25519 completion tokens, Solana/EVM wallets). These are different rails with different KYC, settlement, and regulatory profiles. **Unresolved and blocking.** M-Pesa needs a Daraja merchant account, shortcode, and consumer key/secret; crypto needs a funding source and fee policy.
3. **AI challenge authorship pipeline.** Build the moderation/refinement queue; **the AI cannot be the reviewer.** Needs a named human reviewer and an approval SLA. Prerequisite: the role model in §9 (B1), since there is currently no admin role to gate the queue on.
4. **Astronomical event data.** ✅ *Partially resolved by this document:* `astronomy-engine` is offline, MIT-licensed, needs no key, and satisfies the offline-first requirement — recommended and adopted. **Still needs operator confirmation**, and any *curated event catalogue* (meteor showers, eclipses, holidays) is separate editorial data that a library does not provide.
5. **Auditor role.** Which Completion Steps are machine-verifiable versus human-audited is a product decision, and it determines whether the A2 fix is a validator, an audit queue, or both. Also unresolved: is self-audit ever acceptable, and is auditor assignment random across all eligible users or scoped to participants?
6. **Legal / compliance for Kenya.** Data Protection Act 2019 (consent, data-subject rights, retention, cross-border transfer — note that hosted Supabase regions are outside Kenya), advertising standards for reward-based engagement, and health-adjacent content rules. **Do not generate medical advice copy for Challenge 6 "Vital Check" or the Diseases Catalogue — structure the feature only.** A privacy policy and consent flow remain unwritten.
7. **MoonBird AI persona voice.** Needs real brand-voice copywriting. Build the interaction surface and a clearly labeled placeholder string table for a copywriter to fill; do not ship AI-generated placeholder dialogue as production copy.
8. **Push notification infrastructure.** FCM/APNs need app-store credentials and signing certificates only the operator can obtain. `profiles.notifications_enabled` exists; nothing sends anything.

**New, introduced by this stack:**

9. **Supabase hosting decision.** Local-first development is settled. Production is not: hosted Supabase (which region? — affects §8.6 cross-border transfer) versus self-hosted. This also determines connection-pooling strategy for serverless Route Handlers.
10. **Transactional email.** Supabase Auth sends OTP emails. Local development uses the CLI's built-in Inbucket. Production needs a real SMTP provider configured in Supabase — and the existing Gmail app password **must not** be reused (see audit finding A9; it requires rotation regardless).

---

## 9. Security requirements — audit findings mapped to this stack

Every finding in `docs/audit-findings.md` is restated here as a build requirement. **The port is not complete until this table is satisfied.** Findings marked *by construction* are resolved by the architecture itself; the rest need deliberate work.

| # | Finding | Fix in this stack |
|---|---|---|
| **A1** | Advertiser self-grant | `POST /api/advertiser/register` calls a `SECURITY DEFINER` function that evaluates challenge-earned eligibility server-side. Add `granted_at` / `expires_at`. No RLS policy permits a user to write their own privilege columns. |
| **A2** | Client-declared challenge completion | Route Handler evaluates the challenge's Completion Step against submitted data; the state enum trigger (B3) rejects any invalid transition. Badge award moves into a `SECURITY DEFINER` function. Client input no longer includes `completed`. |
| **A3** | Nonce-farmable payout tokens | Nonce is **server-generated** and bound to an `ad_view_sessions` row with an issue time and minimum dwell. One claimable completion per user per campaign per period, enforced by a unique constraint. |
| **A4** | Survey upsert missing ownership check | *By construction* — RLS on `surveys` requires the campaign's advertiser to be the caller. |
| **A5** | Chat room IDOR | *By construction* — RLS on `messages` requires room membership. Realtime respects RLS for Postgres Changes, so the subscription is gated by the same policy. |
| **A6** | Audit assignment PII leak | *By construction* + projection — RLS scopes assignments to `auditor_id = auth.uid()`; the handler selects only the questionnaire fields, never the raw `data` blob. |
| **A7** | Ephemeral payout signing key | Signing moves to a Node-runtime Route Handler. **Fail closed:** if `MOONBIRD_PAYOUT_KEY` is unset or malformed and `NODE_ENV=production`, throw at module load — never generate a throwaway key. |
| **A8** | No rate limiting | Supabase Auth rate-limits OTP request/verify natively. Application endpoints (ad completion, chat post, challenge save) need an explicit limiter — Postgres-backed counter or an edge KV. Not free; must be built. |
| **A9** | Live Gmail password + weak JWT secret | JWT signing disappears with Supabase Auth. **The Gmail app password still requires operator rotation** — the credential is compromised regardless of which stack uses it. |
| **A10** | postcss CVE | Expected to resolve with the Vite removal; verify with `npm audit`. |
| **B1** | No role model | `profiles.role` enum (`user` \| `moderator` \| `admin`), read by RLS policies and by the `/admin` route group. Prerequisite for §7's moderation queue. |
| **B2** | No CSRF defense | Supabase's `@supabase/ssr` cookie handling plus `SameSite`; add an origin check in `middleware.ts` for state-changing methods. |
| **B3** | No state enum | Postgres `ENUM` + transition trigger, per §7. |
| **B4** | No event visibility column | Add `events.visibility`; RLS policy enforces it on read. |
| **B5** | Self-audit possible, assignments never created | Assignment creation function excludes the log's own author and randomizes selection. Note the v1 route/handler ID mismatch documented in the audit — do not port the bug. |
| **B6** | Game answers leaked, client-supplied score | RLS hides the answer columns from the anon role; scoring moves server-side. |
| **B7** | No input length caps | Zod `.max()` on every field + Postgres `CHECK` constraints as the backstop. |
| **B8** | No security headers | `headers()` in `next.config.ts`: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`. |
| **B9** | 30-day JWT, unrevocable sessions | *By construction* — Supabase Auth issues short-lived access tokens with refresh rotation and server-side revocation. |
| **B10** | Unvalidated media URL rendered | Zod URL schema with an `https:` scheme allow-list at write time; host allow-list for `payload_url`. |
| **C1** | Broken git refs | Operator action: prune `refs/remotes/origin/master`, establish `main`. Blocks the §10 PR workflow. |
| **C3** | `.env.example` incomplete | Rewritten for the new stack — see below. |
| **C4** | No unit tests | Vitest for `lib/`, `pgTAP` or SQL assertions for RLS policies. **RLS policies without tests are unverified claims.** |

### `.env.example` for the new stack

```bash
# Supabase — `supabase start` prints these for local development
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""          # SERVER ONLY — never expose to the browser

# Payout signing (Ed25519, base64 private key). Fails closed in production if unset.
MOONBIRD_PAYOUT_KEY=""

# TODO(operator) §8.2 — payment rail undecided. M-Pesa Daraja if that is the answer:
# MPESA_CONSUMER_KEY=""
# MPESA_CONSUMER_SECRET=""
# MPESA_SHORTCODE=""

# TODO(operator) §8.1 — ad network. No provider selected; house ads only until then.
# TODO(operator) §8.8 — FCM/APNs credentials. Nothing sends notifications yet.
```

---

## 10. Git workflow

- One feature branch per module: `feature/<module-name>`.
- **Never commit directly to `main`.** (Note finding C1: `main` does not currently exist locally and the remote refs are broken — resolve before the first PR.)
- Granular **Conventional Commits**: `feat(moondial): add lunar phase calculation` · `fix(ads): prevent client-side privilege escalation` · `docs(audit): add security findings report` · `chore(deps): patch high-severity CVE in <package>`.
- Run `npm run lint` (which includes `tsc --noEmit`) and the test suite before each commit. Where no test exists for touched code, write a minimal one.
- `supabase db reset` must succeed from empty at every commit that touches `supabase/migrations/`.
- PRs target `main` and reference the section of this brief they implement.
- **No squash-merge without operator review for anything touching §8 items** (payment, ad network, auth).

---

## 11. Build order

0. **Migration.** Scaffold Next.js, stand up Supabase locally, port the schema with RLS, port the API contracts. Per `MIGRATION_MAP.md`. Apply the §9 fixes *during* the port — do not port a vulnerability forward and schedule its fix.
1. **Security completion.** Everything in §9 not resolved by construction: A1, A2, A3, A7, A8, B1, B3, B4, B5, B6, B7, B8, B10, C4.
2. **MoonDial + Journal + Portfolio + seed Challenges 1–2.**
3. **Ads (house-ad placeholder) + Catalogues.**
4. **Challenges 3–8 + Events.**
5. **Chat (Supabase Realtime) + Snapshot (Supabase Storage).**
6. **Challenge Builder + MoonBird AI persona layer.**

Each step ships its UI in the same PR.

---

## 12. Open conflicts requiring an operator decision

Carried forward from the audit; none are resolved by the stack change.

1. **Challenge catalogue.** The database seeds **5 moon-phase challenges**; this brief specifies **8 different onboarding challenges**. Replace, or run both? Existing `challenge_logs` reference the current five.
2. **Payout rail.** Crypto (implemented in v1) versus M-Pesa (specified). The largest architectural divergence in the project, and still open.
3. **Geography.** v1 hardcoded `observerLatitude = 51.5 // London` against a stated Kenya launch. The `astronomy-engine` port should take a per-user observer location with a Nairobi default (−1.2921, 36.8219) — confirm.
4. **Product name.** The repo, module path, database name, and all user-facing copy say **"Moonbug"**; both briefs say **"Moon-Bird."** The rewrite is the cheapest moment to settle this — after the schema and seed data are written, it gets expensive.
