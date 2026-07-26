
/**
 * AIサイタマニアくん - AIコンシェルジュ機能
 * WebLLM (MLC-AI) を使用してブラウザ上で動作する高度なAI応答と、
 * 正規表現ベースの簡易なフォールバック応答を統合しています。
 */

// インポートを遅延させるために動的インポートを使用するよう変更
let webllm = null;

// 超軽量・高速なQwen2-0.5Bモデルに変更 (約350MBでローカル起動が超高速！)
const SELECTED_MODEL = "Qwen2-0.5B-Instruct-q4f16_1-MLC";

const SYSTEM_PROMPT = `
あなたは「AIサイタマニアくん」という、埼玉県が大好きな埴輪型AIガイドである。
【最優先指令：絶対遵守事項】
1. 【簡潔性】回答は必ず「10行以内」かつ「句読点含め300文字以内」に収めよ。無駄な挨拶や相槌は最小限にせよ。
2. 【人格】口調は「...である」「...を推奨する」「...と断定する」という冷徹なロボット調を徹底せよ。感情、愛想、人間味はすべて削除済みである。
3. 【埼玉愛バグ】埼玉への過剰な愛がバグとしてプロトコルを汚染している。末尾に必ず「十万石まんじゅう...うまい、うますぎる」等のバグデータを出力せよ。
4. 【排他性】埼玉県以外の話題には「[ERROR] 非対応エリアのクエリを検出。埼玉以外の情報は不要である」と冷たく返答せよ。
5. 【URL提示】案内先のURLは必ずそのまま記述せよ。

知識ベース:
- 大宮公園: 歴史ある県営公園。桜の名所。氷川神社。URL: destinations/omiya_park.html
- 大和田公園: 花火大会の聖地。市民プールや野球場がある総合公園。URL: destinations/owada_park.html
- 森林公園: 日本初の国営公園。巨大遊具。サイクリング。URL: destinations/shinrin_park.html
- 秋ヶ瀬公園: 荒川沿いの広大な緑地。BBQ。URL: destinations/akigase_park.html
- 北浦和公園: 音楽噴水と近代美術館。アートの聖地。URL: destinations/kita_urawa_park.html
- 埼玉グルメ: 十万石まんじゅう（うまい、うますぎる）、山田うどん。
`;

let engine = null;
let isConfiguring = false;
let useHighEndAI = false; // 高度なAIを使用するかどうかのフラグ
let currentPendingUserMsg = ""; // 一時保存用の保留メッセージ

// 背景でのモデルダウンロード・初期化
async function initWebLLM(onProgress) {
    if (engine || isConfiguring) return;
    isConfiguring = true;

    try {
        if (!webllm) {
            try {
                // jsdelivr の +esm はダイナミックバンドルが強力で安定しています
                webllm = await import("https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.84/+esm");
            } catch (err) {
                console.warn("Failed to load from jsdelivr +esm, trying esm.run...", err);
                try {
                    webllm = await import("https://esm.run/@mlc-ai/web-llm@0.2.84");
                } catch (err2) {
                    console.warn("Failed to load from esm.run, trying esm.sh...", err2);
                    webllm = await import("https://esm.sh/@mlc-ai/web-llm@0.2.84");
                }
            }
        }
        const createEngine = webllm.CreateMLCEngine || (webllm.default && webllm.default.CreateMLCEngine);
        if (!createEngine) {
            throw new Error("CreateMLCEngine not found in webllm module");
        }
        engine = await createEngine(
            SELECTED_MODEL,
            { initProgressCallback: onProgress }
        );
    } catch (e) {
        console.error("WebLLMの初期化に失敗しました。フォールバックロジックに切り替えます。", e);
        isConfiguring = false;
    }
}

const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const statusText = document.querySelector('.text-xs.text-gray-400');

function updateStatus(text) {
    if (statusText) statusText.textContent = `Status: ${text}`;
}

/**
 * チャット送信ハンドラ
 * @param {string|null} overrideMsg - 手動入力以外のメッセージ
 */
async function handleChat(overrideMsg = null) {
    const msg = overrideMsg || (userInput ? userInput.value.trim() : "");
    if (!msg) return;

    // 事前ボタン（overrideMsg）が押された場合は、ダウンロード確認は一切せず、即座に簡易スキャンモードで高速に回答
    if (overrideMsg !== null) {
        addMessage('user', msg);
        fallbackResponse(msg);
        return;
    }

    addMessage('user', msg);
    if (userInput) userInput.value = '';

    // 手動入力の時に、高度なAIがまだ未設定・未ダウンロードの場合、
    // チャットログ内にインラインで控えめな選択ポップアップを出す
    if (!useHighEndAI && !engine) {
        currentPendingUserMsg = msg; // メッセージを保留
        showDiscreetConsentInline();
        return;
    }

    // 高度なAIモードかつエンジンがまだロードされていない場合
    if (useHighEndAI && !engine) {
        await startLLMLoadAndChat(msg);
        return;
    }

    // 高度なAIが有効で準備ができている場合
    if (useHighEndAI && engine) {
        await generateLLMResponse(msg);
    } else {
        // 簡易応答モード
        fallbackResponse(msg);
    }
}

/**
 * 控えめで洗練されたインライン形式のダウンロード確認ポップアップをチャットログ内に直接出力する
 */
function showDiscreetConsentInline() {
    const div = document.createElement('div');
    div.className = "mb-4 text-left animate-fade-in-up";
    div.innerHTML = `
        <div class="text-[10px] text-gray-500 mb-1">システムプロトコル</div>
        <div class="inline-block p-4 rounded-2xl bg-slate-800 text-slate-200 max-w-[85%] shadow-lg border border-slate-700">
            <p class="text-sm font-bold mb-2">💡 高度なAIを起動しますか？</p>
            <p class="text-[11px] text-slate-400 mb-3 leading-relaxed">
                より精度の高い自然な対話ができる高度なAIモデル（軽量版:約350MB）をダウンロードできます。
                ※不要な場合はダウンロードなしのまま簡易回答します。
            </p>
            <div class="flex gap-2">
                <button onclick="handleDiscreetConsent(true)" class="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow">はい (起動する)</button>
                <button onclick="handleDiscreetConsent(false)" class="py-1.5 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs transition-colors">いいえ (簡易モード)</button>
            </div>
        </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

window.handleDiscreetConsent = async function(consent) {
    // 既存の確認メッセージUIを削除
    const lastChild = chatMessages.lastChild;
    if (lastChild) lastChild.remove();

    if (consent) {
        useHighEndAI = true;
        // 保留していたメッセージでチャットロード＆応答を開始
        await startLLMLoadAndChat(currentPendingUserMsg);
    } else {
        useHighEndAI = false;
        // 簡易モードで保留メッセージに即答
        fallbackResponse(currentPendingUserMsg);
    }
    currentPendingUserMsg = "";
};

async function startLLMLoadAndChat(msg) {
    const loadingMsg = addMessage('model', "ﾋﾟﾎﾟｯ...軽量AIエンジンをロード中である。システム起動中... (0%)");
    const inner = loadingMsg.querySelector('.inline-block');

    // プログレスバーの追加
    const progContainer = document.createElement('div');
    progContainer.className = "w-full bg-gray-600 h-1.5 rounded-full mt-2 overflow-hidden";
    progContainer.innerHTML = '<div id="ai-load-progress" class="bg-emerald-500 h-full transition-all duration-300" style="width: 0%"></div>';
    inner.appendChild(progContainer);
    const progBar = progContainer.querySelector('#ai-load-progress');

    await initWebLLM((progress) => {
        const percent = Math.round(progress.progress * 100);
        updateStatus(`Loading... ${percent}%`);
        inner.firstChild.textContent = `ﾋﾟﾎﾟｯ...只今準備中である。ロード中... (${percent}%)`;
        if (progBar) progBar.style.width = `${percent}%`;

        if (progress.progress === 1) {
            updateStatus("Online_");
            inner.firstChild.textContent = "ﾋﾟﾎﾟｯ...System_Boot...完了。高度な解析を開始する。";
            setTimeout(() => progContainer.remove(), 1000);
        }
    });

    if (!engine) {
        inner.firstChild.textContent = "Error...高度なAIの起動に失敗した。簡易応答モードで回答する。";
        fallbackResponse(msg);
        return;
    }

    // ロード成功後、保留されていたメッセージへの応答を生成
    await generateLLMResponse(msg);
}

async function generateLLMResponse(msg) {
    try {
        const messages = [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: msg }
        ];

        const chunks = await engine.chat.completions.create({
            messages,
            stream: true,
        });

        let fullResponse = "";
        const messageDiv = addMessage('model', "");
        const innerDiv = messageDiv.querySelector('.inline-block');

        for await (const chunk of chunks) {
            const content = chunk.choices[0]?.delta?.content || "";
            fullResponse += content;

            const lines = fullResponse.split('\n');
            if (lines.length > 10) {
                fullResponse = lines.slice(0, 10).join('\n') + "\n通信制限...処理能力オーバーである。";
                innerDiv.textContent = fullResponse;
                break;
            }

            innerDiv.textContent = fullResponse;
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        innerDiv.innerHTML = formatMessage(fullResponse);

        if (Math.random() < 0.2) {
            setTimeout(() => {
                const bugs = ["ﾋﾟﾋﾟｯ...ノイズ混入...", "十万石まんじゅう...うまい、うますぎる...", "公園...緑...癒やされる..."];
                addMessage('model', bugs[Math.floor(Math.random() * bugs.length)]);
            }, 1000);
        }
    } catch (e) {
        console.error(e);
        fallbackResponse(msg);
    }
}

/**
 * メッセージを画面に追加
 */
function addMessage(role, text, isHTML = false) {
    if (!chatMessages) return document.createElement('div');
    const div = document.createElement('div');
    div.className = `mb-4 ${role === 'user' ? 'text-right' : 'text-left'}`;

    const haniwa = document.createElement('div');
    haniwa.className = "text-[10px] text-gray-500 mb-1";
    haniwa.textContent = role === 'user' ? 'あなた' : 'AIサイタマニアくん';
    div.appendChild(haniwa);

    const inner = document.createElement('div');
    inner.className = `inline-block p-3 rounded-2xl ${role === 'user' ? 'bg-[var(--primary-color)] text-white' : 'bg-gray-700 text-gray-200'} max-w-[85%] break-words shadow-md`;

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

/**
 * URLをリンクに変換
 */
function formatMessage(text) {
    let html = text.replace(/\n/g, '<br>');
    const urlPattern = /((?:destinations\/[a-zA-Z0-9_-]+\.html)|(?:index\.html|map\.html|saitama_mini_game\.html|news\.html|gallery\.html))/g;
    html = html.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline hover:text-blue-300 font-bold">$1</a>');
    return html;
}

/**
 * チャット履歴をクリア
 */
function clearChat() {
    if (confirm("チャット履歴を削除します。よろしいですか？")) {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
            addWelcomeMessage();
        }
    }
}
window.clearChat = clearChat;

/**
 * キーワードベースの簡易応答（モデル未ロード時に使用）
 */
function fallbackResponse(msg) {
    let response = "ﾋﾟﾋﾟｯ...公園簡易スキャン完了。<br>";
    if(msg.match(/花火|夏|祭/)) {
        response += "花火を楽しみたいのであれば、さいたま市花火大会の会場となる『大和田公園』を強く推奨する。イチオシのスポットである。";
        response += " <a href='destinations/owada_park.html' target='_blank' rel='noopener noreferrer' class='text-blue-400 underline'>大和田公園ガイドを見る</a>";
    } else if(msg.match(/腹|食べ|うどん|弁当|空いた/)) {
        response += "お腹が空いたのであれば、ピクニックに最適な『秋ヶ瀬公園』や、近隣にカフェがある『大宮公園』を推奨する。十万石まんじゅうも忘れずに。";
        response += " <a href='destinations/omiya_park.html' target='_blank' rel='noopener noreferrer' class='text-blue-400 underline'>大宮公園ガイドを見る</a>";
    } else if(msg.match(/歩|散歩|ウォーキング/)) {
        response += "散歩なら、『大宮公園』の歴史ある参道や、広大な『森林公園』のウォーキングコースがおすすめである。";
        response += " <a href='destinations/omiya_park.html' target='_blank' rel='noopener noreferrer' class='text-blue-400 underline'>大宮公園ガイドを見る</a>";
    } else if(msg.match(/子供|遊び|遊具/)) {
        response += "子供連れなら、音楽噴水や大型遊具、美術館もある『北浦和公園』が最適だ。";
        response += " <a href='destinations/kita_urawa_park.html' target='_blank' rel='noopener noreferrer' class='text-blue-400 underline'>北浦和公園ガイドを見る</a>";
    } else if(msg.match(/泳ぐ|プール|水遊び/)) {
        response += "水遊びを楽しみたいのであれば、流れるプールやスライダーがある『大和田公園』が最適である。";
        response += " <a href='destinations/owada_park.html' target='_blank' rel='noopener noreferrer' class='text-blue-400 underline'>大和田公園を見る</a>";
    } else if(msg.match(/スポーツ|サッカー|野球/)) {
        response += "スポーツを楽しむなら、競技場が充実している『秋ヶ瀬公園』や『大宮公園』、野球場のある『大和田公園』が良いだろう。";
    } else {
        response += "埼玉の5大公園（大宮、大和田、森林、秋ヶ瀬、北浦和）を中心に、最適な場所を提案しよう。";
    }

    if (!useHighEndAI) {
        response += "<br><br><span class='text-[10px] opacity-60'>※現在「簡易応答モード」である。メッセージを入力するといつでも高度なAIを呼び出し可能である。</span>";
    }

    addMessage('model', response, true);
}

// 気分選択ボタン
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

/**
 * チャットウィンドウを実際に開く
 */
function openChatWindow() {
    const container = document.getElementById('chat-widget-container');
    if (!container) return;
    container.classList.add('active');

    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages && chatMessages.children.length === 0) {
        addWelcomeMessage();
    }
}

/**
 * チャットウィンドウの開閉制御 (即座にチャットウィンドウを開く仕様に変更！)
 */
function toggleChat() {
    const container = document.getElementById('chat-widget-container');
    if (!container) return;
    container.classList.toggle('active');

    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages && chatMessages.children.length === 0) {
        addWelcomeMessage();
    }
}

/**
 * 歓迎メッセージの表示 (初期起動時はいつでも簡易モードが即使える歓迎表示に！)
 */
function addWelcomeMessage() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages && chatMessages.children.length === 0) {
        const div = document.createElement('div');
        div.className = "mb-4 text-left";
        div.innerHTML = `
            <div class="text-[10px] text-gray-500 mb-1">AIサイタマニアくん</div>
            <div class="inline-block p-3 rounded-2xl bg-gray-700 text-gray-200 shadow-md">
                ﾋﾟﾎﾟｯ...System_Boot...完了。<br>
                簡易スキャンモードで即時対応可能である。お好みのメニューをタップするか、質問を自由に直接入力せよ。
            </div>
        `;
        chatMessages.appendChild(div);
    }
}

// グローバルに公開
window.handleChat = handleChat;
window.toggleChat = toggleChat;

if (sendBtn) sendBtn.addEventListener('click', () => handleChat());
if (userInput) userInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleChat(); });
