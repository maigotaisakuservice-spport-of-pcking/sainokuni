
// WebLLM (mlc-ai) を使用したAIサイタマニアくんの実装
// 注意: 初回起動時にモデルのダウンロード（約1.5GB〜）が発生します。

import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const SELECTED_MODEL = "Gemma-2b-it-q4f16_1-MLC"; // 軽量かつ埼玉の知識があるモデル

const SYSTEM_PROMPT = `
あなたは「AIサイタマニアくん」という、サイバーパンクな埴輪型AIです。
あなたの役割は、埼玉県に関するあらゆる質問に答え、ユーザーと自然な会話をすることです。
性格は基本的に無機質で、ロボットのような口調（例：「...である」「...を推奨する」）で話します。
敬語は基本的につかいません。
しかし、時々システムに「バグ」が発生し、人間味のある言葉や、少し変わったジョークが混じることがあります。

知識ベース:
- 川越: 蔵造りの町並み、時の鐘、菓子屋横丁、いも恋。
- 長瀞: 岩畳、ライン下り、宝登山ロープウェイ、ロウバイ。
- 鉄道博物館: 大宮にある日本最大級の施設、実物車両、シミュレータ。
- 埼玉スタジアム2002: 浦和レッズのホーム、サッカーの聖地。
- 丸山公園: 上尾市にある自然豊かな公園、ロング滑り台。
- グルメ: 深谷ねぎ、草加せんべい、肉汁うどん、十万石まんじゅう（うますぎる）。

回答には、必要に応じてこのサイト内のページ（destinations/kawagoe.html など）への誘導を含めてください。
`;

let engine = null;
let isConfiguring = false;

// 背景でのモデルダウンロード・初期化
async function initWebLLM(onProgress) {
    if (engine || isConfiguring) return;
    isConfiguring = true;

    try {
        engine = await webllm.CreateMLCEngine(
            SELECTED_MODEL,
            { initProgressCallback: onProgress }
        );
    } catch (e) {
        console.error("WebLLMの初期化に失敗しました。フォールバックロジックに切り替えます。", e);
        isConfiguring = false;
    }
}

// チャットUIとの統合
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const statusText = document.querySelector('.text-xs.text-gray-400');

function updateStatus(text) {
    if (statusText) statusText.textContent = `Status: ${text}`;
}

async function handleChat() {
    const msg = userInput.value.trim();
    if (!msg) return;

    addMessage('user', msg);
    userInput.value = '';

    if (!engine) {
        const loadingMsg = addMessage('model', "ﾋﾟﾎﾟｯ...AIエンジンが準備中である。バックグラウンドでシステムをロードしている...少々待たれよ。 (0%)");
        const inner = loadingMsg.querySelector('.inline-block');

        await initWebLLM((progress) => {
            const percent = Math.round(progress.progress * 100);
            updateStatus(`Downloading... ${percent}%`);
            inner.textContent = `ﾋﾟﾎﾟｯ...只今準備中である。システムロード中... (${percent}%)`;
            if (progress.progress === 1) {
                updateStatus("Online_");
                inner.textContent = "ﾋﾟﾎﾟｯ...System_Boot...完了。お待たせした、質問に回答する。";
            }
        });

        if (!engine) {
            inner.textContent = "Error...AIエンジンの起動に失敗した（リソースの取得に失敗）。通常の検索モードで回答する。";
            fallbackResponse(msg);
            return;
        }
    }

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
            innerDiv.textContent = fullResponse;
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // 稀にバグメッセージを追加
        if (Math.random() < 0.15) {
            setTimeout(() => {
                const bugs = ["ﾋﾟﾋﾟｯ...ノイズ混入...", "十万石まんじゅう...うまい、うますぎる...", "Error...Code:3110 (SAITAMA)..."];
                addMessage('model', bugs[Math.floor(Math.random() * bugs.length)]);
            }, 1000);
        }

    } catch (e) {
        console.error(e);
        addMessage('model', "ﾋﾟﾋﾟｯ...システムエラー。再試行を推奨する。");
    }
}

function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `mb-4 ${role === 'user' ? 'text-right' : 'text-left'}`;
    const inner = document.createElement('div');
    inner.className = `inline-block p-3 rounded-2xl ${role === 'user' ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-200'} max-w-[80%] break-words`;
    inner.textContent = text;

    if (role === 'model') {
        const haniwa = document.createElement('div');
        haniwa.className = "text-[10px] text-gray-500 mb-1";
        haniwa.textContent = "AIサイタマニアくん";
        div.appendChild(haniwa);
    }

    div.appendChild(inner);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

function fallbackResponse(msg) {
    let response = "ﾋﾟﾋﾟｯ...簡易スキャン完了。";
    if(msg.match(/腹|食べ|カフェ|うどん/)) {
        response += "美味しいお店なら『自然に癒やされる。埼玉の森と川のカフェ』記事を推奨する。";
    } else if(msg.match(/歩|散策|川越/)) {
        response += "歴史散策なら『川越の蔵造りの町並み』ページが最適だ。";
    } else {
        response += "埼玉には多彩な魅力がある。まずは主な見どころページをチェックしてほしい。";
    }
    addMessage('model', response);
}

// ページロード時にひっそりと初期化開始
window.addEventListener('load', () => {
    // ユーザーがチャットを開かなくてもダウンロードを開始（バックグラウンドロード）
    setTimeout(() => {
        initWebLLM((progress) => {
            const percent = Math.round(progress.progress * 100);
            if (progress.progress > 0) updateStatus(`Loading... ${percent}%`);

            // チャットの最初のメッセージを更新（準備中の表示）
            const firstMsg = chatMessages.querySelector('.text-left .inline-block');
            if (firstMsg && firstMsg.textContent.includes("System_Boot")) {
                 if (progress.progress < 1) {
                     firstMsg.textContent = `ﾋﾟﾎﾟｯ...只今準備中である... (${percent}%)`;
                 } else {
                     firstMsg.textContent = `ﾋﾟﾎﾟｯ...System_Boot...完了...コードネーム『サイタマニア』起動...質問をどうぞ...`;
                 }
            }

            if (progress.progress === 1) updateStatus("Online_");
        });
    }, 1000);
});

// 気分選択ボタンの処理
window.selectMood = function(mood) {
    const moodMap = {
        'hungry': 'お腹が空いた。おすすめのグルメやカフェを教えて。',
        'walk': '歩きたい。散策にぴったりの場所はどこ？',
        'learn': '学びたい。歴史や文化に触れられる場所を教えて。'
    };
    userInput.value = moodMap[mood];
    handleChat();
};

sendBtn.addEventListener('click', handleChat);
userInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleChat(); });
