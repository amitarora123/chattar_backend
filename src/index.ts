import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { createServer } from "node:http";
import swaggerUi from "swagger-ui-express";
import { initSocket } from "./lib/socket/server";
import { connectDB } from "./lib/utils/db";
import { swaggerSpec } from "./lib/utils/swagger";
import UserRoutes from "./routes/user.routes";
import ChatRoutes from "./routes/chat.routes";
import MessageRoutes from "./routes/message.routes";
import ContactRoutes from "./routes/contact.routes";
import CloudinaryRoutes from "./routes/cloudinary.routes";

dotenv.config();
const PORT = process.env.PORT || 8000;
const app = express();

app.use(
  cors({
    credentials: true,
    origin: process.env.FRONTEND_URL || "*",
  }),
);

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger docs
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api/docs.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Routes
app.use("/api/user", UserRoutes);
app.use("/api/chats", ChatRoutes);
app.use("/api/messages", MessageRoutes);
app.use("/api/contacts", ContactRoutes);
app.use("/api/cloudinary", CloudinaryRoutes);

const httpServer = createServer(app);

const io = initSocket(httpServer);

const onlineUsers = new Map<string, Set<string>>();

io.on("connection", (socket) => {
  const userId = socket.handshake.auth?.userId;

  if (!userId) {
    console.log("No userId provided");
    return;
  }

  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }

  onlineUsers.get(userId)!.add(socket.id);

  socket.emit("presence:initial", Array.from(onlineUsers.keys()));

  socket.broadcast.emit("user:online", userId);

  socket.on("chat:join", (room) => {
    socket.join(room);
  });

  socket.on("typing:start", ({ room, userId }) => {
    socket.to(room).emit("typing:start", { userId });
  });

  socket.on("typing:stop", ({ room, userId }) => {
    socket.to(room).emit("typing:stop", { userId });
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);

    const sockets = onlineUsers.get(userId);

    if (!sockets) return;

    sockets.delete(socket.id);

    if (sockets.size === 0) {
      onlineUsers.delete(userId);
      console.log(`${userId} is now offline`);
      io.emit("user:offline", userId);
    }
  });
});

connectDB()
  .then(() =>
    httpServer
      .once("error", (err) => {
        console.error(err);
        process.exit(1);
      })
      .listen(PORT, () => {
        console.log(`> Ready on http://localhost:${PORT}`);
      }),
  )
  .catch((error) => {
    console.log("Failed to connect database", error);
  });
