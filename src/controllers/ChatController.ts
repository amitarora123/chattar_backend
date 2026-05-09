import { Request, Response } from "express";
import {
  getUserChats,
  createGroup as createGroupService,
  getChatById as getChatByIdService,
  getChatMessages as getChatMessagesService,
  clearChat as clearChatService,
  getRecipientInfo as getRecipientInfoService,
  getChatKey,
} from "@/services/ChatService";
import { Chat, ChatParticipants, IChat } from "@/models/Chat";

// GET /api/chats/me
export const getMyChats = async (req: Request, res: Response) => {
  try {
    const result = await getUserChats(req.authUser!);
    return res.status(200).json(result);
  } catch (error) {
    console.log("User Chats Fetching Error:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// POST /api/chats/group
export const createGroup = async (req: Request, res: Response) => {
  try {
    const { memberIds, adminIds, name, description, avatar_url } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const result = await createGroupService(req.authUser!, {
      memberIds,
      adminIds,
      name,
      description,
      avatar_url,
    });
    return res.status(200).json(result);
  } catch (error) {
    console.log("Error creating group:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// GET /api/chats/:chat_id
export const getChatById = async (req: Request, res: Response) => {
  try {
    const result = await getChatByIdService(
      req.params.chat_id as string,
      req.authUser!,
    );

    if (!result) {
      return res
        .status(403)
        .json({ message: "User is not a participant of this chat" });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Chat Fetch Error:", error);
    const { message } = error as { message?: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// GET /api/chats/:chat_id/messages
export const getChatMessages = async (req: Request, res: Response) => {
  try {
    const result = await getChatMessagesService(
      req.params.chat_id as string,
      req.query.recipient_id as string | undefined,
      req.authUser!,
    );

    if (result === null) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (result === "forbidden") {
      return res
        .status(403)
        .json({ message: "Chat does not exist or access denied" });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.log("Error fetching messages:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// GET /api/chats/recipient/:recipient_id
export const getRecipientInfo = async (req: Request, res: Response) => {
  try {
    const result = await getRecipientInfoService(
      req.params.recipient_id as string,
      req.authUser!,
    );

    if (!result) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Recipient Info Fetch Error:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// DELETE /api/chats/:chat_id/clear
export const clearChat = async (req: Request, res: Response) => {
  try {
    const result = await clearChatService(
      req.params.chat_id as string,
      req.query.recipient_id as string | undefined,
      req.authUser!,
    );

    if (result === "not_found") {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (result === "forbidden") {
      return res
        .status(403)
        .json({ message: "Chat not found or access denied" });
    }

    return res.status(200).json({ message: "Chat Cleared Successfully" });
  } catch (error) {
    console.error("Chat Clear Error:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

export const createSingleChat = async (req: Request, res: Response) => {
  try {
    const { recipient_id } = req.body;

    const user_id = req.authUser!._id;

    const chat_key = getChatKey(recipient_id, user_id);

    const existingChat = await Chat.findOne({
      chat_key,
    });

    if (existingChat) {
      return res.json(existingChat);
    }

    // create the chat participants

    const newChat: IChat = await Chat.create({
      chat_key,
    });

    await ChatParticipants.create({
      chat_id: newChat._id,
      user_id,
    });

    await ChatParticipants.create({
      chat_id: recipient_id,
      user_id,
    });

    return res.json(newChat);
  } catch (error) {
    const { message } = error as { message: string };
    console.log("Error Creating Single Chat: ", message);
    return res.status(500).json({
      message,
    });
  }
};
