/**
 * Injects API_URL into frontend/config.js at build time (e.g. Netlify).
 * Usage: API_URL=https://your-api.onrender.com node scripts/inject-env.js
 */
const fs = require("fs");
const path = require("path");

const apiUrl = process.env.API_URL || "";
const configPath = path.join(__dirname, "..", "frontend", "config.js");
const content = `// Injected at build time from API_URL env (do not edit)\nwindow.__API_BASE__ = ${JSON.stringify(apiUrl)};\n`;

fs.writeFileSync(configPath, content, "utf8");
console.log("Wrote frontend/config.js with API_BASE =", apiUrl || "(same origin)");
