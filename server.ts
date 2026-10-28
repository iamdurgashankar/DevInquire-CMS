import express from "express";
import compression from "compression";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc 
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

// Initialize Firebase for the server
let db: any;
try {
  const firebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
  console.log("[Firebase] Server SDK Initialized successfully");
} catch (err) {
  console.warn("[Firebase] Server SDK Initialization warning:", err);
}

async function startServer() {
  const app = express();
  app.use(compression());
  app.use(cors()); // Enable CORS for Headless API access
  
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Set up WebSocket server for Gemini Live API on /live
  const wss = new WebSocketServer({ server: httpServer, path: "/live" });
  setupLiveApiBridge(wss);

  const PORT = 3000;

  // Middleware for JSON parsing
  app.use(express.json({ limit: '50mb' }));

  // Debug logging for API
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API Request] ${req.method} ${req.url}`);
    }
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
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
    try {
      const { includeDrafts } = req.query;
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
      const { includeDrafts } = req.query;
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
      const sampleMatch = SAMPLE_PAGES.find(p => p.slug === slug || p.id === slug);
      if (sampleMatch) {
        return res.json({ success: true, data: sampleMatch });
      }
      res.status(404).json({ success: false, error: "Page not found" });
    }
  });

  // GET /api/v1/content/config - Get global config and styles
  app.get("/api/v1/content/config", async (req, res) => {
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
    try {
      const collectionsRef = collection(db, "collections");
      const snapshot = await getDocs(collectionsRef);
      const collections = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      res.json({ success: true, data: collections });
    } catch (error: any) {
      res.json({ success: true, data: [] });
    }
  });

  // GET /api/v1/content/collections/:collectionSlug/items - List items in a collection
  app.get("/api/v1/content/collections/:collectionSlug/items", async (req, res) => {
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
      res.json({ success: true, data: [] });
    }
  });

  // GET /api/v1/content/entries/:entryId - Get a single entry
  app.get("/api/v1/content/entries/:entryId", async (req, res) => {
    try {
      const { entryId } = req.params;
      const entryRef = doc(db, "entries", entryId);
      const entrySnap = await getDoc(entryRef);
      
      if (!entrySnap.exists()) {
        return res.status(404).json({ success: false, error: "Entry not found" });
      }
      
      res.json({ success: true, data: { id: entrySnap.id, ...entrySnap.data() } });
    } catch (error: any) {
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      maxAge: '1d',
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
