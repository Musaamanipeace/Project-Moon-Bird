# API Contracts — Go backend HTTP surface (literal transcription)

Source of truth: `backend/internal/handlers/handlers.go` (**1196 lines, 31 routes**),
`backend/internal/store/store.go`, `backend/internal/store/activity.go`,
`backend/internal/middleware/middleware.go`, `backend/internal/auth/auth.go`,
`backend/internal/lunar/lunar.go`, `backend/internal/payout/payout.go`, `backend/main.go`.

Captured at commit `cf08d29` ("phase 3"), working tree clean. This file exists to
replace the never-written `MIGRATION_MAP.md` §5.

---

## 0. Corrections to the brief that commissioned this file

These are stated up front because three of them change what a mapper must build.

| Claim | Reality |
| --- | --- |
| `handlers.go` is 1781 lines | It is **1196** lines. `MIGRATION_MAP.md:14` repeats the 1781/51-route figure; both are stale. |
| Routes registered via `mux.HandleFunc` | **Zero** occurrences in the repo. Registration is `mux.Handle("METHOD /path", handler)` (Go 1.22 method-pattern `ServeMux`), `handlers.go:24-62`. |
| 51 routes | **31** routes. Verified across every branch (`master`, `feature/repo-audit`, `feature/security-audit`, `spangle-wash`) and every commit touching the file. |
| Route groups include `advertiser`, `chat`, `game` | **None of these exist**, and none ever have in any commit on any branch. See §12. |
| Frontend matches on the error string `"not your campaign"` | That string does not exist in the backend or the frontend. Full verbatim error inventory is §11. |
| Missing-JSON-tag PascalCase is "audit finding B6" | B6 (`docs/audit-findings.md:165`) is *"game answers and scores"* — `getGameLevelHandler` leaking answers and trusting client-supplied `score`. Those handlers do not exist in this tree. The PascalCase/no-JSON-tags idea appears only at `MIGRATION_MAP.md:310` as a *forward-looking* note about a `GameLevel` type that has not been written. **However, a genuine PascalCase leak does exist here — one route, `GET /api/profile` — and it is a live production bug. See §10.** |
| `MIGRATION_MAP.md` §5 is "missing" | Correct. The document stops at §4.2. References to §5.9, §5.10, §6.1, §6.4 and §7 are all dangling. |

---

## 1. Global conventions

### 1.1 Success writer

`handlers.go:67`

```go
func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
```

Byte-level consequences for a "byte-identical" port:

- `Content-Type: application/json` — **no `; charset=utf-8`**. Next.js `NextResponse.json()` emits `application/json`, matching; a bare `Response.json()` also matches.
- `json.Encoder.Encode` appends a **trailing `\n`**. `JSON.stringify` does not. Every success body ends in a newline.
- HTML escaping is **on** (encoder default): `<`, `>`, `&` become `<`, `>`, `&`.

### 1.2 Map key ordering — load-bearing

Every response in this backend is a `map[string]interface{}` or `map[string]string`.
Go's `encoding/json` **sorts map keys alphabetically**. JavaScript `JSON.stringify`
preserves insertion order. For byte-identical output every object literal in the port
must be written in alphabetical key order. The sorted order is given explicitly for each
route below.

Structs are the exception — they marshal in **field-declaration order**. Only two
struct types reach the wire: `payout.CompletionClaim` (§9) and `store.Badge` (§10).

### 1.3 Request reader

`handlers.go:73`

```go
func readJSON(r *http.Request, v interface{}) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}
```

- **`DisallowUnknownFields()`** — any key not present on the target struct is a decode
  error, which every handler converts to a `400`. The port must reject unknown keys.
- Go's decoder matches field names **case-insensitively**, tags included. `{"EMAIL":"x"}`
  populates `json:"email"`. `{"displayname":"x"}` populates `json:"displayName"`. A
  `JSON.parse`-based port is case-*sensitive* and will silently diverge.
- Decoding stops after the first JSON value; trailing garbage is not rejected.

### 1.4 Auth

`middleware/middleware.go`. Cookie name `moonbug_session` (`middleware.go:17`), value is an
HS256 JWT with claims `{uid, sid, sub, iat, exp}` (`auth.go:28-48`), 30-day expiry.

`Auth` (`middleware.go:20`) is *non-blocking* — it parses the cookie, validates the session
row via `store.SessionValid`, and populates context. On any failure it calls the next
handler **unauthenticated** rather than rejecting. Enforcement is per-route via
`RequireAuth` (`middleware.go:65`).

`RequireAuth` rejection is **not** written through `writeJSON` (`middleware.go:75`):

```go
w.Header().Set("Content-Type", "application/json")
w.WriteHeader(http.StatusUnauthorized)
w.Write([]byte(`{"error":"unauthorized"}`))
```

→ `401`, body exactly `{"error":"unauthorized"}` with **no trailing newline**. This is the
only response body in the codebase without one.

`SessionValid` (`store.go:175`) returns false when the row is missing, `revoked`, or
`expires_at` is in the past.

### 1.5 Session cookie

Set by `setSessionCookie` (`handlers.go:79`) on every successful `issueSession`:

| Attribute | Value |
| --- | --- |
| Name | `moonbug_session` |
| Path | `/` |
| HttpOnly | `true` |
| Secure | `os.Getenv("APP_ENV") == "production"` |
| SameSite | `Lax` |
| Expires | now + 30 days |
| Max-Age | `2592000` |

Cleared by `clearSessionCookie` (`handlers.go:93`): same name/path/HttpOnly/Secure/SameSite,
`Value: ""`, `Expires: time.Unix(0,0)`, `MaxAge: -1`.

### 1.6 Router-level behaviour

- Mounted at `/api/` by `main.go:38`, wrapped in `middleware.Auth`.
- Go 1.22 `ServeMux` with method patterns: a registered path hit with an unregistered
  method returns **`405`** with an `Allow` header and an empty body. `GET` patterns also
  serve `HEAD`.
- An unmatched `/api/*` path returns Go's built-in **`404`**, `Content-Type: text/plain; charset=utf-8`,
  body `404 page not found\n`. (`test/http_test.go:32` asserts this.)
- Non-`/api` paths fall through to the SPA handler (`main.go:54`), and `/healthz` returns
  `200` with plain-text body `ok` (`main.go:39`).

### 1.7 Error envelope

Every handler-level error is `map[string]string{"error": "..."}` → `{"error":"..."}\n`.
Single key, so ordering is moot. Verbatim inventory in §11.

---

## 2. Route inventory (31)

| # | Method + pattern | Auth | Handler |
| --- | --- | --- | --- |
| 1 | `GET /api/health` | no | `healthHandler` |
| 2 | `GET /api/lunar/now` | no | `lunarNowHandler` |
| 3 | `POST /api/auth/request-otp` | no | `otpRequestHandler` |
| 4 | `POST /api/auth/verify-otp` | no | `otpVerifyHandler` |
| 5 | `POST /api/auth/signup` | no | `passwordSignupHandler` |
| 6 | `POST /api/auth/login` | no | `passwordLoginHandler` |
| 7 | `POST /api/auth/logout` | **yes** | `logoutHandler` |
| 8 | `GET /api/auth/me` | **yes** | `meHandler` |
| 9 | `PUT /api/auth/settings` | **yes** | `settingsHandler` |
| 10 | `GET /api/challenges` | **yes** | `listChallengesHandler` |
| 11 | `GET /api/challenges/{slug}` | **yes** | `challengeDetailHandler` |
| 12 | `PUT /api/challenges/{slug}` | **yes** | `saveChallengeHandler` |
| 13 | `GET /api/notebook` | **yes** | `listNotebookHandler` |
| 14 | `POST /api/notebook` | **yes** | `createNotebookHandler` |
| 15 | `PUT /api/notebook/{id}` | **yes** | `updateNotebookHandler` |
| 16 | `DELETE /api/notebook/{id}` | **yes** | `deleteNotebookHandler` |
| 17 | `GET /api/events` | **no** | `eventsHandler` |
| 18 | `POST /api/events` | **yes** | `createEventHandler` |
| 19 | `GET /api/calendar/events` | **yes** | `listCalendarEventsHandler` |
| 20 | `POST /api/calendar/events/{id}` | **yes** | `saveCalendarEventHandler` |
| 21 | `DELETE /api/calendar/events/{id}` | **yes** | `removeCalendarEventHandler` |
| 22 | `GET /api/profile` | **yes** | `profileHandler` |
| 23 | `GET /api/calendar` | **yes** | `calendarHandler` |
| 24 | `GET /api/profile/portfolio` | **yes** | `profilePortfolioHandler` |
| 25 | `PUT /api/profile/portfolio` | **yes** | `saveProfilePortfolioHandler` |
| 26 | `GET /api/ads` | no | `adsListHandler` |
| 27 | `GET /api/ads/{id}` | no | `adDetailHandler` |
| 28 | `POST /api/ads/{id}/complete` | **yes** | `adCompleteHandler` |
| 29 | `GET /api/public-key` | no | `publicKeyHandler` |
| 30 | `GET /api/profile/wallet` | **yes** | `listWalletHandler` |
| 31 | `PUT /api/profile/wallet` | **yes** | `upsertWalletHandler` |

Unauthenticated: 1, 2, 3, 4, 5, 6, 17, 26, 27, 29 (ten routes). Note `GET /api/events`
is public while `POST /api/events` is not.

---

## 3. Misc

### 3.1 `GET /api/health`

No auth. No request body.

**200** — sorted keys `status`, `time`:

```go
map[string]interface{}{
	"status": "ok",
	"time":   time.Now().UTC().Format(time.RFC3339),
}
```

`{"status":"ok","time":"2026-07-31T12:34:56Z"}`. `time` is **RFC3339, second precision, `Z`** —
`Format(time.RFC3339)` truncates sub-second entirely. No error paths.

### 3.2 `GET /api/lunar/now`

No auth. No request body.

**200** — sorted keys `age`, `daysUntilFull`, `daysUntilNew`, `illumination`, `phase`, `phaseCode`, `phaseEmoji`:

```go
now := time.Now().UTC()
age := lunar.Age(now)
map[string]interface{}{
	"age":            age,
	"illumination":   lunar.Illumination(age),
	"phase":          lunar.PhaseName(age),
	"phaseCode":      lunar.PhaseCode(age),
	"phaseEmoji":     lunar.PhaseEmoji(age),
	"daysUntilFull":  lunar.DaysUntilNext(age, 0.5),
	"daysUntilNew":   lunar.DaysUntilNext(age, 0),
}
```

All four numeric values are **unrounded `float64`**. See §8 for the exact algorithms.
No error paths.

### 3.3 `GET /api/public-key`

No auth. No request body.

**200** — `map[string]string{"publicKey": payout.PublicKeyBase64()}` →
`{"publicKey":"<std-base64 of 32-byte Ed25519 public key>"}`.

Standard base64 **with** padding (`base64.StdEncoding`), 44 chars. No error paths.

---

## 4. Auth

### 4.1 `POST /api/auth/request-otp`

No auth. Request struct (**tagged**):

```go
struct {
	Email string `json:"email"`
}
```

Flow: `validEmail` → `auth.GenerateOTP()` (6 digits, zero-padded) → `auth.HashOTP` (unsalted
SHA-256, hex) → `store.SaveOTP` with `expires = now + 5 min` → `auth.SendOTPEmail`.

**200** — keys depend on environment:

```go
resp := map[string]interface{}{"ok": true}
if !isProduction() {          // APP_ENV != "production"
	resp["devCode"] = code
}
```

Production: `{"ok":true}`. Non-production: `{"devCode":"012345","ok":true}` (sorted:
`devCode` before `ok`). **`devCode` echoes the plaintext OTP.**

Errors:

| Status | Body | Trigger |
| --- | --- | --- |
| 400 | `{"error":"a valid email is required"}` | decode error **or** `!validEmail` |
| 500 | `{"error":"could not store code"}` | `store.SaveOTP` fails |
| 500 | `{"error":"could not send code"}` | `auth.SendOTPEmail` fails |

`validEmail` (`handlers.go:1163`): trims; requires non-empty, contains `"@"`, contains `"."`,
and `len <= 254`. That is the entire check.

### 4.2 `POST /api/auth/verify-otp`

No auth. Request struct (**tagged**):

```go
struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}
```

Validation guard is `err != nil || !validEmail(body.Email) || len(body.Code) != 6` — a
**byte**-length check, not a digit check.

On success calls `store.CreateUser(ctx, email, displayNameFromEmail(email), "otp", "")`,
which is get-or-create (`store.go:87`), then `issueSession` (§4.7).

Errors:

| Status | Body | Trigger |
| --- | --- | --- |
| 400 | `{"error":"email and code are required"}` | decode error, bad email, or `len(code) != 6` |
| 500 | `{"error":"verification failed"}` | `store.VerifyOTP` returns error |
| 401 | `{"error":"invalid or expired code"}` | `VerifyOTP` returns `false` |
| 500 | `{"error":"could not create session"}` | `store.CreateUser` fails |

Plus `issueSession`'s own two 500s.

`store.VerifyOTP` (`store.go:204`) selects the newest `used = FALSE` row matching
`(email, code_hash)`, returns false if expired, otherwise marks it used. No attempt counter.

`displayNameFromEmail` (`handlers.go:1171`) — needed to match seeded display names:

```go
parts := strings.SplitN(email, "@", 2)
if len(parts) == 0 { return "Moonbug" }
local := parts[0]
local = strings.ReplaceAll(local, ".", " ")
local = strings.ReplaceAll(local, "_", " ")
if local == "" { return "Moonbug" }
runes := []rune(local)
runes[0] = []rune(strings.ToUpper(string(runes[0])))[0]
return string(runes)
```

Dots and underscores → spaces; first rune upper-cased; **only** the first.

### 4.3 `POST /api/auth/signup`

No auth. Request struct (**tagged**):

```go
struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName"`
}
```

Guard: `err != nil || !validEmail(body.Email) || len(body.Password) < 6` (byte length).
`DisplayName` is `strings.TrimSpace`d; if empty, `store.CreateUser` substitutes `"Moonbug"`
(`store.go:91`). Password hashed with bcrypt `DefaultCost` (10).

Success → `issueSession` (§4.7), **200** (not 201).

Errors:

| Status | Body | Trigger |
| --- | --- | --- |
| 400 | `{"error":"email and password (min 6 chars) are required"}` | decode error, bad email, or password < 6 bytes |
| 409 | `{"error":"an account with this email already exists"}` | `GetUserByEmail` succeeds |
| 500 | `{"error":"could not secure password"}` | bcrypt fails |
| 500 | `{"error":"could not create account"}` | `store.CreateUser` fails |

### 4.4 `POST /api/auth/login`

No auth. Request struct (**tagged**):

```go
struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}
```

Guard checks only `err != nil || !validEmail(body.Email)` — password length is not
pre-validated here.

Success → `issueSession` (§4.7), **200**.

Errors:

| Status | Body | Trigger |
| --- | --- | --- |
| 400 | `{"error":"email and password are required"}` | decode error or bad email |
| 401 | `{"error":"invalid credentials"}` | user not found |
| 401 | `{"error":"invalid credentials"}` | hash lookup fails, hash empty, or bcrypt mismatch |

Both 401 paths are the identical string — no user enumeration via message. Note an
OTP-created account has an empty `password_hash` and therefore always yields `invalid
credentials` on this route.

### 4.5 `POST /api/auth/logout`

**Auth required.** No request body read.

Revokes the session if `middleware.SessionID(r) != ""` (return value ignored), clears the
cookie, then:

**200** — `map[string]bool{"ok": true}` → `{"ok":true}`.

No error paths — a failing revoke still returns 200.

### 4.6 `GET /api/auth/me`

**Auth required.** No request body.

**200** — `map[string]interface{}{"user": userResponse(user)}`.

| Status | Body | Trigger |
| --- | --- | --- |
| 401 | `{"error":"unauthorized"}` | `store.GetUserByID` fails — **written via `writeJSON`, so this one HAS a trailing newline**, unlike the `RequireAuth` 401 in §1.4 |

### 4.7 `issueSession` (shared by routes 4, 5, 6)

`handlers.go:1110`

```go
sid, err := store.CreateSession(r.Context(), user.ID, clientIP(r), r.UserAgent())
// 500 {"error":"could not start session"}
token, err := auth.GenerateToken(user.ID, sid)
// 500 {"error":"could not issue token"}
setSessionCookie(w, token)
writeJSON(w, http.StatusOK, map[string]interface{}{"ok": true, "user": userResponse(user)})
```

**200**, sorted keys `ok`, `user`: `{"ok":true,"user":{...}}`.

`clientIP` (`handlers.go:1187`): first comma-separated segment of `X-Forwarded-For` if
present, else `RemoteAddr` split on the first `:`.

### 4.8 `PUT /api/auth/settings`

**Auth required.** Request struct (**tagged**, both pointers so absent ≠ false/empty):

```go
struct {
	NotificationsEnabled *bool   `json:"notificationsEnabled"`
	PreferredMethod      *string `json:"preferredMethod"`
}
```

`PreferredMethod`, when non-nil, must be exactly `"otp"` or `"password"`.
`store.UpdateUserSettings` (`store.go:141`) applies only the non-nil fields inside one
transaction and re-reads the user.

**200** — `map[string]interface{}{"user": userResponse(user)}`.

| Status | Body | Trigger |
| --- | --- | --- |
| 400 | `{"error":"invalid body"}` | decode error (includes unknown fields) |
| 400 | `{"error":"preferredMethod must be 'otp' or 'password'"}` | non-nil and not in the set |
| 500 | `{"error":"could not update settings"}` | store failure |

### 4.9 `userResponse` serializer

`handlers.go:1125` — used by routes 4–9 and 22.

```go
func userResponse(u *store.User) map[string]interface{} {
	return map[string]interface{}{
		"id":                   u.ID,
		"email":                u.Email,
		"displayName":          u.DisplayName,
		"authMethod":           u.AuthMethod,
		"preferredMethod":      u.PreferredMethod,
		"notificationsEnabled": u.NotificationsEnabled,
		"streak":               u.Streak,
		"longestStreak":        u.LongestStreak,
		"createdAt":            u.CreatedAt.Format(time.RFC3339),
	}
}
```

Emitted (alphabetical) order: `authMethod`, `createdAt`, `displayName`, `email`, `id`,
`longestStreak`, `notificationsEnabled`, `preferredMethod`, `streak`.

`createdAt` is **RFC3339 second-precision**. `password_hash` is never selected into
`store.User`, so it cannot leak here.

---

## 5. Challenges

### 5.1 `GET /api/challenges`

**Auth required.** No request body.

Loads all challenges ordered by `sort_order`, plus `store.AllStatesForUser` (latest log per
slug, `store.go:399`).

**200** — `{"challenges":[...]}`. Each element is `challengePublic(c)` **plus** an injected
`userState` key:

```go
item := challengePublic(c)
if st, ok := states[c.Slug]; ok {
	item["userState"] = statePublic(st)
} else {
	item["userState"] = nil
}
```

`out` is `make([]map[string]interface{}, 0, len(challenges))` → serializes as `[]`, never
`null`, when empty.

| Status | Body | Trigger |
| --- | --- | --- |
| 500 | `{"error":"could not load challenges"}` | `store.ListChallenges` fails |
| 500 | `{"error":"could not load progress"}` | `store.AllStatesForUser` fails |

### 5.2 `GET /api/challenges/{slug}`

**Auth required.** Path param `{slug}` via `r.PathValue("slug")`.

**200** — sorted keys `challenge`, `userState`:

```go
resp := map[string]interface{}{"challenge": challengePublic(*c)}
if st != nil { resp["userState"] = statePublic(st) } else { resp["userState"] = nil }
```

`userState` is always present, `null` when there is no log. `store.GetLatestLog` returns
`(nil, nil)` on no rows (`store.go:309`), so "no log" is not an error.

| Status | Body | Trigger |
| --- | --- | --- |
| 404 | `{"error":"challenge not found"}` | **any** error from `GetChallengeBySlug` — `ErrNotFound` and genuine DB failures are not distinguished |
| 500 | `{"error":"could not load state"}` | `GetLatestLog` fails |

### 5.3 `PUT /api/challenges/{slug}`

**Auth required.** Path param `{slug}`. Request struct (**tagged**):

```go
struct {
	Data      map[string]interface{} `json:"data"`
	Completed bool                   `json:"completed"`
}
```

Nil `Data` is normalised to `{}`. The log date is **server-assigned**:
`time.Now().UTC().Format("2006-01-02")` — the client cannot backdate.

`store.UpsertChallengeLog` upserts on `(user_id, challenge_id, log_date)` and, when
`completed` is true, calls `AwardBadge`, whose `RowsAffected() > 0` becomes `badgeAwarded`
(true only the *first* time a badge is earned). `st.Slug` is then set from the challenge, and
`store.RecomputeStreak` runs with its error deliberately swallowed (`handlers.go:376-379`).

**200** — sorted keys `badgeAwarded`, `ok`, `userState`:

```go
map[string]interface{}{
	"ok":           true,
	"userState":    statePublic(st),
	"badgeAwarded": awarded,
}
```

| Status | Body | Trigger |
| --- | --- | --- |
| 404 | `{"error":"challenge not found"}` | any error from `GetChallengeBySlug` |
| 400 | `{"error":"invalid body"}` | decode error |
| 500 | `{"error":"could not save progress"}` | `UpsertChallengeLog` fails |

Note: the server never validates `Data` against the challenge's completion step — this is
audit finding **A2**, and it survives the port unless deliberately fixed.

### 5.4 `challengePublic`

`handlers.go:1139`

```go
func challengePublic(c store.Challenge) map[string]interface{} {
	return map[string]interface{}{
		"id":          c.ID,
		"slug":        c.Slug,
		"title":       c.Title,
		"description": c.Description,
		"prompt":      c.Prompt,
		"moonPhase":   c.MoonPhase,
		"icon":        c.Icon,
		"sortOrder":   c.SortOrder,
	}
}
```

Emitted order: `description`, `icon`, `id`, `moonPhase`, `prompt`, `slug`, `sortOrder`, `title`.

### 5.5 `statePublic`

`handlers.go:1152`

```go
func statePublic(st *store.ChallengeState) map[string]interface{} {
	return map[string]interface{}{
		"challengeId": st.ChallengeID,
		"slug":        st.Slug,
		"logDate":     st.LogDate,
		"data":        st.Data,
		"completed":   st.Completed,
		"updatedAt":   st.UpdatedAt.Format(time.RFC3339),
	}
}
```

Emitted order: `challengeId`, `completed`, `data`, `logDate`, `slug`, `updatedAt`.

- `logDate` is a **plain string**, selected as `log_date::text` → `"YYYY-MM-DD"`. Not a
  timestamp, and not re-formatted in Go.
- `updatedAt` is **RFC3339 second-precision**.
- `data` is `map[string]interface{}`, normalised to `{}` (never `null`) by both
  `GetLatestLog` and `AllStatesForUser`. Nested keys are sorted alphabetically by Go.
- `st.CompletedAt` exists on the struct but is **never serialized**.

---

## 6. Notebook

Valid `entryType` values (`store.go:509`), enforced on create and update:
`"journal"`, `"dream"`, `"logbook"`, `"goal"`, `"schedule"`, `"idea"`.

### 6.1 `GET /api/notebook`

**Auth required.** Ordered `created_at DESC`.

**200** — `{"entries":[...]}`, each `notebookPublic(e)`. `[]` when empty.

| Status | Body | Trigger |
| --- | --- | --- |
| 500 | `{"error":"could not load notebook"}` | store failure |

### 6.2 `POST /api/notebook`

**Auth required.** Request struct (**tagged**):

```go
struct {
	EntryType string  `json:"entryType"`
	Title     string  `json:"title"`
	Body      string  `json:"body"`
	DueDate   *string `json:"dueDate"`
}
```

`dueDate`, when non-nil and non-empty, is parsed with `time.Parse("2006-01-02", ...)` —
strict date-only. `null` and `""` both mean "no due date".

**201 Created** — `{"entry":{...}}`.

| Status | Body | Trigger |
| --- | --- | --- |
| 400 | `{"error":"invalid body"}` | decode error |
| 400 | `{"error":"dueDate must be YYYY-MM-DD"}` | parse failure |
| 400 | `{"error":"invalid entry_type"}` | from `err.Error()` — `store.CreateNotebook` rejects the type (`store.go:545`). Note the **snake_case** string. |
| 400 | *(raw driver error text)* | any other DB failure is surfaced verbatim via `err.Error()` |

### 6.3 `PUT /api/notebook/{id}`

**Auth required.** Path param `{id}`. Same request struct as §6.2.
`store.UpdateNotebook` scopes on `WHERE id = $1 AND user_id = $2`, so another user's entry
is indistinguishable from a missing one.

**200** — `{"entry":{...}}`.

| Status | Body | Trigger |
| --- | --- | --- |
| 400 | `{"error":"invalid body"}` | decode error |
| 400 | `{"error":"dueDate must be YYYY-MM-DD"}` | parse failure |
| 404 | `{"error":"entry not found"}` | `errors.Is(err, store.ErrNotFound)` |
| 400 | `{"error":"invalid entry_type"}` / raw error | other errors via `err.Error()` |

### 6.4 `DELETE /api/notebook/{id}`

**Auth required.** Path param `{id}`.

**200** — `map[string]bool{"ok": true}` → `{"ok":true}`.

| Status | Body | Trigger |
| --- | --- | --- |
| 404 | `{"error":"entry not found"}` | `ErrNotFound` (i.e. `RowsAffected() == 0`) |
| 500 | `{"error":"could not delete entry"}` | other store failure |

### 6.5 `notebookPublic`

`handlers.go:793`

```go
func notebookPublic(e store.NotebookEntry) map[string]interface{} {
	m := map[string]interface{}{
		"id":        e.ID,
		"entryType": e.EntryType,
		"title":     e.Title,
		"body":      e.Body,
		"createdAt": e.CreatedAt.Format(time.RFC3339),
		"updatedAt": e.UpdatedAt.Format(time.RFC3339),
		"dueDate":   nil,
	}
	if e.DueDate != nil {
		m["dueDate"] = e.DueDate.Format("2006-01-02")
	}
	return m
}
```

Emitted order: `body`, `createdAt`, `dueDate`, `entryType`, `id`, `title`, `updatedAt`.

**Mixed date formats in one object:** `dueDate` is date-only `"2006-01-02"` or `null`;
`createdAt`/`updatedAt` are RFC3339 second-precision. `userId` is on the struct but is
never serialized.

---

## 7. Events & calendar

### 7.1 `GET /api/events` — **unauthenticated**

Query params, all optional:

| Param | Handling |
| --- | --- |
| `from` | passed through; `store.ListEvents` defaults it to `time.Now().UTC().Format("2006-01-02")` when `""` |
| `tier` | `"community"`, `"astronomical"`, or anything else → default branch |
| `community` | included only when the raw value is exactly the string `"true"` |

Predicate (`store.go:635`), always `AND event_date >= $1`, ordered `event_date ASC`:

- `tier=community` → `tier = 'community' AND approved = TRUE`
- `tier=astronomical` → `tier = 'astronomical'`
- default + `community=true` → `(tier = 'astronomical' OR (tier = 'community' AND approved = TRUE))`
- default → `tier = 'astronomical'`

**200** — `{"events":[...]}`, each `eventPublic(e)`. `[]` when empty.

| Status | Body | Trigger |
| --- | --- | --- |
| 500 | `{"error":"could not load events"}` | store failure |

An invalid `from` (e.g. `?from=banana`) is passed straight to Postgres and surfaces as this
same 500.

### 7.2 `POST /api/events`

**Auth required.** Request struct (**tagged**):

```go
struct {
	Title     string `json:"title"`
	EventDate string `json:"eventDate"`
	Rarity    string `json:"rarity"`
	Synopsis  string `json:"synopsis"`
	Category  string `json:"category"`
	Source    string `json:"source"`
}
```

Server-forced on insert (`store.go:690`): `tier = 'community'`, `approved = FALSE`,
`author_id = <caller>`. Defaults: empty `rarity` → `"common"`, empty `category` →
`"community"`.

**201 Created** — `{"event":{...}}`.

| Status | Body | Trigger |
| --- | --- | --- |
| 400 | `{"error":"invalid body"}` | decode error |
| 400 | `{"error":"title is required"}` | handler-level, empty title |
| 400 | `{"error":"eventDate is required"}` | handler-level, empty date |
| 400 | `{"error":"eventDate must be a valid date (YYYY-MM-DD)"}` | store-level parse failure, via `err.Error()` |
| 400 | `{"error":"title is required"}` | store-level duplicate of the same check (`store.go:675`) |

### 7.3 `GET /api/calendar/events`

**Auth required.** Joins `user_calendar_events` → `events`, ordered `event_date ASC`.

**200** — `{"events":[...]}`, each `eventPublic(e)`. `[]` when empty.

| Status | Body | Trigger |
| --- | --- | --- |
| 500 | `{"error":"could not load calendar events"}` | store failure |

### 7.4 `POST /api/calendar/events/{id}`

**Auth required.** Path param `{id}`. No request body read. Idempotent
(`ON CONFLICT DO NOTHING`).

**200** — `map[string]bool{"ok": true}` → `{"ok":true}`.

| Status | Body | Trigger |
| --- | --- | --- |
| 400 | `{"error":"invalid event id"}` | `uuid.Parse` failure, via `err.Error()` |
| 400 | *(raw driver error)* | e.g. FK violation for a well-formed but unknown UUID |

Note: saving a nonexistent event yields **400**, not 404.

### 7.5 `DELETE /api/calendar/events/{id}`

**Auth required.** Path param `{id}`.

**200** — `map[string]bool{"ok": true}` → `{"ok":true}`.

| Status | Body | Trigger |
| --- | --- | --- |
| 404 | `{"error":"event not saved"}` | `ErrNotFound` (`RowsAffected() == 0`) |
| 400 | `{"error":"invalid event id"}` | `uuid.Parse` failure |

### 7.6 `eventPublic`

`handlers.go:902`

```go
func eventPublic(e store.Event) map[string]interface{} {
	m := map[string]interface{}{
		"id":        e.ID,
		"title":     e.Title,
		"eventDate": e.EventDate.Format("2006-01-02"),
		"rarity":    e.Rarity,
		"synopsis":  e.Synopsis,
		"category":  e.Category,
		"source":    e.Source,
		"tier":      e.Tier,
		"approved":  e.Approved,
		"authorId":  nil,
	}
	if e.AuthorID != nil {
		m["authorId"] = *e.AuthorID
	}
	return m
}
```

Emitted order: `approved`, `authorId`, `category`, `eventDate`, `id`, `rarity`, `source`,
`synopsis`, `tier`, `title`.

**`eventDate` is date-only `"2006-01-02"`** even though the column is a timestamp —
the time component is dropped. `authorId` is `null` or a string.

### 7.7 `GET /api/calendar`

**Auth required.** Query params `year`, `month`, both via `strconv.Atoi` with the error
ignored — a non-numeric value yields `0` and therefore falls back to the current UTC
year/month. `month` is then range-checked; `year` is **not** (e.g. `year=0` is
unreachable via fallback, but `year=-5` is accepted and passed to `time.Date`).

Range is the whole month; `CompletedSlugsForRange` is called with
`start.Format("2006-01-02")` and `end.Format("2006-01-02")` where
`end = start.AddDate(0,1,0).Add(-time.Second)`.

Each day is computed at **12:00:00 UTC** (`handlers.go:415`) — noon, not midnight. Any
reimplementation must use noon or the phase boundaries will shift.

**200** — sorted keys `days`, `month`, `year`:

```go
map[string]interface{}{
	"year":  year,
	"month": month,
	"days":  days,
}
```

Each `days[i]`, sorted keys `completedChallenges`, `date`, `day`, `illumination`, `phase`,
`phaseCode`, `phaseEmoji`:

```go
map[string]interface{}{
	"date":                key,                       // day.Format("2006-01-02")
	"day":                 d,                         // int, 1-based
	"phase":               lunar.PhaseName(age),
	"phaseCode":           lunar.PhaseCode(age),
	"phaseEmoji":          lunar.PhaseEmoji(age),
	"illumination":        lunar.Illumination(age),
	"completedChallenges": states[key],               // []string
}
```

**`completedChallenges` is `null`, not `[]`, for a day with no completions** — it is a
missing map key yielding a nil `[]string`. `src/types.ts:53` correctly types this as
`string[] | null`.

| Status | Body | Trigger |
| --- | --- | --- |
| 400 | `{"error":"invalid month"}` | `month < 1 || month > 12` after fallback |
| 500 | `{"error":"could not load calendar"}` | store failure |

`daysIn` (`handlers.go:1194`) is `time.Date(year, month+1, 0, ...).Day()`.

---

## 8. Profile & portfolio

### 8.1 `GET /api/profile`

**Auth required.** Four store calls: user, badges, `RecentActivity(ctx, uid, 20)`,
`CountCompletedLogs`.

**200** — sorted keys `badges`, `longestStreak`, `recentActivity`, `streak`,
`totalCompleted`, `user`:

```go
map[string]interface{}{
	"user":           userResponse(user),
	"badges":         badges,            // []store.Badge — SEE §10
	"streak":         user.Streak,
	"longestStreak":  user.LongestStreak,
	"totalCompleted": total,
	"recentActivity": actOut,
}
```

`recentActivity` elements (sorted keys `completed`, `data`, `logDate`, `slug`):

```go
map[string]interface{}{
	"slug":      a.Slug,
	"logDate":   a.LogDate,   // string, log_date::text → "YYYY-MM-DD"
	"completed": a.Completed,
	"data":      a.Data,      // normalised to {} by RecentActivity
}
```

`actOut` is `make(..., 0, len(activity))` → `[]` when empty.
**`badges` is not wrapped and is `null` when empty** — `store.GetBadges` returns
`var out []Badge` (`store.go:342`), a nil slice.

| Status | Body | Trigger |
| --- | --- | --- |
| 401 | `{"error":"unauthorized"}` | `GetUserByID` fails (via `writeJSON`, has trailing newline) |
| 500 | `{"error":"could not load badges"}` | `GetBadges` fails |
| 500 | `{"error":"could not load activity"}` | `RecentActivity` fails |
| 500 | `{"error":"could not load stats"}` | `CountCompletedLogs` fails |

### 8.2 `GET /api/profile/portfolio`

**Auth required.** Four store reads: fields (tree), assets, favorites, links.

**200** — sorted keys `assets`, `favorites`, `fields`, `links`:

```go
map[string]interface{}{
	"fields":    fieldOut,
	"assets":    assetOut,
	"favorites": favOut,
	"links":     linkOut,
}
```

All four are `make(..., 0, len(...))` → `[]` when empty.

| Status | Body | Trigger |
| --- | --- | --- |
| 500 | `{"error":"could not load portfolio"}` | **all four** read failures share this one string |

### 8.3 `PUT /api/profile/portfolio`

**Auth required.** Full replace-all. Request struct (**tagged**, nested inputs also tagged):

```go
struct {
	Fields    []store.ProfileFieldInput `json:"fields"`
	Assets    []store.UserAssetInput    `json:"assets"`
	Favorites []store.UserFavoriteInput `json:"favorites"`
	Links     []store.UserLinkInput     `json:"links"`
}
```

Nil slices are normalised to empty — so **omitting a key deletes that collection**, since
each `Upsert*` begins with `DELETE ... WHERE user_id = $1`.

Input types (`store.go:1236-1304`), all tagged:

```go
type ProfileFieldInput struct {
	Title     string              `json:"title"`
	ValueText string              `json:"valueText"`
	ValueInt  *int                `json:"valueInt"`
	ValueJSON json.RawMessage     `json:"valueJson"`
	FieldType string              `json:"fieldType"`
	SortOrder int                 `json:"sortOrder"`
	Children  []ProfileFieldInput `json:"children"`   // recursive
}

type UserAssetInput struct {
	Kind      string          `json:"kind"`
	Title     string          `json:"title"`
	Detail    json.RawMessage `json:"detail"`
	SortOrder int             `json:"sortOrder"`
}

type UserFavoriteInput struct {
	Kind      string `json:"kind"`
	Label     string `json:"label"`
	Value     string `json:"value"`
	SortOrder int    `json:"sortOrder"`
}

type UserLinkInput struct {
	URL        string `json:"url"`
	Label      string `json:"label"`
	IsLinktree bool   `json:"isLinktree"`
	SortOrder  int    `json:"sortOrder"`
}
```

Server-side defaults: empty `fieldType` → `"text"`; empty `valueJson` → `[]`;
empty `detail` → `{}`. IDs are server-generated (`uuid.NewString()`) — client IDs are
neither accepted nor honoured. Nesting is rebuilt from `children`, and the four upserts run
in **four separate transactions**, so a later failure leaves earlier collections replaced.

Valid asset kinds (`store.go:1306`): `"car"`, `"bicycle"`, `"pets"`, `"jewelry"`, `"clothing"`.

On success re-reads all four collections and returns the **same shape as §8.2**, **200**.

| Status | Body | Trigger |
| --- | --- | --- |
| 400 | `{"error":"invalid body"}` | decode error |
| 500 | `{"error":"could not save fields"}` | `UpsertProfileFields` fails |
| 400 | `{"error":"invalid asset kind"}` | `UpsertAssets`, via `err.Error()` — **400, not 500** |
| 500 | `{"error":"could not save favorites"}` | `UpsertFavorites` fails |
| 500 | `{"error":"could not save links"}` | `UpsertLinks` fails |
| 500 | `{"error":"could not load portfolio"}` | any of the four re-reads |

### 8.4 `publicField` (recursive)

`handlers.go:626`

```go
func publicField(f store.ProfileField) map[string]interface{} {
	m := map[string]interface{}{
		"id":        f.ID,
		"parentId":  nil,
		"title":     f.Title,
		"valueText": f.ValueText,
		"valueInt":  nil,
		"valueJson": f.ValueJSON,
		"fieldType": f.FieldType,
		"sortOrder": f.SortOrder,
		"createdAt": f.CreatedAt.Format(time.RFC3339),
		"updatedAt": f.UpdatedAt.Format(time.RFC3339),
		"children":  []map[string]interface{}{},
	}
	if f.ParentID != nil { m["parentId"] = *f.ParentID }
	if f.ValueInt != nil { m["valueInt"] = *f.ValueInt }
	if len(f.Children) > 0 {
		children := make([]map[string]interface{}, 0, len(f.Children))
		for _, c := range f.Children {
			children = append(children, publicField(c))
		}
		m["children"] = children
	}
	return m
}
```

Emitted order: `children`, `createdAt`, `fieldType`, `id`, `parentId`, `sortOrder`, `title`,
`updatedAt`, `valueInt`, `valueJson`, `valueText`.

`children` defaults to `[]` (never null). `valueJson` is `json.RawMessage` — inlined
verbatim, defaulted to `[]` by `GetProfileFields` (`store.go:1349`). `userId` is not
serialized.

### 8.5 `publicAsset`

`handlers.go:656`

```go
func publicAsset(a store.UserAsset) map[string]interface{} {
	detail := a.Detail
	if len(detail) == 0 { detail = json.RawMessage("{}") }
	return map[string]interface{}{
		"id":        a.ID,
		"kind":      a.Kind,
		"title":     a.Title,
		"detail":    detail,
		"sortOrder": a.SortOrder,
		"createdAt": a.CreatedAt.Format(time.RFC3339),
		"updatedAt": a.UpdatedAt.Format(time.RFC3339),
	}
}
```

Emitted order: `createdAt`, `detail`, `id`, `kind`, `sortOrder`, `title`, `updatedAt`.

### 8.6 `publicFavorite`

`handlers.go:672`

```go
func publicFavorite(f store.UserFavorite) map[string]interface{} {
	return map[string]interface{}{
		"id":        f.ID,
		"kind":      f.Kind,
		"label":     f.Label,
		"value":     f.Value,
		"sortOrder": f.SortOrder,
		"createdAt": f.CreatedAt.Format(time.RFC3339),
		"updatedAt": f.UpdatedAt.Format(time.RFC3339),
	}
}
```

Emitted order: `createdAt`, `id`, `kind`, `label`, `sortOrder`, `updatedAt`, `value`.

### 8.7 `publicLink`

`handlers.go:684`

```go
func publicLink(l store.UserLink) map[string]interface{} {
	return map[string]interface{}{
		"id":         l.ID,
		"url":        l.URL,
		"label":      l.Label,
		"isLinktree": l.IsLinktree,
		"sortOrder":  l.SortOrder,
		"createdAt":  l.CreatedAt.Format(time.RFC3339),
		"updatedAt":  l.UpdatedAt.Format(time.RFC3339),
	}
}
```

Emitted order: `createdAt`, `id`, `isLinktree`, `label`, `sortOrder`, `updatedAt`, `url`.

Note the response key is **`url`** (lowercase) while the Go field is `URL`.

---

## 9. Ads, completions & wallet

### 9.1 `GET /api/ads` — **unauthenticated**

Query param `nsfw`: NSFW campaigns are included only when the raw value is exactly `"1"`
(`handlers.go:925`) — `"true"` does **not** work here, unlike `community=true` on
`/api/events`. The `categories` filter in `ListActiveCampaigns` is always called with `nil`.

Always filtered to `status = 'active'`, ordered `created_at DESC`.

**200** — `{"campaigns":[...]}`, each `adPublic(c)` (no survey). `[]` when empty.

| Status | Body | Trigger |
| --- | --- | --- |
| 500 | `{"error":"could not load ads"}` | store failure |

### 9.2 `GET /api/ads/{id}` — **unauthenticated**

Path param `{id}`. Returns **any** campaign regardless of `status` or `nsfw` — the
list-level filters do not apply here.

**200** — `{"campaign": adPublicFull(*c)}`.

| Status | Body | Trigger |
| --- | --- | --- |
| 404 | `{"error":"campaign not found"}` | `ErrNotFound` |
| 500 | `{"error":"could not load campaign"}` | other store failure |

A malformed UUID reaches Postgres and surfaces as the **500**, not the 404.

### 9.3 `POST /api/ads/{id}/complete`

**Auth required.** Path param `{id}`. Request struct (**tagged**), read only when
`r.Body != nil && r.ContentLength != 0`:

```go
struct {
	Nonce *string `json:"nonce"`
}
```

The nonce is **client-supplied when provided**, else 16 crypto-random bytes as
`base64.RawURLEncoding` (unpadded, 22 chars). `issuedAt` is `time.Now().UTC().Unix()`.

There is **no advertiser-ownership check and no check that the user actually viewed the
ad** — any authenticated user may mint a signed completion for any active campaign
(audit finding A3). No `403` path exists on this route, and no `"not your campaign"`
string exists anywhere in the codebase.

`store.CreateCompletionToken` is `ON CONFLICT (user_id, campaign_id, nonce) DO NOTHING`
and returns the pre-existing row on conflict, so replaying the same nonce returns **200**
with the same signature rather than an error.

**200** — sorted top-level keys `campaign`, `ok`, `token`:

```go
map[string]interface{}{
	"ok": true,
	"token": map[string]interface{}{
		"campaignId": id,
		"userId":     uid,
		"nonce":      nonce,
		"signature":  signature,
		"issuedAt":   issuedAt,
	},
	"campaign": map[string]interface{}{
		"id":              c.ID,
		"title":           c.Title,
		"rewardPerAction": c.RewardPerAction,
		"rewardCurrency":  c.RewardCurrency,
	},
}
```

`token` emitted order: `campaignId`, `issuedAt`, `nonce`, `signature`, `userId`.
`campaign` emitted order: `id`, `rewardCurrency`, `rewardPerAction`, `title`.
`issuedAt` is a **Unix seconds integer**, not a formatted string — the only such field in
the API.

| Status | Body | Trigger |
| --- | --- | --- |
| 404 | `{"error":"campaign not found"}` | `ErrNotFound` |
| 500 | `{"error":"could not load campaign"}` | other load failure |
| 400 | `{"error":"campaign is not active"}` | `c.Status != "active"` |
| 400 | `{"error":"invalid body"}` | decode error |
| 500 | `{"error":"could not generate nonce"}` | `rand.Read` fails |
| 500 | `{"error":"could not sign completion"}` | `payout.SignCompletion` fails |
| 500 | `{"error":"could not record completion"}` | `CreateCompletionToken` fails |

### 9.4 `GET /api/profile/wallet`

**Auth required.** Ordered by `chain`.

**200** — `{"wallets":[...]}`, each `walletPublic(w)`. `[]` when empty.

| Status | Body | Trigger |
| --- | --- | --- |
| 500 | `{"error":"could not load wallets"}` | store failure |

### 9.5 `PUT /api/profile/wallet`

**Auth required.** Request struct (**tagged**):

```go
struct {
	Chain   string `json:"chain"`
	Address string `json:"address"`
}
```

Validation is entirely in `store.UpsertWallet` (`store.go:1116`): `chain` must be `"solana"`
or `"evm"`; `address` is trimmed and must be non-empty; `evm` requires `len >= 40`,
`solana` requires `len >= 32`. No checksum or base58 validation. Upsert is
`ON CONFLICT (user_id, chain) DO UPDATE`.

**200** — `{"wallet": walletPublic(*wlt)}`.

| Status | Body | Trigger |
| --- | --- | --- |
| 400 | `{"error":"invalid body"}` | decode error |
| 400 | `{"error":"chain must be 'solana' or 'evm'"}` | via `err.Error()` |
| 400 | `{"error":"address is required"}` | via `err.Error()` |
| 400 | `{"error":"invalid evm address"}` | via `err.Error()` |
| 400 | `{"error":"invalid solana address"}` | via `err.Error()` |

### 9.6 `adPublic` / `adPublicFull`

`handlers.go:1075`

```go
func adPublic(c store.AdCampaign) map[string]interface{} {
	return map[string]interface{}{
		"id":               c.ID,
		"advertiserId":     c.AdvertiserID,
		"format":           c.Format,
		"title":            c.Title,
		"payloadUrl":       c.PayloadURL,
		"rewardPerAction":  c.RewardPerAction,
		"rewardCurrency":   c.RewardCurrency,
		"targetCategories": c.TargetCategories,
		"nsfw":             c.NSFW,
		"status":           c.Status,
	}
}

func adPublicFull(c store.AdCampaign) map[string]interface{} {
	m := adPublic(c)
	if c.Survey != nil {
		m["survey"] = map[string]interface{}{
			"questions": c.Survey.Questions,
			"minPayout": c.Survey.MinPayout,
		}
	}
	return m
}
```

`adPublic` emitted order: `advertiserId`, `format`, `id`, `nsfw`, `payloadUrl`,
`rewardCurrency`, `rewardPerAction`, `status`, `targetCategories`, `title`.
With `survey` present it sorts between `status` and `targetCategories`.

- `survey` is **absent entirely** (not `null`) unless `c.Survey != nil`, which
  `store.GetCampaign` populates only when `c.Format == "survey"`.
- `survey.questions` is `[]map[string]interface{}`, defaulted to `[]` (`store.go:1089`);
  `survey.minPayout` is a float64. Survey `id`/`campaignId` are **not** serialized.
- `targetCategories` is defaulted to `[]` by `decodeCampaignCategories` (`store.go:858`),
  never null.
- `createdAt` is on `store.AdCampaign` but is **never serialized**.
- `payloadUrl` — response key is lowercase `Url`, Go field is `PayloadURL`.

### 9.7 `walletPublic`

`handlers.go:1101`

```go
func walletPublic(w store.UserWallet) map[string]interface{} {
	return map[string]interface{}{
		"chain":   w.Chain,
		"address": w.Address,
	}
}
```

Emitted order: `address`, `chain`. `id`, `userId`, `createdAt` are deliberately withheld.

---

## 10. PascalCase leak — `GET /api/profile` → `badges[]`

**This is the only route in the API whose response contains PascalCase keys, and it is a
live bug, not merely a porting hazard.**

`profileHandler` passes the raw `[]store.Badge` straight into the response
(`handlers.go:471`) — it is the sole collection in the codebase with no `*Public()`
serializer. `store.Badge` (`store.go:54`) has **no JSON tags**:

```go
type Badge struct {
	ChallengeID string
	Title       string
	Icon        string
	AwardedAt   time.Time
}
```

Go marshals exported fields by Go name when untagged, and structs marshal in
**declaration order**, not alphabetically. The wire format is therefore:

```json
"badges": [
  {
    "ChallengeID": "0f3c…",
    "Title": "Moonlit Walk",
    "Icon": "🌙",
    "AwardedAt": "2026-07-31T12:34:56.789012Z"
  }
]
```

Three separate divergences from every other object in this API:

1. **PascalCase keys**, and `ChallengeID` has a fully-capitalised initialism — it is *not*
   `ChallengeId`.
2. **Declaration order**, not alphabetical.
3. **`AwardedAt` is RFC3339Nano** — the default `time.Time` marshaller, which preserves
   sub-second precision and trims trailing zeros. Every other timestamp in the API goes
   through `.Format(time.RFC3339)` and is second-precision.

The frontend disagrees with all of this. `src/types.ts:38` declares:

```ts
export interface Badge {
  challengeId: string;
  title: string;
  icon: string;
  awardedAt: string;
}
```

and `src/pages/Profile.tsx:69` reads:

```ts
const earnedIds = new Set((profile?.badges ?? []).map((b: Badge) => b.challengeId));
```

`b.challengeId` is `undefined` against the actual payload, so `earnedIds` is a `Set` of
`undefined` and no badge ever renders as earned. This is broken in production today.

**Porting decision required.** The two options are not equivalent and this is an operator
call, not a mechanical one:

- *Byte-identical port* — emit `ChallengeID` / `Title` / `Icon` / `AwardedAt` in declaration
  order with nanosecond precision, preserving the bug.
- *Fix during port* — emit `challengeId` / `title` / `icon` / `awardedAt`, matching
  `src/types.ts` and repairing `Profile.tsx`. This is the only place where "match the Go
  output" and "match the frozen `src/types.ts` contract" actively contradict each other.

Recommended: **fix**, and record it as a deliberate, third exception alongside the two the
migration brief already sanctions. The frontend cannot currently be consuming the
PascalCase shape, so nothing depends on it.

All 30 other routes build responses from hand-written `map[string]interface{}` literals
with explicit lowerCamelCase keys and are unaffected. Every request-side struct — inline
handler bodies and the four `store.*Input` types — carries explicit JSON tags.

---

## 11. Complete error-string inventory

Every literal the frontend could match on, verbatim. 39 distinct handler-level strings.

| String | Status | Route(s) |
| --- | --- | --- |
| `unauthorized` | 401 | `RequireAuth` (all 21 authed routes, **no trailing newline**); `GET /api/auth/me`; `GET /api/profile` |
| `a valid email is required` | 400 | request-otp |
| `could not store code` | 500 | request-otp |
| `could not send code` | 500 | request-otp |
| `email and code are required` | 400 | verify-otp |
| `verification failed` | 500 | verify-otp |
| `invalid or expired code` | 401 | verify-otp |
| `could not create session` | 500 | verify-otp |
| `email and password (min 6 chars) are required` | 400 | signup |
| `an account with this email already exists` | 409 | signup |
| `could not secure password` | 500 | signup |
| `could not create account` | 500 | signup |
| `email and password are required` | 400 | login |
| `invalid credentials` | 401 | login (both paths) |
| `could not start session` | 500 | `issueSession` |
| `could not issue token` | 500 | `issueSession` |
| `invalid body` | 400 | settings, save-challenge, notebook create/update, create-event, portfolio save, ad-complete, wallet upsert |
| `preferredMethod must be 'otp' or 'password'` | 400 | settings |
| `could not update settings` | 500 | settings |
| `could not load challenges` | 500 | list challenges |
| `could not load progress` | 500 | list challenges |
| `challenge not found` | 404 | challenge detail, save challenge |
| `could not load state` | 500 | challenge detail |
| `could not save progress` | 500 | save challenge |
| `invalid month` | 400 | calendar |
| `could not load calendar` | 500 | calendar |
| `could not load badges` | 500 | profile |
| `could not load activity` | 500 | profile |
| `could not load stats` | 500 | profile |
| `could not load portfolio` | 500 | portfolio get (×4) + save (×4) |
| `could not save fields` | 500 | portfolio save |
| `invalid asset kind` | **400** | portfolio save (store) |
| `could not save favorites` | 500 | portfolio save |
| `could not save links` | 500 | portfolio save |
| `could not load notebook` | 500 | list notebook |
| `dueDate must be YYYY-MM-DD` | 400 | notebook create/update |
| `invalid entry_type` | 400 | notebook create/update (store) — **snake_case** |
| `entry not found` | 404 | notebook update/delete |
| `could not delete entry` | 500 | notebook delete |
| `could not load events` | 500 | events |
| `title is required` | 400 | create event (handler + store) |
| `eventDate is required` | 400 | create event |
| `eventDate must be a valid date (YYYY-MM-DD)` | 400 | create event (store) |
| `could not load calendar events` | 500 | list calendar events |
| `invalid event id` | 400 | save/remove calendar event |
| `event not saved` | 404 | remove calendar event |
| `could not load ads` | 500 | ads list |
| `campaign not found` | 404 | ad detail, ad complete |
| `could not load campaign` | 500 | ad detail, ad complete |
| `campaign is not active` | 400 | ad complete |
| `could not generate nonce` | 500 | ad complete |
| `could not sign completion` | 500 | ad complete |
| `could not record completion` | 500 | ad complete |
| `could not load wallets` | 500 | wallet list |
| `chain must be 'solana' or 'evm'` | 400 | wallet upsert (store) |
| `address is required` | 400 | wallet upsert (store) |
| `invalid evm address` | 400 | wallet upsert (store) |
| `invalid solana address` | 400 | wallet upsert (store) |

Strings marked "(store)" reach the client through `err.Error()`. Those call sites also pass
through **raw pgx driver errors** for unanticipated DB failures — a Next.js port should
decide deliberately whether to keep that leak (finding B-class) rather than reproduce it by
accident.

---

## 12. Route groups that do **not** exist

The commissioning brief and `docs/MIGRATION_MAP.md` both reference endpoints absent from
this codebase. Verified across all four branches and every commit that has touched
`handlers.go`:

- **No `/api/chat/*`.** `store.go:791-813` defines `ChatRoom` and `Message`, and
  `store.go:939-1013` defines `CreateChatRoom`, `GetChatRoom`, `GetChatRoomByChallenge`,
  `ListMessages`, `CreateMessage` — **all dead code with no callers**. `audit-findings.md:181`
  cites `POST /api/chat/rooms/{id}/messages`; no such route is registered.
- **No `/api/game/*`.** No `GameLevel` type exists in any `.go` file. `audit-findings.md:165`
  (finding B6) cites `getGameLevelHandler` at `handlers.go:1731` and
  `completeGameLevelHandler` at `handlers.go:1749` — the file is 1196 lines and contains
  neither. `MIGRATION_MAP.md:310` lists `game_levels` with a *"(none yet)"* TypeScript type.
- **No `/api/advertiser/*`.** No advertiser-facing management, claim, or verification
  endpoints. `payout.VerifyCompletion` and `store.MarkTokenClaimed` are both **uncalled**;
  the only exposed half of the payout loop is `GET /api/public-key`.
- **No audit-assignment routes.** `store.CreateAuditAssignment`, `GetAuditAssignment`,
  `UpdateAuditAssignmentStatus`, `ListAuditAssignmentsForAuditor` (`store.go:1016-1073`) are
  all uncalled. `audit-findings.md:160` cites `submitAuditDecisionHandler` at
  `handlers.go:1510`; it does not exist.

Either the docs describe a planned/parallel implementation that was never committed here,
or this tree predates it. A port scoped to *this* repository has 31 routes. **Confirm with
the operator before treating the missing ~20 as work to be recreated** — they cannot be
ported from source that is not present.

---

## 13. `lunar.go` — full spec for `lib/lunar.ts`

`backend/internal/lunar/lunar.go`, 109 lines. Constants:

```go
const (
	SynodicMonth = 29.530588853
	RefNewMoon   = 947166000 // Date.UTC(2000, 0, 6, 18, 14, 0) in seconds
)
```

`RefNewMoon` is **Unix seconds**, and the comment records its provenance as a JS
`Date.UTC` expression — the TS port should use `947166000 * 1000` for ms, or keep seconds.

### 13.1 Signatures

```go
func Age(t time.Time) float64                    // lunar age in days, [0, SynodicMonth)
func Illumination(age float64) float64           // percentage, 0-100
func PhaseName(age float64) string
func PhaseCode(age float64) string
func PhaseEmoji(age float64) string
func DaysUntilNext(age, target float64) float64
func RefNewMoonTime() time.Time                  // unused by handlers
```

Every phase function takes **age in days**, not a fraction, and internally computes
`pct := age / SynodicMonth`.

### 13.2 `Age`

```go
secs := float64(t.Unix())
days := (secs - float64(RefNewMoon)) / 86400.0
age := math.Mod(days, SynodicMonth)
if age < 0 { age += SynodicMonth }
return age
```

Uses **whole seconds** (`t.Unix()` truncates sub-second). `math.Mod` is truncated
remainder, sign-following — matching JS `%`. The negative correction matters for dates
before 2000-01-06.

### 13.3 `Illumination`

```go
angle := (age / SynodicMonth) * 2 * math.Pi
return ((1 - math.Cos(angle)) / 2) * 100
```

Returns 0 at new moon, 100 at full. **Not rounded** — the raw float64 is serialized.

### 13.4 `DaysUntilNext`

```go
pct := age / SynodicMonth
delta := target - pct
if delta < 0 { delta += 1 }
return delta * SynodicMonth
```

`target` is a *fraction* of the synodic month: `0` = new, `0.5` = full. Callers pass
`0.5` for `daysUntilFull` and `0` for `daysUntilNew`. Note `delta == 0` is **not**
corrected, so exactly-on-target returns `0`, not a full cycle.

### 13.5 Phase boundaries — identical thresholds across all three functions

| `pct` range | `PhaseName` | `PhaseCode` | `PhaseEmoji` |
| --- | --- | --- | --- |
| `< 0.03` or `>= 0.97` | `New Moon` | `new-moon` | `🌑` U+1F311 |
| `< 0.22` | `Waxing Crescent` | `waxing-crescent` | `🌒` U+1F312 |
| `< 0.28` | `First Quarter` | `first-quarter` | `🌓` U+1F313 |
| `< 0.47` | `Waxing Gibbous` | `waxing-gibbous` | `🌔` U+1F314 |
| `< 0.53` | `Full Moon` | `full-moon` | `🌕` U+1F315 |
| `< 0.72` | `Waning Gibbous` | `waning-gibbous` | `🌖` U+1F316 |
| `< 0.78` | `Last Quarter` | `last-quarter` | `🌗` U+1F317 |
| else | `Waning Crescent` | `waning-crescent` | `🌘` U+1F318 |

The wrap-around case is **first** in each switch, so `pct >= 0.97` short-circuits before any
later comparison. Bands are unequal by design (quarters are 0.06 wide, gibbous/crescent
0.19). Evaluate as an ordered if/else chain, not a lookup table.

> `MIGRATION_MAP.md:41` directs `lib/lunar.ts` to be rebuilt on `astronomy-engine`.
> **That will not reproduce these outputs.** This is a mean-synodic approximation with
> hand-tuned percentage bands; a real ephemeris will disagree on `illumination` by
> percentage points and will cross phase boundaries at different instants. If
> `GET /api/lunar/now` and `GET /api/calendar` must stay byte-identical, port this file
> literally — it is ~40 lines of arithmetic. Adopting `astronomy-engine` is a deliberate
> behaviour change requiring operator sign-off. The referenced §6.1 that would have
> specified this does not exist.

---

## 14. `payout.go` — signing payload

`backend/internal/payout/payout.go`, 75 lines. Ed25519 via `crypto/ed25519`.

### 14.1 Key material

`init()` reads **`MOONBUG_PAYOUT_KEY`**, std-base64, expected to decode to exactly
`ed25519.PrivateKeySize` (64) bytes. On missing / invalid-base64 / wrong-length it
generates an **ephemeral** key and logs a warning — signatures then do not survive a
restart, and `GET /api/public-key` silently starts returning a different key.

`PublicKeyBase64()` returns `base64.StdEncoding` (padded) of the 32-byte public key.

### 14.2 Claim struct — field order is load-bearing

```go
type CompletionClaim struct {
	UserID     string `json:"user_id"`
	CampaignID string `json:"campaign_id"`
	Nonce      string `json:"nonce"`
	IssuedAt   int64  `json:"issued_at"`
}
```

This is a **struct**, so `encoding/json` emits fields in **declaration order** — *not*
alphabetical, unlike every map-based response in §3–§9. The signed byte string is exactly:

```
{"user_id":"<uid>","campaign_id":"<cid>","nonce":"<nonce>","issued_at":<int>}
```

- **snake_case** — the only snake_case JSON in the system. The HTTP response echoes the
  same values as `userId` / `campaignId` / `nonce` / `issuedAt` (§9.3); the *signed* form
  uses different key names. Do not sign the response object.
- No trailing newline: `json.Marshal`, not `Encoder.Encode`.
- `issued_at` is a bare integer (Unix seconds).
- `json.Marshal` HTML-escapes `<`, `>`, `&` into `<`, `>`, `&`. A nonce is
  base64url so it is unaffected, but a UUID-shaped `user_id`/`campaign_id` is too — still,
  a TS port using `JSON.stringify` must replicate the escaping if any field could contain
  those bytes.
- Field order in `JSON.stringify` follows object-literal insertion order, so build the
  object as `{user_id, campaign_id, nonce, issued_at}` in exactly that sequence.

### 14.3 Functions

```go
func PublicKeyBase64() string
func SignCompletion(claim CompletionClaim) (string, error)   // std-base64 of 64-byte sig
func VerifyCompletion(claim CompletionClaim, signatureBase64 string) bool
```

`SignCompletion` marshals → `ed25519.Sign` → `base64.StdEncoding` (padded, 88 chars).
Errors only if marshalling fails; surfaces as `could not sign completion` (500).

`VerifyCompletion` re-marshals and verifies; returns `false` on marshal error, base64
decode error, or signature mismatch. **It has no callers** — nothing in the backend
verifies a claim, and `store.MarkTokenClaimed` is likewise uncalled. The redemption half
of the payout loop is unimplemented.

---

## 15. Date & time formatting matrix

Three distinct formats are in play. Per field:

| Route | Field | Format | Literal |
| --- | --- | --- | --- |
| `/api/health` | `time` | RFC3339 sec | `Format(time.RFC3339)` |
| all `userResponse` | `createdAt` | RFC3339 sec | `Format(time.RFC3339)` |
| `statePublic` | `updatedAt` | RFC3339 sec | `Format(time.RFC3339)` |
| `statePublic` | `logDate` | **date-only string** | `log_date::text` from SQL — no Go formatting |
| `/api/profile` | `recentActivity[].logDate` | **date-only string** | `log_date::text` |
| **`/api/profile`** | **`badges[].AwardedAt`** | **RFC3339Nano** | default `time.Time` marshal — see §10 |
| `notebookPublic` | `createdAt`, `updatedAt` | RFC3339 sec | `Format(time.RFC3339)` |
| `notebookPublic` | `dueDate` | **date-only or `null`** | `Format("2006-01-02")` |
| `eventPublic` | `eventDate` | **date-only** | `Format("2006-01-02")` |
| `publicField` | `createdAt`, `updatedAt` | RFC3339 sec | `Format(time.RFC3339)` |
| `publicAsset` | `createdAt`, `updatedAt` | RFC3339 sec | `Format(time.RFC3339)` |
| `publicFavorite` | `createdAt`, `updatedAt` | RFC3339 sec | `Format(time.RFC3339)` |
| `publicLink` | `createdAt`, `updatedAt` | RFC3339 sec | `Format(time.RFC3339)` |
| `/api/calendar` | `days[].date` | **date-only** | `Format("2006-01-02")` |
| `/api/ads/{id}/complete` | `token.issuedAt` | **Unix seconds int** | `time.Now().UTC().Unix()` |

Notes:

- `Format(time.RFC3339)` **truncates sub-second precision** — it does not round. Values are
  `2026-07-31T12:34:56Z` when the underlying `time.Time` is UTC. `toISOString()` in JS emits
  `.000Z` milliseconds and will **not** match; the port must strip them.
- Whether the offset renders as `Z` or `+00:00` depends on the `time.Time`'s location.
  Values read back from pgx carry the connection's timezone; values built in-process via
  `time.Now().UTC()` are always `Z`.
- `badges[].AwardedAt` is the sole RFC3339**Nano** field — full sub-second precision with
  trailing zeros removed, e.g. `2026-07-31T12:34:56.789012Z`.
- Server-assigned dates that clients cannot influence: the challenge-log date
  (`handlers.go:369`) and the events `from` default (`store.go:630`), both
  `time.Now().UTC().Format("2006-01-02")`.

---

## 16. Empty-collection nullability

Go distinguishes a nil slice (`null`) from an empty one (`[]`). Current behaviour:

| Field | Empty value | Why |
| --- | --- | --- |
| `challenges` | `[]` | handler `make(..., 0, n)` |
| `entries` | `[]` | handler `make(..., 0, n)` |
| `events` (both routes) | `[]` | handler `make(..., 0, n)` |
| `campaigns` | `[]` | handler `make(..., 0, n)` |
| `wallets` | `[]` | handler `make(..., 0, n)` |
| `fields`, `assets`, `favorites`, `links` | `[]` | handler `make(..., 0, n)` |
| `recentActivity` | `[]` | handler `make(..., 0, n)` |
| `publicField.children` | `[]` | explicit default |
| `targetCategories` | `[]` | `decodeCampaignCategories` |
| `survey.questions` | `[]` | `getSurvey` default |
| `statePublic.data` | `{}` | normalised by store |
| `publicAsset.detail` | `{}` | explicit default |
| `publicField.valueJson` | `[]` | `GetProfileFields` default |
| **`badges`** | **`null`** | raw nil `[]store.Badge`, no wrapper |
| **`days[].completedChallenges`** | **`null`** | missing map key → nil `[]string` |

The last two are the only nulls, and both are load-bearing — `src/types.ts:53` types
`completedChallenges` as `string[] | null`, and `Profile.tsx:69` guards `badges` with
`?? []`. A port that "helpfully" emits `[]` changes the contract.

---

## 17. Port checklist

1. Alphabetical key order in every response object (§1.2); declaration order for
   `CompletionClaim` (§14.2) and `badges[]` (§10).
2. Trailing `\n` on every body except the `RequireAuth` 401 (§1.1, §1.4).
3. Reject unknown request keys with 400 (§1.3) and decide explicitly whether to keep Go's
   case-insensitive field matching.
4. `Content-Type: application/json` with no charset.
5. HTML-escape `<`, `>`, `&` in all output (§1.1) and in the signing payload (§14.2).
6. 405 with `Allow` for method mismatch; `404 page not found\n` as `text/plain` for unknown
   `/api/*` (§1.6).
7. Preserve `null` for `badges` and `completedChallenges` (§16).
8. Per-field date formats, incl. second-precision RFC3339 — not `toISOString()` (§15).
9. Port `lunar.go` literally rather than adopting `astronomy-engine` (§13.5).
10. Sign `{user_id, campaign_id, nonce, issued_at}` in that order, snake_case, no newline (§14.2).
11. Resolve the `badges` PascalCase decision with the operator before writing the profile
    route (§10).
12. Confirm the ~20 chat/game/advertiser/audit routes referenced by the docs are genuinely
    out of scope (§12).
