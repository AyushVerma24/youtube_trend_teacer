# ==========================================
# YOUTUBE API BASED TREND ANALYSIS PROJECT
# ==========================================

import io
import sys
import time

# Fix Windows console encoding for Unicode (e.g. emoji in video titles)
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")  # non-interactive backend so script runs without blocking
import matplotlib.pyplot as plt
import seaborn as sns
from googleapiclient.discovery import build
from textblob import TextBlob
from wordcloud import WordCloud
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import nltk
import warnings

warnings.filterwarnings("ignore")
sns.set(style="whitegrid")
nltk.download('punkt')

# ------------------------------------------
# 1️⃣ CONNECT TO YOUTUBE API
# ------------------------------------------

API_KEY = "AIzaSyAGaZL79jnWPqo_TZAo9_T8sLSizqHh6mo"
youtube = build('youtube', 'v3', developerKey=API_KEY)

# ------------------------------------------
# 2️⃣ FETCH TRENDING VIDEOS
# ------------------------------------------

# Regions to fetch trending videos from (YouTube API regionCode)
TRENDING_REGIONS = ["IN", "US", "GB", "CA", "AU", "DE", "FR", "JP", "BR", "KR"]


def get_trending_videos(region="IN", max_results=50):
    request = youtube.videos().list(
        part="snippet,statistics",
        chart="mostPopular",
        regionCode=region,
        maxResults=min(max_results, 50),
    )
    response = request.execute()

    videos = []

    for item in response["items"]:
        video_data = {
            "video_id": item["id"],
            "title": item["snippet"]["title"],
            "category_id": item["snippet"]["categoryId"],
            "publish_time": item["snippet"]["publishedAt"],
            "views": int(item["statistics"].get("viewCount", 0)),
            "likes": int(item["statistics"].get("likeCount", 0)),
            "comment_count": int(item["statistics"].get("commentCount", 0)),
            "region": region,
        }
        videos.append(video_data)

    return pd.DataFrame(videos)


def detect_language(title):
    """Detect language of title; returns ISO 639-1 code or 'unknown'."""
    try:
        import langdetect
        return langdetect.detect(str(title)[:500]) or "unknown"
    except Exception:
        return "unknown"


# Fetch trending videos from multiple regions and combine
dfs = []
for region in TRENDING_REGIONS:
    try:
        region_df = get_trending_videos(region=region, max_results=50)
        if not region_df.empty:
            dfs.append(region_df)
            print(f"Fetched {len(region_df)} videos for region {region}")
        time.sleep(0.3)  # Avoid rate limits
    except Exception as e:
        print(f"Skipping region {region}: {e}")

df = pd.concat(dfs, ignore_index=True) if dfs else pd.DataFrame()
if df.empty:
    raise SystemExit("No data fetched from any region. Check API key and quota.")

df["language"] = df["title"].apply(detect_language)

print("Fetched Data:")
print(df.head())
print("Shape:", df.shape)

# ------------------------------------------
# 3️⃣ DATA CLEANING
# ------------------------------------------

df['publish_time'] = pd.to_datetime(df['publish_time'])
df['publish_hour'] = df['publish_time'].dt.hour

# ------------------------------------------
# 4️⃣ FEATURE ENGINEERING
# ------------------------------------------

df['like_ratio'] = df['likes'] / df['views']
df['comment_ratio'] = df['comment_count'] / df['views']
df['engagement_score'] = (df['likes'] + df['comment_count']) / df['views']

df.replace([np.inf, -np.inf], 0, inplace=True)
df.fillna(0, inplace=True)

# ------------------------------------------
# 5️⃣ SENTIMENT ANALYSIS
# ------------------------------------------

def get_sentiment(text):
    return TextBlob(str(text)).sentiment.polarity

df['title_sentiment'] = df['title'].apply(get_sentiment)

# ------------------------------------------
# 6️⃣ EDA VISUALIZATIONS
# ------------------------------------------

plt.figure(figsize=(8,5))
sns.histplot(df['views'], bins=20)
plt.title("Views Distribution")
plt.show()

plt.figure(figsize=(8,5))
sns.lineplot(x='publish_hour', y='views', data=df)
plt.title("Publish Hour vs Views")
plt.show()

# ------------------------------------------
# 7️⃣ WORD CLOUD
# ------------------------------------------

text = " ".join(df['title'])
wordcloud = WordCloud(width=800, height=400, background_color='white').generate(text)

plt.figure(figsize=(12,5))
plt.imshow(wordcloud, interpolation='bilinear')
plt.axis("off")
plt.title("Trending Keywords")
plt.show()

# ------------------------------------------
# 8️⃣ CREATE VIRAL LABEL
# ------------------------------------------

threshold = df['views'].quantile(0.75)
df['viral'] = np.where(df['views'] > threshold, 1, 0)

print("Viral Distribution:")
print(df['viral'].value_counts())

# ------------------------------------------
# 9️⃣ MACHINE LEARNING MODEL
# ------------------------------------------

features = [
    'likes',
    'comment_count',
    'like_ratio',
    'comment_ratio',
    'engagement_score',
    'publish_hour',
    'title_sentiment'
]

X = df[features]
y = df['viral']

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)

model = RandomForestClassifier(random_state=42)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)

print("\nAccuracy:", accuracy_score(y_test, y_pred))
print("\nConfusion Matrix:\n", confusion_matrix(y_test, y_pred))
print("\nClassification Report:\n", classification_report(y_test, y_pred))

# ------------------------------------------
# 🔟 FEATURE IMPORTANCE
# ------------------------------------------

importance_df = pd.DataFrame({
    "Feature": features,
    "Importance": model.feature_importances_
}).sort_values(by="Importance", ascending=False)

print("\nFeature Importance:")
print(importance_df)

plt.figure(figsize=(8,5))
sns.barplot(x="Importance", y="Feature", data=importance_df)
plt.title("Feature Importance")
plt.show()

# ------------------------------------------
# 1️⃣1️⃣ SAVE DATA FOR DASHBOARD
# ------------------------------------------

df.to_csv("youtube_api_cleaned_data.csv", index=False)

print("\nProject Completed Successfully 🚀")