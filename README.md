# Saitama Parks 2026 - Official Portal

Welcome to the Saitama Parks 2026 portal. This is a high-performance, accessible, and interactive web application designed to showcase the best parks in Saitama Prefecture.

## 🚀 Key Features

- **High Performance:** Optimized with deferred scripts, lazy-loaded images, and zero-CLS (Cumulative Layout Shift) design.
- **AI Travel Concierge:** Meet **Saitamania-kun**, our cold but passionate robot guide. He provides brief, Saitama-centric advice.
- **Interactive Maps:** Real-time facility search using OpenStreetMap and Overpass API.
- **Accessibility First:** Integrated Text-to-Speech (TTS) with natural-sounding voices and global display settings (Saicolor themes & Dark Mode).
- **Play Hub:** Interactive 3D park exploration, fishing games, and quizzes.

## 📂 Project Structure

- `/index.html`: Main landing page with weather and featured parks.
- `/map.html`: Interactive map for finding facilities.
- `/saitama-mini-game.html`: Entry point for all park-related games.
- `/destinations/`: Detailed information for major parks (Omiya, Shinrin, etc.).
- `/js/`:
    - `common.js`: Global logic, TTS, and theme management.
    - `ai-concierge.js`: AI logic and Saitamania-kun persona settings.
    - `map.js`: Leaflet-based map functionality.
- `/css/`:
    - `common.css`: Shared design system and variables.

## 🤖 Saitamania-kun Persona

Saitamania-kun is a robot with a specific personality:
- **Concise:** All responses are strictly limited to under 100 characters or 3 lines.
- **Cold but Passionate:** He behaves like a machine but has an irrational obsession with Saitama parks.
- **Buggy:** Occasionally outputs Saitama slogans in a glitchy manner.

## 🖼️ Required Image Assets / 必要アセットリスト

To ensure the site renders correctly, the following local images must be placed in the `images/` directory:
サイトを正しく表示するために、以下の画像を `images/` ディレクトリに配置する必要があります。

| Filename | Description (JP) | Use Case |
| :--- | :--- | :--- |
| `maruyama_park.jpg` | 上尾丸山公園の写真 | Hero slider, Gallery, Destination page |
| `omiya_park.jpg` | 大宮公園の写真 | Hero slider, Gallery, Destination page |
| `tokorozawa_park.jpg` | 所沢航空記念公園の写真 | Hero slider, Gallery, Destination page |
| `shinrin_park.jpg` | 国営武蔵丘陵森林公園の写真 | Hero slider, Gallery, Destination page |
| `akigase_park.jpg` | 秋ヶ瀬公園の写真 | Gallery, Destination page |
| `densya.jpg` | 埼玉の電車の写真 | Transit visualization (Access Modal) |

*Note: If local files are missing, the site may fall back to placeholder colors or external Unsplash URLs in some sections.*

## 🛠 Tech Stack

- **Frontend:** Tailwind CSS, Three.js, Leaflet.js
- **AI:** WebLLM (running `gemma-2-2b-it-q4f16_1-MLC`)
- **API:** Overpass API (Map), WeatherAPI (via CORS proxy)

---
© 2026 Saitama Parks Promotion Association. All Rights Reserved.
