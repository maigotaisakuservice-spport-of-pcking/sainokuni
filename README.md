# SAITAMA PARKS 2026｜彩の国さいたま公園ガイド＆AIインタラクティブポータル

埼玉県内の豊かな自然と公園の魅力を全世界に発信する、Webポータルサイトです。
インタラクティブなマップ、リアルタイム天気予報、AIコンシェルジュ「AIサイタマニアくん」、ミニゲーム（長瀞フィッシング、埼玉マスタークイズ）など多彩なコンテンツを提供します。

---

## 🛠 動作確認状況 (Verification Status)

全15ページについて、ローカル開発サーバー（`http://localhost:3000`）環境下でのPlaywright E2E自動検証を実施し、**全ページの正常表示（Status 200）および機能正常動作**を確認済みです。

| ページ名 | パス | 表示確認 | 動作確認内容 |
| :--- | :--- | :---: | :--- |
| **ホーム** | `index.html` | ✅ PASS | 背景動画ループ、天気予報API/プロキシフォールバック、ミニマップ、AIチャット起動 |
| **全画面マップ** | `map.html` | ✅ PASS | Leafletマップ描画、Overpass API/ローカルフォールバック施設表示、100mOverride検索 |
| **ゲームハブ** | `saitama_mini_game.html` | ✅ PASS | モードカード表示、ヘルプモーダル、ゲーム起動リンク |
| **フォトギャラリー** | `gallery.html` | ✅ PASS | 外部画像レスポンシブグリッド表示、ライトボックス拡大表示 |
| **ニュース** | `news.html` | ✅ PASS | 公園最新情報リスト表示、記事モーダル展開 |
| **カフェ紹介** | `cafe.html` | ✅ PASS | 公園カフェ記事コンテンツ表示、読了プログレスバー |
| **農業体験** | `nougyou.html` | ✅ PASS | 農業×公園記事コンテンツ表示 |
| **404ページ** | `404.html` | ✅ PASS | 葉っぱパーティクルCanvasアニメーション、おすすめ公園リンク |
| **長瀞フィッシング** | `game/fishing.html` | ✅ PASS | Canvas 2Dアクションゲーム、ヒット判定、スコア・結果画面表示 |
| **埼玉マスタークイズ** | `game/quiz.html` | ✅ PASS | クイズプログレスバー、4択問題選択、スコア・称号判定 |
| **秋ヶ瀬公園** | `destinations/akigase_park.html` | ✅ PASS | モデルコースタイムライン、アクセスマップ |
| **北浦和公園** | `destinations/kita_urawa_park.html` | ✅ PASS | 音楽噴水案内、MOMAS情報 |
| **大宮公園** | `destinations/omiya_park.html` | ✅ PASS | 歴史・桜名所案内、小動物園情報 |
| **大和田公園** | `destinations/owada_park.html` | ✅ PASS | イチオシバッジ、花火Canvasアニメーション、YouTube埋め込み動画 |
| **森林公園** | `destinations/shinrin_park.html` | ✅ PASS | 国営武蔵丘陵森林公園案内、ぽんぽこマウンテン情報 |

---

## 🎨 デザイン＆機能の特長

- **ユニバーサルデザイン・ダークモード:** サイカラー（Nature Green, Saitama Blue, Passion Red）およびダークモード（`saitama-mode`）をワンタップで切替可能。
- **天気予報プロキシフォールバック:** `corsproxy.io` をはじめとする複数プロキシチェーンによるCORSエラー防止および15分間`localStorage`キャッシュ。
- **Overpass API高速マップ:** タイムアウト対策（20,000ms）およびオフライン時ローカル施設データフォールバック構造。
- **AIコンシェルジュ (AIサイタマニアくん):** 語尾「〜である」、スローガン「埼玉は最高だ。十万石まんじゅう...うまい、うますぎる。」、10行制限、他県クエリ拒絶プロトコルを実装。

---

## 📁 ディレクトリ構造 & アセット一覧

```
.
├── index.html                  # トップページ (ヒーロー動画, 天気, 近くの公園プレビュー)
├── map.html                    # 全画面インタラクティブLeafletマップ
├── saitama_mini_game.html      # ゲームハブ (Play-Hub)
├── gallery.html                # フォトギャラリー
├── news.html                   # ニュース・最新情報
├── cafe.html                   # 公園カフェ特集記事
├── nougyou.html                # 農業×公園特集記事
├── 404.html                    # カスタム404エラーページ
├── css/
│   └── common.css              # サイト共通デザインシステム (変数, ダークモード, アニメーション)
├── js/
│   ├── common.js               # 共通JavaScript (モーダル, アクセシビリティ, 読み上げ, 共通ナビ)
│   ├── ai_concierge.js         # AIコンシェルジュ logic
│   └── slider_content.json     # RSS/スライダーコンテンツ情報
├── game/
│   ├── fishing.html            # 長瀞フィッシング (2D Canvasゲーム)
│   └── quiz.html               # 埼玉マスター検定クイズ
├── destinations/               # 公園個別詳細ページ (5大公園)
│   ├── akigase_park.html
│   ├── kita_urawa_park.html
│   ├── omiya_park.html
│   ├── owada_park.html
│   └── shinrin_park.html
└── images/                     # ローカル静的メディアアセット
    ├── kita_urawa_fountain.mp4 # ヒーロー用動画アセット
    ├── owada_fireworks.mp4     # 花火動画アセット
    ├── kita_urawa_park.jpg     # 北浦和公園
    ├── omiya_park.jpg          # 大宮公園
    ├── owada_park.jpg          # 大和田公園
    ├── akigase_park.jpg        # 秋ヶ瀬公園
    └── shinrin_park.jpg        # 森林公園
```

---

© 2026 埼玉県公園ガイドポータル
