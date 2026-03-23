
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
    // サイカラー（青・緑・赤）の切り替え
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

    // アクセシビリティ設定は車椅子アイコンをデフォルトとする
    let icon = '♿';

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
    } else {
        const mainEl = document.querySelector('main') || document.body;
        const clone = mainEl.cloneNode(true);
        const scripts = clone.querySelectorAll('script, style, #menu-content, header, footer, .theme-toggle-btn');
        scripts.forEach(s => s.remove());

        const textToRead = clone.innerText || clone.textContent;
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = 'ja-JP';
        utterance.rate = 1.0;

        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
    }
}

// ハンバーガーメニュー制御
function toggleMenu() {
    const menu = document.getElementById('menu-content');
    const overlay = document.getElementById('menu-overlay');
    if (menu && overlay) {
        menu.classList.toggle('active');
        overlay.classList.toggle('active');
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
                <h3 class="font-bold text-lg dark:text-white">♿ アクセシビリティ設定</h3>
                <button onclick="toggleAccessibilityPanel()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white text-2xl">&times;</button>
            </div>

            <div class="space-y-6">
                <!-- カラーテーマ -->
                <div>
                    <p class="text-xs text-slate-500 mb-3 uppercase tracking-widest font-bold">サイカラー選択</p>
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
        <div class="space-y-4">
            <p>埼玉県の公園は、多くが駅から徒歩圏内、または駅からバスでアクセス可能です。</p>
            <p><strong>🚆 主要な公園の最寄り駅:</strong></p>
            <ul class="list-disc list-inside">
                <li>大宮公園: 東武アーバンパークライン「大宮公園駅」徒歩10分</li>
                <li>所沢航空公園: 西武新宿線「航空公園駅」直結</li>
                <li>森林公園: 東武東上線「森林公園駅」からバス</li>
            </ul>
        </div>
    `,
    copyright: `
        <h2 class="text-2xl font-bold mb-4">著作権・免責事項</h2>
        <p class="mb-4">© 2026 埼玉公園ポータルプロジェクト. All Rights Reserved.</p>
        <p class="text-sm">当サイトの情報の正確性には万全を期しておりますが、利用者が当サイトの情報を用いて行う一切の行為について、責任を負うものではありません。</p>
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

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initAnimations();
});
