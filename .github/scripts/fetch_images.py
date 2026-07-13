# -*- coding: utf-8 -*-
"""
画像自動収集・同期 ＆ README自動更新スクリプト (fetch_images.py)
------------------------------------------------------------------
`.github/image_sync_config.json` に定義されたキーワードや Photock.jp のURL情報に基づき、
ライセンスフリーの高品質画像を自動でダウンロード・同期します。

[動作仕様]
1. FORCE_SYNC 環境変数が "true" の場合、またはローカルにファイルが存在しない場合のみダウンロードを行います。
2. Photock.jp からのスクレイピング：
   - Photock は Cloudflare 等のスクレイピング保護が稼働しているため、
     urllib で直接リクエストした際に「403 Forbidden」等でアクセスが遮断される可能性があります。
   - スクリプト内では Photock URL へのリクエストを試行し、遮断された場合や画像が見つからなかった場合は
     「未取得」として扱い、高機能なフォールバック用ライセンスフリーURLから画像を確実に取得しつつ、
     README.md の素材管理テーブルにステータス（[取得済み] / [未取得]）を追記・自動更新します。
"""

import os
import sys
import json
import re
import urllib.request
import urllib.parse

# ログ出力用ユーティリティ
def log(message):
    print(f"[ImageSync] {message}")

def download_file(url, destination):
    """指定されたURLからファイルをダウンロードして保存します"""
    try:
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req, timeout=15) as response, open(destination, 'wb') as out_file:
            data = response.read()
            out_file.write(data)
        log(f"保存成功: {destination}")
        return True
    except Exception as e:
        log(f"ダウンロードエラー ({destination}): {e}")
        return False

def try_photock_fetch(photock_url):
    """Photock.jp からの画像取得を試行します。Cloudflare等で遮断された場合は None を返します"""
    if not photock_url:
        return None
    log(f"Photock.jp に接続を試みています: {photock_url}")
    try:
        # Photockの個別詳細ページからオリジナル画像URL（あるいは大きな画像URL）を抽出しようとするリクエスト
        req = urllib.request.Request(
            photock_url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')

            # オリジナル画像のダウンロード用URLパターン、もしくは <img> のsrcに格納されている /img/ の高解像度画像URL
            # 例: <a href="/img/detail/...jpg"> もしくは src="/img/detail/...jpg"
            match = re.search(r'href="(/img/detail/[^"]+\.jpg)"', html)
            if not match:
                match = re.search(r'src="(/img/detail/[^"]+\.jpg)"', html)

            if match:
                img_path = match.group(1)
                full_url = "https://photock.jp" + img_path
                log(f"Photock内で画像URLを特定しました: {full_url}")
                return full_url
    except Exception as e:
        log(f"Photock.jp への直接接続は制限されています（Cloudflare等によるセキュリティ保護）: {e}")
    return None

def update_readme_statuses(statuses):
    """README.md を解析し、素材一覧テーブル内の各ファイルのステータス（取得済み／未取得）を自動で追記更新します"""
    readme_path = "README.md"
    if not os.path.exists(readme_path):
        log("警告: README.md が見つかりません。")
        return

    with open(readme_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Markdown テーブル行の特定の画像アセット行を探してステータスを更新
    # 例：| `kita_urawa_park.jpg` | JPEG | 各種 | 北浦和公園の景観（メインビジュアル）。... |
    # この末尾にステータス（「取得状況：取得済み」または「取得状況：未取得」）を自動的に追記または置換します。
    lines = content.splitlines()
    updated_lines = []

    for line in lines:
        matched = False
        for filename, status_val in statuses.items():
            if f"`{filename}`" in line:
                # すでに「取得状況」の記載がある場合は上書き、なければ末尾に追加
                status_text = f" **【取得状況：{status_val}】**"

                # すでに以前追加された取得状況テキストがあれば削除
                cleaned_line = re.sub(r'\s*\*\*【取得状況：[^】]+】\*\*', '', line)

                # テーブル列の区切り文字である最後の | の直前にステータスを挿入
                parts = cleaned_line.split('|')
                if len(parts) >= 3:
                    # 最後から2番目の列（用途・ステータス列など）にステータスを追加
                    parts[-2] = parts[-2].rstrip() + status_text + " "
                    new_line = '|'.join(parts)
                    updated_lines.append(new_line)
                    matched = True
                    break
        if not matched:
            updated_lines.append(line)

    new_content = "\n".join(updated_lines) + "\n"

    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    log("README.md の取得ステータス（取得状況）を自動更新しました。")

def main():
    config_path = os.path.join(".github", "image_sync_config.json")
    if not os.path.exists(config_path):
        log(f"エラー: 設定ファイルが見つかりません: {config_path}")
        sys.exit(1)

    with open(config_path, "r", encoding="utf-8") as f:
        configs = json.load(f)

    # 保存先ディレクトリの作成
    os.makedirs("images", exist_ok=True)

    # 同期ポリシー確認
    force_sync = os.environ.get("FORCE_SYNC", "false").lower() == "true"
    if force_sync:
        log("強制同期モード (FORCE_SYNC=true): 全てのアセットを同期します。")
    else:
        log("通常同期モード: ローカルに未配置の画像アセットのみ同期します。")

    # ダウンロード結果のステータス格納用ディクショナリ
    asset_statuses = {}

    for item in configs:
        filename = item.get("filename")
        photock_url = item.get("photock_url")
        fallback_url = item.get("fallback_url")

        if not filename:
            continue

        target_path = os.path.join("images", filename)

        # すでにローカルに画像が存在し、強制更新ではない場合
        if os.path.exists(target_path) and not force_sync:
            log(f"スキップ: 既にファイルが存在します: {filename}")
            # すでにファイルが存在するため「取得済み」扱い
            asset_statuses[filename] = "取得済み"
            continue

        log(f"同期中: {filename}")
        download_success = False

        # 1. まずは Photock.jp からの画像探索・取得を試行
        photock_img_url = try_photock_fetch(photock_url)
        if photock_img_url:
            log(f"Photock から画像をダウンロードしています...")
            download_success = download_file(photock_img_url, target_path)

        # Photock で取得できた場合はステータス「取得済み」
        if download_success:
            asset_statuses[filename] = "取得済み"
        else:
            # Photock から取得できなかった場合はステータス「未取得」とし、Unsplash などのパブリックフリー素材で補う
            log(f"Photock から取得できなかったため、「未取得」とマークします。代替のパブリックフリー画像でフォールバックします...")
            asset_statuses[filename] = "未取得"

            # 代替URLからアセットをダウンロードし、サイトの表示が壊れないように補完
            if fallback_url:
                download_file(fallback_url, target_path)

    # 取得ステータスを README.md にマッピングして動的更新
    update_readme_statuses(asset_statuses)
    log("画像同期 ＆ README自動更新が完全に終了しました。")

if __name__ == "__main__":
    main()
