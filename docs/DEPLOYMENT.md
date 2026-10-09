# Deployment and operations

## Supported production scope
One operator identity, one workspace, one running Node process, persistent local volume. Public visitors explore the licensed historical dataset without accessing operator data. This is not a multi-tenant SaaS or high-availability deployment. A database-backed identity provider, shared session/rate-limit storage and transactional datastore are required before horizontal scaling or multiple organizations.

## Local operation
Node 20.19+ or 22. `npm run dev` starts localhost:4173. Optional `.env` is loaded automatically. Without a configured hash, private APIs remain inaccessible and public exploration works.

Create a password of at least 14 characters with `npm run password`. Store only its returned salted scrypt hash in OPERATOR_PASSWORD_HASH in an ignored `.env` or hosting secret store. The generator warns that terminal input is visible; use a private terminal. There is no default production password. Restart to activate changes. The browser sends credentials only to the same-origin /api/login.

## Container production
1. Run tests, checks and build. Build `docker build -t stockwise .`.
2. Supply NODE_ENV=production, APP_ORIGIN=https://your-domain.example and OPERATOR_PASSWORD_HASH via deployment secrets. Mount a durable writable volume at /app/data, owned by the container's node user (UID 1000).
3. Terminate HTTPS at a trusted reverse proxy; route to port 4173. Keep one replica and disable external access to the Node port. The app checks the configured Origin for mutations and never trusts X-Forwarded-For for login limiting.
4. Probe /health. Verify login, workspace save/reload and CSV download against the actual domain. Secure cookies require HTTPS. Startup fails if production origin or password configuration is absent.
5. Set container resource limits, log rotation and a reverse-proxy request limit of at most 3 MB. Monitor health, HTTP failures and workspace_saved logs. Never log request bodies or passwords.

## Persistence and recovery
workspace.json is the latest server state; workspace.previous.json is one prior valid revision. Writes are serialized, validated, fsynced and atomically renamed; stale revision saves return 409 rather than overwriting another session. Directory permissions are 0700; state file is 0600. Explicit Save workspace avoids unnoticed uploads. Sessions and login counters are in memory: restarting signs out operators and resets rate limiting. A proxy that shares one IP will share the login attempt quota.

Before upgrades, stop the single app process and copy the private volume to an encrypted backup outside the host. Schedule off-host backups with retention according to your organization's requirements. To restore, stop the process, copy a verified snapshot to workspace.json, preserve private ownership/permissions, start and confirm revision/data. Test recovery on a separate environment before relying on it. No off-host backup is provisioned by this repository; the previous revision is NOT disaster recovery.

## Release gates
Local HTTP integration tests cover login, unauthorized access, Origin/CSRF enforcement, revisions, persistence and exported content. Container runtime, real HTTPS/cookies, host-volume durability across host failure, off-host restore, load and independent security review remain deployment-specific checks. Do not advertise those as verified before running them.

## GitHub Pages portfolio demo
The public static guest demo uses the pages.yml workflow and npm run build:pages at https://desta-data-analytics.github.io/stockwise/. No credentials or private operator APIs are deployed. Storage is browser-local; a configured persistent Node backend is a separate deployment option. Revert the release commit and push to roll back through the same checked workflow.
