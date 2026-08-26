/**
 * Fixed credentials for the public "Try Demo" trial account.
 *
 * Intentionally public — anyone can already reach this account by clicking
 * "Try Demo", so there's nothing gained by hiding the values. The backend
 * (see taskmaster-backend/app/routers/demo_router.py) refuses to reseed any
 * account whose email doesn't match this one, so demo resets can never
 * touch a real user's data.
 *
 * Must match DEMO_EMAIL / DEMO_PASSWORD on the backend.
 */
export const DEMO_EMAIL = 'demo@example.com';
export const DEMO_PASSWORD = 'demopassword123';
