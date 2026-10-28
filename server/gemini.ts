import { GoogleGenAI, Type, Modality, LiveServerMessage } from "@google/genai";
import { WebSocketServer, WebSocket } from "ws";

// Helper to get initialized Gemini client with current environment key
export const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

export const ai = getAiClient();

// Helper to safely parse JSON from AI outputs
export const parseAIResponse = (text: string | undefined, defaultValue: any) => {
  if (!text) return defaultValue;
  try {
    return JSON.parse(text);
  } catch (err) {
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text];
      const cleaned = (jsonMatch[1] || text).trim();
      return JSON.parse(cleaned);
    } catch (innerErr) {
      return defaultValue;
    }
  }
};

export const generatePageIdeaServer = async (description: string) => {
  try {
    const client = getAiClient();
    const result = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `You are an expert web designer. Based on the following description, suggest a creative page structure with sections and content ideas: "${description}". 
      Return the response as a JSON object with a 'title', 'description', and an array of 'sections'. 
      Each section should have a 'title', 'purpose', and 'suggestedBlocks' (array of objects).
      Each block object should have a 'type' (one of: 'text', 'image', 'button', 'video', 'spacer', 'icon', 'accordion', 'pricing', 'social', 'form', 'map', 'testimonial', 'gallery', 'divider', 'counter', 'progress', 'tabs', 'list', 'alert', 'newsletter') and an optional 'content' string or object that matches the block's expected data structure.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  purpose: { type: Type.STRING },
                  suggestedBlocks: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: { type: Type.STRING },
                        content: { type: Type.STRING },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const parsed = parseAIResponse(result.text, null);
    if (parsed && parsed.sections) return parsed;
  } catch (_err) {
    // Fallback below when API key is unavailable or invalid
  }

  const cleanTopic = (description || "Modern Landing Page").trim();
  const titleWords = cleanTopic
    .split(/\s+/)
    .slice(0, 5)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    title: titleWords || "Custom Landing Page",
    description: `A high-converting page designed for: ${cleanTopic}`,
    sections: [
      {
        title: "Hero Section",
        purpose: "Capture visitor attention with a clear value proposition and call to action",
        suggestedBlocks: [
          { type: "text", content: `<h1>${titleWords}</h1><p>${cleanTopic}</p>` },
          { type: "button", content: "Get Started Today" },
          { type: "image", content: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80" },
        ],
      },
      {
        title: "Key Features & Benefits",
        purpose: "Highlight core offerings and differentiators",
        suggestedBlocks: [
          { type: "text", content: "<h2>Why Choose Us</h2><p>Built for speed, flexibility, and measurable growth.</p>" },
          { type: "list", content: JSON.stringify(["Fast visual customization", "Responsive across all devices", "SEO-ready architecture"]) },
        ],
      },
      {
        title: "Social Proof & Conversion",
        purpose: "Build trust and capture leads",
        suggestedBlocks: [
          { type: "testimonial", content: JSON.stringify({ quote: "This transformed our workflow and doubled our engagement.", author: "Alex Morgan", role: "Product Director" }) },
          { type: "newsletter", content: JSON.stringify({ title: "Stay Updated", description: "Subscribe for product updates and insights.", buttonText: "Subscribe" }) },
        ],
      },
    ],
  };
};

export const generateCollectionSchemaServer = async (description: string) => {
  try {
    const client = getAiClient();
    const result = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `You are an expert database architect. Based on the following description, suggest a CMS collection schema: "${description}". 
      The schema should include a name, slug, description, and an array of field definitions.
      Fields should have an id (uuid), name, slug (snake_case), type (one of: 'text', 'long_text', 'number', 'date', 'boolean', 'image', 'color'), and required (boolean).
      Return the response as a JSON object with 'name', 'slug', 'description', and 'fields'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            slug: { type: Type.STRING },
            description: { type: Type.STRING },
            fields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  slug: { type: Type.STRING },
                  type: { type: Type.STRING },
                  required: { type: Type.BOOLEAN },
                },
              },
            },
          },
        },
      },
    });

    const parsed = parseAIResponse(result.text, null);
    if (parsed && Array.isArray(parsed.fields)) return parsed;
  } catch (_err) {
    // Fallback below
  }

  const rawName = (description || "Content Items").trim().split(/\s+/).slice(0, 3).join(" ");
  const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "items";

  return {
    name,
    slug,
    description: `Structured collection for ${description || "custom CMS entries"}`,
    fields: [
      { id: "f_title", name: "Title", slug: "title", type: "text", required: true },
      { id: "f_summary", name: "Summary", slug: "summary", type: "long_text", required: true },
      { id: "f_image", name: "Cover Image", slug: "cover_image", type: "image", required: false },
      { id: "f_published_at", name: "Published Date", slug: "published_date", type: "date", required: false },
      { id: "f_featured", name: "Featured", slug: "featured", type: "boolean", required: false },
    ],
  };
};

export const refineContentServer = async (currentContent: string, instruction: string) => {
  try {
    const client = getAiClient();
    const result = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `Refine the following web content: "${currentContent}" based on this instruction: "${instruction}". 
      Keep it professional and engaging for a website. Return only the refined text.`,
    });

    if (result.text) return result.text;
  } catch (_err) {
    // Fallback below
  }

  if (!currentContent) return "";
  const lower = (instruction || "").toLowerCase();
  if (lower.includes("short") || lower.includes("concise")) {
    return currentContent.split(".")[0] + ".";
  }
  if (lower.includes("upper") || lower.includes("bold")) {
    return currentContent.toUpperCase();
  }
  return currentContent;
};

export const suggestColorPaletteServer = async (vibe: string) => {
  try {
    const client = getAiClient();
    const result = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `Suggest a modern color palette for a website with a "${vibe}" vibe. 
      Return a JSON object with 'primary', 'secondary', 'accent', and 'background' hex codes.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primary: { type: Type.STRING },
            secondary: { type: Type.STRING },
            accent: { type: Type.STRING },
            background: { type: Type.STRING },
          },
        },
      },
    });

    const parsed = parseAIResponse(result.text, null);
    if (parsed && parsed.primary) return parsed;
  } catch (_err) {
    // Fallback below
  }

  const v = (vibe || "").toLowerCase();
  if (v.includes("dark") || v.includes("cyber") || v.includes("night")) {
    return { primary: "#6366f1", secondary: "#8b5cf6", accent: "#22d3ee", background: "#0f172a" };
  }
  if (v.includes("warm") || v.includes("earth") || v.includes("sunset")) {
    return { primary: "#ea580c", secondary: "#d97706", accent: "#dc2626", background: "#fffbeb" };
  }
  if (v.includes("green") || v.includes("eco") || v.includes("nature")) {
    return { primary: "#059669", secondary: "#10b981", accent: "#14b8a6", background: "#f0fdf4" };
  }
  return { primary: "#4f46e5", secondary: "#6366f1", accent: "#8b5cf6", background: "#ffffff" };
};

export const suggestURLRewritesServer = async (pages: any[], currentRewrites: any[]) => {
  try {
    const client = getAiClient();
    const result = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `You are an expert SEO and web administrator. Based on the following pages and existing rewrite rules, suggest 3-5 new URL rewrite or redirect rules to improve SEO.
      Pages: ${JSON.stringify(pages.slice(0, 10).map((p) => ({ title: p.title, slug: p.slug })))}
      Current Rules: ${JSON.stringify(currentRewrites)}
      Return a JSON array of objects, each with 'source', 'target', 'type' (one of: 'rewrite', '301', '302'), and 'explanation'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              source: { type: Type.STRING },
              target: { type: Type.STRING },
              type: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
          },
        },
      },
    });

    const parsed = parseAIResponse(result.text, null);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (_err) {
    // Fallback below
  }

  return [
    {
      source: "/home",
      target: "/",
      type: "301",
      explanation: "Consolidate duplicate home URL to canonical root path for better SEO authority.",
    },
    {
      source: "/about-us",
      target: "/about",
      type: "301",
      explanation: "Redirect legacy about-us path to cleaner canonical /about slug.",
    },
    {
      source: "/get-started",
      target: "/contact",
      type: "rewrite",
      explanation: "Provide a memorable campaign-friendly URL alias for conversion pages.",
    },
  ];
};

export const suggestBlockStylesServer = async (blockType: string, content: string, vibe: string) => {
  try {
    const client = getAiClient();
    const result = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `Suggest modern CSS styles for a "${blockType}" block with the following content: "${content}". 
      The desired vibe is "${vibe}". 
      Return a JSON object with 'styles' (an object of CSS properties in camelCase) and 'explanation'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            styles: {
              type: Type.OBJECT,
              properties: {
                backgroundColor: { type: Type.STRING },
                color: { type: Type.STRING },
                padding: { type: Type.STRING },
                borderRadius: { type: Type.STRING },
                fontSize: { type: Type.STRING },
                fontWeight: { type: Type.STRING },
                textAlign: { type: Type.STRING },
                border: { type: Type.STRING },
                boxShadow: { type: Type.STRING },
              },
            },
            explanation: { type: Type.STRING },
          },
        },
      },
    });

    const parsed = parseAIResponse(result.text, null);
    if (parsed && parsed.styles) return parsed;
  } catch (_err) {
    // Fallback below
  }

  const isDark = (vibe || "").toLowerCase().includes("dark");
  return {
    styles: {
      backgroundColor: isDark ? "#0f172a" : "#f8fafc",
      color: isDark ? "#f8fafc" : "#0f172a",
      padding: "24px",
      borderRadius: "16px",
      boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.08)",
      border: isDark ? "1px solid #1e293b" : "1px solid #e2e8f0",
    },
    explanation: `Applied a clean ${vibe || "modern"} surface treatment with balanced padding and subtle elevation for the ${blockType} block.`,
  };
};

export const suggestNextItemsServer = async (pages: any[], userContext: string = "") => {
  try {
    const client = getAiClient();
    const result = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `You are a strategic product manager. Suggest the next 3 valuable features.
      Current Pages: ${JSON.stringify(pages.slice(0, 10).map((p) => p.title))}
      User Context: ${userContext}
      Return a JSON array of 3 suggestion objects with 'type', 'title', 'description', 'action', and 'icon' (Lucide icon name).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              action: { type: Type.STRING },
              icon: { type: Type.STRING },
            },
          },
        },
      },
    });

    const parsed = parseAIResponse(result.text, null);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (_err) {
    // Fallback below when API key is invalid or unavailable
  }

  const pageTitles = (pages || []).map((p) => (p?.title || "").toLowerCase());
  const hasBlog = pageTitles.some((t) => t.includes("blog") || t.includes("news") || t.includes("article"));
  const hasPricing = pageTitles.some((t) => t.includes("pricing") || t.includes("plan"));

  return [
    {
      type: "Conversion",
      title: hasPricing ? "Add Interactive Plan Comparison" : "Launch a Dedicated Pricing Page",
      description: hasPricing
        ? "Increase checkout clarity by adding an FAQ accordion and testimonial proof beneath your pricing tiers."
        : "Help visitors evaluate your tiers with a clear pricing matrix, feature checklist, and call-to-action buttons.",
      action: hasPricing ? "Enhance Pricing Layout" : "Create Pricing Page",
      icon: "Zap",
    },
    {
      type: "Content & SEO",
      title: hasBlog ? "Expand Structured Content Collections" : "Start an Insights & Resources Hub",
      description:
        "Drive organic search traffic by publishing structured articles, case studies, and release updates via CMS Collections.",
      action: "Open Collections",
      icon: "Layout",
    },
    {
      type: "Engagement",
      title: "Add Customer Social Proof & Lead Capture",
      description:
        "Boost trust on your primary landing pages with verified customer testimonials and an inline newsletter signup block.",
      action: "Add Social Proof Block",
      icon: "Sparkles",
    },
  ];
};

export const smartSearchServer = async (searchQuery: string, pages: any[]) => {
  try {
    const client = getAiClient();
    const prompt = `
      You are an AI assistant for a CMS dashboard. 
      The user is searching for pages based on this query: "${searchQuery}"
      
      Here are the pages available in the CMS:
      ${JSON.stringify(pages, null, 2)}
      
      Your task:
      1. Use Google Search grounding to understand the user's query if it's about a general topic (e.g., "Find the page about the city with the Golden Gate Bridge").
      2. Match the query against the page titles, slugs, and content.
      3. Return a JSON array of page IDs that are most relevant to the query.
      4. If no pages are relevant, return an empty array [].
      
      Return ONLY the JSON array of IDs.
    `;

    const response = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    const parsed = parseAIResponse(response.text, null);
    if (Array.isArray(parsed)) return parsed;
  } catch (_err) {
    // Fallback to local keyword search below
  }

  const terms = (searchQuery || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (terms.length === 0) return (pages || []).map((p) => p.id);

  return (pages || [])
    .filter((p) => {
      const haystack = `${p.title || ""} ${p.slug || ""} ${p.content || ""}`.toLowerCase();
      return terms.some((term) => haystack.includes(term));
    })
    .map((p) => p.id);
};

// Generic content generator
export const generateContentServer = async (params: {
  contents: any;
  model?: string;
  config?: any;
}) => {
  try {
    const client = getAiClient();
    const model = params.model || "gemini-3.8-flash";
    const response = await client.models.generateContent({
      model,
      contents: params.contents,
      config: params.config,
    });
    return {
      text: response.text || "",
    };
  } catch (_err) {
    return {
      text: "",
    };
  }
};

// Set up Live API WebSocket bridge for real-time voice streaming
export const setupLiveApiBridge = (wss: WebSocketServer) => {
  wss.on("connection", async (clientWs: WebSocket) => {
    let session: any = null;

    try {
      const client = getAiClient();
      session = await client.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are DevInquire CMS AI voice assistant, helping users design and build their websites.",
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onclose: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.close();
            }
          },
          onerror: (err: any) => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ error: err?.message || "Live API error" }));
            }
          },
        },
      });

      clientWs.on("message", (data: any) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio && session) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
          if (parsed.text && session) {
            session.sendRealtimeInput({
              text: parsed.text,
            });
          }
        } catch (_err) {
          // ignore malformed message
        }
      });

      clientWs.on("close", () => {
        if (session && typeof session.close === "function") {
          try {
            session.close();
          } catch (_e) {
            // ignore cleanup errors
          }
        }
      });
    } catch (err: any) {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ error: err?.message || "Failed to connect to Live API" }));
        clientWs.close();
      }
    }
  });
};
