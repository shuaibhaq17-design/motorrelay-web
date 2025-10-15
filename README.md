## MotorRelay Rebuild (Vue 3 + Laravel 11 + MySQL)

The MotorRelay platform has been rebuilt as two deployable apps:

- `frontend/` — Vue 3 + Vite SPA ready for Netlify.
- `backend/` — Laravel 11 REST API with Sanctum auth, backed by MySQL (ideal for Railway).

Supabase dependencies from the previous Next.js build have been removed. Jobs, messaging, planner snapshots, and invoicing now flow through the Laravel API.

---

### Repository structure

```
frontend/   Vue 3 SPA (Tailwind, Vue Router, Pinia)
backend/    Laravel 11 API (Sanctum, MySQL migrations, seeders)
```

> The legacy Next.js files remain in the repo for reference. You can delete them once you are comfortable that the new stack covers all required flows.

---

## Prerequisites

| Tool      | Version (tested) | Notes                              |
|-----------|------------------|------------------------------------|
| Node.js   | ≥ 18             | Needed for the Vue frontend        |
| npm / pnpm| npm ≥ 9          | Netlify build defaults to npm      |
| PHP       | ≥ 8.2            | Required for Laravel 11            |
| Composer  | ≥ 2.6            | Installs Laravel dependencies      |
| MySQL     | ≥ 8.0            | Use Workbench for GUI management   |
| Git       | latest           | Separate repos for FE / BE deploys |

---

## Backend setup (`backend/`)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Update `.env` with your MySQL credentials. Suggested local DB name: `motorrelay`.

Run migrations & seed demo data (admin, dealer, driver, sample jobs/messages/invoices):

```bash
php artisan migrate --seed
```

Serve locally:

```bash
php artisan serve
# API: http://127.0.0.1:8000/api
```

Sanctum issues personal access tokens. The Vue SPA stores the bearer token in `localStorage` under `mr_auth_token`.

### Handy demo credentials

| Role    | Email                 | Password |
|---------|-----------------------|----------|
| Admin   | admin@motorrelay.com  | password |
| Dealer  | dealer@motorrelay.com | password |
| Driver  | driver@motorrelay.com | password |

---

## Frontend setup (`frontend/`)

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

Create a `.env` from `.env.example` if you want to point at a different API URL:

```
VITE_API_BASE_URL=http://localhost:8000/api
```

### Vue SPA highlights

- Tailwind styling with component helpers (`tile`, `badge`).
- Pinia store manages auth token + user profile.
- `axios` service automatically injects bearer token and clears storage on `401`.
- UI routes match the previous app: jobs (index/detail/create), planner, messages, invoices, profile, membership, onboarding placeholders.

---

## Deploying to Netlify (frontend)

1. Create a new Netlify site and link to the frontend repository or subdirectory.
2. Build command: `npm run build`
3. Publish directory: `frontend/dist`
4. Environment variables:
   - `VITE_API_BASE_URL=https://<your-railway-app>.railway.app/api`
5. Optional: enable Netlify forms or edge functions later.

---

## Deploying to Railway (backend)

1. Create a new Railway project.
2. Add a MySQL database service (Railway will expose connection variables).
3. Add a PHP service pointing at `backend/`.
4. Set environment variables:
   - `APP_ENV=production`
   - `APP_URL=https://<railway-app>.railway.app`
   - `FRONTEND_URL=https://<your-netlify-site>.netlify.app`
   - `APP_KEY` (generate locally: `php artisan key:generate --show`)
   - `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` (from Railway MySQL service)
5. Deploy command: `composer install --no-dev && php artisan migrate --force && php artisan db:seed --force`
6. Start command: `php artisan serve --host=0.0.0.0 --port=${PORT}`

Railway automatically injects `PORT`; we bind Laravel’s server to it.

---

## Using MySQL Workbench

- Connect using the same credentials stored in `.env`.
- You will see tables: `users`, `jobs`, `messages`, `message_threads`, `message_thread_user`, `invoices`, `sessions`, `personal_access_tokens`, etc.
- You can visually inspect job status transitions or edit memberships (plans) via Workbench.

---

## Suggested next steps

1. Verify feature parity by driving workflows through the new Vue UI against the seeded data.
2. Remove the legacy Next.js directories (`app/`, `lib/`, etc.) once you no longer need them.
3. Split the repo into two Git remotes (frontend/back-end) to match your deployment pipelines.
4. Add automated tests (PHPUnit + Vitest) as you continue to iterate.

The codebase is now ready for Netlify + Railway and uses technologies you requested: Vue on the frontend, Laravel 11 + MySQL on the backend, with Laravel Sanctum for auth.
