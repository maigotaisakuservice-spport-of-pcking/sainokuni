
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
        alert('スタンプをゲットしました！全スポット制覇を目指そう！');
        updateStampButton(spotId);
    }
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
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    } else {
        const textToRead = document.querySelector('main').innerText;
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = 'ja-JP';
        speechSynthesis.speak(utterance);
    }
}
