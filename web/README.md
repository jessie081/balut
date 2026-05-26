# Balut · Sales & Inventory (Web)

A clean web rewrite of the original Android Balut app. Same four-screen concept
(Dashboard, Sell, Inventory, History) running anywhere a browser can reach
your server.

- **Backend**: Node.js + Express + libsql client (works with a local SQLite
  file in dev and with hosted libsql/Turso in production – no native build).
- **Frontend**: HTML + Tailwind (CDN) + Chart.js (CDN), zero build step
- **Palette**: warm egg-yolk yellow / brown / cream
- **Deploy**: Vercel + Turso, Render with persistent disk, Docker, or local

## Quick start (local)

```bash
cd web
npm install
npm run seed   # optional: pre-populates Balut, Penoy, Aboy
npm start
```

Open <http://localhost:3000>. Local mode stores data at `web/data/balut.db`
(automatically created).

## API

| Method | Path                       | Notes                                       |
| ------ | -------------------------- | ------------------------------------------- |
| GET    | `/api/health`              |                                             |
| GET    | `/api/products`            | List products                               |
| POST   | `/api/products`            | `{name, price, stock}`                      |
| GET    | `/api/products/:id`        |                                             |
| PUT    | `/api/products/:id`        | Partial update accepted                     |
| DELETE | `/api/products/:id`        | Blocked (409) if sales exist                |
| GET    | `/api/sales`               | `?from=YYYY-MM-DD&to=YYYY-MM-DD HH:MM:SS`   |
| POST   | `/api/sales`               | `{productId, quantity, unitPrice?, customerName?, saleDate?}` — atomic stock deduction |
| GET    | `/api/sales/export.csv`    | CSV download                                |
| GET    | `/api/dashboard`           | `?lowStock=5` threshold                     |

All responses are JSON; errors return `{ "error": "message" }` with the right status.

## Configuration

Environment variables (see `.env.example`):

- `PORT` – default `3000`
- `DB_PATH` – default `./data/balut.db`
- `NODE_ENV`

## Docker

```bash
cd web
docker compose up --build
```

Data persists in the `balut-data` named volume.

## Deploy to Vercel (with Turso)

Vercel runs this app as a serverless function (`api/index.js` re-exports the
Express app). Because functions are stateless, the database lives on Turso
(hosted libsql, free tier).

1. Create a Turso DB and grab the credentials:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash   # one-time
   turso auth signup
   turso db create balut
   turso db show balut --url           # → libsql://...turso.io
   turso db tokens create balut        # → eyJ...
   ```
2. Run the schema & seed once against the hosted DB (any of these work):
   ```bash
   # Option A – using the Turso shell
   turso db shell balut < web/db/schema.sql

   # Option B – locally pointing at Turso
   cd web
   TURSO_DATABASE_URL=libsql://...turso.io TURSO_AUTH_TOKEN=eyJ... npm run init-db
   TURSO_DATABASE_URL=libsql://...turso.io TURSO_AUTH_TOKEN=eyJ... npm run seed
   ```
3. Deploy:
   ```bash
   npm i -g vercel
   cd web
   vercel              # link the project (first time)
   vercel env add TURSO_DATABASE_URL    # paste the libsql:// URL (all envs)
   vercel env add TURSO_AUTH_TOKEN      # paste the token (all envs)
   vercel --prod
   ```

   Or via the dashboard: **Add New… → Project → Import** the GitHub repo,
   set **Root Directory** to `web`, add the two env vars under
   **Settings → Environment Variables**, then **Deploy**.

## Deploy to Render

The repo includes `web/render.yaml`. Push to GitHub, then in Render:
**New → Blueprint → pick this repo**. Render uses the included persistent
1 GB disk for the SQLite file – no Turso needed there.

## Validation rules

- `quantity` must be a positive integer and cannot exceed available stock.
- `price` and `unitPrice` must be non-negative.
- Product names are unique (case-insensitive sort, exact-match unique index).
- A product cannot be deleted while sales reference it (the API responds 409).
  Delete the corresponding sales first or keep the product as historical.

## Notes

- Sales store a snapshot of the product name, so renaming a product does not
  rewrite history.
- `sale_date` is stored as `YYYY-MM-DD HH:MM:SS` in UTC; the frontend renders
  in the browser's local timezone.
- The CSV export streams from the same query the History screen uses.
