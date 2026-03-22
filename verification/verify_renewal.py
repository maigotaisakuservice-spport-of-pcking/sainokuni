from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 800})
    page = context.new_page()

    # 1. Home Page & Accessibility Panel
    page.goto('file:///app/index.html')
    expect(page.locator('.header-main')).to_be_visible()

    # Open Accessibility Panel
    page.click('#theme-toggle-icon')
    page.wait_for_selector('#accessibility-panel', state='visible')
    page.screenshot(path='verification/home_accessibility.png')

    # Toggle Dark Mode
    page.click('#dark-mode-switch')
    page.wait_for_timeout(500)
    page.screenshot(path='verification/home_darkmode.png')

    # 2. Park Detail Page (Family Info & Animation)
    page.goto('file:///app/destinations/maruyama.html')
    # Scroll down to trigger animations
    page.evaluate("window.scrollTo(0, 500)")
    page.wait_for_timeout(1000)
    page.screenshot(path='verification/park_detail.png')

    # 3. Game Page (Fishing)
    page.goto('file:///app/fishing.html')
    page.wait_for_timeout(1000)
    page.screenshot(path='verification/game_fishing.png')

    # 4. Quiz Page
    page.goto('file:///app/quiz.html')
    page.wait_for_timeout(500)
    page.screenshot(path='verification/game_quiz.png')

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
