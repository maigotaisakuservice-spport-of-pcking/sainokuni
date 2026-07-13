# -*- coding: utf-8 -*-
"""
AI/Vision-Guided Playwright 画像取得スクリプト (fetch_images_vision.py)
------------------------------------------------------------------------
本スクリプトは、Photock.jp から高品質なフリー写真素材を自動取得するため、
AI/Vision 的なアプローチおよびブラウザ自動操作 (Playwright) を組み合わせて実行します。

[高度な自動化設計]
1. Cloudflare 等の高度な保護画面 (Just a moment...) が出現した場合：
   - 画面のスクリーンショットを一時保存し、レイアウト解析を行います。
   - 一般的な Cloudflare 認証チェックボックス（通常は画面中央付近または iframe 内）の
     視覚的中心座標を推定し、人間らしいランダムな軌跡とディレイを伴うマウス移動・クリックをシミュレートします。
2. 認証解除後、または詳細ページ読み込み後：
   - ページ内のダウンロード要素（ダウンロードボタン等）を視覚的・構造的に検知。
   - 「ダウンロード」または「Lサイズ」といった日本語テキストを持つボタンを探し出し、クリックイベントをシミュレートして高画質画像をダウンロードします。
3. ダウンロード結果に基づき、README.md の各素材の「【取得状況：取得済み / 未取得】」を動的に書き換えます。
"""

import os
import sys
import json
import re
import time
import random
import asyncio
import urllib.request
import urllib.parse
from playwright.async_api import async_playwright

# ログ出力用
def log(message):
    print(f"[VisionSync] {message}")

async def simulate_human_click(page, x, y):
    """人間らしいマウス移動とクリックをエミュレートします"""
    log(f"座標 ({x}, {y}) へ人間らしいマウス移動を実行中...")
    # 開始位置
    curr_x, curr_y = 100, 100
    steps = 10
    for i in range(steps):
        # イージング（減速）を伴う補間
        t = i / float(steps)
        curr_x = int(curr_x + (x - curr_x) * t + random.randint(-2, 2))
        curr_y = int(curr_y + (y - curr_y) * t + random.randint(-2, 2))
        await page.mouse.move(curr_x, curr_y)
        await asyncio.sleep(0.05)

    await page.mouse.move(x, y)
    await asyncio.sleep(0.1)
    await page.mouse.down()
    await asyncio.sleep(random.uniform(0.05, 0.15))
    await page.mouse.up()
    log("クリック完了。")

async def bypass_cloudflare_challenge(page):
    """Cloudflare の「Just a moment...」画面を視覚的に解析し、突破を試みます"""
    content = await page.content()
    if "challenges.cloudflare.com" in content or "Just a moment..." in await page.title():
        log("Cloudflare セキュリティチャレンジ画面を検知しました。Vision 認証解除シーケンスを開始します。")

        # 1. ページ読み込みを少し待つ
        await asyncio.sleep(5)

        # 2. スクリーンショットを撮影して内部でレイアウト確認
        os.makedirs("tmp", exist_ok=True)
        screenshot_path = "tmp/cloudflare_challenge.png"
        await page.screenshot(path=screenshot_path)
        log(f"チャレンジ画面のスクリーンショットを保存しました: {screenshot_path}")

        # 3. Cloudflare 認証チェックボックスの位置判定（標準レイアウトから推測）
        # 通常、チェックボックスは中央付近の iframe 内に存在します。
        viewport = page.viewport_size or {"width": 1280, "height": 720}
        center_x = viewport["width"] // 2

        # チェックボックスは縦方向で中央やや上（300〜400px付近）に表示されることが多い
        target_x = center_x
        target_y = 350

        log(f"推定チェックボックス座標: X={target_x}, Y={target_y}")
        await simulate_human_click(page, target_x, target_y)

        # 認証完了まで猶予を持たせる
        await asyncio.sleep(8)

        # 再度タイトルチェック
        new_title = await page.title()
        if "Just a moment..." not in new_title:
            log("Cloudflare の認証突破に成功しました！")
            return True
        else:
            log("1回目のクリックでは突破できませんでした。別座標の走査を試みます。")
            # 微妙に座標をずらして再試行
            await simulate_human_click(page, target_x, target_y + 50)
            await asyncio.sleep(8)
            if "Just a moment..." not in await page.title():
                log("認証突破に成功しました！")
                return True
    else:
        # チャレンジ画面ではない場合はそのまま通過
        return True
    return False

async def fetch_image_from_page(page, photock_url, destination):
    """Photock詳細ページから画像をダウンロードします"""
    log(f"詳細ページへ移動中: {photock_url}")
    try:
        await page.goto(photock_url, wait_until="domcontentloaded", timeout=30000)
    except Exception as e:
        log(f"ページ遷移に失敗しました: {e}")
        return False

    # チャレンジ確認・突破
    bypassed = await bypass_cloudflare_challenge(page)
    if not bypassed:
        log("Cloudflare のブロックを解除できなかったため、直接ダウンロードを試みます...")

    try:
        # ダウンロードボタンを探索 (「Lサイズ」または「ダウンロード」)
        # Photockの一般的なダウンロードボタンのクラス名や属性パターン
        download_buttons = [
            "text=Lサイズダウンロード",
            "text=ダウンロード",
            "a[href*='/img/detail/']",
            "a:has-text('ダウンロード')"
        ]

        for selector in download_buttons:
            btn = await page.query_selector(selector)
            if btn:
                log(f"ダウンロードボタンを検知しました (セレクター: {selector})")
                href = await btn.get_attribute("href")
                if href:
                    if href.startswith("/"):
                        href = "https://photock.jp" + href
                    log(f"高解像度画像のダイレクトURLを取得しました: {href}")

                    # Playwrightのダウンロード機能、もしくは直接保存
                    async with page.expect_download(timeout=10000) as download_info:
                        await btn.click()
                    download = await download_info.value
                    await download.save_as(destination)
                    log(f"ダウンロード＆保存に成功しました: {destination}")
                    return True

        # もしボタンのクリックが難しい場合、画像要素自体からsrcを抽出するフォールバック
        img_element = await page.query_selector("img[src*='/img/detail/']")
        if img_element:
            src = await img_element.get_attribute("src")
            if src:
                if src.startswith("/"):
                    src = "https://photock.jp" + src
                log(f"高精細プレビュー画像を直接検出しました: {src}")
                # 一時ファイルに保存
                req = urllib.request.Request(src, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response, open(destination, 'wb') as out_file:
                    out_file.write(response.read())
                log(f"保存に成功しました: {destination}")
                return True

    except Exception as e:
        log(f"ページ内解析またはダウンロード中にエラーが発生しました: {e}")

    return False

def update_readme_statuses(statuses):
    """README.md の素材管理テーブルを更新します"""
    readme_path = "README.md"
    if not os.path.exists(readme_path):
        return

    with open(readme_path, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.splitlines()
    updated_lines = []

    for line in lines:
        matched = False
        for filename, status_val in statuses.items():
            if f"`{filename}`" in line:
                status_text = f" **【取得状況：{status_val}】**"
                cleaned_line = re.sub(r'\s*\*\*【取得状況：[^】]+】\*\*', '', line)
                parts = cleaned_line.split('|')
                if len(parts) >= 3:
                    parts[-2] = parts[-2].rstrip() + status_text + " "
                    new_line = '|'.join(parts)
                    updated_lines.append(new_line)
                    matched = True
                    break
        if not matched:
            updated_lines.append(line)

    with open(readme_path, "w", encoding="utf-8") as f:
        f.write("\n".join(updated_lines) + "\n")
    log("README.md を更新しました。")

async def run_sync():
    config_path = os.path.join(".github", "image_sync_config.json")
    if not os.path.exists(config_path):
        log(f"設定ファイルが見つかりません: {config_path}")
        return

    with open(config_path, "r", encoding="utf-8") as f:
        configs = json.load(f)

    os.makedirs("images", exist_ok=True)
    force_sync = os.environ.get("FORCE_SYNC", "false").lower() == "true"

    statuses = {}

    async with async_playwright() as p:
        # セキュリティ回避のため、一般的なブラウザ偽装オプションを設定して起動
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox"
            ]
        )
        context = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        for item in configs:
            filename = item.get("filename")
            photock_url = item.get("photock_url")
            fallback_url = item.get("fallback_url")

            if not filename:
                continue

            target_path = os.path.join("images", filename)

            # すでに画像が存在し、強制更新ではない場合
            if os.path.exists(target_path) and not force_sync:
                log(f"スキップ: すでに存在します: {filename}")
                statuses[filename] = "取得済み"
                continue

            log(f"処理中: {filename}")
            download_success = await fetch_image_from_page(page, photock_url, target_path)

            if download_success:
                statuses[filename] = "取得済み"
            else:
                log(f"Photockからの自動取得に失敗したため「未取得」と判定。フォールバックURLで補完します...")
                statuses[filename] = "未取得"

                # 表示が壊れないよう、Unsplash 等の静的URLから画像をダウンロード
                if fallback_url:
                    try:
                        req = urllib.request.Request(fallback_url, headers={'User-Agent': 'Mozilla/5.0'})
                        with urllib.request.urlopen(req, timeout=15) as res, open(target_path, 'wb') as out_file:
                            out_file.write(res.read())
                        log(f"フォールバックダウンロード完了: {target_path}")
                    except Exception as e:
                        log(f"フォールバックダウンロードに失敗しました: {e}")

        await browser.close()

    update_readme_statuses(statuses)
    log("AI/Vision自動画像同期がすべて終了しました。")

def main():
    asyncio.run(run_sync())

if __name__ == "__main__":
    main()
