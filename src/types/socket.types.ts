import { Message, MessageSeen } from "./message.types";
import { Server as IOServer } from "socket.io";

export interface ServerToClientEvents {
  "presence:initial": (users: string[]) => void;
  "user:online": (userId: string) => void;
  "user:offline": (userId: string) => void;
  "typing:start": (data: { userId: string; chat_id: string }) => void;
  "typing:stop": (data: { userId: string; chat_id: string }) => void;
  "message:receive": (message: Message) => void;
  "message:update": (message: Message) => void;
  "message:delete": (data: { message_id: string; chat_id: string }) => void;
  "message:seen": (data: {
    message_id: string;
    userId: string;
    seen_at: string;
  }) => void;
}

export interface ClientToServerEvents {
  "chat:join": (room: string) => void;

  "typing:start": (data: { room: string; userId: string }) => void;

  "typing:stop": (data: { room: string; userId: string }) => void;

  "message:send": (
    data: {
      room: string;
      chat_id: string;
      content: string;
      attachment?: unknown;
      reply_to?: string;
    },
    callback: (response: { error?: string; data?: Message }) => void,
  ) => void;

  "message:seen": (
    data: { room: string; userId: string; message_id: string },
    callback: (response: { error?: string; data?: MessageSeen }) => void,
  ) => void;

  "message:edit": (
    data: { room: string; message_id: string; content: string },
    callback: (response: { error?: string; data?: Message }) => void,
  ) => void;

  "message:delete": (
    data: { room: string; message_id: string },
    callback: (response: { error?: string }) => void,
  ) => void;
}

export type InterServerEvents = Record<string, never>;
export interface SocketData {
  userId: string;
}

export type TypedIO = IOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
