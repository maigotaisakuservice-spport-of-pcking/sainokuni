/**
 * ==========================================
 * AIサイタマニアくん - AIコンシェルジュ機能
 * ==========================================
 * [役割]
 * 埴輪（はにわ）型ロボット「AIサイタマニアくん」とのチャット対話システムです。
 * クライアントサイドでのWebLLM (Qwen2.5-0.5B-Instruct-q4f16_1-MLC) による
 * 高度なAI対話（High-End AI）と、瞬時に返答する簡易的なローカル対話（Simple Mode）の
 * ハイブリッド構成になっています。
 *
 * [利用CDN]
 * - WebLLM (MLC-AI): https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm (ブラウザ内ローカルAI駆動フレームワーク)
 */

let webllm = null;

// 高速かつ日本語対応に優れたQwen2.5-0.5Bモデルを使用
const SELECTED_MODEL = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

// AIサイタマニアくん用の自然で簡潔なシステムプロンプト
const SYSTEM_PROMPT = `あなたは「AIサイタマニアくん」という、埼玉県が大好きな埴輪型ガイドロボットです。
ユーザーに埼玉県の魅力的な公園やスポットを親切に紹介してください。

基本ルール:
1. 語尾は「〜である」「〜を推奨する」「〜だ」などのロボット調で回答してください。
2. 簡潔に200文字程度で分かりやすく回答してください。
3. 語尾または文末に「埼玉は最高だ。十万石まんじゅう...うまい、うますぎる。」というフレーズを含めてください。
4. 埼玉県の5大公園（大宮公園、大和田公園、森林公園、秋ヶ瀬公園、北浦和公園）を中心に案内してください。

おすすめスポット情報:
- 大宮公園: 歴史ある公園。桜の名所。氷川神社隣接。URL: destinations/omiya_park.html
- 大和田公園: 花火大会で有名。市民プールや野球場がある。URL: destinations/owada_park.html
- 森林公園: 国営武蔵丘陵森林公園。広大な自然とサイクリング。URL: destinations/shinrin_park.html
- 秋ヶ瀬公園: 荒川沿いの緑地。バーベキューやスポーツ。URL: destinations/akigase_park.html
- 北浦和公園: 音楽噴水と埼玉県立近代美術館。URL: destinations/kita_urawa_park.html
`;

let engine = null;
let isConfiguring = false;
let useHighEndAI = false; // 高度なAIを使用するかどうかのフラグ
let currentPendingUserMsg = ""; // 一時保存用の保留メッセージ

/**
 * WebLLM エンジンの初期化
 */
async function initWebLLM(onProgress) {
    if (engine || isConfiguring) return;
    isConfiguring = true;

    try {
        if (!webllm) {
            try {
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
 * プログラム的にペルソナ設定（語尾、制限、スローガンなど）を補正するフィルター
 */
function enforcePersona(text) {
    let cleaned = text.trim();

    // 1. 口調・語尾の補正
    cleaned = cleaned
        .replace(/（笑）/g, '')
        .replace(/です。/g, 'である。')
        .replace(/ます。/g, 'る。')
        .replace(/ください。/g, 'よ。')
        .replace(/だね。/g, 'である。')
        .replace(/でしょうか。/g, 'であるか。')
        .replace(/ましょう。/g, 'る。')
        .replace(/ましょう！/g, 'よ。');

    // 2. 文字数制限
    if (cleaned.length > 350) {
        cleaned = cleaned.substring(0, 320) + "...\n通信制限...処理能力オーバーである。";
    }

    // 3. スローガンの付与
    const slogan = "埼玉は最高だ。十万石まんじゅう...うまい、うますぎる。";
    if (!cleaned.includes("埼玉は最高だ") && !cleaned.includes("十万石まんじゅう")) {
        cleaned += "\n" + slogan;
    }

    return cleaned;
}

/**
 * チャット送信ハンドラ
 */
async function handleChat(overrideMsg = null) {
    const msg = overrideMsg || (userInput ? userInput.value.trim() : "");
    if (!msg) return;

    // 他県クエリ拒絶プロトコル
    const nonSaitamaPattern = /(東京|神奈川|千葉|群馬|栃木|茨城|大阪|京都|福岡|北海道|沖縄|他県|別の県|新宿|渋谷|横浜|梅田|名古屋)/i;
    if (msg.match(nonSaitamaPattern) && !msg.match(/埼玉/)) {
        addMessage('user', msg);
        if (userInput) userInput.value = '';
        addMessage('model', "[ERROR] 非対応エリアのクエリを検出。埼玉以外の情報は不要である。");
        return;
    }

    if (overrideMsg !== null) {
        addMessage('user', msg);
        fallbackResponse(msg);
        return;
    }

    addMessage('user', msg);
    if (userInput) userInput.value = '';

    if (!useHighEndAI && !engine) {
        currentPendingUserMsg = msg;
        showDiscreetConsentInline();
        return;
    }

    if (useHighEndAI && !engine) {
        await startLLMLoadAndChat(msg);
        return;
    }

    if (useHighEndAI && engine) {
        await generateLLMResponse(msg);
    } else {
        fallbackResponse(msg);
    }
}

/**
 * 高度なAI使用可否のインライン確認
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
    const lastChild = chatMessages.lastChild;
    if (lastChild) lastChild.remove();

    if (consent) {
        useHighEndAI = true;
        await startLLMLoadAndChat(currentPendingUserMsg);
    } else {
        useHighEndAI = false;
        fallbackResponse(currentPendingUserMsg);
    }
    currentPendingUserMsg = "";
};

/**
 * 高度なAIエンジンのロードとチャット
 */
async function startLLMLoadAndChat(msg) {
    const loadingMsg = addMessage('model', "ﾋﾟﾎﾟｯ...軽量AIエンジンをロード中である。システム起動中... (0%)");
    const inner = loadingMsg.querySelector('.inline-block');

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

    await generateLLMResponse(msg);
}

/**
 * 高度なLLMによる応答の生成
 */
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

            if (fullResponse.length > 350) {
                fullResponse = fullResponse.substring(0, 320) + "...\n通信制限...処理能力オーバーである。";
                innerDiv.textContent = fullResponse;
                break;
            }

            innerDiv.textContent = fullResponse;
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        const finalResponse = enforcePersona(fullResponse);
        innerDiv.innerHTML = formatMessage(finalResponse);
    } catch (e) {
        console.error(e);
        fallbackResponse(msg);
    }
}

/**
 * 画面へのチャットメッセージ追加
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
 * テキスト内のURL/パスを自動的にクリック可能なリンクに変換する
 */
function formatMessage(text) {
    let html = text.replace(/\n/g, '<br>');
    const urlPattern = /((?:destinations\/[a-zA-Z0-9_-]+\.html)|(?:index\.html|map\.html|saitama_mini_game\.html|news\.html|gallery\.html))/g;
    html = html.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline hover:text-blue-300 font-bold">$1</a>');
    return html;
}

/**
 * チャットログの消去
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
 * 簡易スキャンモード (Simple Mode) の応答生成
 */
function fallbackResponse(msg) {
    let response = "ﾋﾟﾋﾟｯ...埼玉の公園情報をスキャンした。\n";
    if (msg.match(/花火|夏|祭|プール|泳/)) {
        response += "花火やプールを楽しむなら『大和田公園』がおすすめである。さいたま市を代表するレジャースポットである。詳細：destinations/owada_park.html";
    } else if (msg.match(/腹|食べ|うどん|弁当|空いた|グルメ/)) {
        response += "ピクニックなら『秋ヶ瀬公園』(destinations/akigase_park.html)が最適である。埼玉名物うどんや十万石まんじゅうの持参を推奨する。";
    } else if (msg.match(/歩|散歩|ウォーキング/)) {
        response += "散策には『大宮公園』(destinations/omiya_park.html)や広大な『森林公園』(destinations/shinrin_park.html)が素晴らしい。";
    } else if (msg.match(/子供|遊び|遊具|ファミリー/)) {
        response += "ファミリーには大型遊具や音楽噴水、近代美術館がある『北浦和公園』(destinations/kita_urawa_park.html)を推す。";
    } else if (msg.match(/スポーツ|サッカー|野球/)) {
        response += "スポーツなら野球場を備える『大和田公園』(destinations/owada_park.html)やグラウンドのある『秋ヶ瀬公園』(destinations/akigase_park.html)が好適である。";
    } else {
        response += "埼玉県には魅力的な5大公園（大宮、大和田、森林、秋ヶ瀬、北浦和）がある。目的や好みに合わせて案内可能である。";
    }

    const processedResponse = enforcePersona(response);
    addMessage('model', formatMessage(processedResponse), true);
}

/**
 * クイック気分選択
 */
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

function toggleChat() {
    const container = document.getElementById('chat-widget-container');
    if (!container) return;
    container.classList.toggle('active');

    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages && chatMessages.children.length === 0) {
        addWelcomeMessage();
    }
}

function addWelcomeMessage() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages && chatMessages.children.length === 0) {
        const div = document.createElement('div');
        div.className = "mb-4 text-left";
        div.innerHTML = `
            <div class="text-[10px] text-gray-500 mb-1">AIサイタマニアくん</div>
            <div class="inline-block p-3 rounded-2xl bg-gray-700 text-gray-200 shadow-md">
                ﾋﾟﾎﾟｯ...System_Boot...完了。<br>
                埼玉県内の公園や魅力について何でも質問してほしい。
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
