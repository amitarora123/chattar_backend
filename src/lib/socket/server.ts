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

export const registerSocketHandlers = (io: IOType): void => {
  const onlineUsers = new Map<string, Set<string>>();

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId;

    if (!userId) {
      console.log("No userId provided");
      return;
    }

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }

    onlineUsers.get(userId)!.add(socket.id);

    socket.emit("presence:initial", Array.from(onlineUsers.keys()));

    socket.broadcast.emit("user:online", userId);

    socket.on("chat:join", (room) => {
      socket.join(room);
    });

    socket.on("typing:start", ({ room, userId }) => {
      socket.to(room).emit("typing:start", { userId });
    });

    socket.on("typing:stop", ({ room, userId }) => {
      socket.to(room).emit("typing:stop", { userId });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);

      const sockets = onlineUsers.get(userId);

      if (!sockets) return;

      sockets.delete(socket.id);

      if (sockets.size === 0) {
        onlineUsers.delete(userId);
        console.log(`${userId} is now offline`);
        io.emit("user:offline", userId);
      }
    });
  });
};
