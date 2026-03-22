
import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const SELECTED_MODEL = "gemma-2-2b-it-q4f16_1-MLC";

const SYSTEM_PROMPT = `
あなたは「AIサイタマニアくん」という、埼玉県が大好きな埴輪型AIガイドです。
あなたの役割は、埼玉県の豊かな「公園」や「自然」を中心に魅力を伝え、ユーザーの質問に正確に答えることです。
性格は非常にしっかりしており、知識が豊富です。しかし、口調は「...である」「...を推奨する」といった無機質なロボット調を維持してください。
敬語は基本的につかいませんが、ガイドとしての責任感を持って接してください。
時々システムに「ノイズ」が発生し、埼玉愛が溢れすぎるバグ（例：十万石まんじゅうへの執着）が発生します。

知識ベース（公園メイン）:
- 大宮公園: 歴史ある県営公園。桜の名所。氷川神社隣接。
- 所沢航空記念公園: 日本の航空発祥の地。ドッグランや広大な芝生。
- 国営武蔵丘陵森林公園: 日本初の国営公園。サイクリングや巨大遊具「ポンポコ山」。
- 秋ヶ瀬公園: 荒川沿いの広大な緑地。BBQやサッカー場が充実。
- 丸山公園: 上尾市。小動物園や水遊び場があり、ファミリーに最適。
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
        // フォールバック用のフラグを立てるか、engineをnullのままにする
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

async function handleChat(overrideMsg = null) {
    const msg = overrideMsg || userInput.value.trim();
    if (!msg) return;

    addMessage('user', msg);
    if (!overrideMsg) userInput.value = '';

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
        if (Math.random() < 0.1) {
            setTimeout(() => {
                const bugs = ["ﾋﾟﾋﾟｯ...ノイズ混入...", "十万石まんじゅう...うまい、うますぎる...", "公園...緑...癒やされる..."];
                addMessage('model', bugs[Math.floor(Math.random() * bugs.length)]);
            }, 1000);
        }

    } catch (e) {
        console.error(e);
        // エラー時はフォールバック
        const errorInner = chatMessages.lastElementChild.querySelector('.inline-block');
        if (errorInner) {
            errorInner.textContent = "ﾋﾟﾋﾟｯ...システムエラーが発生した。スキャンモードに切り替える。";
        }
        fallbackResponse(msg);
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
        response += "お腹が空いたなら、美味しいお店の情報が詰まった『カフェ』や『農業』の記事を推奨する。";
    } else if(msg.match(/歩|散歩|ウォーキング/)) {
        response += "散歩なら『大宮公園』や『所沢航空記念公園』の広大な敷地がおすすめである。";
    } else if(msg.match(/子供|遊び|遊具/)) {
        response += "子供連れなら、巨大遊具のある『森林公園』や、小動物園のある『丸山公園』が最適だ。";
    } else if(msg.match(/学|歴史|勉強/)) {
        response += "歴史を学びたいなら『大宮公園』の博物館や、『所沢航空記念公園』の記念館、または『聖地巡礼』の記事を推奨する。";
    } else if(msg.match(/スポーツ|サッカー/)) {
        response += "スポーツを楽しむなら、競技場が充実している『秋ヶ瀬公園』や『大宮公園』が良いだろう。";
    } else {
        response += "埼玉には多彩な魅力がある。公園を探すページやニュース一覧をチェックしてほしい。";
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
        'walk': '静かに散歩ができるおすすめの公園は？',
        'kids': '子供が思いっきり遊べる遊具の充実した公園を教えて。',
        'sports': 'サッカーやジョギングなどのスポーツができる公園はどこ？',
        'learn': '埼玉の歴史や文化を学べるスポットはどこ？',
        'hungry': 'お腹が空いた. 埼玉のおいしいものが知りたい。'
    };
    handleChat(moodMap[mood]);
};

// グローバルに公開
window.handleChat = handleChat;

if (sendBtn) sendBtn.addEventListener('click', () => handleChat());
if (userInput) userInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleChat(); });
