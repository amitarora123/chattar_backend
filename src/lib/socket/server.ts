import { Server as IOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "@/types/socket.types";

type IOType = IOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

let io: IOType;

export const initSocket = (server: HTTPServer) => {
  io = new IOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(server);

  return io;
};

export const getIO = (): IOType => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};
