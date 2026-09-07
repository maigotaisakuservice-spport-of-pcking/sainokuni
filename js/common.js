
/**
 * ==========================================
 * SAITAMA PARKS - サイト共通スクリプト (js/common.js)
 * ==========================================
 * [役割]
 * 音声読み上げ(TTS)、アクセシビリティコントロール(Saicolorテーマ・ダークモード切替)、
 * ランダム遷移リンク、共通モーダル(約款、アクセス、著作権等)、スクロール連動などの
 * ポータル全体にわたる共通フロントエンドインタラクションを統合管理します。
 *
 * [外部リソース/CDN名]
 * - Google Translate Widget (translate.google.com)
 * - Tailwind CSS (cdn.tailwindcss.com) (共通ダークモード連携用)
 */

// Tailwind ダークモード設定 (セレクタ方式)
if (window.tailwind) {
    tailwind.config = {
        darkMode: 'selector'
    };
}

/**
 * テーマ・モード管理
 * ユーザーが選択したカラーテーマとダークモードの状態を管理します
 */
function initTheme() {
    const savedMode = localStorage.getItem('saitama-mode') || 'light';
    const savedTheme = localStorage.getItem('saitama-theme') || 'green';

    document.documentElement.setAttribute('data-mode', savedMode);
    document.documentElement.classList.toggle('dark', savedMode === 'dark');
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedMode, savedTheme);
}

/**
 * カラーテーマの切り替え
 * グリーン、ブルー、レッドの3色を順繰りに切り替えます
 */
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

/**
 * ダークモードの切り替え
 * ページ全体の色調を反転させ、設定をlocalStorageに保存します
 */
function toggleDarkMode() {
    const currentMode = document.documentElement.getAttribute('data-mode');
    const newMode = currentMode === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-mode', newMode);
    document.documentElement.classList.toggle('dark', newMode === 'dark');
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

    if (themeIcon) {
        const emojiEl = themeIcon.querySelector('.icon-emoji');
        if (emojiEl) {
            emojiEl.textContent = icon;
        } else {
            themeIcon.textContent = icon;
        }
    }
    if (themeIconMobile) {
        // モバイルメニュー内は「カラー変更」の横なので🌳などのままでも良い
        let mobileIcon = '🌳';
        if (theme === 'blue') mobileIcon = '💧';
        if (theme === 'red') mobileIcon = '🔥';
        themeIconMobile.textContent = mobileIcon;
    }
}

/**
 * SNSシェア機能
 * @param {string} platform - 'x', 'line', 'facebook' のいずれか
 */
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

/**
 * 読み上げ機能 (TTS)
 * ページ内のメインコンテンツを抽出し、日本語音声で読み上げます
 */
function readPageText() {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        return;
    }

    // 読み上げ開始時にヒーロー背景動画を強制ミュートする
    if (typeof window.muteHeroVideo === 'function') {
        window.muteHeroVideo();
    }

    const mainEl = document.querySelector('main') || document.body;
    const clone = mainEl.cloneNode(true);
    const excludes = 'script, style, #menu-content, header, footer, .theme-toggle-btn, button, #accessibility-panel, .no-read';
    clone.querySelectorAll(excludes).forEach(s => s.remove());

    const textToRead = (clone.innerText || clone.textContent).replace(/\s+/g, ' ').trim();
    if (!textToRead) return;

    const utterance = new SpeechSynthesisUtterance(textToRead);

    // ブラウザ標準のデフォルト日本語設定で自然に読み上げ
    utterance.lang = 'ja-JP';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const defaultJaVoice = voices.find(v => v.lang === 'ja-JP' || v.lang === 'ja_JP' || (v.lang && v.lang.toLowerCase().startsWith('ja')));
    if (defaultJaVoice) {
        utterance.voice = defaultJaVoice;
    }

    window.speechSynthesis.speak(utterance);
}

// 公園データの定義
const PARK_DATA = [
    { name: "大宮公園", link: "omiya_park.html", img: "https://gogo-saitama.jp/wp/wp-content/uploads/2022/05/pixta_15102193_XL.jpg" },
    { name: "北浦和公園", link: "kita_urawa_park.html", img: "https://thumb.photo-ac.com/04/04d880c10523a7f1589138951a67355e_w.jpeg" },
    { name: "森林公園", link: "shinrin_park.html", img: "https://www.sbaa-bicycle.com/wordpress/wp-content/uploads/2022/05/01.jpg" },
    { name: "大和田公園", link: "owada_park.html", img: "https://tse4.mm.bing.net/th/id/OIP.mTTEYSuTcweeJ3ZRiU2IHwHaFn?r=0&rs=1&pid=ImgDetMain&o=7&rm=3", isFeatured: true },
    { name: "秋ヶ瀬公園", link: "akigase_park.html", img: "https://rental-field.com/park_img/load.php?file=2.jpg&id=63" }
];

function getRandomPark() {
    return PARK_DATA[Math.floor(Math.random() * PARK_DATA.length)];
}

/**
 * 「公園を探す」リンクにランダムな公園のパスを設定
 * イチオシの公園（大和田公園）が選ばれやすいように重み付けを行う
 */
function initRandomParkLinks() {
    const pathname = window.location.pathname;
    const isRoot = pathname.endsWith('/') || pathname.endsWith('index.html') ||
                   (!pathname.includes('/destinations/') && !pathname.includes('/news/') && !pathname.includes('/game/'));

    // パスプレフィックスの決定
    const prefix = isRoot ? 'destinations/' : (pathname.includes('/destinations/') ? '' : '../destinations/');

    // イチオシを優先するロジック（40%の確率でイチオシ、残りをランダム）
    let selectedPark;
    if (Math.random() < 0.4) {
        selectedPark = PARK_DATA.find(p => p.isFeatured) || getRandomPark();
    } else {
        selectedPark = getRandomPark();
    }

    const links = document.querySelectorAll('a');

    links.forEach(link => {
        if (link.textContent.includes('公園を探す')) {
            link.href = `${prefix}${selectedPark.link}`;
            // イチオシの場合はバッジなどを付けることも検討可能（現在はリンク先変更のみ）
        }
    });
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

        // メニュー項目の動的更新
        const nav = menu.querySelector('nav');
        if (nav) {
            const pathname = window.location.pathname;
            const isRoot = pathname.endsWith('/') || pathname.endsWith('index.html') ||
                           (!pathname.includes('/destinations/') && !pathname.includes('/news/') && !pathname.includes('/game/'));

            const rootPrefix = isRoot ? '' : '../';
            const destPrefix = isRoot ? 'destinations/' : (pathname.includes('/destinations/') ? '' : '../destinations/');

            const randomPark = getRandomPark();
            const parkPath = `${destPrefix}${randomPark.link}`;

            nav.innerHTML = `
                <a href="${rootPrefix}index.html" class="flex items-center gap-3">🏠 ホーム</a>
                <a href="${parkPath}" class="flex items-center gap-3">🌳 公園を探す</a>
                <a href="${rootPrefix}map.html" class="flex items-center gap-3">🗺️ マップ</a>
                <a href="${rootPrefix}saitama_mini_game.html" class="flex items-center gap-3">🎮 ゲーム</a>
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

/**
 * アクセシビリティ・パネル（設定画面）の表示切り替え
 * 画面右下の歯車アイコンから呼び出される設定メニューを生成・表示します
 */
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
                            <p class="font-bold text-sm">北浦和公園 / 大宮公園</p>
                            <p class="text-[10px] opacity-60">大宮駅からバスまたは徒歩圏内</p>
                        </div>
                    </div>
                </div>
            </div>

            <ul class="text-sm space-y-2">
                <li><strong class="text-emerald-600">大宮公園:</strong> 大宮公園駅より徒歩10分</li>
                <li><strong class="text-emerald-600">大和田公園:</strong> 大宮公園駅より徒歩15分</li>
                <li><strong class="text-emerald-600">森林公園:</strong> 森林公園駅からバス</li>
            </ul>
        </div>
    `,
    copyright: `
        <h2 class="text-2xl font-bold mb-4">著作権および免責事項について</h2>
        <div class="space-y-4 text-sm leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
            <p class="font-bold text-base border-b-2 border-[var(--primary-color)] pb-1 mb-2">1. 各画像およびメディア素材の著作権帰属</p>
            <p>当ポータルサイト「SAITAMA PARKS」に掲載されているすべての画像、写真、動画、およびその他一切のメディア素材の著作権は、それぞれの権利を有する「各画像の著作権者（撮影者、提供元組織、またはUnsplash等のライセンス取得元）」に帰属します。</p>
            <div class="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 p-3 rounded-r-xl font-bold text-xs my-3 text-[var(--text-color)]">
                ⚠️ 注意事項：各画像の著作権はそれぞれの画像の著作権者に帰属します。無断での転載、複製、二次加工、再配布等の行為は法律により固く禁止されています。
            </div>

            <p class="font-bold text-base border-b-2 border-[var(--primary-color)] pb-1 mb-2 mt-4">2. 本サイトのコンテンツの著作権</p>
            <p>本サイト内のテキスト、ロゴ、レイアウトデザイン、プログラムソースコード（Canvasアニメーション、共通共通スクリプト等）の著作権は、当サイト運営および開発プロジェクトに帰属、またはライセンスに基づいて使用されています。これらについても無断使用はお控えください。</p>

            <p class="font-bold text-base border-b-2 border-[var(--primary-color)] pb-1 mb-2 mt-4">3. 免責事項</p>
            <p>当サイトの情報の正確性・安全性については細心の注意を払っておりますが、その内容を完全に保証するものではありません。利用者が当ポータルサイトの情報を用いて行う一切の行為、およびそれによって生じるいかなる損害・トラブルについて、当プロジェクトおよび運営組織は一切の責任を負いません。現地の案内や各公式ウェブサイトの最新情報を必ず合わせてご確認ください。</p>

            <hr class="border-gray-200 dark:border-gray-700 my-4">
            <p class="text-xs text-center opacity-75">© 2026 Saitama Prefecture Park Guide Portal - Living with nature. All Rights Reserved.</p>
        </div>
    `,
    legal: `
        <h2 class="text-2xl font-bold mb-4">利用規約 (ToS) / EULA</h2>
        <div class="space-y-4 text-xs leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
            <p>本サイト（SAITAMA PARKS 2026）をご利用いただく際は、以下の規約に同意したものとみなします。</p>
            <p><strong>1. AIサービスの利用:</strong> 「AIサイタマニアくん」は試験的な技術を使用しており、情報の正確性を保証しません。埼玉愛が強すぎるあまり不適切な表現（十万石まんじゅうの過度な推奨等）が含まれる場合があります。</p>
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
    /**
     * 各ページの「ここに行った人はここもチェック！」セクションを初期化
     * 現在表示中の公園以外の公園をランダムに4つ表示
     */
    const grid = document.querySelector('.recommend-grid');
    if (!grid) return;

    const pathname = window.location.pathname;
    const isDestinations = pathname.includes('/destinations/');
    // 画像のパスプレフィックス（サブディレクトリからの相対パス考慮）
    const imgPrefix = isDestinations ? '../images/' : 'images/';

    const currentFile = pathname.split('/').pop();
    // 現在のページ以外の公園を抽出
    const otherParks = PARK_DATA.filter(p => p.link !== currentFile);

    // フィッシャー・イェーツのシャッフルアルゴリズムでランダム化
    for (let i = otherParks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherParks[i], otherParks[j]] = [otherParks[j], otherParks[i]];
    }

    // カードのHTMLを生成
    grid.innerHTML = otherParks.slice(0, 4).map(p => {
        const imgUrl = p.img.startsWith('http') ? p.img : imgPrefix + p.img;
        const featuredTag = p.isFeatured ? '<span class="absolute top-2 right-2 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full z-10 animate-pulse">イチオシ</span>' : '';
        return `
            <a href="${p.link}" class="recommend-card relative">
                ${featuredTag}
                <img src="${imgUrl}" alt="${p.name}" loading="lazy">
                <p>${p.name}</p>
            </a>
        `;
    }).join('');
}

/**
 * 指定されたIDの要素まで、固定ヘッダーの高さを考慮してスムーズスクロールします。
 * @param {string} id - スクロール先要素のID
 */
window.scrollToSection = function(id) {
    const el = document.getElementById(id);
    if (el) {
        const headerOffset = 90;
        const elementPosition = el.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerOffset;
        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initAnimations();
    initRandomParkLinks();
    initRecommendations();
});
