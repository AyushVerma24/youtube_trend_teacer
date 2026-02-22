# Deploying YouTube Trend Tracer

The app has two parts:

1. **Frontend** (HTML/CSS/JS) → deploy to **Netlify** or **GitHub Pages**
2. **Backend** (Flask API + CSV data) → deploy to **Render** (or another Python host)

Netlify and GitHub Pages only serve static files; they cannot run your Flask server. So you deploy the frontend on one of them and the API on Render, then connect them with the API URL.

---

## Step 1: Deploy the backend (Render)

1. Go to [render.com](https://render.com) and sign in (e.g. with GitHub).

2. **New → Web Service**.

3. Connect the same GitHub repo (`youtube-trend-tracer`). Select the repo and branch (e.g. `main`).

4. **Settings:**
   - **Name:** `youtube-trend-tracer-api` (or any name).
   - **Region:** Choose one.
   - **Runtime:** Python 3.
   - **Build command:**
   ```bash
   pip install -r backend/requirements.txt
   ```
   - **Start command:** (Render runs from repo root)
   ```bash
   gunicorn backend.app:app
   ```
   If that fails, try:
   ```bash
   cd backend && gunicorn app:app
   ```

   - **Instance type:** Free (or paid if you prefer).

5. **Environment (optional but recommended):**
   - Add `PYTHON_VERSION` = `3.11` (or your preferred 3.x).

6. **Advanced:** Add a **Release Command** to create the CSV on first deploy (optional):
   ```bash
   python main.py
   ```
   This needs a YouTube API key; see “API key” below.

7. Click **Create Web Service**. Wait for the first deploy. Note the URL, e.g. `https://youtube-trend-tracer-api.onrender.com`.

8. **Important:** On the free tier, the app sleeps after inactivity. The first request after sleep can take 30–60 seconds. That’s normal.

**API key (for Refresh trends):**  
Right now the YouTube API key is in `main.py`. For production, add it as an env var on Render (e.g. `YOUTUBE_API_KEY`) and change `main.py` to read `os.environ.get("YOUTUBE_API_KEY")` so the release command and “Refresh trends” work. If you skip this, Refresh may fail until you move the key to env.

**CSV on Render:**  
The backend reads `youtube_api_cleaned_data.csv` from the repo root. Either:

- Commit `youtube_api_cleaned_data.csv` to the repo (so Render has it), or  
- Run `python main.py` once (e.g. via the release command above) so the CSV is generated on the server. If you use the release command, set the YouTube API key in Render’s env.

---

## Step 2: Deploy the frontend (Netlify)

1. Go to [netlify.com](https://www.netlify.com) and sign in (e.g. with GitHub).

2. **Add new site → Import an existing project**. Choose **GitHub** and authorize Netlify.

3. Pick the repo `youtube-trend-tracer` and the branch you use (e.g. `main`).

4. Netlify will read `netlify.toml` from the repo. It should show:
   - **Build command:** `node scripts/inject-env.js`
   - **Publish directory:** `frontend`

5. **Environment variables (required):**  
   In **Site settings → Environment variables → Add variable** (or during import):
   - **Key:** `API_URL`  
   - **Value:** your Render backend URL **with no trailing slash**, e.g.  
     `https://youtube-trend-tracer-api.onrender.com`

   This is injected at build time so the frontend knows where to call the API.

6. **Deploy site.** Netlify will run the build (which writes `frontend/config.js` with `API_URL`) and publish the `frontend` folder.

7. After deploy, open your Netlify URL (e.g. `https://your-site-name.netlify.app`). The app will load trends from the Render API. If the backend is sleeping, wait 30–60 seconds and try again.

---

## Deploy frontend to GitHub Pages

1. **Deploy the backend** on Render first (see Step 1 above) and note the API URL (e.g. `https://youtube-trend-tracer-api.onrender.com`).

2. **Add the API URL as a secret** in your GitHub repo:
   - Repo → **Settings** → **Secrets and variables** → **Actions**
   - **New repository secret**
   - Name: `API_URL`
   - Value: your Render backend URL (no trailing slash)

3. **Enable GitHub Pages to use Actions:**
   - Repo → **Settings** → **Pages**
   - Under **Build and deployment**, set **Source** to **GitHub Actions**.

4. **Deploy:** Push to the `main` branch (or run the workflow manually: **Actions** → **Deploy to GitHub Pages** → **Run workflow**). The workflow will:
   - Run `node scripts/inject-env.js` with `API_URL` from secrets
   - Deploy the `frontend` folder to GitHub Pages

5. Your site will be at `https://<username>.github.io/<repo-name>/` (e.g. `https://myuser.github.io/youtube-trend-tracer/`).

**Note:** If your default branch is not `main`, edit `.github/workflows/deploy-pages.yml` and change `branches: [main]` to your branch (e.g. `master`).

---

## Summary

| Part      | Where        | URL you get |
|----------|---------------|-------------|
| Frontend | Netlify       | `https://your-site.netlify.app` |
| Frontend | GitHub Pages  | `https://<username>.github.io/<repo-name>/` |
| Backend  | Render        | `https://your-api.onrender.com` |

- Set **Render** URL as **`API_URL`** in Netlify.
- Commit and push changes; Netlify and Render will redeploy from your GitHub repo.

---

## Optional: Run backend locally and point Netlify dev to it

For local dev with the same Netlify frontend:

- Run the Flask backend locally (e.g. `cd backend && python app.py`).
- Use Netlify Dev: `netlify dev` — it can use env vars and proxy API requests to your local backend if you configure it.

For production, you only need the steps above (Render + Netlify).
