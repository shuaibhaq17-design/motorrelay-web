# MotorRelay API (Laravel 11)

This backend replaces the original Supabase layer with a Laravel 11 REST API targeting MySQL. It is provisioned for Railway deployment and local development via Sail or Laravel Valet.

## Quick start

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Update `.env` with your MySQL credentials (Workbench works great). Default config expects a database named `motorrelay`.

Run migrations and seed baseline demo data:

```bash
php artisan migrate --seed
```

Run the dev server:

```bash
php artisan serve
```

The API will be available on `http://127.0.0.1:8000/api`. Sanctum is configured for first-party SPA auth with the Vue frontend.

## Railway deployment

1. Create a new Railway project and add a MySQL service.
2. Add a PHP service from this repository (or the dedicated backend repo).
3. Set Railway environment variables:
   - `APP_KEY` (generate via `php artisan key:generate --show`)
   - `APP_URL` / `FRONTEND_URL`
   - `DB_*` vars supplied by Railway
4. Configure deploy command `php artisan migrate --force` in Railway.

## Endpoints

| Method | Path                        | Purpose                     |
| ------ | --------------------------- | --------------------------- |
| POST   | /api/auth/register          | Register driver or dealer   |
| POST   | /api/auth/login             | Email/password login        |
| POST   | /api/auth/logout            | Logout and revoke token     |
| GET    | /api/auth/me                | Current authenticated user  |
| GET    | /api/jobs/highlights        | Latest jobs for homepage    |
| GET    | /api/jobs                   | List jobs (filters+scope)   |
| POST   | /api/jobs                   | Create job (dealer/admin)   |
| GET    | /api/jobs/{job}             | Job detail                  |
| PATCH  | /api/jobs/{job}             | Update job                  |
| DELETE | /api/jobs/{job}             | Delete job                  |
| POST   | /api/jobs/{job}/accept      | Driver accepts              |
| POST   | /api/jobs/{job}/collected   | Mark collected              |
| POST   | /api/jobs/{job}/delivered   | Mark delivered              |
| POST   | /api/jobs/{job}/cancel      | Cancel job                  |
| GET    | /api/messages               | List message threads        |
| POST   | /api/messages               | Send message                |
| GET    | /api/invoices               | List invoices               |
| POST   | /api/invoices/from-job/{id} | Generate invoice            |

See `routes/api.php` and controllers for details on query params and payloads.
