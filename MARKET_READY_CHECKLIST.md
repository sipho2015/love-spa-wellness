# Market Readiness Checklist

Use this as the execution board for launch.

## 1) Security Baseline

- [ ] Replace placeholder JWT key in production environment.
- [ ] Move production connection strings and SMTP credentials to environment/secret store.
- [ ] Add HTTPS-only deployment config.
- [ ] Add rate limiting for auth and public booking endpoints.
- [ ] Add centralized error logging and alerting.

## 2) Product Quality

- [ ] Resolve Angular bundle/CSS budget warnings.
- [ ] Add responsive QA pass for all key pages (Home, Booking, Dashboards).
- [ ] Add empty/loading/error state audit for all user flows.
- [ ] Add accessibility pass (labels, contrast, keyboard navigation).

## 3) Test Coverage

- [ ] Add backend integration tests for booking, inquiry reply, and notifications.
- [ ] Add frontend tests for auth modal and booking flow.
- [ ] Add CI gate for backend tests and frontend build.
- [ ] Add smoke test script for local release verification.

## 4) Operations & Deployment

- [ ] Add production Docker Compose profile or cloud deploy manifest.
- [ ] Add migration-on-deploy process.
- [ ] Configure backups for SQL Server data.
- [ ] Add health checks + uptime monitoring.

## 5) Launch Readiness

- [ ] Privacy policy and terms finalized for production use.
- [ ] Production seed strategy (no default weak credentials).
- [ ] Release notes for v1.0.0.
- [ ] Rollback plan documented.
