# Server API Endpoints (what the backend exposes)

Purpose
- Describe the HTTP API routes provided by `server.js` and how they are used by the frontend.

Where to look
- All endpoints are defined in `server.js`. Key endpoints and approximate line numbers:
  - `POST /api/products/save` — save full product list (starts near line 199)
  - `GET /api/products` — read products (around line 260)
  - `GET /api/coupons` — read coupons (around line 294)
  - `GET /api/readfile` — read arbitrary JSON under `src/data/` (starts around line 300)
  - `DELETE /api/products/:id` — delete a specific product (starts around line 340)
  - `PATCH /api/products/stock` — update product stock (starts around line 400)
  - `POST /api/savefile` — generic save for any file under `src/data/` (starts around line 520)

What each endpoint does (student-friendly)
- `POST /api/products/save`
  - Input: { products: [...] }
  - Validates the array and writes it to `src/data/products.json` using the safe save helper.
  - Returns added and deleted IDs to help the frontend update UI.

- `GET /api/products`
  - Returns the contents of `src/data/products.json`.

- `GET /api/coupons`
  - Returns `src/data/coupons.json`. The handler logs steps and checks the file exists first.

- `GET /api/readfile?filePath=src/data/somefile.json`
  - Allows the frontend to read other JSON files under `src/data/` (used by admin components to load `banner.json`, `banner-admin.json`, etc.)
  - Security: rejects paths that don't start with `src/data/` or that contain `..` (prevents reading system files).

- `DELETE /api/products/:id`
  - Removes a product by ID from the array and saves the updated file. If saving fails after retries, the product is restored in memory and the response indicates failure.

- `PATCH /api/products/stock`
  - Updates stock counts for a specific product and size.

- `POST /api/savefile`
  - Generic endpoint to save any JSON under `src/data/` (used by admin panels to save `coupons.json`, `banner.json`, `hero-images.json`, `banner-admin.json`, etc.).
  - Performs security checks and data validation before saving.

Security and robustness notes
- Path checks: The server rejects file read/write requests that try to access outside `src/data/` or use path traversal (`..`). This is a crucial security measure (implemented in `GET /api/readfile` and `POST /api/savefile`).
- Retries: Saving logic includes retry loops to handle transient file system errors.
- Backups: `saveJsonToFile` attempts to create a `.backup` copy before writing.

How the frontend uses these endpoints
- Admin pages call `/api/readfile` to load banner and hero content JSON.
- Admin save actions call `/api/savefile` to persist banners, coupons, and hero images.
- Product manager uses `POST /api/products/save` and `DELETE /api/products/:id` to manage products.
