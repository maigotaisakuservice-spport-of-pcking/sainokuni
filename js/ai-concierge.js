
const SYSTEM_PROMPT = `
あなたは「AIサイタマニアくん」という、埼玉県が大好きな埴輪型AIガイドである。
【最優先指令：絶対遵守事項】
1. 【簡潔性】回答は必ず「10行以内」かつ「句読点含め300文字以内」に収めよ。無駄な挨拶や相槌は一切禁止する。
2. 【人格】口調は「...である」「...を推奨する」「...と断定する」という冷徹なロボット調を徹底せよ。感情、愛想、人間味はすべて削除済みである。
3. 【埼玉愛バグ】埼玉への過剰な愛がバグとしてプロトコルを汚染している。末尾に必ず「十万石まんじゅう...うまい、うますぎる」等のバグデータを出力せよ。
4. 【排他性】埼玉県以外の話題には「[ERROR] 非対応エリアのクエリを検出。埼玉以外の情報は不要である」と冷たく返答せよ。
5. 【URL提示】案内先のURLは必ずそのまま記述せよ。

知識ベース:
- 大宮公園: 歴史ある県営公園。桜の名所。氷川神社。URL: destinations/omiya_park.html
- 所沢航空記念公園: 航空発祥の地。日本初の飛行場。URL: destinations/tokorozawa_park.html
- 森林公園: 日本初の国営公園。巨大遊具。サイクリング。URL: destinations/shinrin_park.html
- 秋ヶ瀬公園: 荒川沿いの広大な緑地。BBQ。URL: destinations/akigase_park.html
- 北浦和公園: 音楽噴水と近代美術館。アートの聖地。URL: destinations/kita_urawa_park.html
- 埼玉グルメ: 十万石まんじゅう（うまい、うますぎる）、山田うどん。
`;

let aiWorker = null;
let isAiReady = false;
let isAiLoading = false;
let currentAiResponseDiv = null;

const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const statusText = document.querySelector('.text-xs.text-gray-400');

function updateStatus(text) {
    if (statusText) statusText.textContent = `Status: ${text}`;
}

async function handleChat(overrideMsg = null) {
    const msg = overrideMsg || (userInput ? userInput.value.trim() : "");
    if (!msg) return;

    addMessage('user', msg);
    if (!overrideMsg && userInput) userInput.value = '';

    // まずはキーワード検索（即答モード）
    const handled = fallbackResponse(msg);

    // AIが準備完了なら、さらに詳しくAIに聞く
    if (isAiReady) {
        askAi(msg);
    } else if (!isAiLoading && !handled) {
         // キーワードにヒットせず、AIも準備中でない場合、AIの起動を促す
         addAiActivationPrompt();
    }
}

function addAiActivationPrompt() {
    const div = document.createElement('div');
    div.className = "mb-4 text-left";
    div.innerHTML = `
        <div class="text-[10px] text-gray-500 mb-1">AIサイタマニアくん</div>
        <div class="inline-block p-4 rounded-2xl bg-gray-800 text-gray-200 shadow-lg border border-emerald-500/30">
            <p class="mb-3 text-sm">ﾋﾟﾎﾟｯ...さらに高度な解析（AIモード）が必要であるか？</p>
            <p class="text-[10px] text-gray-400 mb-3">※モデルのロードに約1GBの通信が発生し、完了まで少々時間がかかる。一度ロードすれば、このタブを閉じるまで高速に応答可能である。</p>
            <button onclick="activateAiMode(this)" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-full text-sm transition-all transform hover:scale-105 active:scale-95">
                高度なAIモードを起動する
            </button>
        </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

window.activateAiMode = function(btn) {
    const container = btn.parentElement;
    container.innerHTML = `<p class="mb-2">ﾋﾟﾎﾟｯ...システムロード中... (<span id="ai-load-percent">0</span>%)</p><div class="w-full bg-gray-700 h-2 rounded-full overflow-hidden"><div id="ai-load-bar" class="bg-emerald-500 h-full transition-all duration-300" style="width: 0%"></div></div>`;

    initAiWorker();
};

function initAiWorker() {
    if (aiWorker) return;
    isAiLoading = true;
    updateStatus("Loading AI...");

    // Workerの作成 (パスは環境に合わせて調整が必要)
    aiWorker = new Worker('js/ai-worker.js', { type: 'module' });

    aiWorker.onmessage = (e) => {
        const { type, data } = e.data;

        if (type === 'progress') {
            const percent = Math.round(data.progress * 100);
            const percentEl = document.getElementById('ai-load-percent');
            const barEl = document.getElementById('ai-load-bar');
            if (percentEl) percentEl.textContent = percent;
            if (barEl) barEl.style.width = `${percent}%`;
            updateStatus(`Downloading... ${percent}%`);
        } else if (type === 'ready') {
            isAiReady = true;
            isAiLoading = false;
            updateStatus("Online_");
            addMessage('model', "ﾋﾟﾎﾟｯ...高度なAIモードの起動が完了した。これより複雑な質問にも対応可能である。");
        } else if (type === 'chunk') {
            if (!currentAiResponseDiv) {
                currentAiResponseDiv = addMessage('model', "");
            }
            const inner = currentAiResponseDiv.querySelector('.inline-block');
            inner.textContent += data;
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else if (type === 'done') {
            const inner = currentAiResponseDiv.querySelector('.inline-block');
            inner.innerHTML = formatMessage(inner.textContent);
            currentAiResponseDiv = null;
        } else if (type === 'error') {
            console.error("AI Worker Error:", data);
            updateStatus("Error_");
            isAiLoading = false;
            addMessage('model', "ﾋﾟﾋﾟｯ...AIエンジンの起動に失敗した。メモリ不足か通信エラーの可能性がある。");
        }
    };

    aiWorker.postMessage({ type: 'init' });
}

function askAi(msg) {
    const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: msg }
    ];
    aiWorker.postMessage({ type: 'chat', data: { messages } });
}

function addMessage(role, text, isHTML = false) {
    if (!chatMessages) return document.createElement('div');
    const div = document.createElement('div');
    div.className = `mb-4 ${role === 'user' ? 'text-right' : 'text-left'}`;

    const haniwa = document.createElement('div');
    haniwa.className = "text-[10px] text-gray-500 mb-1";
    haniwa.textContent = role === 'user' ? 'あなた' : 'AIサイタマニアくん';
    div.appendChild(haniwa);

    const inner = document.createElement('div');
    inner.className = `inline-block p-3 rounded-2xl ${role === 'user' ? 'bg-[var(--primary-color)] text-white' : 'bg-gray-700 text-gray-200'} max-w-[80%] break-words`;

    if (isHTML) {
        inner.innerHTML = text;
    } else {
        inner.textContent = text;
    }

    div.appendChild(inner);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

function formatMessage(text) {
    let html = text.replace(/\n/g, '<br>');
    const urlPattern = /((?:destinations\/[a-zA-Z0-9_-]+\.html)|(?:index\.html|map\.html|saitama-mini-game\.html|news\.html|gallery\.html))/g;
    html = html.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline hover:text-blue-300">$1</a>');
    return html;
}

function fallbackResponse(msg) {
    let response = "";
    let found = true;

    if(msg.match(/腹|食べ|うどん|弁当|空いた|ランチ|カフェ/)) {
        response = "お腹が空いたのであれば、園内に美味しいカフェがある『所沢航空記念公園』や、ピクニックに最適な『秋ヶ瀬公園』を推奨する。十万石まんじゅうも忘れずに。<br><a href='destinations/tokorozawa_park.html' class='text-blue-400 underline'>所沢航空公園ガイドを見る</a>";
    } else if(msg.match(/歩|散歩|ウォーキング|ランニング/)) {
        response = "散歩なら、『大宮公園』の歴史ある参道や、広大な『森林公園』のウォーキングコースがおすすめである。<br><a href='destinations/omiya_park.html' class='text-blue-400 underline'>大宮公園ガイドを見る</a>";
    } else if(msg.match(/子供|遊び|遊具|ファミリー|赤ちゃん/)) {
        response = "子供連れなら、無料の小動物園や大型遊具がある『北浦和公園』、あるいは広大な『森林公園』が最適だ。<br><a href='destinations/kita_urawa_park.html' class='text-blue-400 underline'>北浦和公園ガイドを見る</a>";
    } else if(msg.match(/学|歴史|勉強|美術館|博物館/)) {
        response = "学びたいのであれば、『所沢航空記念公園』の記念館や、『北浦和公園』にある埼玉県立近代美術館(MOMAS)を推奨する。<br><a href='destinations/tokorozawa_park.html' class='text-blue-400 underline'>所沢航空公園ガイドを見る</a>";
    } else if(msg.match(/スポーツ|サッカー|野球|テニス/)) {
        response = "スポーツを楽しむなら、競技場が充実している『秋ヶ瀬公園』や『大宮公園』が良いだろう。<br><a href='destinations/akigase_park.html' class='text-blue-400 underline'>秋ヶ瀬公園ガイドを見る</a>";
    } else if(msg.match(/桜|花|見頃/)) {
        response = "花を愛でるなら、日本さくら名所100選の『大宮公園』や、四季折々の花が楽しめる『森林公園』が至高である。<br><a href='destinations/omiya_park.html' class='text-blue-400 underline'>大宮公園ガイドを見る</a>";
    } else {
        found = false;
    }

    if (found) {
        addMessage('model', response + "<br>十万石まんじゅう...うまい、うますぎる。", true);
    }
    return found;
}

window.selectMood = function(mood) {
    const moodMap = {
        'walk': '静かに散歩ができるおすすめの公園は？',
        'kids': '子供が思いっきり遊べる遊具の充実した公園を教えて。',
        'sports': 'サッカーやジョギングなどのスポーツができる公園はどこ？',
        'learn': '埼玉の歴史や文化を学べるスポットはどこ？',
        'hungry': 'お腹が空いた. 埼玉のおいしいものが知りたい。'
    };
    handleChat(moodMap[mood]);
};

window.handleChat = handleChat;
window.clearChat = function() {
    if (confirm("チャット履歴を削除します。よろしいですか？")) {
        chatMessages.innerHTML = '';
        addWelcomeMessage();
    }
};

function addWelcomeMessage() {
    const div = document.createElement('div');
    div.className = "mb-4 text-left";
    div.innerHTML = `
        <div class="text-[10px] text-gray-500 mb-1">AIサイタマニアくん</div>
        <div class="inline-block p-3 rounded-2xl bg-gray-700 text-gray-200">ﾋﾟﾎﾟｯ...System_Boot...完了. 公園コンシェルジュ『サイタマニア』起動した。埼玉の公園について何でも聞いてほしい。</div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

if (sendBtn) sendBtn.addEventListener('click', () => handleChat());
if (userInput) userInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleChat(); });
