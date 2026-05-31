
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];

  const checkPage = async (filePath) => {
    try {
      const url = `file://${path.resolve(filePath)}`;
      await page.goto(url);

      // Basic check for global functions
      const isCommonLoaded = await page.evaluate(() => typeof window.openModal === 'function');
      if (!isCommonLoaded) errors.push(`[${filePath}] common.js not loaded or broken`);

      // Check for broken links
      const links = await page.$$eval('a', as => as.map(a => a.href));
      for (const link of links) {
        if (link.startsWith('file://') && !link.includes('#')) {
          const targetPath = link.replace('file://', '');
          if (!fs.existsSync(targetPath)) {
            errors.push(`[${filePath}] Broken link: ${link}`);
          }
        }
      }
    } catch (e) {
      errors.push(`[${filePath}] Navigation failed: ${e.message}`);
    }
  };

  const files = [
    'index.html',
    'map.html',
    'news.html',
    'gallery.html',
    'saitama_mini_game.html',
    'destinations/kita_urawa_park.html',
    'destinations/omiya_park.html',
    'destinations/oowada_park.html',
    'game/quiz.html'
  ];

  for (const file of files) {
    await checkPage(file);
  }

  if (errors.length > 0) {
    fs.writeFileSync('bug報告.txt', errors.join('\n'));
    console.error('Bugs found! See bug報告.txt');
    process.exit(1);
  } else {
    console.log('No bugs detected.');
  }

  await browser.close();
})();
