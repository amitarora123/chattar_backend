import { Server as IOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { isValidObjectId } from "mongoose";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "@/types/socket.types";
import { ChatParticipants } from "@/models/Chat";
import { Message } from "@/models/Message";

type IOType = IOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

let io: IOType;

const allowedHosts = process.env.ALLOWED_HOSTS?.split(",") || "*";

export const initSocket = (server: HTTPServer) => {
  io = new IOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(server, {
    cors: {
      origin: allowedHosts,
      credentials: true,
    },
  });

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

    console.log("socket connected", userId);

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

    socket.on("message:send", async (data, callback) => {
      try {
        const isMember = await ChatParticipants.exists({
          chat_id: data.chat_id,
          user_id: userId,
          left_at: null,
        });

        if (!isMember) return callback({ error: "Not a participant" });

        const message = await Message.create({
          chat_id: data.chat_id,
          sender_id: userId,
          content: data.content || "",
          reply_to_id: isValidObjectId(data.reply_to)
            ? data.reply_to
            : undefined,
          attachment: data.attachment,
        });

        await message.populate(
          "sender_id",
          "_id username display_name avatar_url last_seen",
        );

        const formattedMessage = {
          _id: message._id.toString(),
          content: message.content,
          chat_id: message.chat_id.toString(),
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
          is_edited: message.is_edited,
          is_deleted: message.is_deleted,
          sender: {
            user: {
              _id: message.sender_id?._id?.toString(),
              username: message.sender_id?.username,
              display_name: message.sender_id?.display_name ?? null,
              avatar_url: message.sender_id?.avatar_url ?? null,
              last_seen: message.sender_id?.last_seen ?? null,
            },
            isContact: false,
            contactName: null,
          },
        };

        socket.to(data.room).emit("message:new", formattedMessage);
        callback({ data: formattedMessage });
      } catch (error) {
        const { message } = error as { message: string };
        callback({ error: message || "Failed to send message" });
      }
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
