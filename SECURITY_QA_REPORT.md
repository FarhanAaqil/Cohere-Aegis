# Lemon Host Monitor Security QA Report

Review date: 2026-09-04  
Scope: deployed homepage header checks for `farhan.careerjumpstart.com.au`, local frontend source, Chrome extension source, proxy templates, built output scan, and npm dependency audit.  
Limitation: Supabase Edge Function source was not present in this workspace checkout, so server-side authorization, SQL safety, password reset behavior, and API IDOR testing could not be fully verified from backend code.

## Executive Summary

The application loads over HTTPS and HTTP redirects to HTTPS. Basic hardening headers are present, and the quick bundle/source scan did not find obvious private signing secrets or service-role keys in the deployed browser output.

The application should not be called fully secure yet. The main items to address are missing production security headers, vulnerable npm dependencies, lack of frontend role route guards, and incomplete backend verification for authorization/API access control.

## Overall Status

| Area | Status | Notes |
| --- | --- | --- |
| HTTPS / SSL | Pass with gaps | HTTPS works and HTTP redirects to HTTPS. Certificate is valid. HSTS was not present. |
| Authentication | Partial | Login uses POST body, not URL. Logout clears local storage. Password reset/MFA not implemented or not visible in this checkout. |
| Authorization / Access Control | Needs verification | Frontend hides admin navigation by role, but admin routes are only protected by authentication. Backend must enforce admin/manager access. |
| Input Security | Partial | React escaping helps against basic XSS. Backend validation could not be verified. |
| API Security | Needs verification | API wrappers send bearer tokens. Backend source unavailable, so unauthenticated/admin/IDOR behavior must be tested against functions. |
| Frontend Secrets | Mostly pass | No obvious private keys/JWT secrets found in `dist`, `src`, `extension`, or `public` scans. Public Supabase anon keys are expected. |
| Security Headers | Needs improvement | CSP and HSTS missing from observed live response. |
| Dependencies | Fail | `npm audit` reported 23 vulnerabilities: 1 critical, 16 high, 4 moderate, 2 low. |
| Error Handling | Needs improvement | Boot error handler can display stack traces to users. |
| OWASP Coverage | Partial | Quick review only. Full OWASP WSTG testing still required with test accounts. |

## Findings

### Critical: Dependency Audit Contains Critical/High Vulnerabilities

Evidence:

- Command: `npm.cmd audit --audit-level=low`
- Result: 23 vulnerabilities: 1 critical, 16 high, 4 moderate, 2 low.
- Critical package: `vitest <3.2.6`
- High impact packages include `react-router-dom`, `@remix-run/router`, `rollup`, `postcss`, `nanoid`, `lodash`, `form-data`, `glob`, `js-yaml`, `ws`, and related transitive dependencies.

Risk:

- Mostly build/dev dependency risk, but vulnerable tooling can still expose local files, enable DoS, or create supply-chain risk.
- `react-router-dom` advisory is directly relevant to frontend routing behavior.

Recommended fix:

```bash
npm audit fix
npm run build
npm run test
```

If `npm audit fix` changes major dependency behavior, review `package-lock.json`, run the app locally, and retest login/navigation.

### High: Admin Routes Are Not Frontend Role-Guarded

Evidence:

- `src/App.tsx` wraps all protected routes with the same `ProtectedRoute`.
- `src/components/ProtectedRoute.tsx` only checks whether the user is authenticated.
- `src/components/AppSidebar.tsx` hides admin links based on role, but hidden navigation is not access control.

Affected routes include:

```text
/admin
/admin/users
/admin/teams
/admin/browser-history
/admin/shifts
/admin/departments
/admin/analytics
/admin/audit-logs
/admin/ip-config
/team
/browser-history
/screenshots
/reports
```

Risk:

- A normal authenticated user can manually enter an admin/manager URL and render the page shell.
- If backend APIs are also weak, this becomes critical data exposure or privilege escalation.

Recommended fix:

- Add a role-aware route guard for manager/admin pages.
- Keep backend authorization as the source of truth. Frontend guards only improve UX and reduce accidental exposure.

### High: Backend Authorization / IDOR Could Not Be Verified

Evidence:

- Frontend APIs send user-controlled IDs in paths/query strings:

```text
adminApi.updateUser(id, body)
adminApi.getTeamMembers(teamId)
adminApi.removeTeamMember(teamId, userId)
workSessionsApi.getBrowserHistory(userId, date)
workSessionsApi.getScreenshots(userId, date)
reportsApi user filters
```

- Supabase Edge Function source was not present in this workspace, so server-side checks could not be reviewed.

Risk:

- If server-side checks do not validate the current user's role/team relationship, normal users may access another user's records or admin APIs by changing IDs.

Required verification:

- Log in as an employee and call admin endpoints directly.
- Change `user_id`, `team_id`, and route IDs in API requests.
- Confirm all unauthorized access returns `401` or `403`.

### Medium: Missing CSP and HSTS Headers

Evidence from live HEAD request to `https://farhan.careerjumpstart.com.au/`:

Present:

```text
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Cache-Control: no-cache, no-store, must-revalidate
```

Missing:

```text
Content-Security-Policy
Strict-Transport-Security
Permissions-Policy
```

Risk:

- Missing CSP increases XSS impact.
- Missing HSTS allows SSL-stripping risk on first connection.

Recommended fix:

- Add HSTS after confirming HTTPS is stable:

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

- Add a CSP compatible with the app and Supabase endpoints. Start in `Content-Security-Policy-Report-Only`, then enforce after reviewing reports.

### Medium: Boot Error Handler Can Expose Stack Traces

Evidence:

- `src/main.tsx` renders `err.message` and `err.stack` into the page on runtime boot errors.

Risk:

- In production, stack traces can expose internal file paths, implementation details, package names, and deployment structure.

Recommended fix:

- In production, show a generic error message.
- Log detailed stack traces only in development or to a private monitoring service.

### Medium: Temporary Passwords Are Displayed and Copied in Admin UI

Evidence:

- `src/pages/admin/AdminUsersPage.tsx` displays created user email/password in the UI.
- The same details can be copied to clipboard.

Risk:

- Shoulder-surfing, clipboard leakage, screenshots, or browser extensions can capture temporary credentials.

Recommended fix:

- Require first-login password change.
- Display the temporary password only once.
- Add password-generation rules and avoid re-showing credentials after modal close.
- Prefer secure internal transfer rather than clipboard when possible.

### Medium: Tokens Stored in Local Storage

Evidence:

- `src/lib/auth.ts` stores `auth_token`, `auth_user`, and a Supabase-style auth token in `localStorage`.
- `src/integrations/supabase/client.ts` also enables localStorage persistence.

Risk:

- Any successful XSS can steal the app JWT from localStorage.

Recommended fix:

- Strong CSP and XSS prevention are required.
- For higher-security admin accounts, consider HttpOnly Secure SameSite cookies managed server-side.
- Add MFA for admin/HR accounts.

### Low / Medium: Proxy Template Allows Broad CORS

Evidence:

- `public/supabase-proxy.example.php` sets:

```text
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: *
```

Risk:

- Broad CORS is usually unnecessary for same-origin production proxy traffic.
- It can increase abuse surface if tokens are exposed elsewhere.

Recommended fix:

- Restrict `Access-Control-Allow-Origin` to the production app domain.
- Restrict methods to the required set.
- Add an allowlist for expected function paths if practical.

## HTTPS / SSL Results

Checked:

```text
https://farhan.careerjumpstart.com.au/
http://farhan.careerjumpstart.com.au/
```

Results:

- HTTPS returned `200 OK`.
- HTTP returned `301 Moved Permanently` to HTTPS.
- Certificate subject: `CN=farhan.careerjumpstart.com.au`
- Issuer: `Let's Encrypt`
- Valid from: 2026-08-04 09:47:33
- Valid until: 2026-11-02 09:47:32

No mixed-content crawl was performed in this quick pass. Run a browser DevTools check after login to confirm there are no mixed-content warnings on authenticated pages.

## Frontend Secret Scan Results

Scanned:

```text
dist
src
extension
public
```

Patterns checked included:

```text
service_role
SUPABASE_SERVICE
JWT_SECRET
RESEND
SMTP
private_key
-----BEGIN
password_hash
```

Result:

- No obvious private signing secrets, service-role keys, SMTP passwords, or private keys were found in browser output.
- Supabase publishable/anon keys are expected to be public.
- `.env`, `extension/config.js`, and `public/supabase-proxy.php` exist locally and are ignored by `.gitignore`; keep them out of commits.

## Authentication Checklist

| Check | Result |
| --- | --- |
| Wrong password rejected | Not live-tested; backend unavailable locally |
| Password in URL | Pass from source review; login uses POST JSON body |
| Password in logs | Not fully verifiable; no frontend logging found |
| Password reset links expire | Not implemented or not visible in this checkout |
| Sessions expire after logout | Frontend clears localStorage tokens on logout |
| Back button after logout | Likely protected by local auth state; should be browser-tested |
| MFA | Not implemented; recommended for admin/HR |

## Recommended Next Actions

1. Fix dependency vulnerabilities with `npm audit fix`, then run build/test.
2. Add frontend role guards for admin and manager-only routes.
3. Verify backend Edge Functions enforce `401/403` for employee access to admin/team/private user data.
4. Add HSTS and CSP headers on production hosting.
5. Remove production stack traces from the UI boot error handler.
6. Add MFA or stricter controls for admin/HR accounts.
7. Perform a full OWASP WSTG pass with separate employee, manager, HR, and admin test accounts.

## Quick Verdict

The deployed app has a working HTTPS baseline, but it should be treated as partially reviewed, not fully security-cleared. Authorization and API access control require backend/live testing before final sign-off.
