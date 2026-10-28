import { Page } from "../types";

// Helper for calling server Gemini endpoints
async function postToGeminiApi<T>(endpoint: string, body: Record<string, any>, defaultValue: T): Promise<T> {
  try {
    const response = await fetch(`/api/gemini/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return defaultValue;
    }

    const data = await response.json();
    return data as T;
  } catch (_error) {
    return defaultValue;
  }
}

export const generatePageIdea = async (description: string): Promise<any> => {
  return postToGeminiApi<any>("generate-page-idea", { description }, {});
};

export const generateCollectionSchema = async (description: string): Promise<any> => {
  return postToGeminiApi<any>("generate-collection-schema", { description }, {});
};

export const refineContent = async (currentContent: string, instruction: string): Promise<string> => {
  const data = await postToGeminiApi<{ text?: string }>("refine-content", { currentContent, instruction }, { text: currentContent });
  return data?.text || currentContent;
};

export const suggestColorPalette = async (vibe: string): Promise<any> => {
  return postToGeminiApi<any>("suggest-color-palette", { vibe }, {});
};

export const suggestURLRewrites = async (pages: any[], currentRewrites: any[]): Promise<any[]> => {
  return postToGeminiApi<any[]>("suggest-url-rewrites", { pages, currentRewrites }, []);
};

export const suggestBlockStyles = async (blockType: string, content: string, vibe: string): Promise<any> => {
  return postToGeminiApi<any>("suggest-block-styles", { blockType, content, vibe }, {});
};

export const suggestNextItems = async (pages: Page[], userContext: string = ""): Promise<any[]> => {
  return postToGeminiApi<any[]>("suggest-next-items", { pages, userContext }, []);
};

export const smartSearchPages = async (searchQuery: string, pages: any[]): Promise<string[]> => {
  return postToGeminiApi<string[]>("smart-search", { searchQuery, pages }, []);
};

// Streaming helper for text responses using Server-Sent Events
export const streamGeminiContent = async (
  prompt: string,
  onChunk: (chunk: string) => void,
  options?: { model?: string; config?: any }
): Promise<string> => {
  try {
    const response = await fetch("/api/gemini/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: prompt,
        model: options?.model || "gemini-3.8-flash",
        config: options?.config,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Streaming failed with status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunkStr = decoder.decode(value, { stream: true });
      const lines = chunkStr.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const payload = line.replace("data: ", "").trim();
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) {
              fullText += parsed.text;
              onChunk(parsed.text);
            }
          } catch (e) {
            // non-json line
          }
        }
      }
    }

    return fullText;
  } catch (err) {
    console.error("[streamGeminiContent Error]:", err);
    throw err;
  }
};

// Live API WebSocket connection helper for real-time voice streaming
export const createLiveAudioSession = (callbacks: {
  onAudioChunk?: (base64Audio: string) => void;
  onInterrupted?: () => void;
  onError?: (err: any) => void;
  onClose?: () => void;
}) => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const socketUrl = `${protocol}//${window.location.host}/live`;
  const ws = new WebSocket(socketUrl);

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.audio && callbacks.onAudioChunk) {
        callbacks.onAudioChunk(msg.audio);
      }
      if (msg.interrupted && callbacks.onInterrupted) {
        callbacks.onInterrupted();
      }
      if (msg.error && callbacks.onError) {
        callbacks.onError(msg.error);
      }
    } catch (e) {
      console.error("[Live API Socket Parse Error]:", e);
    }
  };

  ws.onerror = (err) => {
    console.error("[Live API Socket Error]:", err);
    if (callbacks.onError) callbacks.onError(err);
  };

  ws.onclose = () => {
    if (callbacks.onClose) callbacks.onClose();
  };

  return {
    sendAudio: (base64Pcm: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ audio: base64Pcm }));
      }
    },
    sendText: (text: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ text }));
      }
    },
    close: () => {
      ws.close();
    },
    socket: ws,
  };
};
