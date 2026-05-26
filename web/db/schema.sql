-- Balut Web App schema (libsql / SQLite compatible)

CREATE TABLE IF NOT EXISTS products (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT    NOT NULL UNIQUE,
  price     REAL    NOT NULL CHECK (price >= 0),
  stock     INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at TEXT   NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id    INTEGER NOT NULL,
  product_name  TEXT    NOT NULL,
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  unit_price    REAL    NOT NULL CHECK (unit_price >= 0),
  total         REAL    NOT NULL CHECK (total >= 0),
  customer_name TEXT,
  sale_date     TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_sales_date    ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product_id);
