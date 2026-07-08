## MotorRelay (Vue 3 + Laravel 11 + MySQL)

The MotorRelay platform is split into two deployable apps:

- `frontend/` - Vue 3 + Vite SPA ready for Netlify.
- `backend/` - Laravel 11 REST API with Sanctum auth, backed by MySQL.

Jobs, messaging, tracking, expenses, and invoicing flow through the Laravel API.

---

### Repository structure

```text
frontend/   Vue 3 SPA (Tailwind, Vue Router, Pinia)
backend/    Laravel 11 API (Sanctum, MySQL migrations, seeders)
```

---

## Prerequisites

| Tool       | Version (tested) | Notes                              |
|------------|------------------|------------------------------------|
| Node.js    | >= 18            | Needed for the Vue frontend        |
| npm / pnpm | npm >= 9         | Netlify build defaults to npm      |
| PHP        | >= 8.2           | Required for Laravel 11            |
| Composer   | >= 2.6           | Installs Laravel dependencies      |
| MySQL      | >= 8.0           | Use Workbench for GUI management   |
| Git        | latest           | Useful for deployment pipelines    |

---

## Backend setup (`backend/`)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Update `.env` with your MySQL credentials. Suggested local DB name: `motorrelay`.

Run migrations and seed demo data:

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

| Role   | Email                 | Password |
|--------|-----------------------|----------|
| Admin  | admin@motorrelay.com  | password |
| Dealer | dealer@motorrelay.com | password |
| Driver | driver@motorrelay.com | password |

---

## Frontend setup (`frontend/`)

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

Create a `.env` from `.env.example` if you want to point at a different API URL:

```text
VITE_API_BASE_URL=http://localhost:8000/api
```

### Vue SPA highlights

- Tailwind styling with component helpers (`tile`, `badge`).
- Pinia store manages auth token and user profile.
- `axios` service injects the bearer token and clears storage on `401`.
- UI routes cover jobs, driver/dealer dashboards, planner, messages, invoices, profile, membership, and admin.

---

## Deploying to Netlify (frontend)

1. Create a new Netlify site and link to the frontend repository or subdirectory.
2. Build command: `npm run build`
3. Publish directory: `frontend/dist`
4. Environment variables:
   - `VITE_API_BASE_URL=https://<your-railway-app>.railway.app/api`

---

## Deploying to Railway (backend)

1. Create a new Railway project.
2. Add a MySQL database service.
3. Add a PHP service pointing at `backend/`.
4. Set environment variables:
   - `APP_ENV=production`
   - `APP_URL=https://<railway-app>.railway.app`
   - `FRONTEND_URL=https://<your-netlify-site>.netlify.app`
   - `APP_KEY` from `php artisan key:generate --show`
   - `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
5. Deploy command: `composer install --no-dev && php artisan migrate --force && php artisan db:seed --force`
6. Start command: `php artisan serve --host=0.0.0.0 --port=${PORT}`

Railway automatically injects `PORT`; Laravel binds to it at startup.

---

## Suggested next steps

1. Verify the main workflows against seeded data.
2. Split the repo into two Git remotes if you want separate frontend/backend deployments.
3. Add automated tests (PHPUnit + Vitest) as you continue to iterate.
