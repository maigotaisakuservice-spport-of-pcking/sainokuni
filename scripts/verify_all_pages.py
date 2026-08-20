import os
import sys
from playwright.sync_api import sync_playwright

def test_all_pages():
    results = []

    # Collect all HTML files in repository
    html_files = []
    for root, dirs, files in os.walk("."):
        if ".git" in root or "node_modules" in root:
            continue
        for file in files:
            if file.endswith(".html"):
                path = os.path.join(root, file)
                html_files.append(os.path.normpath(path))

    html_files.sort()
    print(f"Found {len(html_files)} HTML files to test on local file:// protocol.")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for filepath in html_files:
            abs_path = os.path.abspath(filepath)
            file_url = f"file://{abs_path}"

            console_errors = []
            page_errors = []

            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type in ["error"] else None)
            page.on("pageerror", lambda err: page_errors.append(str(err)))

            status = "PASS"
            details = []

            try:
                page.goto(file_url, wait_until="load", timeout=10000)
                page.wait_for_timeout(1500)

                title = page.title()
                body_text = page.inner_text("body") or ""
                body_html = page.inner_html("body") or ""

                if not title:
                    status = "FAIL"
                    details.append("Missing page title")

                # Allow canvas/game pages with rich HTML structures
                if len(body_text) < 50 and len(body_html) < 200:
                    status = "FAIL"
                    details.append("Body content too short (< 50 chars)")

                # Check for broken image sources (only visible, non-lazy/main images)
                images = page.eval_on_selector_all("img:not([loading='lazy'])", "imgs => imgs.map(i => ({ src: i.src, naturalWidth: i.naturalWidth }))")
                broken_imgs = [img['src'] for img in images if img['naturalWidth'] == 0 and not img['src'].startswith("data:")]
                if broken_imgs:
                    status = "WARN"
                    details.append(f"Unloaded non-lazy image(s): {len(broken_imgs)}")

            except Exception as e:
                status = "FAIL"
                details.append(f"Load Exception: {str(e)}")

            if page_errors:
                status = "FAIL"
                details.append(f"JS Errors: {', '.join(page_errors)}")

            results.append({
                "file": filepath,
                "status": status,
                "title": title if 'title' in locals() else "N/A",
                "details": " / ".join(details) if details else "All checks passed successfully"
            })

        browser.close()

    # Generate report.md
    report_content = "# 📊 SAITAMA PARKS 2026 - 全ファイル動作確認レポート (GitHub Actions)\n\n"
    report_content += "ローカル環境（`file://` プロトコル直接実行）における全HTMLページの完全動作確認結果です。\n\n"
    report_content += "| ステータス | ファイルパス | ページタイトル | チェック結果 / 詳細 |\n"
    report_content += "| :---: | :--- | :--- | :--- |\n"

    passed_count = 0
    warn_count = 0
    fail_count = 0

    for r in results:
        badge = "✅ PASS" if r["status"] == "PASS" else ("⚠️ WARN" if r["status"] == "WARN" else "❌ FAIL")
        report_content += f"| {badge} | `{r['file']}` | {r['title']} | {r['details']} |\n"
        if r["status"] == "PASS":
            passed_count += 1
        elif r["status"] == "WARN":
            warn_count += 1
        else:
            fail_count += 1

    report_content += f"\n\n### 📈 集計結果\n"
    report_content += f"- **総テスト対象ファイル数:** {len(results)}\n"
    report_content += f"- **成功 (PASS):** {passed_count}\n"
    report_content += f"- **警告 (WARN):** {warn_count}\n"
    report_content += f"- **失敗 (FAIL):** {fail_count}\n\n"
    report_content += f"*レポート生成日時: 自動検証システム (GitHub Actions Workflow)*\n"

    with open("report.md", "w", encoding="utf-8") as f:
        f.write(report_content)

    print("report.md successfully generated!")
    if fail_count > 0:
        sys.exit(1)

if __name__ == "__main__":
    test_all_pages()
