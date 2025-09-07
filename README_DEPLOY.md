# Deployment guide — klown-accessories-store

This guide covers deploying the full-stack app (Vite frontend + Express backend) as a single Node service. Two ready-to-use options are provided: Render and Fly.

Prerequisites
- GitHub repo connected to the host (Render/Fly).
- Docker (if building locally) or use the platform build.

Quick local test
1. Build frontend: `npm run build`
2. Start server: `npm start`
3. Visit `http://localhost:3001`

Render (recommended for simplicity)
1. Sign in to Render and create a new Web Service.
2. Connect to your GitHub repo and select the `main` branch.
3. Use the provided `render.yaml` or enter:
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm start`
4. Render will install dependencies, build the frontend, and run the server which serves the built `dist/` and your API.

Fly.io (recommended if you need volumes/persistent disk)
1. Install Fly CLI and log in: `curl -L https://fly.io/install.sh | sh` then `fly auth login`.
2. Create a volume to persist `src/data` (optional): `fly volumes create klown-data --region <your-region> --size 1`.
3. Deploy:
   - `fly deploy` (uses Dockerfile)
   - To mount volume, update `fly.toml` with a `mounts` section mapping the volume to `/app/src/data`.

Notes about persistence
- The server writes to `src/data/*.json`. On platforms without persistent disk (Render free plan ephemeral), those writes will be lost on redeploy or scale events. Use a persistent volume (Fly) or move storage to S3/Postgres for durable data.

Alternative: Separate frontend and backend
- Host the frontend on Vercel/Netlify (static), and host the backend on Render/Fly. Update API base URL in client config and enable CORS on backend.

Files added
- `Dockerfile` — multi-stage build to build frontend and run server
- `.dockerignore` — reduce image size
- `render.yaml` — Render deployment config
- `fly.toml` — Fly.io config (edit to add volume mounts if needed)
