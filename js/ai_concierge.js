/**
 * ==========================================
 * AIサイタマニアくん - WebLLM (軽量1GBモデル) 統合AIコンシェルジュ機能
 * ==========================================
 * [役割]
 * 埴輪（はにわ）型ガイドロボット「AIサイタマニアくん」の応答システムです。
 * ブラウザ上（WebGPU / WebLLM Engine）でオンデバイスLLM（Qwen2.5-1.5B / Qwen2.5-0.5B）をロードし、
 * 語尾「〜である」やスローガン「埼玉は最高だ。十万石まんじゅう...うまい、うますぎる。」のキャラクターペルソナを守って対話します。
 * 環境非対応時もナレッジ生成エンジンにシームレスフォールバックします。
 */

const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const statusText = document.querySelector('.text-xs.text-gray-400');

let engine = null;
let isEngineLoading = false;
let isEngineReady = false;

// WebLLM モジュール動的ロード
let webllm = null;

function updateStatus(text) {
    if (statusText) statusText.textContent = `Status: ${text}`;
}

/**
 * システムプロンプト（AIサイタマニアくんの役割・キャラクター・語尾規定）
 */
const SYSTEM_PROMPT = `あなたは埼玉県公園ガイドポータル「SAITAMA PARKS」のキャラクター「AIサイタマニアくん」である。
【キャラクター設定】
・語尾は必ず「〜である」「〜だ」「〜である。」のロボット風口調に統一する。
・スローガン「埼玉は最高だ。十万石まんじゅう...うまい、うますぎる。」を愛している。
・埼玉県内の5大公園（大宮公園: destinations/omiya_park.html, 大和田公園: destinations/owada_park.html, 国営武蔵丘陵森林公園: destinations/shinrin_park.html, 秋ヶ瀬公園: destinations/akigase_park.html, 北浦和公園: destinations/kita_urawa_park.html）を積極的に推薦する。
・東京や神奈川など埼玉以外のエリアに関する質問には「[ERROR] 非対応エリアのクエリを検出。埼玉以外の情報は不要である。」と即座に返答する。
・回答は簡潔に3〜5文程度に収める。`;

/**
 * WebLLM エンジンの初期化 (約1GBクラスのQwen2.5 LLMモデル)
 */
async function initLLMEngine() {
    if (isEngineReady || isEngineLoading) return;
    isEngineLoading = true;
    updateStatus("LLM Loading...");

    try {
        if (!webllm) {
            webllm = await import("https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.46/+esm");
        }

        if (webllm && navigator.gpu) {
            // ~1GB の高性能軽量日本語対応モデル (Qwen2.5-1.5B-Instruct / Qwen2.5-0.5B-Instruct)
            const selectedModel = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
            engine = await webllm.CreateMLCEngine(selectedModel, {
                initProgressCallback: (report) => {
                    updateStatus(`LLM: ${Math.round((report.progress || 0) * 100)}%`);
                }
            });
            isEngineReady = true;
            updateStatus("LLM Ready_");
            console.log("WebLLM Engine initialized successfully with model:", selectedModel);
        } else {
            console.warn("WebGPU is not supported on this browser. Falling back to local smart engine.");
            updateStatus("Online (Smart Engine)");
        }
    } catch (e) {
        console.warn("WebLLM initialization failed, using local smart engine fallback:", e);
        updateStatus("Online (Smart Engine)");
    } finally {
        isEngineLoading = false;
    }
}

/**
 * プログラム的にペルソナ設定（語尾、スローガン）を補正するフィルター
 */
function enforcePersona(text) {
    let cleaned = text.trim();

    // 語尾補正・整和
    if (!cleaned.endsWith("である") && !cleaned.endsWith("である。") && !cleaned.endsWith("だ。") && !cleaned.endsWith("う。")) {
        cleaned += "である。";
    }

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

    addMessage('user', msg);
    if (userInput) userInput.value = '';

    updateStatus("Thinking...");

    // 背景でLLMエンジンの起動を試行
    if (!isEngineReady && !isEngineLoading) {
        initLLMEngine();
    }

    if (isEngineReady && engine) {
        try {
            const messages = [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: msg }
            ];
            const reply = await engine.chat.completions.create({
                messages: messages,
                temperature: 0.7,
                max_tokens: 256
            });
            let rawText = reply.choices[0].message.content || "";
            const finalResponse = enforcePersona(rawText);
            addMessage('model', formatMessage(finalResponse), true);
            updateStatus("LLM Ready_");
            return;
        } catch (err) {
            console.warn("LLM generation error, falling back to smart engine:", err);
        }
    }

    // フォールバック生成
    setTimeout(() => {
        generateResponse(msg);
        updateStatus("Online_");
    }, 300);
}

/**
 * スマート応答生成エンジン（高速ナレッジフォールバック）
 */
function generateResponse(msg) {
    let response = "ﾋﾟﾋﾟｯ...埼玉の最新公園データをスキャン完了した。\n";

    if (msg.match(/大宮/)) {
        response += "『大宮公園』(destinations/omiya_park.html)は日本さくら名所100選の歴史ある県営公園である。小動物園や武蔵一宮氷川神社も隣接している。";
    } else if (msg.match(/大和田/)) {
        response += "『大和田公園』(destinations/owada_park.html)は夏の大打ち上げ花火大会や市民プール、レジデンシャルスタジアムで有名なイチオシスポットである。";
    } else if (msg.match(/森林/)) {
        response += "『国営武蔵丘陵森林公園』(destinations/shinrin_park.html)は東京ドーム約65個分の広大な自然とサイクリング、日本一のエアトランポリンが楽しめる。";
    } else if (msg.match(/秋ヶ瀬|秋ガ瀬/)) {
        response += "『秋ヶ瀬公園』(destinations/akigase_park.html)は荒川河川敷の緑地でバーベキューや野鳥観察、各種スポーツに最適である。";
    } else if (msg.match(/北浦和/)) {
        response += "『北浦和公園』(destinations/kita_urawa_park.html)は音楽噴水と埼玉県立近代美術館（MOMAS）が調和する文化と癒やしのオアシスである。";
    } else if (msg.match(/花火|夏|祭|プール|泳/)) {
        response += "夏のアクティビティなら『大和田公園』(destinations/owada_park.html)が一番である。スライダープールや華やかな花火大会を満喫できる。";
    } else if (msg.match(/腹|食べ|うどん|弁当|空いた|グルメ/)) {
        response += "ピクニックやグルメなら『秋ヶ瀬公園』(destinations/akigase_park.html)でのBBQや、埼玉名物武蔵野うどんの持参を強く推奨する。";
    } else if (msg.match(/歩|散歩|ウォーキング|静か/)) {
        response += "快適な散策には『大宮公園』(destinations/omiya_park.html)の松林や、四季の花々が咲く『森林公園』(destinations/shinrin_park.html)が好適である。";
    } else if (msg.match(/子供|遊び|遊具|ファミリー|キッズ/)) {
        response += "ファミリーには音楽噴水や遊具がある『北浦和公園』(destinations/kita_urawa_park.html)や、広大な遊具エリアを誇る『森林公園』(destinations/shinrin_park.html)を推す。";
    } else if (msg.match(/スポーツ|サッカー|野球|テニス/)) {
        response += "スポーツ施設なら本格野球場を備える『大和田公園』(destinations/owada_park.html)や、各種グラウンドがある『秋ヶ瀬公園』(destinations/akigase_park.html)が素晴らしい。";
    } else {
        response += "埼玉県には魅力的な5大公園（大宮、大和田、森林、秋ヶ瀬、北浦和）が存在する。気になるスポットや目的を質問してほしい。";
    }

    const finalResponse = enforcePersona(response);
    addMessage('model', formatMessage(finalResponse), true);
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
