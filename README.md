# YouTube Trend Tracer

Fetch trending YouTube videos (India), analyze engagement, and view results in a web UI.

## Setup

1. Install Python dependencies (from project root):

   ```bash
   pip install google-api-python-client pandas numpy matplotlib seaborn scikit-learn textblob wordcloud nltk flask flask-cors langdetect
   ```

2. (Optional) Generate trend data once:

   ```bash
   python main.py
   ```

   This fetches trending videos from **multiple regions** (India, US, UK, Canada, Australia, Germany, France, Japan, Brazil, South Korea), detects **language** from each title, and saves `youtube_api_cleaned_data.csv`. The frontend can also refresh data via the "Refresh trends" button. Install `langdetect` so the Language filter shows real options: `pip install langdetect`

## Run the app

1. Start the backend (serves API + frontend):

   ```bash
   cd backend
   python app.py
   ```

2. Open in browser: **http://localhost:5000**

- **API**: `GET /api/trends` — returns trends from CSV  
- **Refresh**: `POST /api/trends/refresh` — re-runs the pipeline and returns new data (can take ~30s)

## Deploy (Netlify or GitHub Pages)

The **frontend** can be deployed to **Netlify** or **GitHub Pages**; the **backend** (Flask API) must be deployed elsewhere (e.g. Render) because both only serve static files. See **[DEPLOY.md](DEPLOY.md)** for step-by-step instructions and how to set `API_URL` so the site talks to your API.

## Project layout

- `main.py` — Fetches from YouTube API, cleans data, trains a viral classifier, saves CSV
- `backend/app.py` — Flask API and static file server for the frontend
- `frontend/` — HTML, CSS, JS for the trend list and filters
- `netlify.toml` — Netlify build config (publish `frontend`, inject `API_URL`)
- `.github/workflows/deploy-pages.yml` — GitHub Actions workflow for GitHub Pages
- `DEPLOY.md` — Full deployment guide (Netlify, GitHub Pages, Render)
