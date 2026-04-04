import { Request, Response } from "express";
import {
  sendMessage as sendMessageService,
  updateMessage as updateMessageService,
  deleteMessage as deleteMessageService,
} from "@/services/MessageService";

// POST /api/messages
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const result = await sendMessageService(req.authUser!, req.body);

    if ("error" in result) {
      if (result.error === "bad_request") {
        return res.status(400).json({ message: result.message });
      }
      if (result.error === "not_found") {
        return res.status(404).json({ message: "Chat not found" });
      }
      if (result.error === "forbidden") {
        return res.status(403).json({ message: "Not allowed in this chat" });
      }
    }

    return res
      .status(201)
      .json({
        message: "Message sent successfully",
        data: (result as { data: unknown }).data,
      });
  } catch (error) {
    console.error(error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// PUT /api/messages/:message_id
export const updateMessage = async (req: Request, res: Response) => {
  try {
    const result = await updateMessageService(
      req.params.message_id as string,
      req.body.content,
      req.authUser!,
    );

    if (result === "not_found") {
      return res.status(404).json({ message: "Message not found" });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.log("Message Update Error:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};

// DELETE /api/messages/:message_id
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const result = await deleteMessageService(
      req.params.message_id as string,
      req.authUser!,
    );

    if (result === "not_found") {
      return res.status(404).json({ message: "Message not found" });
    }

    return res.status(200).json({ message: "Message Deleted Successfully" });
  } catch (error) {
    console.log("Message Delete Error:", error);
    const { message } = error as { message: string };
    return res
      .status(500)
      .json({ message: message || "Internal Server Error" });
  }
};
