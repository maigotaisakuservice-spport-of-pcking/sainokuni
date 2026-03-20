
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
    if (!progressBar) return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = (scrollTop / scrollHeight) * 100;
    progressBar.style.width = progress + '%';

    // FAB の表示制御
    const goTopBtn = document.querySelector('.go-to-top-button');
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
            // クーポンメニューを表示
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
                <p class="text-sm text-yellow-700 mb-4">秘密のクーポンが発行されました。ハンバーガーメニューからいつでも確認できます。</p>
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

// 読み上げ機能の強化（共通化）
function readPageText() {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    } else {
        // mainタグがない場合はbody全体から取得
        const mainEl = document.querySelector('main') || document.body;
        // スクリプトやスタイル、メニューなどを除いたテキストのみを取得
        const clone = mainEl.cloneNode(true);
        const scripts = clone.querySelectorAll('script, style, #menu-content, header, footer');
        scripts.forEach(s => s.remove());

        const textToRead = clone.innerText || clone.textContent;
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = 'ja-JP';
        utterance.rate = 1.0;

        // ブラウザによっては初回クリック時に発音しない場合があるため、明示的にresumeを試みる
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
    }
}

// ハンバーガーメニュー制御
function toggleMenu() {
    const menu = document.getElementById('menu-content');
    const overlay = document.getElementById('menu-overlay');
    menu.classList.toggle('active');
    overlay.classList.toggle('active');
}

document.addEventListener('DOMContentLoaded', () => {
    // クーポン解除状態の確認
    const couponLink = document.getElementById('coupon-menu-item');
    if (couponLink) {
        const isUnlocked = localStorage.getItem('saitama-coupon-unlocked') === 'true';
        if (isUnlocked) {
            couponLink.classList.remove('hidden');
        }
    }
});
