const API_BASE = "";

const $ = (id) => document.getElementById(id);
const loadingEl = $("loading");
const errorEl = $("error");
const errorMessage = $("error-message");
const trendList = $("trend-list");
const statsEl = $("stats");
const btnRefresh = $("btn-refresh");
const btnRetry = $("btn-retry");
const filterViral = $("filter-viral");
const filterCountry = $("filter-country");
const filterLanguage = $("filter-language");
const filterCategory = $("filter-category");
const filterEngagement = $("filter-engagement");
const filterTimeFrom = $("filter-time-from");
const filterTimeTo = $("filter-time-to");
const sortBy = $("sort-by");

// YouTube category ID → display name
const CATEGORY_NAMES = {
  1: "Film & Animation",
  2: "Autos & Vehicles",
  10: "Music",
  15: "Pets & Animals",
  17: "Sports",
  19: "Travel & Events",
  20: "Gaming",
  22: "People & Blogs",
  23: "Comedy",
  24: "Entertainment",
  25: "News & Politics",
  26: "Howto & Style",
  27: "Education",
  28: "Science & Technology",
};

// ISO 3166-1 alpha-2 region → display name
const COUNTRY_NAMES = {
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  JP: "Japan",
  BR: "Brazil",
  KR: "South Korea",
  MX: "Mexico",
  ES: "Spain",
  IT: "Italy",
  RU: "Russia",
};

// ISO 639-1 language → display name (used for filter dropdown and display)
const LANGUAGE_NAMES = {
  en: "English",
  hi: "Hindi",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  mr: "Marathi",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  pa: "Punjabi",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  "zh-cn": "Chinese (Simplified)",
  "zh-tw": "Chinese (Traditional)",
  ar: "Arabic",
  ru: "Russian",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
  tr: "Turkish",
  vi: "Vietnamese",
  th: "Thai",
  id: "Indonesian",
  unknown: "Unknown",
};

let allTrends = [];

function setLoading(show) {
  loadingEl.classList.toggle("hidden", !show);
  if (show) {
    errorEl.hidden = true;
    trendList.innerHTML = "";
  }
}

function setError(message) {
  errorEl.hidden = false;
  errorMessage.textContent = message || "Failed to load trends.";
  loadingEl.classList.add("hidden");
  trendList.innerHTML = "";
}

function hideError() {
  errorEl.hidden = true;
}

function formatNumber(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

function formatDate(s) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return isNaN(d) ? s : d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return s;
  }
}

function renderStats(trends) {
  const totalViews = trends.reduce((s, t) => s + (Number(t.views) || 0), 0);
  const viralCount = trends.filter((t) => Number(t.viral) === 1).length;
  statsEl.innerHTML = `
    <div class="stat">
      <div class="stat-value">${formatNumber(totalViews)}</div>
      <div class="stat-label">Total views</div>
    </div>
    <div class="stat">
      <div class="stat-value">${trends.length}</div>
      <div class="stat-label">Videos</div>
    </div>
    <div class="stat">
      <div class="stat-value">${viralCount}</div>
      <div class="stat-label">Viral (top 25%)</div>
    </div>
  `;
}

function renderTrendCard(t) {
  const viral = Number(t.viral) === 1;
  const engagement = t.engagement_score != null ? (Number(t.engagement_score) * 100).toFixed(2) + "%" : "—";
  const li = document.createElement("li");
  li.className = "trend-card" + (viral ? " viral" : "");
  li.innerHTML = `
    <h2 class="trend-title">${escapeHtml(t.title || "Untitled")}</h2>
    <div class="trend-meta">
      <span>👁 ${formatNumber(t.views)} views</span>
      <span>👍 ${formatNumber(t.likes)}</span>
      <span>💬 ${formatNumber(t.comment_count)}</span>
      <span>📅 ${formatDate(t.publish_time)}</span>
    </div>
    <div class="trend-badges">
      ${viral ? '<span class="badge badge-viral">Viral</span>' : ""}
      <span class="badge badge-engagement">Engagement ${engagement}</span>
    </div>
  `;
  return li;
}

function escapeHtml(s) {
  if (s == null) return "";
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function getCategoryName(id) {
  const n = id != null ? String(id).trim() : "";
  return CATEGORY_NAMES[n] || (n ? `Category ${n}` : "Unknown");
}

function getCountryName(code) {
  const c = code != null ? String(code).toUpperCase().trim() : "";
  return COUNTRY_NAMES[c] || (c || "Unknown");
}

function getLanguageName(code) {
  const l = code != null ? String(code).toLowerCase().trim() : "";
  return LANGUAGE_NAMES[l] || (l ? l.toUpperCase() : "Unknown");
}

function populateFilterOptions(trends) {
  let regions = [...new Set(trends.map((t) => t.region).filter((v) => v != null && String(v).trim() !== ""))].sort();
  let languages = [...new Set(trends.map((t) => t.language || "unknown").filter((v) => v != null && String(v).trim() !== ""))].sort();
  // Fallbacks when CSV has no region/language columns (old data or backend not updated)
  if (regions.length === 0) regions = ["IN"];
  if (languages.length === 0) languages = ["unknown"];
  const categoryIds = [...new Set(trends.map((t) => t.category_id).filter((v) => v != null && v !== ""))].sort(
    (a, b) => Number(a) - Number(b)
  );

  function setOptions(select, options, allLabel = "All") {
    const current = select.value;
    select.innerHTML = `<option value="all">${allLabel}</option>`;
    options.forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = select.id === "filter-country" ? getCountryName(opt) : select.id === "filter-language" ? getLanguageName(opt) : getCategoryName(opt);
      select.appendChild(o);
    });
    if (options.includes(current)) select.value = current;
  }

  setOptions(filterCountry, regions);
  setOptions(filterLanguage, languages);
  setOptions(filterCategory, categoryIds);
}

function filterAndSort(trends) {
  let list = trends;

  const country = filterCountry.value;
  if (country !== "all") {
    list = list.filter((t) => String(t.region || "").toUpperCase() === country.toUpperCase());
  }

  const language = filterLanguage.value;
  if (language !== "all") {
    list = list.filter((t) => String(t.language || "unknown").toLowerCase() === language.toLowerCase());
  }

  const category = filterCategory.value;
  if (category !== "all") {
    list = list.filter((t) => String(t.category_id) === String(category));
  }

  const viralFilter = filterViral.value;
  if (viralFilter !== "all") {
    list = list.filter((t) => String(t.viral) === viralFilter);
  }

  const engagementFilter = filterEngagement.value;
  if (engagementFilter !== "all") {
    const scores = list.map((t) => Number(t.engagement_score) || 0).filter((n) => !Number.isNaN(n));
    scores.sort((a, b) => a - b);
    const p33 = scores[Math.floor(scores.length / 3)] ?? 0;
    const p66 = scores[Math.floor((2 * scores.length) / 3)] ?? 1;
    list = list.filter((t) => {
      const s = Number(t.engagement_score) || 0;
      if (engagementFilter === "high") return s >= p66;
      if (engagementFilter === "low") return s <= p33;
      return s > p33 && s < p66;
    });
  }

  const timeFrom = filterTimeFrom.value;
  if (timeFrom) {
    const fromMs = new Date(timeFrom).getTime();
    list = list.filter((t) => {
      try {
        return new Date(t.publish_time).getTime() >= fromMs;
      } catch {
        return true;
      }
    });
  }

  const timeTo = filterTimeTo.value;
  if (timeTo) {
    const toMs = new Date(timeTo).getTime();
    list = list.filter((t) => {
      try {
        return new Date(t.publish_time).getTime() <= toMs;
      } catch {
        return true;
      }
    });
  }

  const key = sortBy.value;
  list = [...list].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (key === "title") {
      return (va || "").localeCompare(vb || "");
    }
    const na = Number(va);
    const nb = Number(vb);
    if (Number.isNaN(na) || Number.isNaN(nb)) return 0;
    return nb - na;
  });
  return list;
}

function renderTrends(trends) {
  const list = filterAndSort(trends);
  renderStats(list);
  trendList.innerHTML = "";
  list.forEach((t) => trendList.appendChild(renderTrendCard(t)));
}

async function fetchTrends() {
  const res = await fetch(`${API_BASE}/api/trends`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();
  return data.trends || [];
}

async function loadTrends() {
  setLoading(true);
  hideError();
  try {
    allTrends = await fetchTrends();
    setLoading(false);
    if (allTrends.length === 0) {
      setError("No trends data. Run the pipeline (main.py) or use Refresh trends.");
      return;
    }
    populateFilterOptions(allTrends);
    renderStats(allTrends);
    renderTrends(allTrends);
    btnRefresh.disabled = false;
  } catch (e) {
    setError(e.message || "Failed to load trends.");
    setLoading(false);
  }
}

async function refreshTrends() {
  btnRefresh.classList.add("loading");
  btnRefresh.disabled = true;
  hideError();
  try {
    const res = await fetch(`${API_BASE}/api/trends/refresh`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    allTrends = data.trends || [];
    populateFilterOptions(allTrends);
    renderStats(allTrends);
    renderTrends(allTrends);
  } catch (e) {
    setError(e.message || "Refresh failed.");
  } finally {
    btnRefresh.classList.remove("loading");
    btnRefresh.disabled = false;
  }
}

filterViral.addEventListener("change", () => renderTrends(allTrends));
filterCountry.addEventListener("change", () => renderTrends(allTrends));
filterLanguage.addEventListener("change", () => renderTrends(allTrends));
filterCategory.addEventListener("change", () => renderTrends(allTrends));
filterEngagement.addEventListener("change", () => renderTrends(allTrends));
filterTimeFrom.addEventListener("change", () => renderTrends(allTrends));
filterTimeTo.addEventListener("change", () => renderTrends(allTrends));
sortBy.addEventListener("change", () => renderTrends(allTrends));
btnRefresh.addEventListener("click", refreshTrends);
btnRetry.addEventListener("click", loadTrends);

loadTrends();
