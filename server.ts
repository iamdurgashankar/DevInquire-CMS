
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // In-memory state for real-time collaboration
  // In a real app, this would be backed by a database
  const pageStates: Record<string, any> = {};
  const activeUsers: Record<string, any[]> = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-page", ({ pageId, user }) => {
      socket.join(pageId);
      
      if (!activeUsers[pageId]) activeUsers[pageId] = [];
      
      const userData = { ...user, socketId: socket.id, pageId, cursor: { x: 0, y: 0 } };
      activeUsers[pageId].push(userData);

      console.log(`User ${user.name} joined page ${pageId}`);

      // Send current page state to the new user if it exists
      if (pageStates[pageId]) {
        socket.emit("page-state", pageStates[pageId]);
      }

      // Notify others in the room
      io.to(pageId).emit("users-updated", activeUsers[pageId]);
      
      // Notify everyone about global activity
      io.emit("global-activity", activeUsers);
    });

    socket.on("update-page", ({ pageId, pageData }) => {
      pageStates[pageId] = pageData;
      // Broadcast to everyone else in the room
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
        const index = activeUsers[pageId].findIndex(u => u.socketId === socket.id);
        if (index !== -1) {
          activeUsers[pageId].splice(index, 1);
          io.to(pageId).emit("users-updated", activeUsers[pageId]);
          io.emit("global-activity", activeUsers);
          break;
        }
      }
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
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
