# 彩の国ポータル 2026 リニューアルプロジェクト

埼玉県を遊び尽くすための次世代ポータルサイト。
「読み物（NEWS）」×「実用ツール（MAP）」×「エンタメ（GAME）」を融合し、埼玉の自然と文化をシームレスに体験できます。

## 🌟 主要機能
- **AI旅先コンシェルジュ**: WebLLMを使用したオンデバイスAIが、気分に合わせた公園を提案。
- **Saicolor（サイカラー）モード**: 埼玉の自然（青・緑・赤）をイメージしたテーマカラー切り替え機能。
- **デジタル・スタンプラリー**: 5大公園を巡ってスタンプを集め、秘密のクーポンをゲット。
- **多機能マップ**: Overpass APIを利用し、現在地周辺の公園・駅・トイレをリアルタイム検索。
- **PLAY-HUB**: 埼玉をテーマにしたミニゲーム（釣り・クイズ）を楽しめるエンタメ拠点。

## 📂 ページ構成
1. `index.html`: ホームページ（スライダー、AI、ダイジェスト）
2. `news.html`: ニュースアーカイブ（農業・カフェ・聖地巡礼）
3. `map.html`: 施設検索マップ（5大公園ピン表示対応）
4. `saitama-mini-game.html`: ゲームハブ
5. `gallery.html`: フォトギャラリー

## 🖼️ 必要な画像アセット
本プロジェクトの完全な表示には、以下のローカル画像ファイルが必要です。
（※一部は外部URLを参照していますが、以下のファイルは`images/`ディレクトリに配置してください）

| ファイル名 | 用途 |
| :--- | :--- |
| `images/maruyama.jpeg` | 丸山公園のメインビジュアル |
| `images/densya.jpg` | 鉄道博物館・スライダー用 |
| `newskiji/kijiimg/aiyasai.jpg` | ニュース記事用（農業） |
| `newskiji/kijiimg/ainegi.jpg` | ニュース記事用（農業） |
| `newskiji/kijiimg/aitunagarisns.jpg` | ニュース記事用（農業） |
| `newskiji/tyosyaimg/cafetyosya.jpg` | 著者アイコン |

## 🛠️ 技術スタック
- **Frontend**: HTML5, CSS3 (Tailwind CSS), JavaScript (ES6+)
- **Map**: Leaflet.js + OpenStreetMap + Overpass API
- **AI**: WebLLM (MLC-LLM)
- **Icons**: Lucide Icons (SVG)
- **Fonts**: Noto Sans JP, Mochiy Pop One, DotGothic16
