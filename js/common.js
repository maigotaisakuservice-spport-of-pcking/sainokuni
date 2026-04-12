
// Tailwind ダークモード設定 (セレクタ方式)
if (window.tailwind) {
    tailwind.config = {
        darkMode: 'selector'
    };
}

// テーマ・モード管理
function initTheme() {
    const savedMode = localStorage.getItem('saitama-mode') || 'light';
    const savedTheme = localStorage.getItem('saitama-theme') || 'green';

    document.documentElement.setAttribute('data-mode', savedMode);
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedMode, savedTheme);
}

function toggleTheme() {
    // パークカラー（青・緑・赤）の切り替え
    const themes = ['green', 'blue', 'red'];
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'green';
    const nextIdx = (themes.indexOf(currentTheme) + 1) % themes.length;
    const newTheme = themes[nextIdx];

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('saitama-theme', newTheme);
    updateThemeIcon(document.documentElement.getAttribute('data-mode'), newTheme);
}

function toggleDarkMode() {
    const currentMode = document.documentElement.getAttribute('data-mode');
    const newMode = currentMode === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-mode', newMode);
    localStorage.setItem('saitama-mode', newMode);
    updateThemeIcon(newMode, document.documentElement.getAttribute('data-theme'));

    // ウィジェット内のスイッチ状態を更新
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

function updateThemeIcon(mode, theme) {
    const themeIcon = document.getElementById('theme-toggle-icon');
    const themeIconMobile = document.getElementById('theme-toggle-icon-mobile');

    // アクセシビリティ設定は歯車アイコンをデフォルトとする
    let icon = '⚙️';

    // ダークモード時は月（任意で切り替える場合）
    // if (mode === 'dark') icon = '🌙';

    if (themeIcon) themeIcon.textContent = icon;
    if (themeIconMobile) {
        // モバイルメニュー内は「カラー変更」の横なので🌳などのままでも良い
        let mobileIcon = '🌳';
        if (theme === 'blue') mobileIcon = '💧';
        if (theme === 'red') mobileIcon = '🔥';
        themeIconMobile.textContent = mobileIcon;
    }
}

// SNSシェア機能
function shareSNS(platform) {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    let shareUrl = "";

    switch (platform) {
        case 'x':
            shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
            break;
        case 'line':
            shareUrl = `https://social-plugins.line.me/lineit/share?url=${url}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
            break;
    }

    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }
}

// 読了インジケーターの更新
window.addEventListener('scroll', () => {
    const progressBar = document.getElementById('reading-progress-bar');
    if (progressBar) {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const progress = (scrollTop / scrollHeight) * 100;
        progressBar.style.width = progress + '%';
    }

    // FAB の表示制御
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const goTopBtn = document.querySelector('.go-to-top-button');
    if (goTopBtn) {
        if (scrollTop > 500) {
            goTopBtn.classList.add('visible');
            goTopBtn.style.display = 'flex';
        } else {
            goTopBtn.classList.remove('visible');
            setTimeout(() => {
                if (!goTopBtn.classList.contains('visible')) {
                    goTopBtn.style.display = 'none';
                }
            }, 300);
        }
    }
});

// スムーズスクロール
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 読み上げ機能
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
        // 自然な日本語音声の優先順位付け
        const japaneseVoice =
            voices.find(v => v.lang === 'ja-JP' && v.name.includes('Natural')) ||
            voices.find(v => v.lang === 'ja-JP' && v.name.includes('Online')) ||
            voices.find(v => v.lang === 'ja-JP' && (v.name.includes('Nanami') || v.name.includes('Keita') || v.name.includes('Siri'))) ||
            voices.find(v => v.lang === 'ja-JP' && v.name.includes('Google')) ||
            voices.find(v => v.lang === 'ja-JP') ||
            voices[0];

        if (japaneseVoice) {
            utterance.voice = japaneseVoice;
        }
        utterance.lang = 'ja-JP';
        // より人間らしく、聞き取りやすい設定
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = speak;
    } else {
        speak();
    }
}

// UI要素のランダムラベル
function randomizeUILabel(selector, options) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
        if (!el.dataset.originalText) el.dataset.originalText = el.textContent;
        const randomText = options[Math.floor(Math.random() * options.length)];
        el.textContent = randomText;
    });
}

// ハンバーガーメニュー制御
function toggleMenu() {
    const menu = document.getElementById('menu-content');
    const overlay = document.getElementById('menu-overlay');
    if (menu && overlay) {
        menu.classList.toggle('active');
        overlay.classList.toggle('active');

        // メニュー項目の動的更新 (index.html かどうかで出し分け)
        const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
        const nav = menu.querySelector('nav');
        if (nav) {
            const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
            const prefix = isIndex ? '' : (window.location.pathname.includes('/destinations/') || window.location.pathname.includes('/news/') || window.location.pathname.includes('/game/')) ? '../' : '';

            nav.innerHTML = `
                <a href="${prefix}index.html" class="flex items-center gap-3">🏠 ホーム</a>
                <a href="${prefix}destinations/maruyama-park.html" class="flex items-center gap-3">🌳 公園を探す</a>
                <a href="${prefix}map.html" class="flex items-center gap-3">🗺️ マップ</a>
                <a href="${prefix}saitama-mini-game.html" class="flex items-center gap-3">🎮 ゲーム</a>
                <hr class="border-slate-700">
                <button onclick="toggleTheme()" class="flex items-center gap-3 w-full text-left"><span id="theme-toggle-icon-mobile">🌳</span> カラー変更</button>
                <button onclick="toggleDarkMode()" class="flex items-center gap-3 w-full text-left"><span>🌓</span> ダークモード切替</button>
            `;
        }

        // メニューが開いているときはスクロール禁止
        if (menu.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
}

// アクセシビリティ・ウィジェット
function toggleAccessibilityPanel() {
    let panel = document.getElementById('accessibility-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'accessibility-panel';
        panel.className = 'fixed bottom-24 right-6 w-72 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl z-[3000] border border-slate-200 dark:border-slate-800 p-6 transform transition-all duration-300 translate-y-10 opacity-0 pointer-events-none';
        panel.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <h3 class="font-bold text-lg dark:text-white">⚙️ アクセシビリティ設定</h3>
                <button onclick="toggleAccessibilityPanel()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white text-2xl">&times;</button>
            </div>

            <div class="space-y-6">
                <!-- カラーテーマ -->
                <div>
                    <p class="text-xs text-slate-500 mb-3 uppercase tracking-widest font-bold">パークカラー選択</p>
                    <div class="flex justify-between gap-2">
                        <button onclick="setTheme('green')" class="flex-1 aspect-square rounded-2xl bg-emerald-600 border-4 border-white dark:border-slate-800 shadow-sm transition-transform hover:scale-110 active:scale-95" title="グリーン"></button>
                        <button onclick="setTheme('blue')" class="flex-1 aspect-square rounded-2xl bg-sky-600 border-4 border-white dark:border-slate-800 shadow-sm transition-transform hover:scale-110 active:scale-95" title="ブルー"></button>
                        <button onclick="setTheme('red')" class="flex-1 aspect-square rounded-2xl bg-red-600 border-4 border-white dark:border-slate-800 shadow-sm transition-transform hover:scale-110 active:scale-95" title="レッド"></button>
                    </div>
                </div>

                <!-- ダークモード -->
                <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                    <span class="text-sm font-bold dark:text-white">🌙 ダークモード</span>
                    <button onclick="toggleDarkMode()" id="dark-mode-switch" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${localStorage.getItem('saitama-mode') === 'dark' ? 'bg-emerald-500' : 'bg-slate-200'}">
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localStorage.getItem('saitama-mode') === 'dark' ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                </div>

                <!-- 音声読み上げ -->
                <button onclick="readPageText()" class="w-full flex items-center justify-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-colors font-bold text-sm dark:text-white">
                    🔊 ページを読み上げる
                </button>
            </div>
        `;
        document.body.appendChild(panel);

        // 初回表示アニメーション
        setTimeout(() => {
            panel.classList.remove('translate-y-10', 'opacity-0', 'pointer-events-none');
        }, 10);
    } else {
        if (panel.classList.contains('opacity-0')) {
            panel.classList.remove('translate-y-10', 'opacity-0', 'pointer-events-none');
        } else {
            panel.classList.add('translate-y-10', 'opacity-0', 'pointer-events-none');
        }
    }
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('saitama-theme', theme);
    updateThemeIcon(document.documentElement.getAttribute('data-mode'), theme);
}

// モーダル機能
const modalContents = {
    about: `
        <h2 class="text-2xl font-bold mb-4">SAITAMA PARKS について</h2>
        <p class="mb-4">「SAITAMA PARKS 2026」は、埼玉県の豊かな自然と公園の魅力を発信するためのポータルサイトです。</p>
        <p>日本初の飛行場跡地である航空公園から、広大な国営公園まで、埼玉には個性豊かな公園がたくさんあります。週末の行き先探しにぜひご活用ください。</p>
    `,
    access: `
        <h2 class="text-2xl font-bold mb-4">公園へのアクセス</h2>
        <div class="space-y-6">
            <p class="text-sm">埼玉県の公園は、都心からのアクセスも良好です。主要ルートは以下の通りです。</p>

            <div class="bg-slate-100 dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
                <p class="text-xs font-bold text-slate-500 mb-4 uppercase tracking-widest">🚉 主要ルート・スキマティック</p>
                <div class="flex flex-col gap-4 relative">
                    <div class="absolute left-[15px] top-4 bottom-4 w-1 bg-emerald-500 rounded-full"></div>

                    <div class="flex items-center gap-4 relative z-10">
                        <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-[10px] font-bold border-4 border-white dark:border-slate-800 shadow-sm">駅</div>
                        <div>
                            <p class="font-bold text-sm">東京・上野方面</p>
                            <p class="text-[10px] opacity-60">JR上野東京ライン / 湘南新宿ライン</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-4 relative z-10">
                        <div class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold border-4 border-white dark:border-slate-800 shadow-sm">駅</div>
                        <div>
                            <p class="font-bold text-sm">大宮駅</p>
                            <p class="text-[10px] opacity-60">主要ハブ。ここから各方面へ分岐</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-4 relative z-10">
                        <div class="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white text-[10px] font-bold border-4 border-white dark:border-slate-800 shadow-sm">🌳</div>
                        <div>
                            <p class="font-bold text-sm">丸山公園 / 大宮公園</p>
                            <p class="text-[10px] opacity-60">大宮駅からバスまたは徒歩圏内</p>
                        </div>
                    </div>
                </div>
            </div>

            <ul class="text-sm space-y-2">
                <li><strong class="text-emerald-600">大宮公園:</strong> 大宮公園駅より徒歩10分</li>
                <li><strong class="text-emerald-600">所沢航空公園:</strong> 航空公園駅直結</li>
                <li><strong class="text-emerald-600">森林公園:</strong> 森林公園駅からバス</li>
            </ul>
        </div>
    `,
    copyright: `
        <h2 class="text-2xl font-bold mb-4">著作権・免責事項</h2>
        <p class="mb-4">© 2026 埼玉公園ポータルプロジェクト. All Rights Reserved.</p>
        <p class="text-sm">当サイトの情報の正確性には万全を期しておりますが、利用者が当サイトの情報を用いて行う一切の行為について、責任を負うものではありません。</p>
    `,
    legal: `
        <h2 class="text-2xl font-bold mb-4">利用規約 (ToS) / EULA</h2>
        <div class="space-y-4 text-xs leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
            <p>本サイト（SAITAMA PARKS 2026）をご利用いただく際は、以下の規約に同意したものとみなします。</p>
            <p><strong>1. AIサービスの利用:</strong> 「AIサイタマニアくん」は試験的なLLM技術を使用しており、情報の正確性を保証しません。埼玉愛が強すぎるあまり不適切な表現（十万石まんじゅうの過度な推奨等）が含まれる場合があります。</p>
            <p><strong>2. 禁止事項:</strong> 本サイトのデータを不正にスクレイピングする行為、およびAIエンジンに対して攻撃的なプロンプトを入力する行為を禁じます。</p>
            <p><strong>3. 免責事項:</strong> 本サイトの情報に基づいて発生した損害について、当プロジェクトは一切の責任を負いません。実際の公園の状況は現地の案内に従ってください。</p>
            <p><strong>4. アップデート:</strong> 本規約は予告なく変更されることがあります。</p>
        </div>
    `
};

function openModal(type) {
    let modal = document.getElementById('info-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'info-modal';
        modal.className = 'modal';
        modal.onclick = (e) => { if(e.target === modal) closeModal(); };
        modal.innerHTML = `
            <div class="modal-content" onclick="event.stopPropagation()">
                <span class="modal-close" onclick="closeModal()">&times;</span>
                <div id="modal-body"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const body = document.getElementById('modal-body');
    if (body) body.innerHTML = modalContents[type] || 'コンテンツがありません。';
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('info-modal');
    if (modal) modal.style.display = 'none';
}

// スクロール監視 (アニメーション用)
const observerOptions = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('appear');
        }
    });
}, observerOptions);

function initAnimations() {
    const fadeElements = document.querySelectorAll('.fade-in-up');
    fadeElements.forEach(el => observer.observe(el));
}

// おすすめパークの動的生成
function initRecommendations() {
    const grid = document.querySelector('.recommend-grid');
    if (!grid) return;

    const allParks = [
        { name: "大宮公園", link: "omiya_park.html", img: "../images/omiya_park.jpg" },
        { name: "丸山公園", link: "maruyama-park.html", img: "../images/maruyama_park.jpg" },
        { name: "森林公園", link: "shinrin_park.html", img: "../images/shinrin_park.jpg" },
        { name: "所沢航空公園", link: "tokorozawa_park.html", img: "../images/tokorozawa_park.jpg" },
        { name: "秋ヶ瀬公園", link: "akigase_park.html", img: "../images/akigase_park.jpg" }
    ];

    const currentFile = window.location.pathname.split('/').pop();
    const otherParks = allParks.filter(p => p.link !== currentFile);

    // フィッシャー・イェーツのシャッフル
    for (let i = otherParks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherParks[i], otherParks[j]] = [otherParks[j], otherParks[i]];
    }

    grid.innerHTML = otherParks.slice(0, 4).map(p => `
        <a href="${p.link}" class="recommend-card">
            <img src="${p.img}" alt="${p.name}" loading="lazy">
            <p>${p.name}</p>
        </a>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initAnimations();
    initRecommendations();
});
