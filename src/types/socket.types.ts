import { Message } from "./message.types";
import { Server as IOServer } from "socket.io";

export interface ServerToClientEvents {
  "presence:initial": (users: string[]) => void;
  "user:online": (userId: string) => void;
  "user:offline": (userId: string) => void;
  "typing:start": (data: { userId: string }) => void;
  "typing:stop": (data: { userId: string }) => void;
  "message:new": (message: Message) => void;
}

export interface ClientToServerEvents {
  "chat:join": (room: string) => void;

  "typing:start": (data: { room: string; userId: string }) => void;

  "typing:stop": (data: { room: string; userId: string }) => void;
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
