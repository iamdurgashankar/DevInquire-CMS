import express from "express";
import compression from "compression";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc,
  setLogLevel,
  disableNetwork,
  terminate
} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import firebaseConfig from "./firebase-applet-config.json";
import { WebSocketServer } from "ws";
import {
  getAiClient,
  generatePageIdeaServer,
  generateCollectionSchemaServer,
  refineContentServer,
  suggestColorPaletteServer,
  suggestURLRewritesServer,
  suggestBlockStylesServer,
  suggestNextItemsServer,
  smartSearchServer,
  generateContentServer,
  setupLiveApiBridge,
} from "./server/gemini";
import { SAMPLE_PAGES } from "./sampleData";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly log server startup for debugging
console.log("[Server] Starting with Node version:", process.version);
console.log("[Server] Current Directory:", process.cwd());

try {
  setLogLevel("silent");
} catch {
  // ignore
}

// Initialize Firebase for the server
let db: any;
let firestoreServerAvailable = Boolean(
  firebaseConfig?.projectId && firebaseConfig.projectId !== "devinquire-cms"
);

const disableServerFirestore = async () => {
  if (!firestoreServerAvailable && !db) return;
  firestoreServerAvailable = false;
  if (db) {
    try {
      await disableNetwork(db);
    } catch {
      // ignore
    }
    try {
      await terminate(db);
    } catch {
      // ignore
    }
  }
};

try {
  if (firestoreServerAvailable) {
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    console.log("[Firebase] Server SDK Initialized successfully");
  }
} catch (err) {
  firestoreServerAvailable = false;
  console.warn("[Firebase] Server SDK Initialization warning:", err);
}

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(compression());
  app.use(cors()); // Enable CORS for Headless API access
  
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    path: "/cms/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Set up WebSocket server for Gemini Live API on /cms/live
  const wss = new WebSocketServer({ server: httpServer, path: "/cms/live" });
  setupLiveApiBridge(wss);

  const PORT = Number(process.env.PORT) || 3002;

  // Middleware for JSON parsing
  app.use(express.json({ limit: '50mb' }));

  // Support both /api/* and /cms/api/* so reverse proxies under /cms work seamlessly
  app.use((req, _res, next) => {
    if (req.url === '/cms/api' || req.url.startsWith('/cms/api/')) {
      req.url = req.url.replace(/^\/cms/, '');
    }
    next();
  });

  // Route root "/" to the connected domain's published home page if present, otherwise to CMS Studio "/cms/"
  app.get("/", async (req, res) => {
    const reqHost = String(req.headers.host || "").split(":")[0].toLowerCase();
    if (reqHost && reqHost !== "localhost" && reqHost !== "127.0.0.1" && !/^\d+\.\d+\.\d+\.\d+$/.test(reqHost)) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1500);
        const javaRes = await fetch(
          `http://127.0.0.1:8080/api/v1/content/site-home?domain=${encodeURIComponent(reqHost)}`,
          { signal: controller.signal }
        );
        clearTimeout(timer);
        if (javaRes.ok) {
          const json: any = await javaRes.json().catch(() => null);
          if (json?.success && json?.data?.slug) {
            return res.redirect(302, `/cms/p/${encodeURIComponent(json.data.slug)}`);
          }
        }
      } catch {
        // fallback to CMS Studio
      }
    }
    return res.redirect(302, "/cms/");
  });
  app.use((req, res, next) => {
    if (req.method === "GET" && req.originalUrl === "/cms") {
      return res.redirect(302, "/cms/");
    }
    next();
  });

  // Debug logging for API
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API Request] ${req.method} ${req.url}`);
    }
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      env: process.env.NODE_ENV || "development",
      time: new Date().toISOString(),
    });
  });

  app.get("/api/i18n/detect", (req, res) => {
    const tz = typeof req.query.timezone === "string" ? req.query.timezone : "";
    const tzCountryMap: Record<string, string> = {
      "Asia/Kolkata": "IN",
      "Asia/Calcutta": "IN",
      "Europe/Paris": "FR",
      "Europe/Berlin": "DE",
      "Europe/Madrid": "ES",
      "Asia/Tokyo": "JP",
      "Asia/Riyadh": "SA",
      "Asia/Dubai": "AE",
      "America/Sao_Paulo": "BR",
      "America/New_York": "US",
      "Europe/London": "GB",
    };
    const headerCountry =
      (req.headers["cf-ipcountry"] as string) ||
      (req.headers["x-vercel-ip-country"] as string) ||
      (req.headers["cloudfront-viewer-country"] as string) ||
      (req.headers["x-country-code"] as string) ||
      "";
    const queryCountry = typeof req.query.country === "string" ? req.query.country : "";
    const country = (queryCountry || headerCountry || tzCountryMap[tz] || "").toUpperCase();
    const acceptLanguage = (req.headers["accept-language"] as string) || "";
    res.json({
      success: true,
      country: country || null,
      timezone: tz || null,
      acceptLanguage,
    });
  });

  // --- Multi-Domain & Hosting Connection Endpoints ---
  const hostingConfigFile = path.join(process.cwd(), ".local-hosting-config.json");

  const readHostingStore = () => {
    if (!fs.existsSync(hostingConfigFile)) {
      return { domains: [] as any[], activeDomainId: "" };
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(hostingConfigFile, "utf-8"));
      if (Array.isArray(parsed?.domains)) {
        return {
          domains: parsed.domains,
          activeDomainId: parsed.activeDomainId || parsed.domains[0]?.id || "",
        };
      }
      // Migrate legacy single-domain format
      if (parsed?.customDomain) {
        const legacy = {
          id: `dom_${parsed.customDomain.replace(/[^a-z0-9]/g, "_")}`,
          domain: parsed.customDomain,
          hostingProvider: parsed.hostingProvider || "Hostinger",
          siteName: parsed.siteName || parsed.customDomain,
          baseUrl: parsed.baseUrl || `https://${parsed.customDomain}`,
          connected: true,
          dnsVerified: Boolean(parsed.dnsVerified),
          resolvedIps: parsed.resolvedIps || [],
          verifiedAt: parsed.verifiedAt || new Date().toISOString(),
        };
        return { domains: [legacy], activeDomainId: legacy.id };
      }
    } catch {
      // ignore parse errors
    }
    return { domains: [] as any[], activeDomainId: "" };
  };

  const writeHostingStore = (store: { domains: any[]; activeDomainId: string }) => {
    fs.writeFileSync(hostingConfigFile, JSON.stringify(store, null, 2), "utf-8");
  };

  app.get("/api/hosting/status", async (_req, res) => {
    try {
      const store = readHostingStore();
      const activeDomain =
        store.domains.find((d: any) => d.id === store.activeDomainId) || store.domains[0] || null;
      return res.json({
        success: true,
        data: {
          domains: store.domains,
          activeDomainId: activeDomain?.id || "",
          activeDomain,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/hosting/connect", async (req, res) => {
    try {
      const { domain, hostingProvider, siteName } = req.body || {};
      const cleanDomain = String(domain || "")
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/\/.*$/, "")
        .toLowerCase();

      if (!cleanDomain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleanDomain)) {
        return res.status(400).json({
          success: false,
          error: "Please enter a valid domain name (e.g., devinquire.com).",
        });
      }

      let resolvedIps: string[] = [];
      let dnsVerified = false;
      try {
        const dns = await import("dns");
        const lookupPromise = dns.promises.resolve4(cleanDomain);
        const timeoutPromise = new Promise<string[]>((resolve) =>
          setTimeout(() => resolve([]), 2500)
        );
        resolvedIps = await Promise.race([lookupPromise, timeoutPromise]);
        dnsVerified = Array.isArray(resolvedIps) && resolvedIps.length > 0;
      } catch {
        dnsVerified = false;
      }

      const store = readHostingStore();
      const existingIdx = store.domains.findIndex((d: any) => d.domain === cleanDomain);
      const id =
        existingIdx >= 0
          ? store.domains[existingIdx].id
          : `dom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

      const entry = {
        id,
        domain: cleanDomain,
        hostingProvider: String(hostingProvider || "Hostinger").trim(),
        siteName: String(siteName || cleanDomain).trim(),
        baseUrl: `https://${cleanDomain}`,
        connected: true,
        dnsVerified,
        resolvedIps,
        verifiedAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        store.domains[existingIdx] = entry;
      } else {
        store.domains.push(entry);
      }
      store.activeDomainId = id;
      writeHostingStore(store);

      return res.json({
        success: true,
        data: {
          domains: store.domains,
          activeDomainId: id,
          activeDomain: entry,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to connect domain and hosting.",
      });
    }
  });

  app.post("/api/hosting/select", async (req, res) => {
    try {
      const { domainId } = req.body || {};
      const store = readHostingStore();
      const found = store.domains.find((d: any) => d.id === domainId);
      if (!found) {
        return res.status(404).json({ success: false, error: "Domain not found." });
      }
      store.activeDomainId = found.id;
      writeHostingStore(store);
      return res.json({
        success: true,
        data: {
          domains: store.domains,
          activeDomainId: found.id,
          activeDomain: found,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/hosting/delete", async (req, res) => {
    try {
      const { domainId } = req.body || {};
      const store = readHostingStore();
      store.domains = store.domains.filter((d: any) => d.id !== domainId);
      if (store.activeDomainId === domainId) {
        store.activeDomainId = store.domains[0]?.id || "";
      }
      writeHostingStore(store);
      const activeDomain =
        store.domains.find((d: any) => d.id === store.activeDomainId) || null;
      return res.json({
        success: true,
        data: {
          domains: store.domains,
          activeDomainId: store.activeDomainId,
          activeDomain,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // --- Gemini AI Server Endpoints ---

  app.post("/api/gemini/generate-page-idea", async (req, res) => {
    try {
      const { description } = req.body;
      const data = await generatePageIdeaServer(description || "");
      res.json(data);
    } catch (error: any) {
      res.status(200).json({});
    }
  });

  app.post("/api/gemini/generate-collection-schema", async (req, res) => {
    try {
      const { description } = req.body;
      const data = await generateCollectionSchemaServer(description || "");
      res.json(data);
    } catch (error: any) {
      res.status(200).json({});
    }
  });

  app.post("/api/gemini/refine-content", async (req, res) => {
    try {
      const { currentContent, instruction } = req.body;
      const refined = await refineContentServer(currentContent || "", instruction || "");
      res.json({ text: refined });
    } catch (error: any) {
      res.status(200).json({ text: req.body?.currentContent || "" });
    }
  });

  app.post("/api/gemini/suggest-color-palette", async (req, res) => {
    try {
      const { vibe } = req.body;
      const palette = await suggestColorPaletteServer(vibe || "");
      res.json(palette);
    } catch (error: any) {
      res.status(200).json({});
    }
  });

  app.post("/api/gemini/suggest-url-rewrites", async (req, res) => {
    try {
      const { pages, currentRewrites } = req.body;
      const rewrites = await suggestURLRewritesServer(pages || [], currentRewrites || []);
      res.json(rewrites);
    } catch (error: any) {
      res.status(200).json([]);
    }
  });

  app.post("/api/gemini/suggest-block-styles", async (req, res) => {
    try {
      const { blockType, content, vibe } = req.body;
      const styles = await suggestBlockStylesServer(blockType || "", content || "", vibe || "");
      res.json(styles);
    } catch (error: any) {
      res.status(200).json({});
    }
  });

  app.post("/api/gemini/suggest-next-items", async (req, res) => {
    try {
      const { pages, userContext } = req.body;
      const items = await suggestNextItemsServer(pages || [], userContext || "");
      res.json(items);
    } catch (error: any) {
      res.status(200).json([]);
    }
  });

  app.post("/api/gemini/smart-search", async (req, res) => {
    try {
      const { searchQuery, pages } = req.body;
      const results = await smartSearchServer(searchQuery || "", pages || []);
      res.json(results);
    } catch (error: any) {
      res.status(200).json([]);
    }
  });

  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { contents, model, config } = req.body;
      const result = await generateContentServer({ contents, model, config });
      res.json(result);
    } catch (error: any) {
      res.status(200).json({ text: "" });
    }
  });

  app.post("/api/gemini/stream", async (req, res) => {
    try {
      const { contents, model, config } = req.body;
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const client = getAiClient();
      const responseStream = await client.models.generateContentStream({
        model: model || "gemini-3.8-flash",
        contents,
        config,
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      if (!res.headersSent) {
        res.setHeader("Content-Type", "text/event-stream");
      }
      res.write(`data: ${JSON.stringify({ text: "" })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  });

  // --- Headless CMS API Routes ---
  
  // GET /api/v1/content/pages - List all published pages
  app.get("/api/v1/content/pages", async (req, res) => {
    const { includeDrafts } = req.query;
    if (!firestoreServerAvailable || !db) {
      const fallbackPages = SAMPLE_PAGES.filter(p => includeDrafts === 'true' || p.status === 'published');
      return res.json({ success: true, data: fallbackPages });
    }
    try {
      const pagesRef = collection(db, "pages");
      
      let q;
      if (includeDrafts === 'true') {
        q = query(pagesRef, where("status", "in", ["published", "draft"]));
      } else {
        q = query(pagesRef, where("status", "==", "published"));
      }

      const snapshot = await getDocs(q);
      
      const pages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      }));
      
      const resultPages = pages.length > 0 ? pages : SAMPLE_PAGES.filter(p => includeDrafts === 'true' || p.status === 'published');

      resultPages.sort((a: any, b: any) => {
        if (a.status !== b.status) return a.status === 'published' ? -1 : 1;
        return a.title.localeCompare(b.title);
      });

      res.json({
        success: true,
        data: resultPages
      });
    } catch (error: any) {
      await disableServerFirestore();
      const fallbackPages = SAMPLE_PAGES.filter(p => includeDrafts === 'true' || p.status === 'published');
      res.json({
        success: true,
        data: fallbackPages
      });
    }
  });

  // GET /api/v1/content/pages/:slug - Get a page by its slug (or ID)
  app.get("/api/v1/content/pages/:slug", async (req, res) => {
    const { slug } = req.params;
    if (!firestoreServerAvailable || !db) {
      const sampleMatch = SAMPLE_PAGES.find(p => p.slug === slug || p.id === slug);
      if (sampleMatch) {
        return res.json({ success: true, data: sampleMatch });
      }
      return res.status(404).json({ success: false, error: "Page not found" });
    }
    try {
      const pagesRef = collection(db, "pages");
      
      let q = query(pagesRef, where("slug", "==", slug));
      let snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        const docRef = doc(db, "pages", slug);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return res.json({
            success: true,
            data: { id: docSnap.id, ...(docSnap.data() as any) }
          });
        }
        const sampleMatch = SAMPLE_PAGES.find(p => p.slug === slug || p.id === slug);
        if (sampleMatch) {
          return res.json({ success: true, data: sampleMatch });
        }
        return res.status(404).json({ success: false, error: "Page not found" });
      }
      
      const pageData = {
        id: snapshot.docs[0].id,
        ...(snapshot.docs[0].data() as any)
      };
      
      res.json({
        success: true,
        data: pageData
      });
    } catch (error: any) {
      await disableServerFirestore();
      const sampleMatch = SAMPLE_PAGES.find(p => p.slug === slug || p.id === slug);
      if (sampleMatch) {
        return res.json({ success: true, data: sampleMatch });
      }
      res.status(404).json({ success: false, error: "Page not found" });
    }
  });

  // GET /api/v1/content/config - Get global config and styles
  app.get("/api/v1/content/config", async (req, res) => {
    if (!firestoreServerAvailable || !db) {
      return res.json({
        success: true,
        data: {
          styles: null,
          site: { siteName: "DevInquire Official", baseUrl: "https://devinquire.com" }
        }
      });
    }
    try {
      const stylesDoc = await getDoc(doc(db, "config", "globalStyles"));
      const configDoc = await getDoc(doc(db, "config", "siteConfig"));
      
      res.json({
        success: true,
        data: {
          styles: stylesDoc.exists() ? stylesDoc.data() : null,
          site: configDoc.exists() ? configDoc.data() : null
        }
      });
    } catch (error: any) {
      await disableServerFirestore();
      res.json({
        success: true,
        data: {
          styles: null,
          site: { siteName: "DevInquire Official", baseUrl: "https://devinquire.com" }
        }
      });
    }
  });

  // GET /api/v1/content/collections - List all available collections
  app.get("/api/v1/content/collections", async (req, res) => {
    if (!firestoreServerAvailable || !db) {
      return res.json({ success: true, data: [] });
    }
    try {
      const collectionsRef = collection(db, "collections");
      const snapshot = await getDocs(collectionsRef);
      const collections = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      res.json({ success: true, data: collections });
    } catch (error: any) {
      await disableServerFirestore();
      res.json({ success: true, data: [] });
    }
  });

  // GET /api/v1/content/collections/:collectionSlug/items - List items in a collection
  app.get("/api/v1/content/collections/:collectionSlug/items", async (req, res) => {
    if (!firestoreServerAvailable || !db) {
      return res.json({ success: true, data: [] });
    }
    try {
      const { collectionSlug } = req.params;
      
      const collectionsRef = collection(db, "collections");
      const qColl = query(collectionsRef, where("slug", "==", collectionSlug));
      const collSnapshot = await getDocs(qColl);
      
      if (collSnapshot.empty) {
        return res.status(404).json({ success: false, error: "Collection not found" });
      }
      
      const collectionId = collSnapshot.docs[0].id;
      
      const entriesRef = collection(db, "entries");
      const qEntries = query(
        entriesRef, 
        where("collectionId", "==", collectionId),
        where("status", "==", "published")
      );
      
      const entrySnapshot = await getDocs(qEntries);
      const items = entrySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      
      res.json({ success: true, data: items });
    } catch (error: any) {
      await disableServerFirestore();
      res.json({ success: true, data: [] });
    }
  });

  // GET /api/v1/content/entries/:entryId - Get a single entry
  app.get("/api/v1/content/entries/:entryId", async (req, res) => {
    if (!firestoreServerAvailable || !db) {
      return res.status(404).json({ success: false, error: "Entry not found" });
    }
    try {
      const { entryId } = req.params;
      const entryRef = doc(db, "entries", entryId);
      const entrySnap = await getDoc(entryRef);
      
      if (!entrySnap.exists()) {
        return res.status(404).json({ success: false, error: "Entry not found" });
      }
      
      res.json({ success: true, data: { id: entrySnap.id, ...entrySnap.data() } });
    } catch (error: any) {
      await disableServerFirestore();
      res.status(404).json({ success: false, error: "Entry not found" });
    }
  });

  // In-memory state for real-time collaboration
  const pageStates: Record<string, any> = {};
  const activeUsers: Record<string, any[]> = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-page", ({ pageId, user }) => {
      for (const pid in activeUsers) {
        const filtered = activeUsers[pid].filter(u => u.socketId !== socket.id);
        if (filtered.length !== activeUsers[pid].length) {
          activeUsers[pid] = filtered;
          io.to(pid).emit("users-updated", activeUsers[pid]);
        }
      }

      socket.join(pageId);
      
      if (!activeUsers[pageId]) activeUsers[pageId] = [];
      
      const userData = { ...user, socketId: socket.id, pageId, cursor: { x: 0, y: 0 } };
      activeUsers[pageId].push(userData);

      console.log(`User ${user.name} joined page ${pageId}`);

      if (pageStates[pageId]) {
        socket.emit("page-state", pageStates[pageId]);
      }

      io.to(pageId).emit("users-updated", activeUsers[pageId]);
      io.emit("global-activity", activeUsers);
    });

    socket.on("update-page", ({ pageId, pageData }) => {
      pageStates[pageId] = pageData;
      socket.to(pageId).emit("page-updated", pageData);
    });

    socket.on("cursor-move", ({ pageId, cursor }) => {
      if (activeUsers[pageId]) {
        const user = activeUsers[pageId].find(u => u.socketId === socket.id);
        if (user) {
          user.cursor = cursor;
          socket.to(pageId).emit("cursor-updated", { socketId: socket.id, cursor });
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      
      for (const pageId in activeUsers) {
        const originalLength = activeUsers[pageId].length;
        activeUsers[pageId] = activeUsers[pageId].filter(u => u.socketId !== socket.id);
        
        if (activeUsers[pageId].length !== originalLength) {
          io.to(pageId).emit("users-updated", activeUsers[pageId]);
        }
      }
      io.emit("global-activity", activeUsers);
    });
  });

  // Forward root-level published page slugs (e.g. /:slug) to /cms/p/:slug
  // Placed before Vite/static middlewares so it works in both dev and production
  app.get("/:slug", (req, res, next) => {
    const slug = req.params.slug;
    if (
      !slug ||
      slug === "cms" ||
      slug === "api" ||
      slug.startsWith("@") ||
      slug === "src" ||
      slug === "node_modules" ||
      slug === "assets" ||
      slug === "favicon.ico" ||
      slug.includes(".")
    ) {
      return next();
    }
    return res.redirect(302, `/cms/p/${encodeURIComponent(slug)}`);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use("/cms", express.static(distPath, {
      maxAge: '1d',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));
    app.use((req, res, next) => {
      if (
        req.method === "GET" &&
        req.path.startsWith("/cms/") &&
        !req.path.startsWith("/cms/api") &&
        !req.path.startsWith("/cms/socket.io") &&
        !req.path.startsWith("/cms/live")
      ) {
        return res.sendFile(path.join(distPath, "index.html"));
      }
      next();
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}/cms/`);
  });
}

startServer();
