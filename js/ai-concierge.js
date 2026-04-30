
// インポートを遅延させるために動的インポートを使用するよう変更
let webllm = null;

const SELECTED_MODEL = "gemma-2-2b-it-q4f16_1-MLC";

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
- 北浦和公園: 音楽噴水と近代美術館。アートの聖地。URL: destinations/kita-urawa-park.html
- 埼玉グルメ: 十万石まんじゅう（うまい、うますぎる）、山田うどん。

回答例:
「大宮公園を推奨する。桜の名所であり、氷川神社に隣接している。
詳細は destinations/omiya_park.html を参照せよ。
十万石まんじゅう...うまい、うますぎる。」
`;

let engine = null;
let isConfiguring = false;

// 背景でのモデルダウンロード・初期化
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
        console.error("WebLLMの初期化に失敗しました。フォールバックロジックに切り替えます。", e);
        isConfiguring = false;
        // フォールバック用のフラグを立てるか、engineをnullのままにする
    }
}

// セレクタの存在確認を事前に行う
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

            // 物理的な行数制限の強制 (10行を超えたらカット)
            const lines = fullResponse.split('\n');
            if (lines.length > 10) {
                fullResponse = lines.slice(0, 10).join('\n') + "\n通信制限...処理能力オーバーである。";
                innerDiv.textContent = fullResponse;
                break;
            }

            innerDiv.textContent = fullResponse;
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // 最終的なレスポンスにリンク変換を適用
        innerDiv.innerHTML = formatMessage(fullResponse);

        // 稀にバグメッセージを追加
        if (Math.random() < 0.2) {
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

function addMessage(role, text, isHTML = false) {
    if (!chatMessages) return document.createElement('div');
    const div = document.createElement('div');
    div.className = `mb-4 ${role === 'user' ? 'text-right' : 'text-left'}`;

    const haniwa = document.createElement('div');
    haniwa.className = "text-[10px] text-gray-500 mb-1";
    haniwa.textContent = role === 'user' ? 'あなた' : 'AIサイタマニアくん';
    div.appendChild(haniwa);

    const inner = document.createElement('div');
    // テーマ変数を反映するように変更
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
    // 改行を<br>に変換
    let html = text.replace(/\n/g, '<br>');
    // URL (destinations/xxx.html or root level .html files) をaタグに変換
    // サイト内の主要なHTMLファイルに対応
    const urlPattern = /((?:destinations\/[a-zA-Z0-9_-]+\.html)|(?:index\.html|map\.html|saitama-mini-game\.html|news\.html|gallery\.html))/g;
    html = html.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline hover:text-blue-300">$1</a>');
    return html;
}

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

function fallbackResponse(msg) {
    let response = "ﾋﾟﾋﾟｯ...公園簡易スキャン完了。<br>";
    if(msg.match(/腹|食べ|うどん|弁当|空いた/)) {
        response += "お腹が空いたのであれば、園内に美味しいカフェがある『所沢航空記念公園』や、ピクニックに最適な『秋ヶ瀬公園』を推奨する。十万石まんじゅうも忘れずに。";
        response += " <a href='destinations/tokorozawa_park.html' target='_blank' rel='noopener noreferrer' class='text-blue-400 underline'>所沢航空公園ガイドを見る</a>";
    } else if(msg.match(/歩|散歩|ウォーキング/)) {
        response += "散歩なら、『大宮公園』の歴史ある参道や、広大な『森林公園』のウォーキングコースがおすすめである。";
        response += " <a href='destinations/omiya_park.html' target='_blank' rel='noopener noreferrer' class='text-blue-400 underline'>大宮公園ガイドを見る</a>";
    } else if(msg.match(/子供|遊び|遊具/)) {
        response += "子供連れなら、無料の小動物園や大型遊具がある『北浦和公園』が最適だ。";
        response += " <a href='destinations/kita-urawa-park.html' target='_blank' rel='noopener noreferrer' class='text-blue-400 underline'>北浦和公園ガイドを見る</a>";
    } else if(msg.match(/学|歴史|勉強/)) {
        response += "学びたいのであれば、『所沢航空記念公園』の記念館で日本の航空史に触れることを推奨する。";
        response += " <a href='destinations/tokorozawa_park.html' target='_blank' rel='noopener noreferrer' class='text-blue-400 underline'>所沢航空公園ガイドを見る</a>";
    } else if(msg.match(/スポーツ|サッカー/)) {
        response += "スポーツを楽しむなら、競技場が充実している『秋ヶ瀬公園』や『大宮公園』が良いだろう。";
        response += " <a href='destinations/akigase_park.html' target='_blank' rel='noopener noreferrer' class='text-blue-400 underline'>秋ヶ瀬公園ガイドを見る</a>";
    } else {
        response += "埼玉の5大公園（大宮、所沢、森林、秋ヶ瀬、丸山）を中心に、最適な場所を提案しよう。";
    }
    addMessage('model', response, true);
}

// ページロード時にひっそりと初期化開始
window.addEventListener('load', () => {
    // セレクタがない場合は何もしない
    if (!chatMessages) return;

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
