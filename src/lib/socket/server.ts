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
import { Message, MessageView } from "@/models/Message";
import { Sender } from "@/types/message.types";

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

    ChatParticipants.find({ user_id: userId, left_at: null }, { chat_id: 1 })
      .lean()
      .then((participations) => {
        const rooms = participations.map((p) => `chat:${p.chat_id}`);
        socket.join(rooms);
      })
      .catch((err) => console.error("Failed to auto-join chat rooms:", err));

    socket.emit("presence:initial", Array.from(onlineUsers.keys()));

    socket.broadcast.emit("user:online", userId);

    socket.on("chat:join", (room) => {
      socket.join(room);
    });

    socket.on("typing:start", ({ room, userId }) => {
      const chat_id = room.replace("chat:", "");
      socket.to(room).emit("typing:start", { userId, chat_id });
    });

    socket.on("typing:stop", ({ room, userId }) => {
      const chat_id = room.replace("chat:", "");
      socket.to(room).emit("typing:stop", { userId, chat_id });
    });

    socket.on(
      "message:seen",
      async ({ room, userId, message_id }, callback) => {
        try {
          const message = await Message.findById(message_id);

          if (!message) {
            return callback({ error: "Message not found" });
          }

          const chat_id = message.chat_id;

          const participant = await ChatParticipants.exists({
            chat_id: chat_id,
            user_id: userId,
            left_at: null,
          });

          if (!participant) return callback({ error: "Not a participant" });

          const seen = await MessageView.findOneAndUpdate(
            { message_id, user_id: userId },
            {
              $setOnInsert: {
                message_id,
                user_id: userId,
                viewed_at: new Date(),
              },
            },
            { upsert: true, new: true },
          );

          socket.to(room).emit("message:seen", {
            message_id,
            seen_at: seen!.viewed_at,
            userId,
          });

          callback({ data: seen! });
        } catch (error) {
          const { message } = error as { message: string };
          callback({ error: message || "Failed to send message" });
        }
      },
    );

    socket.on("message:send", async (data, callback) => {
      try {
        const isMember = await ChatParticipants.exists({
          chat_id: data.chat_id,
          user_id: userId,
          left_at: null,
        });

        if (!isMember) return callback({ error: "Not a participant" });

        //TODO:check if reply_to exists or not

        const message = await Message.create({
          chat_id: data.chat_id,
          sender_id: userId,
          content: data.content || "",
          reply_to_id: isValidObjectId(data.reply_to)
            ? data.reply_to
            : undefined,
          attachment: data.attachment,
        });

        await message.populate("sender_id", "_id username avatar_url");

        if (isValidObjectId(data.reply_to)) {
          await message.populate({
            path: "reply_to_id",
            select: "_id content is_deleted attachment sender_id",
            populate: {
              path: "sender_id",
              select: "_id username avatar_url",
            },
          });
        }

        const sender = message.sender_id as Sender;
        const replyTo = isValidObjectId(data.reply_to)
          ? message.reply_to_id
          : null;

        const formattedMessage = {
          _id: message._id.toString(),
          content: message.content,
          chat_id: message.chat_id.toString(),
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
          is_edited: message.is_edited,
          is_deleted: message.is_deleted,
          attachment: message.attachment,
          seen: [],
          reply_to: replyTo
            ? {
                _id: replyTo._id.toString(),
                content: replyTo.content,
                is_deleted: replyTo.is_deleted,
                attachment: replyTo.attachment ?? null,
                sender: {
                  _id: replyTo.sender_id?._id?.toString() ?? null,
                  username: replyTo.sender_id?.username ?? null,
                  display_name: replyTo.sender_id?.display_name ?? null,
                  avatar_url: replyTo.sender_id?.avatar_url ?? null,
                },
              }
            : null,
          sender: {
            _id: sender._id?.toString(),
            username: sender.username,
            avatar_url: sender.avatar_url ?? null,
          },
        };

        socket.to(data.room).emit("message:receive", formattedMessage);
        callback({ data: formattedMessage });
      } catch (error) {
        const { message } = error as { message: string };
        callback({ error: message || "Failed to send message" });
      }
    });

    socket.on("message:edit", async ({ room, message_id, content }, ack) => {
      try {
        if (!isValidObjectId(message_id))
          return ack({ error: "Invalid message id" });

        const updated = await Message.findOneAndUpdate(
          { _id: message_id, sender_id: userId },
          { content, is_edited: true },
          { new: true },
        ).populate<{ sender_id: Sender }>(
          "sender_id",
          "_id username avatar_url ",
        );

        if (!updated)
          return ack({ error: "Message not found or not authorized" });

        // find message seen
        const seen = await MessageView.find({
          message_id,
        }).select("user_id viewed_at");

        const formattedMessage = {
          _id: updated._id.toString(),
          content: updated.content,
          chat_id: updated.chat_id.toString(),
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          is_edited: updated.is_edited,
          is_deleted: updated.is_deleted,
          attachment: updated.attachment,
          seen,
          sender: {
            _id: updated.sender_id._id?.toString(),
            username: updated.sender_id.username,
            avatar_url: updated.sender_id.avatar_url ?? null,
          },
        };

        socket.to(room).emit("message:update", formattedMessage);
        ack({ data: formattedMessage });
      } catch (error) {
        const { message } = error as { message: string };
        ack({ error: message || "Failed to edit message" });
      }
    });

    socket.on("message:delete", async ({ room, message_id }, ack) => {
      try {
        if (!isValidObjectId(message_id))
          return ack({ error: "Invalid message id" });

        const message = await Message.findOne({
          _id: message_id,
          sender_id: userId,
        });

        if (!message)
          return ack({ error: "Message not found or not authorized" });

        await Message.findByIdAndUpdate(message_id, {
          is_deleted: true,
          content: "",
          attachment: null,
        });

        const chat_id = message.chat_id.toString();
        socket.to(room).emit("message:delete", { message_id, chat_id });
        ack({});
      } catch (error) {
        const { message } = error as { message: string };
        ack({ error: message || "Failed to delete message" });
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
