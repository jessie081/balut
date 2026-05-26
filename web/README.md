# Balut · Sales & Inventory (Web)

A clean web rewrite of the original Android Balut app. Same four-screen concept
(Dashboard, Sell, Inventory, History) running anywhere a browser can reach
your server.

- **Backend**: Node.js + Express + better-sqlite3 (single file DB)
- **Frontend**: HTML + Tailwind (CDN) + Chart.js (CDN), zero build step
- **Palette**: warm egg-yolk yellow / brown / cream
- **Deploy**: `npm start`, Docker, or Render/Railway

## Quick start (local)

```bash
cd web
npm install
npm run seed   # optional: pre-populates Balut, Penoy, Aboy
npm start
```

Open <http://localhost:3000>.

The SQLite file is created at `web/data/balut.db` automatically on first run.

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

## Deploy to Render

The repo includes `web/render.yaml` (a Render Blueprint). After pushing to
GitHub:

1. Render → New → Blueprint → pick this repo.
2. Render reads `web/render.yaml`, builds `web/`, and attaches a 1 GB persistent
   disk at `/var/data` so the SQLite file survives redeploys.
3. Visit the assigned URL.

For Railway, point the service at the `web/` directory, set the start command
to `node server.js`, and add a volume mounted at `/app/data` (then set
`DB_PATH=/app/data/balut.db`).

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
