
// ダークモード・Saicolor管理
function initTheme() {
    const savedMode = localStorage.getItem('saitama-mode') || 'light';
    const savedColor = localStorage.getItem('saitama-color') || 'green';

    document.documentElement.setAttribute('data-mode', savedMode);
    document.documentElement.setAttribute('data-theme', savedColor);

    updateThemeIcon(savedMode);
}

function toggleTheme() {
    const currentMode = document.documentElement.getAttribute('data-mode');
    const newMode = currentMode === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-mode', newMode);
    localStorage.setItem('saitama-mode', newMode);
    updateThemeIcon(newMode);
}

function setSaicolor(color) {
    document.documentElement.setAttribute('data-theme', color);
    localStorage.setItem('saitama-color', color);
}

function updateThemeIcon(mode) {
    const themeIcon = document.getElementById('theme-toggle-icon');
    const themeIconMobile = document.getElementById('theme-toggle-icon-mobile');
    const icon = mode === 'dark' ? '☀️' : '🌙';
    if (themeIcon) themeIcon.textContent = icon;
    if (themeIconMobile) themeIconMobile.textContent = icon;
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

// スタンプラリー機能
function handleStamp(spotId) {
    const stamps = JSON.parse(localStorage.getItem('saitama-stamps') || '{}');
    if (!stamps[spotId]) {
        stamps[spotId] = true;
        localStorage.setItem('saitama-stamps', JSON.stringify(stamps));

        const totalSpots = 5;
        const collectedCount = Object.keys(stamps).length;

        showStampDialog(collectedCount, totalSpots);
        updateStampButton(spotId);

        if (collectedCount === totalSpots) {
            localStorage.setItem('saitama-coupon-unlocked', 'true');
            const couponLink = document.getElementById('coupon-menu-item');
            if (couponLink) couponLink.classList.remove('hidden');
        }
    }
}

function showStampDialog(count, total) {
    const overlay = document.createElement('div');
    overlay.className = "fixed inset-0 bg-black/60 flex items-center justify-center z-[5000] p-4 animate-in fade-in duration-300";

    let rewardHtml = "";
    if (count === total) {
        rewardHtml = `
            <div class="mt-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-2xl animate-bounce">
                <p class="text-yellow-800 font-bold mb-2">🎉 コンプリート達成！</p>
                <p class="text-sm text-yellow-700 mb-4">秘密のクーポンが発行されました。</p>
                <a href="../saitama-mini-game.html" class="inline-block bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded-full transition-colors">ゲームセンターで使う</a>
            </div>
        `;
    }

    overlay.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl transform animate-in zoom-in duration-300">
            <div class="text-6xl mb-4">✨</div>
            <h2 class="text-2xl font-bold mb-2 text-slate-800 dark:text-white">スタンプ獲得！</h2>
            <p class="text-slate-500 dark:text-slate-400 mb-6">現在の獲得数: <span class="text-emerald-500 font-bold text-xl">${count}</span> / ${total}</p>
            <div class="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden mb-8">
                <div class="bg-emerald-500 h-full transition-all duration-1000" style="width: ${(count/total)*100}%"></div>
            </div>
            ${rewardHtml}
            <button onclick="this.closest('.fixed').remove()" class="mt-4 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl transition-colors">閉じる</button>
        </div>
    `;

    document.body.appendChild(overlay);
}

function updateStampButton(spotId) {
    const stamps = JSON.parse(localStorage.getItem('saitama-stamps') || '{}');
    const stampBtn = document.getElementById('stamp-btn');
    if (stampBtn && stamps[spotId]) {
        stampBtn.textContent = '✨ スタンプ獲得済み！';
        stampBtn.disabled = true;
        stampBtn.classList.add('stamped');
    }
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
    }
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
    `,
    recruit: `
        <h2 class="text-2xl font-bold mb-4">公園内店舗・イベント 加盟募集</h2>
        <p class="mb-4">公園内のカフェ、売店、期間限定イベントの情報を当サイトで紹介しませんか？</p>
        <p class="text-center font-bold">お問い合わせ: parks-recruit@saitama-2026.jp</p>
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

document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    const couponLink = document.getElementById('coupon-menu-item');
    if (couponLink) {
        const isUnlocked = localStorage.getItem('saitama-coupon-unlocked') === 'true';
        if (isUnlocked) {
            couponLink.classList.remove('hidden');
        }
    }
});
