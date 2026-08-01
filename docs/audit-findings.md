# Project Moon-Bird — Security & Completeness Audit (Brief §5)

**Date:** 2026-07-29
**Scope:** full repo at commit `0320c8a` (branch `master`), backend Go + React/Vite frontend + SQL migrations.
**Method:** read-only review of all backend Go source (~4.3k lines), all `migrations/*.sql`, all `src/` pages and lib, plus `go vet`, `go build`, `go test ./...`, `npm audit`, and `git grep` sweeps for secret patterns and XSS sinks.
**Status:** no code was modified as part of this audit. Per brief §0.1, no §2/§3 feature work has begun.

Severity key: **CRITICAL** = exploitable now, direct money/privilege/data impact · **HIGH** = exploitable now, contained impact · **MEDIUM** = requires preconditions or is a hardening gap · **LOW** = hygiene.

---

## 1. Summary

| # | Severity | Finding | Area |
|---|---|---|---|
| A1 | CRITICAL | Any authenticated user can self-grant advertiser status | Authorization |
| A2 | CRITICAL | Client dictates challenge completion; badge awarded on assertion | State integrity |
| A3 | CRITICAL | Ad completion accepts a client-supplied nonce → unlimited signed payout tokens | Payout |
| A4 | HIGH | Survey upsert has no advertiser-ownership check | Authorization |
| A5 | HIGH | Chat rooms have no membership check (IDOR read + write) | Authorization |
| A6 | HIGH | Audit assignment listing leaks other users' raw log data | PII |
| A7 | HIGH | Payout signing key is ephemeral when `MOONBUG_PAYOUT_KEY` is unset | Secrets |
| A8 | HIGH | No rate limiting anywhere, including OTP request/verify | Abuse |
| A9 | HIGH | Live Gmail app password + weak `JWT_SECRET` in local `.env` need rotation | Secrets |
| A10 | HIGH | `postcss` <8.4.31 path-traversal CVE (GHSA-r28c-9q8g-f849) | Dependencies |
| B1 | MEDIUM | No admin/moderator/auditor role exists in the data model | Authorization |
| B2 | MEDIUM | No CSRF defense on cookie-authenticated state-changing routes | Web |
| B3 | MEDIUM | Challenge status is `completed BOOLEAN`, not the §3 state enum | State integrity |
| B4 | MEDIUM | Personal events have no visibility column; public/private is unenforceable | PII |
| B5 | MEDIUM | Self-audit is not prevented; auditor assignment is not randomized | Integrity |
| B6 | MEDIUM | Game endpoints return answers and trust client-supplied score | Integrity |
| B7 | MEDIUM | No free-text length caps on Journal / portfolio / chat / survey answers | Input validation |
| B8 | MEDIUM | No security response headers, no CSP | Web |
| B9 | MEDIUM | 30-day JWT with no rotation; session revocation not checked per request | Session |
| B10 | MEDIUM | Ad `payload_url` is rendered into `<img src>` / `<video src>` unvalidated | Input validation |
| C1 | LOW | Broken git refs block the §6 PR workflow | Tooling |
| C2 | LOW | Migration UUID collision between `004_ads.sql` and `006_games.sql` | Hygiene |
| C3 | LOW | `MOONBUG_PAYOUT_KEY` missing from `backend/.env.EXAMPLE` | Secrets |
| C4 | LOW | Zero unit tests on `internal/*`; only `test/` integration package | Testing |
| C5 | LOW | Seeded fallback ads point at a non-existent CDN | Completeness |

**Not found (verified clean):** no hardcoded API keys, tokens, or credentials in any tracked file; no SQL string interpolation of user values anywhere in `store.go` (all `$n` placeholders); no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `new Function` in `src/`; `go vet` and `go build` clean; integration tests pass.

---

## 2. Authentication & authorization

### A1 — CRITICAL: advertiser self-grant (brief §5 explicitly asks for this check)

`backend/internal/handlers/handlers.go:1175` `registerAdvertiserHandler` takes a name, creates an advertiser row, and then:

```go
_, _ = db.Pool.Exec(r.Context(), `UPDATE users SET is_advertiser = TRUE WHERE id = $1`, uid)
```

Any user with a session can `POST /api/advertiser/register` and become an advertiser. There is no challenge-earned gate, no verification step, and no expiry — all three of which §2.8 requires ("privileges earned via challenges and can expire"). The error is also discarded, so a failed grant is silent.

**Answer to the brief's question: no, a normal user cannot be prevented from self-granting advertiser status today.**

Fix: gate the grant on a server-evaluated eligibility check (completed challenge set), record `granted_at` / `expires_at`, and never trust the request to imply eligibility.

### A4 — HIGH: survey upsert missing ownership check

`handlers.go:1333` `upsertSurveyHandler` reads `id := r.PathValue("id")` and calls `store.UpsertSurvey(...)` directly. Its siblings (`getAdvertiserCampaignHandler`, `updateAdvertiserCampaignHandler`, `deleteAdvertiserCampaignHandler`) all resolve the caller's advertiser first and verify the campaign belongs to it. This one does not, so any authenticated user can overwrite the questions and `min_payout` of any campaign by ID.

### A5 — HIGH: chat room IDOR

`handlers.go:1448` and `handlers.go:1464` use `roomID := r.PathValue("id")` with no check that the caller participates in that room's challenge:

- `GET /api/chat/rooms/{id}/messages` → read any room's history.
- `POST /api/chat/rooms/{id}/messages` → post into any room.

Room IDs are UUIDs, but `chatRoomHandler` hands them out per challenge slug, so enumeration is not needed — one call per challenge yields every room.

### B1 — MEDIUM: no role model

`users` has exactly one privilege flag, `is_advertiser` (`db.go:52`). There is no admin, moderator, or auditor role. `middleware.go` offers only `Auth` (permissive) and `RequireAuth` (401 if anonymous). Brief §3 requires a moderation/refinement queue as a *first-class admin feature*; there is currently nothing to authorize it against. This is a blocking structural gap for §3 and §7.6.

### B9 — MEDIUM: session lifetime and revocation

`auth.go:43` issues a 30-day HS256 token. `sessions` has a `revoked` column, but request-time authorization derives identity from the JWT alone — a revoked session's token stays valid until natural expiry. Logout is therefore advisory. Recommend short access token + server-side session check on each request, or at minimum a revocation check in `RequireAuth`.

Note `auth.go:18`: `jwtSecret` is captured at package init with a hardcoded weak default (`moonbug-dev-secret-change-me`). If `JWT_SECRET` is unset in production the app boots and signs tokens with a public constant. This should fail closed when `APP_ENV=production`.

---

## 3. Secrets handling

### A9 — HIGH: rotate the credentials currently in the local `.env`

`.env` is **not tracked** (`git ls-files | grep -i env` is empty; `.gitignore` has `.env*` with `!.env.example`), and `git grep` across tracked `*.go`/`*.ts`/`*.tsx`/`*.json` for key/token/secret patterns returns **no hits**. So nothing is committed.

However the working-tree `.env` holds a live Gmail app password and a guessable `JWT_SECRET` ("how-can-i-see-the-world"), with `APP_ENV="production"`. `FEATURE_LOG.md` records that this Gmail app password was previously leaked and rotation was deferred. Brief §5 says found secrets must be moved to env vars *and rotated* — they are already in env vars, so the outstanding action is rotation:

1. Revoke the Gmail app password at the Google account level and issue a new one.
2. Replace `JWT_SECRET` with 32+ bytes from a CSPRNG (this invalidates all sessions — expected).
3. Set `APP_ENV=development` locally so the production-only paths aren't exercised by accident.

### A7 — HIGH: ephemeral payout key

`backend/internal/payout/payout.go:17` generates a throwaway Ed25519 key when `MOONBUG_PAYOUT_KEY` is unset or malformed, logs a warning, and continues. Consequences: every completion signature issued before a restart becomes unverifiable after it, and `GET /api/public-key` serves a key that silently changes. For a money-adjacent path this must fail closed in production instead of degrading.

### C3 — LOW: `.env.EXAMPLE` incomplete

`backend/.env.EXAMPLE` lists `DATABASE_URL`, `JWT_SECRET`, `APP_ENV`, `SMTP_*` but omits `MOONBUG_PAYOUT_KEY`, `PORT`, and `STATIC_DIR` (the latter two are documented in `README.md`). The §4 stub entries below also need to land here.

---

## 4. Injection & input validation

**SQL injection: none found.** Every query in `store.go` (1,939 lines) uses `$n` placeholders. Two dynamic-SQL sites were inspected closely and are safe:

- `ListActiveCampaigns` builds a `WHERE` clause with `strings.Builder` and `fmt.Sprintf("target_categories ? $%d", n)` — only the *placeholder index* is interpolated; values remain bound parameters.
- `ListEvents` selects a `where` string from a fixed `switch`, never from input.

**Stored XSS: no sink exists today.** React auto-escapes, and there is no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `new Function` anywhere in `src/`. This is a property of the current render path, not a validation guarantee — it will break the first time a rich-text or markdown Journal renderer is added, so validation should be added server-side now rather than relied upon later.

### B7 — MEDIUM: no length or shape caps on free text

Journal bodies, portfolio custom field titles/values, chat message bodies, and survey answers are accepted with only `strings.TrimSpace` and (sometimes) a non-empty check. No maximum length, no count cap on portfolio fields/assets/favorites/links, no cap on survey `questions` array size. A single request can store multi-megabyte JSONB. Cheap DoS and storage abuse.

### B10 — MEDIUM: unvalidated media URL rendered

Advertiser-supplied `payload_url` is stored as free `TEXT` and rendered directly: `src/pages/AdDetail.tsx:94,96`, `src/pages/Ads.tsx:136,138`, `src/pages/Home.tsx:254`. There is no scheme allow-list, so a `javascript:`-style or `data:` URL can be stored (harmless in `<img src>`/`<video src>` in modern browsers, but it becomes live the moment that value reaches an `<a href>` or a redirect). Enforce `https://` plus a host allow-list at write time.

### File & media uploads

**Not applicable yet — no upload path exists.** There is no multipart handler, no storage bucket integration, and no `Snapshot` feature (§2.10) in the codebase. When Snapshot and Media Asset Placements land, they need: content-type sniffing (not trusting the declared type), extension allow-list, byte-size limit, randomized server-side filenames (no path traversal from client names), and serving from a separate origin or with `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff`.

---

## 5. State machine integrity

### A2 — CRITICAL: client-declared challenge completion

`handlers.go:414` `saveChallengeHandler`:

```go
var body struct {
	Data      map[string]interface{} `json:"data"`
	Completed bool                   `json:"completed"`
}
...
st, awarded, err := store.UpsertChallengeLog(ctx, middleware.UserID(r), c.ID, logDate, body.Data, body.Completed)
```

`UpsertChallengeLog` awards a badge and advances the streak whenever `completed` is true. The server never evaluates the challenge's Completion Step against `Data`. `PUT /api/challenges/{slug}` with `{"completed":true}` and an empty `data` object mints a badge. This is exactly the forgery §5 asks about, and it is the upstream dependency of every reward the ad/payout system pays out for.

### B3 — MEDIUM: no state enum

`challenge_logs.completed` is a bare `BOOLEAN` (`db.go:92`). Brief §3 requires an explicit enum with valid transitions: `Unfinished` → `Finished` / `Completed-Unaudited` / `Evolving`. There is no column, no transition validation, and therefore no way to express "completed but unaudited" — which is the state the peer-audit flow actually needs.

### A3 — CRITICAL: nonce-farmable ad completions

`handlers.go:1020` `adCompleteHandler` accepts the `nonce` from the request body and signs a `CompletionClaim{UserID, CampaignID, Nonce, IssuedAt}`. The `completion_tokens` table's `UNIQUE (user_id, campaign_id, nonce)` prevents replaying the *same* nonce, but the client picks the nonce — so a loop over fresh nonces yields unlimited distinct, validly-signed payout claims for one campaign. There is no per-user-per-campaign completion cap, no dwell-time check (§ the 6-second skip rule in the older documentation), and no server-side proof the ad was actually watched.

Fix: generate the nonce server-side, bind it to a short-lived issued view session, and enforce one claimable completion per user per campaign per period.

### B5 — MEDIUM: self-audit and non-random assignment

`handlers.go:1510` `submitAuditDecisionHandler` correctly rejects callers who are not `assignment.AuditorID`, but nothing prevents a user from being assigned as auditor of their own log. `store.CreateAuditAssignment` has no callers anywhere in the backend — assignments are never actually created, so the audit flow is inert in practice. `FEATURE_LOG.md` lists randomized auditor assignment as outstanding; confirming.

Also note the route/handler naming mismatch: the path parameter is `{logId}` and the frontend passes `a.challengeLogId` (`src/pages/AuditReview.tsx:41-51`), but `store.GetAuditAssignment` queries `WHERE id = $1` — i.e. the *assignment* ID. Decisions will 404 as wired.

### B6 — MEDIUM: game answers and scores

`getGameLevelHandler` (`handlers.go:1731`) returns the level's `word` and `phrase` — the answers — to the client. `completeGameLevelHandler` (`handlers.go:1749`) trusts client-supplied `score` and `hints_used`. Any score is claimable without playing.

---

## 6. Rate limiting

### A8 — HIGH: none exists

There is no rate-limiting middleware, no per-IP or per-user counter, and no CAPTCHA anywhere in the codebase, despite `PROJECT_DOCUMENTATION.md` claiming rate limiting, CAPTCHA, and device tracking for the login flow. Unbounded endpoints of concern:

- `POST /api/auth/request-otp` — email bombing of arbitrary addresses and SMTP quota exhaustion via *our* credentials.
- `POST /api/auth/verify-otp` — 6-digit code, 5-minute window, unlimited guesses: brute force succeeds well inside the TTL.
- `POST /api/auth/login` — password brute force.
- `POST /api/ads/{id}/complete` — compounds A3.
- `POST /api/chat/rooms/{id}/messages` — the privilege-farming-via-chat-spam vector §5 names, since §2.9 wants chat to earn privileges.
- `PUT /api/challenges/{slug}` — streak/badge farming, compounds A2.

OTP verify needs an attempt counter on the `otp_codes` row plus lockout; the rest need a shared limiter.

---

## 7. PII exposure

### A6 — HIGH: audit assignment listing over-shares

`handlers.go:1484` `listAuditAssignmentsHandler` calls `ListAuditAssignmentsForChallenge`, which returns **every** assignment for that challenge to **any** authenticated caller — not just the caller's own. The public shape embeds the full `challenge_logs.data` JSON blob. Today that blob holds journal-style reflections; per §3 it will hold Challenge 6 "Vital Check" health readings and Challenge 8 "Life Blueprint" life goals. Under the Kenya Data Protection Act 2019 that is sensitive personal data being disclosed to unauthorized parties.

Fix: scope to `ListAuditAssignmentsForAuditor` (which already exists and filters `WHERE auditor_id = $1`), and project only the fields the auditor's questionnaire needs rather than the raw blob.

### B4 — MEDIUM: personal events have no visibility flag

`events` (`db.go:118`) has `tier`, `author_id`, and `approved`, but **no** public/private column. §2.2 requires personal events with a user-controlled public/private toggle and §5 requires that toggle enforced server-side. There is nothing to enforce. `GET /api/events` is also unauthenticated (`handlers.go:48`) and filters only on `approved`/`tier` — so the moment a private-event concept is added without a visibility predicate, it leaks by default.

Separately, `/events`, `/ads`, `/ads/:id`, and `/advertiser` sit outside `ProtectedRoute` in `src/App.tsx`. That is a UX choice, not a vulnerability on its own (the API is the boundary), but `/advertiser` being publicly routable alongside A1 is a bad combination.

### B2 — MEDIUM: no CSRF protection

`src/lib/api.ts` uses `credentials: "include"` against a cookie session. The cookie is `SameSite=Lax` (`handlers.go:116,129`), which blocks cross-site *form* POSTs but is not a substitute for a token: it does not cover same-site subdomain attacks, and top-level navigations remain in scope. No CSRF token is issued or checked on any of the ~30 state-changing routes. Add a double-submit token or require a custom header the browser won't attach cross-origin.

### B8 — MEDIUM: no security headers

No `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, or HSTS anywhere in the Go server. No CORS configuration either (same-origin static serving today, which is fine, but it should be explicit before any separate frontend host exists).

---

## 8. Dependency audit

### A10 — HIGH: postcss

`npm audit` reports one HIGH, no criticals:

- **`postcss` <8.4.31** — GHSA-r28c-9q8g-f849, improper input validation / path traversal (CWE-22). Transitive via `vite` and `tailwindcss`. Build-time only, but it is a real HIGH and the fix is a lockfile bump.

Go side: `go vet ./...` clean, `go build ./...` clean, `go test ./...` passes (`ok moonbug/test`). **`govulncheck` is not installed on this machine, so the Go dependency tree has not been scanned for CVEs.** That is a gap in this audit, not a clean result — install `golang.org/x/vuln/cmd/govulncheck` and re-run before adding dependencies, as §5 requires.

### C4 — LOW: no unit tests on internal packages

`go test ./...` reports `[no test files]` for all eight `internal/*` packages; coverage lives entirely in the `test/` integration package (`http_test.go`, `integration_test.go`). §6 requires tests for touched code, so the security fixes below each need one.

---

## 9. Tooling and hygiene

### C1 — LOW: broken git refs block the §6 workflow

`git fsck` reports `refs/remotes/origin/HEAD` and `refs/remotes/origin/master` as all-zero sha1 pointers with corrupt reflogs; `git log --all` fails with `fatal: bad object refs/remotes/origin/master` and `git branch -a` warns `ignoring broken ref`. §6 requires feature branches and PRs against `main` — but there is no `main` branch locally (current branches: `master`, `spangle-wash`) and no working remote ref. This needs operator resolution: prune the broken refs, confirm the remote, and decide whether `master` is renamed to `main` or `main` is created from it.

### C2 — LOW: migration UUID collision

`migrations/006_games.sql` (untracked) seeds game levels with fixed UUIDs `11111111-1111-1111-1111-111111111111` and `22222222-2222-2222-2222-222222222222`, which are the same literals used for the fallback advertiser and campaign in `004_ads.sql` and `db.go:392,404`. Different tables, so no FK failure — but identical IDs across entity types will cause real confusion in logs and debugging. Renumber the game seeds.

### C5 — LOW: seeded placeholder data contradicts the README

`db.go:404` seeds two fallback campaigns whose `payload_url`s point at `https://cdn.moonbug.app/fallback/cosmic-calm.jpg` and `.../lunar-glow.mp4`, which do not resolve. `README.md` states the project has "no mock endpoints, no placeholder data." One of the two needs to change; see §4 blocking question 1 below.

### Lunar accuracy (affects a user-facing claim)

`backend/internal/lunar/lunar.go` computes moon altitude/azimuth from a deliberately simplified model — its own comments say "simplified draconic rhythm" and it derives declination from the *synodic* age, which is the wrong period for declination. `handlers.go:141` hardcodes `observerLatitude = 51.5 // London`, and longitude is not modeled at all, so the hour angle is effectively UTC-relative. For a Kenya-first launch (Nairobi ≈ 1.29°S, 36.82°E) the displayed sky position will be visibly wrong. `PROJECT_DOCUMENTATION.md` specifies an embedded ELP2000-82 ephemeris; that is not what is implemented. See blocking question 4.

---

## 10. Blocking questions for the operator (brief §4)

Per §0.2 these are surfaced rather than stubbed. Each needs a decision before the dependent feature can ship honestly.

1. **Ad inventory.** No real ad network is integrated; the only inventory is two seeded fallback campaigns pointing at a dead CDN. Do you want (a) a curated house-ad set you supply, drawn from the Catalogues, or (b) a real ad-network integration — and if (b), which network and who holds the API key? Until then the ad feed cannot show real inventory, and the README's "no placeholder data" claim is false.
2. **Payment / reward fulfillment.** The brief specifies **M-Pesa** for Kenya. The code implements **non-custodial crypto payouts** (Ed25519-signed completion tokens, `solana`/`evm` wallet addresses) — a completely different rail with different KYC and settlement properties. Which is the launch rail? If M-Pesa: whose Daraja merchant account, shortcode, and consumer key/secret? If crypto: who funds the campaigns and who bears the on-chain fee?
3. **AI challenge authorship pipeline.** I can build the moderation/refinement queue, but §4.3 is explicit that I cannot be the reviewer. Who is the human reviewer, and what is the approval SLA? Also note B1: there is no admin role in the data model to hang this on, so a role system is a prerequisite.
4. **Astronomical data provider.** The current lunar math is a rough approximation with a hardcoded London latitude (see §9). Accuracy is user-facing. Which provider: `astronomy-engine` (offline, MIT, no key — my recommendation, and it matches the offline-first requirement), a NASA/JPL Horizons API pull, or the embedded ELP2000-82 approach in the older documentation? Any keyed service needs a key from you.
5. **Auditor role definition.** Which Completion Steps count as machine-verifiable versus requiring a human peer auditor? This is a product decision and it determines whether A2's fix is a validator, an audit queue, or both. Related: is self-audit ever acceptable, and should auditor assignment be random across all eligible users or scoped to challenge participants?
6. **Kenya legal and compliance review.** Data Protection Act 2019 (consent, data subject rights, retention, cross-border transfer for any non-Kenyan hosting), advertising standards for reward-based engagement, and health-adjacent content rules for Challenge 6 "Vital Check" and the Diseases Catalogue. Per §4.6 I will structure the health features but **will not write medical advice copy** — that needs a qualified human. A privacy policy and consent flow are also unwritten.
7. **MoonBird AI persona voice.** §2.3 wants a specific artist/singer/free-spirit character. Production dialogue needs real brand-voice copywriting, not AI placeholder lines. I can build the interaction surface and a clearly-labeled placeholder string table for a copywriter to fill.
8. **Push notification infrastructure.** FCM/APNs both need app-store credentials and signing certificates that only you can obtain. `users.notifications_enabled` exists but nothing sends anything.

---

## 11. Conflicts between the brief and the codebase (brief §0.5)

Flagged, not silently resolved. Structure follows the codebase; scope follows the brief — but these four need an explicit call:

1. **Challenge catalogue.** The code seeds **5 moon-phase challenges** (New Moon Reflection, Waxing Crescent Focus, Full Moon Release, Waning Gibbous Gratitude, Balsamic Moon Rest) as the whole product. The brief specifies **8 different onboarding challenges** (Sky Watcher L1, Who Am I, The Seeker, Up to Date, Cut the Habit, Vital Check, Sky Watcher L2, Life Blueprint) with verbatim survey questions. Do the 5 existing ones stay alongside the 8, or are they replaced? They are already seeded in dev databases and referenced by existing `challenge_logs`, so replacement needs a migration decision.
2. **Payout rail.** Crypto (implemented) vs M-Pesa (specified). See blocking question 2 — this is the largest architectural divergence in the repo.
3. **Geography.** `observerLatitude = 51.5 // London` hardcoded, versus a stated Kenya/Africa launch. Assuming the fix is per-user location (with a Nairobi default), not a different constant — confirm.
4. **Product name.** The repo, module path, database name, email templates, and CDN host all say **"Moonbug"**; the brief says **"Moon-Bird"**. A rename touches the Go module path, package names, DB name, and all user-facing copy. Confirm whether "Moon-Bird" is the real product name or a variant in the brief.

---

## 12. Recommended fix order

Before any §2/§3 feature work (§7.1 → §7.2 gate):

1. A1 advertiser self-grant → real eligibility gate + `granted_at`/`expires_at`.
2. A2 challenge completion → server-side Completion Step validation; badge only on validated completion.
3. A3 ad completion → server-generated nonce, bound view session, per-campaign cap.
4. A4, A5, A6 → ownership/membership checks and field projection.
5. A7 → fail closed in production; C3 → complete `.env.EXAMPLE`.
6. A8 → rate limiter + OTP attempt counter.
7. A9 → operator rotates the Gmail app password and `JWT_SECRET`.
8. A10 → bump `postcss`; install and run `govulncheck`.
9. B1 role model + B3 state enum → prerequisites for the §3 moderation queue and the audit flow.
10. B2, B7, B8, B10 hardening; B4 visibility column; B5 assignment wiring; B6 game server authority.

Each fix gets a test and its own Conventional Commit per §6.
