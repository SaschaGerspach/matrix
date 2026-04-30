# Skill Matrix

A full-stack web application for managing employee skills, certifications, and development plans across teams and departments. Built with Django REST Framework and Angular.

## Features

- **Skill Management** — Categorized skill catalog with 5-level proficiency ratings and team lead confirmation workflow
- **Skill Matrix Dashboard** — Interactive grid view of employees × skills with filtering, search, and CSV/PDF export
- **Analytics & KPIs** — Team comparison charts, skill gap analysis, trend tracking, and level distribution
- **Development Plans** — Goal-based development tracking with status management
- **Certificates** — File upload (PDF, JPEG, PNG) with magic-byte validation
- **Skill Proposals** — Employees can propose new skills for review by team leads
- **Role Templates** — Predefined skill sets for common roles
- **Notifications** — Real-time in-app notifications via WebSockets + optional email
- **Audit Logging** — Full trail of all create, update, delete, and import operations
- **Multi-language** — English and German (switchable at runtime)
- **Dark Mode** — System-preference-aware theme switching

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.13, Django 6, Django REST Framework, Django Channels (WebSockets) |
| Frontend | Angular 19, Angular Material, Chart.js, ngx-translate |
| Database | PostgreSQL 17 |
| Cache & Broker | Redis 7 (caching, Celery broker, Channels layer) |
| Async Tasks | Celery |
| Auth | JWT (HttpOnly cookies, automatic refresh, CSRF protection) |
| API Docs | drf-spectacular (Swagger UI at `/api/docs/`) |
| Reverse Proxy | Nginx with TLS termination |
| Monitoring | Sentry (optional) |
| CI | GitHub Actions (backend tests, frontend tests, E2E) |

## Quick Start (Docker)

```bash
git clone https://github.com/SaschaGerspach/matrix.git
cd matrix
cp backend/.env.example backend/.env   # adjust if needed
docker-compose up -d
```

Services start in dependency order: PostgreSQL → Redis → Backend + Celery → Frontend → Nginx.

Once running:

| URL | Description |
|-----|-------------|
| `https://localhost` | Application |
| `https://localhost/api/docs/` | Swagger API documentation |
| `https://localhost/backoffice/` | Django admin panel |

Create an admin user:

```bash
docker-compose exec backend python manage.py createsuperuser
```

## Local Development Setup

### Prerequisites

- Python 3.13+
- Node.js 22+
- PostgreSQL 17 (or SQLite for quick development)
- Redis (optional, falls back to local memory cache)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env            # edit DATABASE_URL, SECRET_KEY, etc.

# Database
python manage.py migrate
python manage.py createsuperuser

# Run
python manage.py runserver 8000
```

### Frontend

```bash
cd frontend
npm install
npm start                       # serves at http://localhost:4200
```

The frontend proxies API requests to `http://localhost:8000` during development.

## Project Structure

```
matrix/
├── backend/                    # Django REST API
│   ├── authentication/         # JWT login, logout, token refresh, password change
│   ├── employees/              # Employee CRUD, CSV import, profile
│   ├── teams/                  # Departments and teams with members/leads
│   ├── skills/                 # Skill catalog, assignments, history, analytics
│   ├── notifications/          # In-app + email notifications, WebSocket consumer
│   ├── certificates/           # Certificate file upload and management
│   ├── development_plans/      # Development plans with goals and status tracking
│   ├── skill_proposals/        # Skill proposal and review workflow
│   ├── common/                 # Audit logging, health check, async task status
│   └── config/                 # Django settings, ASGI config, root URL conf
├── frontend/                   # Angular SPA
│   ├── src/app/core/           # Services, guards, interceptors
│   ├── src/app/pages/          # Page components (dashboard, admin, etc.)
│   ├── src/app/shell/          # App shell with navigation
│   ├── public/i18n/            # Translation files (en.json, de.json)
│   └── tests/                  # Playwright E2E tests
├── nginx/                      # Reverse proxy config with TLS
├── backup/                     # Automated PostgreSQL backup service
└── docker-compose.yml
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | — | Django secret key (required) |
| `DEBUG` | `False` | Enable debug mode |
| `ALLOWED_HOSTS` | `localhost` | Comma-separated allowed hostnames |
| `CORS_ALLOWED_ORIGINS` | — | Comma-separated allowed origins |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_URL` | — | Redis connection string (optional) |
| `EMAIL_HOST` | — | SMTP server for notifications (optional) |
| `EMAIL_PORT` | `587` | SMTP port |
| `EMAIL_HOST_USER` | — | SMTP username |
| `EMAIL_HOST_PASSWORD` | — | SMTP password |
| `DEFAULT_FROM_EMAIL` | `noreply@skillmatrix.local` | Sender address |
| `SENTRY_DSN` | — | Sentry error tracking (optional) |
| `ADMIN_URL` | `backoffice` | Django admin URL prefix |

## API

Interactive API documentation is available at `/api/docs/` (Swagger UI) and the OpenAPI schema at `/api/schema/`.

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/login/` | Authenticate and receive JWT cookies |
| `POST /api/auth/refresh/` | Refresh access token |
| `POST /api/auth/logout/` | Clear JWT cookies and blacklist token |
| `GET /api/employees/` | List employees (search, pagination) |
| `GET /api/employees/me/` | Current user's employee profile |
| `GET/POST /api/skills/` | Skill catalog CRUD |
| `GET/POST /api/skill-assignments/` | Skill level assignments |
| `POST /api/skill-assignments/{id}/confirm/` | Team lead confirmation |
| `GET /api/skill-matrix/` | Matrix data (filterable by team, category, search) |
| `GET /api/skill-matrix/export-csv/` | CSV export |
| `GET /api/skill-matrix/export-pdf/` | PDF export |
| `GET /api/skill-gaps/` | Skills below required levels |
| `GET /api/kpi/` | Team KPI data |
| `GET /api/notifications/` | User notifications |
| `GET /api/health/` | Health check (database + cache) |

### WebSocket

Real-time notifications are delivered via WebSocket at `ws://localhost/ws/`.

## Testing

### Backend (pytest)

```bash
cd backend
python -m pytest                        # run all tests with coverage
python -m pytest -v                     # verbose output
python -m pytest skills/               # single app
python -m pytest --cov-report=html     # HTML coverage report
```

Coverage: **98%** across 303 tests.

### Frontend (Karma + Jasmine)

```bash
cd frontend
npm test                                # unit tests (watch mode)
npx ng test --watch=false --browsers=ChromeHeadless   # single run
```

### E2E (Playwright)

Playwright automatically starts both backend and frontend servers:

```bash
cd frontend
npx playwright install --with-deps chromium   # first time only
npx playwright test                           # run all E2E tests
npx playwright show-report                    # open HTML report
```

35 E2E tests covering login, navigation, dashboard, employees, employee profile, admin, settings, team review, skill gaps, and skill proposals.

### CI Pipeline

GitHub Actions runs three jobs on every push and pull request:

1. **backend** — ruff lint, Django checks, migration check, pytest with coverage
2. **frontend** — ESLint, Karma unit tests, production build
3. **e2e** — Playwright E2E tests (runs after backend + frontend pass)

## Backup & Restore

Automated daily backups run at 2:00 AM UTC via the backup service in Docker Compose.

```bash
# Manual backup
docker-compose exec backup /usr/local/bin/backup.sh

# List backups
docker-compose exec backup ls -la /backups/

# Restore
docker-compose exec backup sh -c \
  'gunzip < /backups/matrix_YYYYMMDD_HHMMSS.sql.gz | psql -h db -U matrix matrix'
```

Configuration via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_SCHEDULE` | `0 2 * * *` | Cron schedule |
| `BACKUP_RETENTION_DAYS` | `7` | Days to keep backups |

## Security

- JWT tokens stored in HttpOnly cookies (not localStorage)
- CSRF protection on all state-changing requests
- Content Security Policy headers
- Account lockout after 10 failed login attempts
- Rate limiting on authentication endpoints
- File upload validation with magic byte content checks
- Django admin moved to configurable URL (`/backoffice/`)
- HTTPS with TLS via Nginx reverse proxy
- Audit logging for all sensitive operations

## License

Private project — not licensed for redistribution.
