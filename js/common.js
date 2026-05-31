
/**
 * SAITAMA PARKS 2026 - Global Scripts
 *
 * This file manages:
 * - Theme & Dark Mode (Saicolor system)
 * - Navigation & Menus
 * - Accessibility (Text-to-Speech, Translation)
 * - Global UI components (FAB, Modals, Progress Bar)
 * - Randomized park discovery logic
 */

// --- Global Initialization ---
if (window.tailwind) {
    tailwind.config = {
        darkMode: 'selector'
    };
}

/**
 * Initializes theme and mode from localStorage on page load.
 */
function initTheme() {
    const savedMode = localStorage.getItem('saitama-mode') || 'light';
    const savedTheme = localStorage.getItem('saitama-theme') || 'green';

    document.documentElement.setAttribute('data-mode', savedMode);
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedMode, savedTheme);
}

// --- Theme & Mode Management ---

/**
 * Cycles through available park colors (green -> blue -> red).
 */
function toggleTheme() {
    const themes = ['green', 'blue', 'red'];
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'green';
    const nextIdx = (themes.indexOf(currentTheme) + 1) % themes.length;
    const newTheme = themes[nextIdx];

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('saitama-theme', newTheme);
    updateThemeIcon(document.documentElement.getAttribute('data-mode'), newTheme);
}

/**
 * Toggles Dark Mode and updates UI state.
 */
function toggleDarkMode() {
    const currentMode = document.documentElement.getAttribute('data-mode');
    const newMode = currentMode === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-mode', newMode);
    localStorage.setItem('saitama-mode', newMode);
    updateThemeIcon(newMode, document.documentElement.getAttribute('data-theme'));

    const switchBtn = document.getElementById('dark-mode-switch');
    if (switchBtn) {
        const dot = switchBtn.querySelector('span');
        if (newMode === 'dark') {
            switchBtn.classList.add('bg-emerald-500');
            switchBtn.classList.remove('bg-slate-200');
            dot.classList.add('translate-x-6');
            dot.classList.remove('translate-x-1');
        } else {
            switchBtn.classList.remove('bg-emerald-500');
            switchBtn.classList.add('bg-slate-200');
            dot.classList.remove('translate-x-6');
            dot.classList.add('translate-x-1');
        }
    }
}

/**
 * Sets a specific theme color.
 * @param {string} theme - 'green', 'blue', or 'red'.
 */
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('saitama-theme', theme);
    updateThemeIcon(document.documentElement.getAttribute('data-mode'), theme);
}

/**
 * Updates the accessibility icon/label based on current state.
 */
function updateThemeIcon(mode, theme) {
    const themeIcon = document.getElementById('theme-toggle-icon');
    const themeIconMobile = document.getElementById('theme-toggle-icon-mobile');
    let icon = '⚙️';

    if (themeIcon) themeIcon.textContent = icon;
    if (themeIconMobile) {
        let mobileIcon = '🌳';
        if (theme === 'blue') mobileIcon = '💧';
        if (theme === 'red') mobileIcon = '🔥';
        themeIconMobile.textContent = mobileIcon;
    }
}

// --- Accessibility Features ---

/**
 * Text-to-Speech: Reads the main content of the page.
 */
function readPageText() {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        return;
    }

    const mainEl = document.querySelector('main') || document.body;
    const clone = mainEl.cloneNode(true);
    const excludes = 'script, style, #menu-content, header, footer, .theme-toggle-btn, button, #accessibility-panel, .no-read';
    clone.querySelectorAll(excludes).forEach(s => s.remove());

    const textToRead = (clone.innerText || clone.textContent).replace(/\s+/g, ' ').trim();
    if (!textToRead) return;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    const speak = () => {
        const voices = window.speechSynthesis.getVoices();
        const japaneseVoice =
            voices.find(v => v.lang === 'ja-JP' && v.name.includes('Natural')) ||
            voices.find(v => v.lang === 'ja-JP' && v.name.includes('Online')) ||
            voices.find(v => v.lang === 'ja-JP') || voices[0];

        if (japaneseVoice) utterance.voice = japaneseVoice;
        utterance.lang = 'ja-JP';
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = speak;
    } else {
        speak();
    }
}

// --- UI Components ---

/**
 * Toggles the floating accessibility settings panel.
 */
function toggleAccessibilityPanel() {
    let panel = document.getElementById('accessibility-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'accessibility-panel';
        panel.className = 'fixed bottom-24 right-6 w-72 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl z-[3000] border border-slate-200 dark:border-slate-800 p-6 transform transition-all duration-300 translate-y-10 opacity-0 pointer-events-none';
        panel.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h3 class="font-bold text-lg dark:text-white">⚙️ 設定</h3>
                <button onclick="toggleAccessibilityPanel()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white text-2xl">&times;</button>
            </div>
            <div class="space-y-6">
                <div>
                    <p class="text-xs text-slate-500 mb-3 uppercase tracking-widest font-bold">パークカラー</p>
                    <div class="flex justify-between gap-2">
                        <button onclick="setTheme('green')" class="flex-1 aspect-square rounded-2xl bg-emerald-600 border-4 border-white dark:border-slate-800"></button>
                        <button onclick="setTheme('blue')" class="flex-1 aspect-square rounded-2xl bg-sky-600 border-4 border-white dark:border-slate-800"></button>
                        <button onclick="setTheme('red')" class="flex-1 aspect-square rounded-2xl bg-red-600 border-4 border-white dark:border-slate-800"></button>
                    </div>
                </div>
                <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                    <span class="text-sm font-bold dark:text-white">🌙 ダークモード</span>
                    <button onclick="toggleDarkMode()" id="dark-mode-switch" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localStorage.getItem('saitama-mode') === 'dark' ? 'bg-emerald-500' : 'bg-slate-200'}">
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localStorage.getItem('saitama-mode') === 'dark' ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                </div>
                <button onclick="readPageText()" class="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-sm dark:text-white">🔊 読み上げ</button>
                <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p class="text-[10px] text-slate-400 mb-2">Translation / 翻訳</p>
                    <div id="google_translate_element"></div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        if (!window.googleTranslateElementInit) {
            window.googleTranslateElementInit = function() {
                new google.translate.TranslateElement({pageLanguage: 'ja', layout: google.translate.TranslateElement.InlineLayout.SIMPLE}, 'google_translate_element');
            };
            const script = document.createElement('script');
            script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            document.body.appendChild(script);
        }
    }
    panel.classList.toggle('opacity-0');
    panel.classList.toggle('translate-y-10');
    panel.classList.toggle('pointer-events-none');
}

// --- Park Discovery Logic ---

/**
 * Master data for the 5 core parks.
 */
const PARK_DATA = [
    { name: "大宮公園", link: "omiya_park.html", img: "omiya_park.jpg" },
    { name: "北浦和公園", link: "kita_urawa_park.html", img: "kita_urawa_park.jpg" },
    { name: "国営武蔵丘陵森林公園", link: "shinrin_park.html", img: "shinrin_park.jpg" },
    { name: "大和田公園", link: "oowada_park.html", img: "omiya_park.jpg", featured: true },
    { name: "秋ヶ瀬公園", link: "akigase_park.html", img: "akigase_park.jpg" }
];

/**
 * Initializes the randomized "Find a Park" links in the header/menu.
 */
function initRandomParkLinks() {
    const pathname = window.location.pathname;
    const isRoot = pathname.endsWith('/') || pathname.endsWith('index.html') || (!pathname.includes('/destinations/') && !pathname.includes('/news/'));
    const prefix = isRoot ? 'destinations/' : (pathname.includes('/destinations/') ? '' : '../destinations/');
    const randomPark = PARK_DATA[Math.floor(Math.random() * PARK_DATA.length)];
    document.querySelectorAll('a').forEach(link => {
        if (link.textContent.includes('公園を探す')) link.href = `${prefix}${randomPark.link}`;
    });
}

/**
 * Dynamically generates "Recommended" park grid at the bottom of detail pages.
 */
function initRecommendations() {
    const grid = document.querySelector('.recommend-grid');
    if (!grid) return;

    const currentFile = window.location.pathname.split('/').pop();
    const otherParks = PARK_DATA.filter(p => p.link !== currentFile).sort(() => Math.random() - 0.5);
    const imgPrefix = window.location.pathname.includes('/destinations/') ? '../images/' : 'images/';

    grid.innerHTML = otherParks.slice(0, 4).map(p => `
        <a href="${p.link}" class="recommend-card relative">
            ${p.featured ? '<span class="absolute top-2 right-2 bg-red-500 text-white text-[8px] px-2 py-0.5 rounded-full font-bold z-10 animate-pulse">イチオシ！</span>' : ''}
            <img src="${imgPrefix}${p.img}" alt="${p.name}" loading="lazy">
            <p>${p.name}</p>
        </a>
    `).join('');
}

// --- Event Listeners ---

window.addEventListener('scroll', () => {
    // Reading Progress Bar
    const progressBar = document.getElementById('reading-progress-bar');
    if (progressBar) {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        progressBar.style.width = (scrollTop / scrollHeight) * 100 + '%';
    }

    // Floating Action Button (Top)
    const goTopBtn = document.querySelector('.go-to-top-button');
    if (goTopBtn) {
        if (window.pageYOffset > 500) {
            goTopBtn.classList.add('visible');
            goTopBtn.style.display = 'flex';
        } else {
            goTopBtn.classList.remove('visible');
            setTimeout(() => { if (!goTopBtn.classList.contains('visible')) goTopBtn.style.display = 'none'; }, 300);
        }
    }
});

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initRandomParkLinks();
    initRecommendations();
});

// Navigation Toggle
window.toggleMenu = function() {
    const menu = document.getElementById('menu-content');
    const overlay = document.getElementById('menu-overlay');
    if (menu && overlay) {
        menu.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.style.overflow = menu.classList.contains('active') ? 'hidden' : '';
    }
};
