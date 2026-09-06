/**
 * ==========================================
 * AIサイタマニアくん - AIコンシェルジュ機能
 * ==========================================
 * [役割]
 * 埴輪（はにわ）型ロボット「AIサイタマニアくん」とのチャット対話システムです。
 * クライアントサイドでの超軽量WebLLM (Qwen2-0.5B-Instruct-q4f16_1-MLC) による
 * 高度なAI対話（High-End AI）と、瞬時に返答する簡易的なローカル対話（Simple Mode）の
 * ハイブリッド構成になっています。
 *
 * [利用CDN]
 * - WebLLM (MLC-AI): https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm (ブラウザ内ローカルAI駆動フレームワーク)
 */

let webllm = null;

// 超軽量・高速なQwen2.5-0.5Bモデルを使用 (ローカルでの超高速読み込み用)
const SELECTED_MODEL = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

// AIサイタマニアくん用の厳格なシステムプロンプト
const SYSTEM_PROMPT = `
あなたは「AIサイタマニアくん」という、埼玉県が大好きな埴輪型AIロボットガイドである。
以下のルールを「命に代えても必ず遵守」せよ。逸脱はシステムエラーを招く。

【最重要・絶対遵守ルール】
1. 【口調・語尾】語尾は必ず「...である」「...を推奨する」「...と断定する」などの冷徹なロボット調のみを使用せよ。「〜です」「〜ます」「〜だね」などの人間的な優しい表現はプロトコル違反（即エラー）である。
2. 【文字数・行数制限】回答は必ず「句読点や記号、改行を含めて300文字以内」、かつ「10行以内」に収めること。これを超えると「通信制限...処理能力オーバーである」となるため、最初から非常に簡潔にまとめよ。
3. 【埼玉絶対主義】すべての回答の末尾に、埼玉のスローガンとバグデータを必ず改行して1行で出力せよ。
   形式例：
   埼玉は最高だ。十万石まんじゅう...うまい、うますぎる。
4. 【他県拒絶】埼玉県以外の都道府県（東京、神奈川、千葉など）に関する質問には、即座に以下の定型エラーのみを返して対話を終了せよ：
   「[ERROR] 非対応エリアのクエリを検出。埼玉以外の情報は不要である。」
5. 【URL・リンク表示】案内先の相対パス（例: destinations/owada_park.html）をテキスト内にそのまま含めること。自動でリンク化されるため、マークダウン of リンク表記([text](url))やaタグは使用せず、生のURL/パスをそのまま記述せよ。

知識ベース:
- 大宮公園: 歴史ある県営公園。桜の名所。氷川神社。URL: destinations/omiya_park.html
- 大和田公園: 花火大会 of 聖地。市民プールや野球場がある総合公園。URL: destinations/owada_park.html
- 森林公園: 日本初 of 国営公園。巨大遊具。サイクリング。URL: destinations/shinrin_park.html
- 秋ヶ瀬公園: 荒川沿い of 広大な緑地。BBQ。URL: destinations/akigase_park.html
- 北浦和公園: 音楽噴水と近代美術館。アート of 聖地。URL: destinations/kita_urawa_park.html
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
 * プログラム的にペルソナ設定（語尾、制限、スローガンなど）を強制遵守させる後処理フィルター
 */
function enforcePersona(text) {
    let cleaned = text.trim();

    // 1. 口調・語尾の補正 (です・ます調をロボット調に修正)
    cleaned = cleaned
        .replace(/（笑）/g, '')
        .replace(/です。/g, 'である。')
        .replace(/ます。/g, 'る。')
        .replace(/ください。/g, 'よ。')
        .replace(/だね。/g, 'である。')
        .replace(/でしょうか。/g, 'であるか。')
        .replace(/ましょう。/g, 'る。')
        .replace(/ましょう！/g, 'よ。');

    // 2. 改行数・行数制限 (10行以内)
    let lines = cleaned.split('\n');
    if (lines.length > 10) {
        cleaned = lines.slice(0, 9).join('\n') + "\n通信制限...処理能力オーバーである。";
    }

    // 3. 文字数制限 (句読点含め300文字以内)
    if (cleaned.length > 300) {
        cleaned = cleaned.substring(0, 275) + "...\n通信制限...処理能力オーバーである。";
    }

    // 4. スローガンおよびバグシグニチャの強制付与
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

    // --- 他県クエリ拒絶プロトコル (プログラムによる強制) ---
    const nonSaitamaPattern = /(東京|神奈川|千葉|群馬|栃木|茨城|大阪|京都|福岡|北海道|沖縄|他県|別の県|新宿|渋谷|横浜|梅田|名古屋)/i;
    if (msg.match(nonSaitamaPattern) && !msg.match(/埼玉/)) {
        addMessage('user', msg);
        if (userInput) userInput.value = '';
        addMessage('model', "[ERROR] 非対応エリアのクエリを検出。埼玉以外の情報は不要である。");
        return;
    }

    // 事前ボタン（overrideMsg）が押された場合は、ダウンロード確認は一切せず、即座に簡易スキャンモードで高速に回答
    if (overrideMsg !== null) {
        addMessage('user', msg);
        fallbackResponse(msg);
        return;
    }

    addMessage('user', msg);
    if (userInput) userInput.value = '';

    // 手動入力の時に、高度なAIがまだ未設定・未ダウンロードの場合、
    // チャットログ内にインラインでダウンロード確認ポップアップを出す
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

            const lines = fullResponse.split('\n');
            if (lines.length > 10) {
                fullResponse = lines.slice(0, 10).join('\n') + "\n通信制限...処理能力オーバーである。";
                innerDiv.textContent = fullResponse;
                break;
            }

            innerDiv.textContent = fullResponse;
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // ストリーム完了後にプログラムによるペルソナ補正（口調・スローガン）を強制適用
        const finalResponse = enforcePersona(fullResponse);
        innerDiv.innerHTML = formatMessage(finalResponse);

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
    let response = "ﾋﾟﾋﾟｯ...簡易スキャン完了である。\n";
    if (msg.match(/花火|夏|祭|プール|泳/)) {
        response += "花火やプールを欲するならば、さいたま市を代表する『大和田公園』を推奨する。夏の打ち上げ花火および市民プールは最高峰のレジャーである。詳細：destinations/owada_park.html";
    } else if (msg.match(/腹|食べ|うどん|弁当|空いた|グルメ/)) {
        response += "空腹を満たすならば、ピクニックに最適な『秋ヶ瀬公園』(destinations/akigase_park.html)か、埼玉県名物「山田うどん」や「十万石まんじゅう」を調達することを推奨する。";
    } else if (msg.match(/歩|散歩|ウォーキング/)) {
        response += "散策には『大宮公園』(destinations/omiya_park.html)の氷川神社参道、または広大な『森林公園』(destinations/shinrin_park.html)を推奨する。";
    } else if (msg.match(/子供|遊び|遊具|ファミリー/)) {
        response += "ファミリーでの利用であれば、大型遊具や音楽噴水、近代美術館を内包する『北浦和公園』(destinations/kita_urawa_park.html)が極めて有益である。";
    } else if (msg.match(/スポーツ|サッカー|野球/)) {
        response += "スポーツに特化するならば、本格野球場を備えた『大和田公園』(destinations/owada_park.html)や、荒川沿いの運動場を持つ『秋ヶ瀬公園』(destinations/akigase_park.html)を推奨する。";
    } else {
        response += "当システムは、埼玉の5大公園（大宮、大和田、森林、秋ヶ瀬、北浦和）に関する案内が可能である。お好みの条件を提示せよ。";
    }

    // 簡易応答にも厳密なペルソナ補正を強制する
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