# Deal Alert

Deal Alert tracks product prices across supported Uzbek marketplaces. Save listings, set target prices, follow price history, compare matching offers, and organize tracked products into collections. The web app also supports email account verification, password recovery, and an optional Telegram bot for linked accounts.

[Open the live app](https://deal-alert-web.onrender.com) · [Check API readiness](https://deal-alert-web.onrender.com/api/health/ready)

## Project structure

| Directory | Purpose |
| --- | --- |
| `frontend/` | React and TypeScript web app built with Vite, Tailwind CSS, React Router, and Recharts. |
| `backend/` | NestJS API with PostgreSQL and Drizzle. The code separates domain rules, application use cases, infrastructure adapters, and HTTP controllers. |
| `backend/docs/` | API contracts, marketplace configuration, Telegram setup, and deployment instructions. |

Scheduled price checks and the email outbox run inside NestJS. PostgreSQL coordinates job leases and retries. The same service hosts the grammY bot when it is configured.

## Run locally

Use Node.js 24, npm, and PostgreSQL 15 or later. Create an empty local PostgreSQL database before running the migrations.

```bash
git clone https://github.com/shamsiddin-devv/deal-alert.git
cd deal-alert
```

Copy `backend/.env.example` to `backend/.env` and configure the backend.

| Variable | Local configuration |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string for the local database. |
| `APP_SECRET` | A unique random secret of at least 32 bytes. |
| `APP_ORIGIN` | `http://localhost:5173`, matching the exact origin opened in the browser. |
| `SMTP_URL` and `MAIL_FROM` | SMTP connection and authorized sender for email verification, password recovery, and email alerts. |

Start the backend from the repository root.

```bash
npm --prefix backend ci
npm --prefix backend run db:migrate
npm --prefix backend run start:dev
```

Open a second terminal at the repository root and start the frontend.

```bash
npm --prefix frontend ci
npm --prefix frontend run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite forwards `/api` to `http://127.0.0.1:3000` by default. Set `DEAL_API_PROXY_TARGET` before starting Vite if the backend uses a different address. The API exposes `/api/health` for process health and `/api/health/ready` for database and migration readiness.

## Marketplace access

The backend includes source profiles for Asaxiy, Mediapark, Texnomart, ISHONCH, OLX, Uzum, NOUT.uz, ComputerHouse, and UPG. Live marketplace requests are disabled when `SCRAPE_APPROVED_SOURCES` is empty. Enable a source only after confirming permitted access and checking its product pages. Configure `SCRAPE_CONTACT` for approved requests. The OLX profile is available for fixture tests only. [Marketplace guide](backend/docs/marketplaces.md)

## Checks

```bash
npm --prefix backend test
npm --prefix backend run db:check
npm --prefix frontend run build
```

The backend suite covers domain rules, source adapters, and HTTP flows with an isolated PGlite database. Run `npm --prefix backend run test:e2e` for the HTTP suite alone. The frontend build runs TypeScript checks before generating `frontend/dist`.

## Production deployment

The live Render services deploy from the `deploy/render-static` branch. Render serves `frontend/dist` as a Static Site and runs the NestJS API as a Web Service. A rewrite forwards `/api/*` from the frontend origin to the API, and the SPA fallback serves `index.html` for frontend routes. Set `APP_ORIGIN` to the public frontend URL so browser sessions work through the same origin.

Configure the Neon pooled connection as `DATABASE_URL` and the direct connection as `DATABASE_MIGRATION_URL`. Apply Drizzle migrations before starting the API. Use `/api/health/ready` as the Web Service health check. The current deployment uses Brevo SMTP with STARTTLS on port `2525` and a verified `MAIL_FROM` sender. [Render deployment guide](backend/docs/render-deploy.md)

To enable Telegram, configure `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, and `TELEGRAM_AUTO_WEBHOOK=true` on the API service. Users link the bot from **Settings → Account → Telegram**. Store database, email, and bot credentials in environment variables and keep `.env` files out of Git. [Telegram setup guide](backend/docs/telegram.md)

## API documentation

- [API endpoints and request examples](backend/docs/api.md)
- [Frontend workflows and API mapping](backend/docs/frontend-api-map.md)
