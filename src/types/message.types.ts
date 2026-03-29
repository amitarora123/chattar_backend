import { IMessageAttachment } from "@/models/Message";
import { ChatParticipant } from "./chat.types";

export interface Message {
  _id: string;
  content: string;
  chat_id: string;
  createdAt: string;
  updatedAt: string;
  is_edited: boolean;
  is_deleted: boolean;
  sender: ChatParticipant;
}

export interface SendMessageProps {
  chat_id?: string;
  content: string;
  recipient_id?: string;
  attachment?: IMessageAttachment;
  reply_to?: string;
  is_group: boolean;
}
