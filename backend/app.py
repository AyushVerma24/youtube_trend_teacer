"""
Flask API for YouTube Trend Tracer.
Serves trend data from CSV; optional refresh runs the pipeline and reloads.
"""
import os
import subprocess
import sys

import pandas as pd
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder="../frontend", static_url_path="")

# Allow frontend (Netlify + local) to call the API
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    allow_headers=["Content-Type"],
    methods=["GET", "POST", "OPTIONS"],
)

@app.after_request
def add_cors_headers(response):
    """Ensure CORS headers are on every response (including errors)."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

# Path to project root and CSV
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(PROJECT_ROOT, "youtube_api_cleaned_data.csv")
MAIN_SCRIPT = os.path.join(PROJECT_ROOT, "main.py")


def _detect_language(title):
    """Detect language from title; returns ISO 639-1 code or 'unknown'."""
    try:
        import langdetect
        return langdetect.detect(str(title)[:500]) or "unknown"
    except Exception:
        return "unknown"


def load_trends():
    """Load trends from CSV and return list of dicts (JSON-serializable)."""
    if not os.path.isfile(CSV_PATH):
        return []
    df = pd.read_csv(CSV_PATH)
    # Backfill region/language for CSVs created before these columns existed
    if "region" not in df.columns:
        df["region"] = "IN"
    if "language" not in df.columns:
        df["language"] = df["title"].apply(_detect_language)
    # Convert publish_time to string for JSON
    if "publish_time" in df.columns:
        df["publish_time"] = df["publish_time"].astype(str)
    # Round floats for cleaner JSON
    for col in df.select_dtypes(include=["float64"]).columns:
        df[col] = df[col].round(6)
    return df.to_dict(orient="records")


@app.route("/api/trends")
def get_trends():
    """Return current trends from CSV."""
    data = load_trends()
    return jsonify({"trends": data, "count": len(data)})


@app.route("/api/trends/refresh", methods=["POST"])
def refresh_trends():
    """Re-run the pipeline (main.py) and return updated trends."""
    try:
        subprocess.run(
            [sys.executable, MAIN_SCRIPT],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=120,
        )
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Refresh timed out"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    data = load_trends()
    return jsonify({"trends": data, "count": len(data)})


@app.route("/")
def index():
    """Serve the frontend."""
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def static_files(path):
    """Serve other frontend assets."""
    return send_from_directory(app.static_folder, path)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
