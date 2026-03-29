import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import {
  getMyChats,
  createGroup,
  getChatById,
  getChatMessages,
  clearChat,
} from "@/controllers/ChatController";

const ChatRoutes = Router();

ChatRoutes.use(authMiddleware);

ChatRoutes.get("/me", getMyChats);
ChatRoutes.post("/group", createGroup);
ChatRoutes.get("/:chat_id", getChatById);
ChatRoutes.get("/:chat_id/messages", getChatMessages);
ChatRoutes.delete("/:chat_id/clear", clearChat);

export default ChatRoutes;
