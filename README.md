# Saitama Parks 2026 - Official Portal

Welcome to the Saitama Parks 2026 portal. This is a high-performance, accessible, and interactive web application designed to showcase the best parks in Saitama Prefecture.

## 🚀 Key Features

- **High Performance:** Optimized with deferred scripts, lazy-loaded images, and optimized asset delivery.
- **Hero Video:** The landing page features a majestic looping video of the Kita-Urawa Park musical fountain.
- **AI Travel Concierge:** Meet **Saitamania-kun**, our cold, robotic haniwa guide. He is strictly concise and Saitama-obsessed.
- **Interactive Maps:** Real-time facility search using OpenStreetMap and Overpass API.
- **Accessibility:** Natural-sounding TTS (Text-to-Speech) and unified Saicolor theme system.
- **MOMAS Integration:** Interactive museum experience for the Museum of Modern Art, Saitama.

## 📂 Project Structure

- `/index.html`: Main landing page with a hero video background.
- `/map.html`: Facility search map.
- `/saitama-mini-game.html`: Entry point for park games.
- `/destinations/kita-urawa-park.html`: The new featured destination (replaces Maruyama Park).
- `/js/ai-concierge.js`: Hardened persona logic for Saitamania-kun.

## 🤖 Saitamania-kun Persona

Saitamania-kun is a robotic guide with the following protocol:
1. **Conciseness:** Always responds in 3 lines or fewer.
2. **Cold Personality:** Uses robotic, formal Japanese (断定調). No emotions allowed.
3. **Saitama-Only:** Highly obsessed with Saitama. Non-Saitama queries may trigger system errors or cold dismissals.

## 🖼️ Required Asset List / 必要アセットリスト

To ensure the site renders correctly, please place the following files in their respective directories:
サイトを正しく表示するために、以下のファイルを指定のディレクトリに配置してください。

### Videos (`/videos/`)
| Filename | Description (JP) | Use Case |
| :--- | :--- | :--- |
| `kita_urawa_fountain.mp4` | 北浦和公園の音楽噴水のループ動画 | Home Page Hero Background |

### Images (`/images/`)
| Filename | Description (JP) | Use Case |
| :--- | :--- | :--- |
| `kita_urawa_park.jpg` | 北浦和公園のメイン写真 | Gallery, Destination page |
| `momas_ext.jpg` | 埼玉県立近代美術館(MOMAS)の外観 | Destination page |
| `omiya_park.jpg` | 大宮公園の写真 | Gallery, Destination page |
| `tokorozawa_park.jpg` | 所沢航空記念公園の写真 | Gallery, Destination page |
| `shinrin_park.jpg` | 国営武蔵丘陵森林公園の写真 | Gallery, Destination page |
| `akigase_park.jpg` | 秋ヶ瀬公園の写真 | Gallery, Destination page |
| `artwork_1.jpg` ~ `artwork_3.jpg` | 美術館の作品イメージ | MOMAS Ticket Animation |
| `densya.jpg` | 埼玉の電車の写真 | Access Modal |

### Audio (`/audio/`)
| Filename | Description (JP) | Use Case |
| :--- | :--- | :--- |
| `fountain_music.mp3` | 噴水ショーの音楽 | MOMAS Ticket Animation |

---
© 2026 Saitama Parks Promotion Association. All Rights Reserved.
