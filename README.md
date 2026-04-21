# Loan Platform

Frontend + Admin + Withdraw flow with local persistence, plus SQL backend service.

## Admin Panel Link

- Local admin link: `http://localhost:5173/?view=admin`

## Run Frontend

```bash
npm install
npm run dev
```

- Frontend URL: `http://localhost:5173`

## Run SQL Backend

```bash
cd backend
npm install
npm run dev
```

- Backend URL: `http://localhost:4000`
- Health check: `http://localhost:4000/api/health`

## Backend Configuration

Copy `backend/.env.example` to `.env` (optional) and set:

- `PORT`
- `DB_FILE`
- `DEFAULT_ADMIN_PIN`
- `CORS_ORIGIN`

Database is SQL (SQLite via `better-sqlite3`) and stored at `backend/data/loan_app.db` by default.

## VPS Deployment Notes

- Run frontend build and serve static files behind Nginx.
- Run backend with PM2 or systemd.
- Point frontend API calls to your domain backend (example: `https://api.yourdomain.com`).
- Keep `backend/data` persistent (or switch to MySQL/PostgreSQL in backend later).
