import { Message } from "./message.types";

export interface GroupMetaData {
  name: string;
  description?: string;
  avatar_url?: string;
  created_by: string;
}

export interface ChatParticipant {
  user: {
    _id: string;
    username: string;
    avatar_url?: string | null;
  };
  role?: string;
  isContact: boolean;
  contactName: string | null;
}

export interface Chat {
  _id: string;
  is_group: boolean;
  groupMetaData?: GroupMetaData;
  last_message?: Message;
  participants?: ChatParticipant[];
  createdAt: string;
  updatedAt: string;
}
