
import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const SELECTED_MODEL = "gemma-2-2b-it-q4f16_1-MLC";
let engine = null;

self.onmessage = async (e) => {
    const { type, data } = e.data;

    if (type === 'init') {
        try {
            engine = await webllm.CreateMLCEngine(SELECTED_MODEL, {
                initProgressCallback: (progress) => {
                    self.postMessage({ type: 'progress', data: progress });
                }
            });
            self.postMessage({ type: 'ready' });
        } catch (error) {
            self.postMessage({ type: 'error', data: error.message });
        }
    } else if (type === 'chat') {
        if (!engine) {
            self.postMessage({ type: 'error', data: 'Engine not initialized' });
            return;
        }
        try {
            const chunks = await engine.chat.completions.create({
                messages: data.messages,
                stream: true,
            });

            for await (const chunk of chunks) {
                const content = chunk.choices[0]?.delta?.content || "";
                self.postMessage({ type: 'chunk', data: content });
            }
            self.postMessage({ type: 'done' });
        } catch (error) {
            self.postMessage({ type: 'error', data: error.message });
        }
    }
};
