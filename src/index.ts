import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { createServer } from "node:http";
import swaggerUi from "swagger-ui-express";
import { initSocket, registerSocketHandlers } from "./lib/socket/server";
import { connectDB } from "./lib/utils/db";
import { swaggerSpec } from "./lib/utils/swagger";
import AuthRoutes from "./routes/auth.routes";
import UserRoutes from "./routes/user.routes";
import ChatRoutes from "./routes/chat.routes";
import MessageRoutes from "./routes/message.routes";
import CloudinaryRoutes from "./routes/cloudinary.routes";
import PushRoutes from "./routes/push.routes";
import LinkPreviewRoutes from "./routes/linkPreview.routes";
import StatusRoutes from "./routes/status.routes";
import CallRoutes from "./routes/call.routes";
import cookieParser from "cookie-parser";
import { Status } from "./models/Status";

dotenv.config();
const PORT = process.env.PORT || 8000;
const app = express();

const allowedHosts = process.env.ALLOWED_HOSTS?.split(",") || "*";

app.use(
  cors({
    credentials: true,
    origin: allowedHosts,
  }),
);

app.use(cookieParser());

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
app.use("/api/auth", AuthRoutes);
app.use("/api/user", UserRoutes);
app.use("/api/chats", ChatRoutes);
app.use("/api/messages", MessageRoutes);
app.use("/api/cloudinary", CloudinaryRoutes);
app.use("/api/push", PushRoutes);
app.use("/api/link-preview", LinkPreviewRoutes);
app.use("/api/status", StatusRoutes);
app.use("/api/calls", CallRoutes);

const httpServer = createServer(app);

const io = initSocket(httpServer);
registerSocketHandlers(io);

// Cleanup expired non-archived statuses older than 7 days
setInterval(
  async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await Status.deleteMany({
      expires_at: { $lt: sevenDaysAgo },
      is_archived: false,
    }).catch(() => {});
  },
  24 * 60 * 60 * 1000,
);

connectDB()
  .then(() =>
    httpServer
      .once("error", (err) => {
        console.error(err);
        process.exit(1);
      })
      .listen(PORT, () => {
        console.log(`> Ready on http://localhost:${PORT}/api/docs`);
      }),
  )
  .catch((error) => {
    console.log("Failed to connect database", error);
  });
