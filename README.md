# 彩の国ポータル 2026 リニューアルプロジェクト

埼玉県を遊び尽くすための次世代ポータルサイト。
「読み物（NEWS）」×「実用ツール（MAP）」×「エンタメ（GAME）」を融合し、埼玉の自然と文化をシームレスに体験できます。

## 🌟 主要機能
- **AI旅先コンシェルジュ**: WebLLMを使用したオンデバイスAIが、気分に合わせた公園を提案。
- **Park Color（パークカラー）モード**: 埼玉の自然（青・緑・赤）をイメージしたテーマカラー切り替え機能。
- **SAITAMA GO**: 3Dで埼玉の公園を探索し、隠されたアイテムを見つけるオープンワールド体験。
- **多機能マップ**: Overpass APIを利用し、現在地周辺の公園・駅・トイレをリアルタイム検索。
- **PLAY-HUB**: 埼玉をテーマにしたミニゲーム（釣り・クイズ）を楽しめるエンタメ拠点。

## 📂 ページ構成
1. `index.html`: ホームページ（スライダー、AI、ダイジェスト）
2. `news.html`: ニュースアーカイブ
3. `map.html`: 施設検索マップ（5大公園ピン表示対応）
4. `saitama-mini-game.html`: ゲームハブ
5. `gallery.html`: フォトギャラリー
6. `destinations/`: 各公園の詳細ページ

## 🖼️ 必要な画像アセット
本プロジェクトでは外部サーバーの負荷軽減とプライバシー保護のため、すべての公園画像をローカルアセットとして管理しています。
以下の画像を `images/` ディレクトリに配置してください。

| ファイル名 | 用途 |
| :--- | :--- |
| `images/omiya_park.jpg` | 大宮公園のメインビジュアル・ギャラリー |
| `images/shinrin_park.jpg` | 森林公園のメインビジュアル・ギャラリー |
| `images/tokorozawa_park.jpg` | 所沢航空記念公園のメインビジュアル・ギャラリー |
| `images/akigase_park.jpg` | 秋ヶ瀬公園のメインビジュアル・ギャラリー |
| `images/maruyama_park.jpg` | 丸山公園のメインビジュアル・ギャラリー |

## 🛠️ 技術スタック
- **Frontend**: HTML5, CSS3 (Tailwind CSS), JavaScript (ES6+)
- **Map**: Leaflet.js + OpenStreetMap + Overpass API
- **AI**: WebLLM (MLC-LLM)
- **Icons**: Lucide Icons (SVG)
- **Fonts**: Noto Sans JP, Mochiy Pop One, DotGothic16
