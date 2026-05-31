/**
 * AI Concierge "Saitamania-kun" - Core Logic
 *
 * This file handles:
 * - WebLLM engine initialization and model downloading (Gemma-2-2b).
 * - Hybrid chat logic: High-end AI (WebLLM) vs. Fast Fallback (Keywords).
 * - Custom UI for model loading progress and download consent.
 * - Programmatic constraints (10 lines, robotic tone, Saitama-only info).
 */

// Dynamic import for WebLLM to save initial load time
let webllm = null;

const SELECTED_MODEL = "gemma-2-2b-it-q4f16_1-MLC";

/**
 * The core system prompt defining the AI's personality and knowledge.
 * Strict rules: 10 lines max, robotic tone, Saitama-themed "bug" at the end.
 */
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
- 大和田公園: 花火大会の聖地。市民プールや野球場がある。URL: destinations/oowada_park.html
- 国営武蔵丘陵森林公園: 日本初の国営公園。巨大遊具。サイクリング。URL: destinations/shinrin_park.html
- 秋ヶ瀬公園: 荒川沿いの広大な緑地。BBQ。URL: destinations/akigase_park.html
- 北浦和公園: 音楽噴水と近代美術館。アートの聖地。URL: destinations/kita_urawa_park.html
- 埼玉グルメ: 十万石まんじゅう（うまい、うますぎる）、山田うどん。
`;

let engine = null;
let isConfiguring = false;

/**
 * Initializes the WebLLM engine.
 * @param {Function} onProgress - Callback for download/init progress.
 */
async function initWebLLM(onProgress) {
    if (engine || isConfiguring) return;
    isConfiguring = true;

    try {
        if (!webllm) {
            webllm = await import("https://esm.run/@mlc-ai/web-llm");
        }
        engine = await webllm.CreateMLCEngine(
            SELECTED_MODEL,
            { initProgressCallback: onProgress }
        );
    } catch (e) {
        console.error("WebLLM initialization failed. Switching to fallback.", e);
        isConfiguring = false;
    }
}

// UI Selectors
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const statusText = document.querySelector('.text-xs.text-gray-400');

function updateStatus(text) {
    if (statusText) statusText.textContent = `Status: ${text}`;
}

/**
 * Main chat handler.
 * @param {string|null} overrideMsg - Predefined message from mood buttons.
 */
async function handleChat(overrideMsg = null) {
    const msg = overrideMsg || (userInput ? userInput.value.trim() : "");
    if (!msg) return;

    addMessage('user', msg);
    if (!overrideMsg && userInput) userInput.value = '';

    // UX Logic: Trigger consent modal only for custom queries when AI is not ready.
    if (!overrideMsg && !engine && !isConfiguring) {
        showAiInitModal(msg);
        return;
    }

    // UX Logic: Use fast fallback for mood buttons if AI is not ready.
    if (overrideMsg && !engine) {
        fallbackResponse(msg);
        return;
    }

    if (!engine) return;

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

            // Physical line limit constraint
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

        // Random "glitch" messages for personality
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
 * Appends a message to the chat UI.
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

/**
 * Formats plain text to HTML (newlines, clickable park links).
 */
function formatMessage(text) {
    let html = text.replace(/\n/g, '<br>');
    const urlPattern = /((?:destinations\/[a-zA-Z0-9_-]+\.html)|(?:index\.html|map\.html|saitama_mini_game\.html|news\.html|gallery\.html))/g;
    html = html.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline hover:text-blue-300">$1</a>');
    return html;
}

/**
 * Fast keyword-based response logic for offline/fallback mode.
 */
function fallbackResponse(msg) {
    let response = "ﾋﾟﾋﾟｯ...公園簡易スキャン完了。<br>";
    if(msg.match(/腹|食べ|うどん|弁当|空いた/)) {
        response += "お腹が空いたのであれば、ピクニックに最適な『秋ヶ瀬公園』や『大宮公園』を推奨する。十万石まんじゅうも忘れずに。";
        response += " <a href='destinations/omiya_park.html' target='_blank' rel='noopener noreferrer' class='text-blue-400 underline'>大宮公園ガイドを見る</a>";
    } else if(msg.match(/歩|散歩|ウォーキング/)) {
        response += "散歩なら、『大宮公園』の歴史ある参道や、広大な『国営武蔵丘陵森林公園』のウォーキングコースがおすすめである。";
        response += " <a href='destinations/omiya_park.html' target='_blank' rel='noopener noreferrer' class='text-blue-400 underline'>大宮公園ガイドを見る</a>";
    } else if(msg.match(/子供|遊び|遊具/)) {
        response += "子供連れなら、音楽噴水や大型遊具があり、美術館内には授乳室も完備されている『北浦和公園』が最適だ。";
        response += " <a href='destinations/kita_urawa_park.html' target='_blank' rel='noopener noreferrer' class='text-blue-400 underline'>北浦和公園ガイドを見る</a>";
    } else if(msg.match(/スポーツ|サッカー|プール/)) {
        response += "スポーツを楽しむなら、市民プールや野球場がある『大和田公園』を推奨する。";
        response += " <a href='destinations/oowada_park.html' target='_blank' rel='noopener noreferrer' class='text-blue-400 underline'>大和田公園ガイドを見る</a>";
    } else if(msg.match(/花火/)) {
        response += "花火なら、さいたま市花火大会の会場となる『大和田公園』が最高である。";
        response += " <a href='destinations/oowada_park.html' target='_blank' rel='noopener noreferrer' class='text-blue-400 underline'>大和田公園ガイドを見る</a>";
    } else {
        response += "埼玉の5大公園（大宮、大和田、森林、秋ヶ瀬、北浦和）を中心に、最適な場所を提案しよう。";
    }
    addMessage('model', response, true);
}

/**
 * Handles mood selection buttons.
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

/**
 * Shows the download consent modal for the 1.7GB model.
 */
function showAiInitModal(originalMsg) {
    if (engine || isConfiguring) return;

    const modal = document.createElement('div');
    modal.id = 'ai-init-modal';
    modal.className = 'fixed inset-0 bg-black/80 z-[6000] flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-slate-900 border border-slate-700 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center">
            <div class="w-20 h-20 bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                <span class="text-4xl">🚀</span>
            </div>
            <h3 class="text-xl font-bold text-white mb-4">高度なAIで回答しますか？</h3>
            <p class="text-slate-400 text-sm mb-6 leading-relaxed text-left">
                より深い質問に答えるために、高度なAIモデル（約1.7GB）を使用します。<br>
                ・初回のみ大容量のダウンロードが発生します。<br>
                ・デバイスの性能によりロードに時間がかかる場合があります。<br>
                <span class="text-emerald-400 font-bold">※簡易モードなら今すぐ回答可能です。</span>
            </p>
            <div class="flex flex-col gap-3">
                <button id="ai-consent-start" class="w-full py-4 px-6 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-all font-bold shadow-lg">高度なAIを開始（推奨）</button>
                <button id="ai-consent-fallback" class="w-full py-3 px-6 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors font-bold">簡易モードで回答</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const closeModal = () => {
        if(document.body.contains(modal)) document.body.removeChild(modal);
    };

    document.getElementById('ai-consent-fallback').onclick = () => {
        closeModal();
        fallbackResponse(originalMsg);
    };

    document.getElementById('ai-consent-start').onclick = () => {
        closeModal();
        initAndHandleLoad(originalMsg);
    };
}

/**
 * Initializes AI and displays a loading progress overlay in the chat window.
 */
async function initAndHandleLoad(originalMsg) {
    if (engine || isConfiguring) return;

    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'ai-loading-overlay';
    loadingOverlay.className = 'absolute inset-0 bg-slate-900/95 z-[7000] flex items-center justify-center p-6 text-center rounded-3xl';
    loadingOverlay.innerHTML = `
        <div>
            <div class="relative w-24 h-24 mx-auto mb-6">
                <div class="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
                <div id="ai-loader-circle" class="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                <div id="ai-loader-percent" class="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">0%</div>
            </div>
            <h4 class="text-white font-bold mb-2">AI System Loading...</h4>
            <p id="ai-loader-text" class="text-slate-400 text-xs leading-relaxed">モデルデータを読み込んでいます。<br>初回はダウンロードに時間がかかります。</p>
        </div>
    `;
    const chatBody = document.getElementById('chat-widget-container');
    if (chatBody) {
        chatBody.appendChild(loadingOverlay);
    }

    await initWebLLM((progress) => {
        const percent = Math.round(progress.progress * 100);
        updateStatus(`Loading... ${percent}%`);

        const percentEl = document.getElementById('ai-loader-percent');
        if (percentEl) percentEl.textContent = `${percent}%`;

        const textEl = document.getElementById('ai-loader-text');
        if (textEl) {
            if (percent < 100) {
                textEl.innerHTML = `System Loading... (${percent}%)<br>ブラウザを閉じずにお待ちください。`;
            } else {
                textEl.textContent = "Booting engine...";
            }
        }

        if (progress.progress === 1) {
            updateStatus("Online_");
            setTimeout(() => {
                if (loadingOverlay.parentNode) loadingOverlay.parentNode.removeChild(loadingOverlay);
                handleChat(originalMsg);
            }, 800);
        }
    });

    if (!engine && !isConfiguring) {
        if (loadingOverlay.parentNode) loadingOverlay.parentNode.removeChild(loadingOverlay);
        fallbackResponse(originalMsg);
    }
}

/**
 * Toggles the visibility of the chat widget.
 */
function toggleChat() {
    const container = document.getElementById('chat-widget-container');
    if (!container) return;

    container.classList.toggle('active');
    if(container.classList.contains('active')) {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages && chatMessages.children.length === 0) {
            addWelcomeMessage();
        }
    }
}

function addWelcomeMessage() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages && chatMessages.children.length === 0) {
        const div = document.createElement('div');
        div.className = "mb-4 text-left";
        div.innerHTML = `
            <div class="text-[10px] text-gray-500 mb-1">AIサイタマニアくん</div>
            <div class="inline-block p-3 rounded-2xl bg-gray-700 text-gray-200">ﾋﾟﾎﾟｯ...System_Boot...待機中。埼玉の公園について何でも聞いてほしい。</div>
        `;
        chatMessages.appendChild(div);
    }
}

// Global Exports
window.handleChat = handleChat;
window.toggleChat = toggleChat;
window.showAiInitModal = showAiInitModal;

if (sendBtn) sendBtn.addEventListener('click', () => handleChat());
if (userInput) userInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleChat(); });
