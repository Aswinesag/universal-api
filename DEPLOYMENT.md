# Free Deployment Guide: Universal AI API Connector & Hub

This guide covers the best **100% free hosting options** to deploy your Universal AI API Hub online so you can access your endpoints from anywhere.

---

## The SQLite Consideration (Persistent vs. Ephemeral Storage)

Because this application uses SQLite (`file:./dev.db`), deployment platforms handle file storage in one of two ways:

1. **Persistent Container Hosting (Recommended for SQLite)**:
   - Your application runs as a continuous Node service.
   - **Best Free Platforms**: **Render.com**, **Fly.io**, **Railway**, or **Oracle Cloud Free Tier VPS**.
   - **Zero code changes needed**: SQLite files remain on the local disk.

2. **Serverless Hosting (Vercel / Netlify)**:
   - Serverless functions have read-only or ephemeral filesystems (files written to disk reset between requests).
   - If deploying to Vercel, you can either:
     - Pair with **Turso** (free hosted SQLite over HTTP with 9GB storage & 500 databases).
     - Or pair with **Neon / Prisma Postgres / Supabase** (free PostgreSQL database).

---

## Option 1: Render.com (Recommended - Easiest & 100% Free)

Render provides a **Free Web Service** tier that runs your Next.js application with zero configuration changes.

### Step 1: Push Your Code to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Universal AI API Hub"
git branch -M main
git remote add origin https://github.com/<your-username>/universal-api.git
git push -u origin main
```

### Step 2: Create a Web Service on Render

1. Log in to [Render.com](https://render.com) (sign up with GitHub).
2. Click **"New +"** in the top right and select **"Web Service"**.
3. Connect your GitHub repository `universal-api`.
4. Configure the service settings:
   - **Name**: `universal-ai-hub` (or your choice)
   - **Region**: Choose closest to you (e.g. Frankfurt, Oregon, Singapore)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (root)
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install --include=dev && npx prisma generate && npm run build
     ```
   - **Start Command**:
     ```bash
     npx prisma db push && npm run db:seed && npm run start
     ```
   - **Instance Type**: Select **"Free"** ($0/month)

### Step 3: Add Environment Variables

In the **Environment Variables** section on Render, add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production mode |
| `DATABASE_URL` | `file:./dev.db` | Local SQLite path |
| `GROQ_API_KEY` | `gsk_...` | Your Groq API key |
| `GEMINI_API_KEY` | `AQ....` | Your Google Gemini API key |
| `OPENAI_API_KEY` | `sk-...` | (Optional) Your OpenAI key |

### Step 4: Deploy

1. Click **"Create Web Service"**.
2. Render will automatically build the Next.js app, initialize `dev.db`, seed the demonstration connectors, and start the server.
3. You will receive a live public HTTPS URL: `https://universal-ai-hub.onrender.com`.

---

## Option 2: Fly.io (Docker-Based Free / Low-Tier)

Fly.io runs Docker containers close to users with native volume mounts for persistent SQLite.

### Step 1: Install Fly CLI

```powershell
# Windows PowerShell:
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### Step 2: Initialize & Launch

In your project directory:

```bash
fly launch --no-deploy
```

- When prompted for an app name, choose one (e.g., `my-universal-api-hub`).
- Select your preferred region.
- Do not add a PostgreSQL or Redis database (we use SQLite).

### Step 3: Set Secret Keys

```bash
fly secrets set GROQ_API_KEY="gsk_..." GEMINI_API_KEY="AQ...." DATABASE_URL="file:./dev.db"
```

### Step 4: Deploy

```bash
fly deploy
```

Fly.io will build the included [`Dockerfile`](Dockerfile) and publish your live app at `https://my-universal-api-hub.fly.dev`.

---

## Option 3: Vercel (Free Serverless)

If you prefer deploying on **Vercel** (the creators of Next.js):

### Step 1: Deploy to Vercel

1. Push your repository to GitHub.
2. Go to [Vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Add your environment variables:
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY`
   - `OPENAI_API_KEY`

### Step 2: Connecting a Free Remote Database

Because Vercel serverless functions have ephemeral file storage, pair Vercel with one of these **100% free cloud databases**:

#### Choice A: Turso (Free SQLite over HTTP)
- [Turso.tech](https://turso.tech) provides free distributed SQLite.
- Run `turso db create universal-db` and set `DATABASE_URL` in Vercel to `libsql://your-db.turso.io?authToken=...`.

#### Choice B: Neon / Supabase / Prisma Postgres (Free PostgreSQL)
- Create a free database on [Neon.tech](https://neon.tech) or [Prisma Postgres](https://console.prisma.io).
- Change `provider = "postgresql"` in `prisma/schema.prisma`.
- Set `DATABASE_URL="postgres://..."` in Vercel project settings.
- Run `npx prisma db push` and `npm run db:seed`.

---

## Option 4: Free Lifetime VPS (Oracle Cloud Free Tier)

Oracle Cloud provides an **"Always Free"** tier featuring:
- 4 ARM Ampere OCPUs + 24 GB RAM.
- 200 GB persistent SSD storage.
- 100% free forever without trial expiration.

### Deployment on Ubuntu/Debian Free VPS:

```bash
# 1. Install Docker & Git
sudo apt update && sudo apt install -y git docker.io docker-compose
sudo systemctl enable --now docker

# 2. Clone repository
git clone https://github.com/<your-username>/universal-api.git
cd universal-api

# 3. Configure environment variables
cat << 'EOF' > .env
DATABASE_URL="file:./dev.db"
GROQ_API_KEY="gsk_..."
GEMINI_API_KEY="AQ...."
EOF

# 4. Build and run via Docker
docker build -t universal-api .
docker run -d \
  --name api-hub \
  -p 80:3000 \
  --restart always \
  -v $(pwd)/prisma:/app/prisma \
  universal-api
```

Your API Hub is now live on your server's public IP address or custom domain with persistent SQLite storage!

---

## Post-Deployment Verification Checklist

Once your deployment is live:

1. **Visit Dashboard**: Open `https://<your-app-url>/dashboard` and confirm the table loads the seeded connectors.
2. **Test an Endpoint via cURL**:
   ```bash
   curl -X POST "https://<your-app-url>/api/v1/run/lead-extractor" \
     -H "Authorization: Bearer uapi_lead_extractor_demo_key" \
     -H "Content-Type: application/json" \
     -d '{"inquiry": "Hi, this is Alice from Vertex AI. We need 20 seats urgently. Contact me at alice@vertex.ai"}'
   ```
3. **Verify Interactive Playground**: Open `https://<your-app-url>/connectors/<connector-id>/test` and run a live request in the browser.
4. **Check SQLite Telemetry**: Confirm the execution latency and tokens are recorded in the logs table.
