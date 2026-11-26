# NEXUS Supabase hardening
- Live RLS optimization already applied as migration 20261126153402.
- Before deployment configure SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) as a server-only Render environment variable. Never put it in NEXT_PUBLIC_ or commit it.
- Run npm ci if a lockfile is available, otherwise npm install; then npm run build. Verify authentication, chat, image logging and share links in a test deployment.
- Only after successful deployment and verification run supabase/manual/02_AFTER_DEPLOY.sql. This blocks public listing and client-side usage log inserts; running it early may break the old application.
- Re-test valid share link in logged-out browser, random link (404), anonymous table access, and direct usage-log writes as authenticated user (denied). Verify new chat/image requests create logs.
- Usage logs are approximate analytics, not a financial ledger. Leaked-password protection requires separate Supabase Auth configuration. Rate limits, payments and end-to-end load tests are outside this patch.
