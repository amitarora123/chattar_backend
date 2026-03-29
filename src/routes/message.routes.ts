import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import {
  sendMessage,
  updateMessage,
  deleteMessage,
} from "@/controllers/MessageController";

const MessageRoutes = Router();

MessageRoutes.use(authMiddleware);

MessageRoutes.post("/", sendMessage);
MessageRoutes.put("/:message_id", updateMessage);
MessageRoutes.delete("/:message_id", deleteMessage);

export default MessageRoutes;
