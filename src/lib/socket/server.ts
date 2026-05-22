import { Server as IOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { isValidObjectId } from "mongoose";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "@/types/socket.types";
import { Chat, ChatParticipants } from "@/models/Chat";
import { Message, MessageReaction, MessageView } from "@/models/Message";
import { Call } from "@/models/Call";
import User from "@/models/User";
import {
  MessageReaction as MessageReactionShape,
  Sender,
} from "@/types/message.types";
import { sendPushToUser } from "@/controllers/PushController";

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

    // Personal room for direct notifications (status updates, etc.)
    socket.join(`user:${userId}`);

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

        // Fire push notifications to offline participants (non-blocking)
        Promise.all([
          ChatParticipants.find(
            { chat_id: data.chat_id, left_at: null, user_id: { $ne: userId } },
            { user_id: 1 },
          ).lean(),
          Chat.findById(data.chat_id, { is_group: 1, groupMetaData: 1 }).lean(),
        ])
          .then(([participants, chat]) => {
            const senderName = sender.username ?? "Someone";
            const preview = message.content
              ? message.content.slice(0, 100)
              : "📎 Attachment";
            const title = chat?.is_group
              ? (chat.groupMetaData?.name ?? "Group")
              : senderName;
            const body = chat?.is_group ? `${senderName}: ${preview}` : preview;
            return Promise.all(
              participants.map((p) =>
                sendPushToUser(p.user_id.toString(), {
                  title,
                  body,
                  icon: sender.avatar_url ?? undefined,
                  data: { chat_id: data.chat_id },
                }),
              ),
            );
          })
          .catch(() => {});
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

    socket.on("message:react", async ({ room, message_id, reaction }, ack) => {
      try {
        const message = await Message.findById(message_id).lean();
        if (!message) return ack({ error: "Message not found" });

        const isMember = await ChatParticipants.exists({
          chat_id: message.chat_id,
          user_id: userId,
          left_at: null,
        });
        if (!isMember) return ack({ error: "Not a participant" });

        const existing = await MessageReaction.findOne({
          message_id,
          participant_id: userId,
          reaction,
        });

        if (existing) {
          await MessageReaction.deleteOne({ _id: existing._id });
        } else {
          await MessageReaction.findOneAndUpdate(
            { message_id, participant_id: userId },
            { reaction },
            { upsert: true },
          );
        }

        const allReactions = await MessageReaction.find({ message_id }).lean();

        const reactionMap = new Map<string, string[]>();
        for (const r of allReactions) {
          const emoji = r.reaction;
          if (!reactionMap.has(emoji)) reactionMap.set(emoji, []);
          reactionMap.get(emoji)!.push(r.participant_id.toString());
        }
        const grouped: MessageReactionShape[] = Array.from(
          reactionMap.entries(),
        ).map(([emoji, userIds]) => ({
          emoji,
          count: userIds.length,
          userIds,
        }));

        socket
          .to(room)
          .emit("message:reaction", { message_id, reactions: grouped });
        ack({ data: grouped });
      } catch (error) {
        const { message } = error as { message: string };
        ack({ error: message || "Failed to react" });
      }
    });

    // ── Call signaling ──────────────────────────────────────────────────
    socket.on(
      "call:initiate",
      async ({ to_user_id, chat_id, type, offer }, ack) => {
        try {
          const [isCaller, isCallee] = await Promise.all([
            ChatParticipants.exists({
              chat_id,
              user_id: userId,
              left_at: null,
            }),
            ChatParticipants.exists({
              chat_id,
              user_id: to_user_id,
              left_at: null,
            }),
          ]);
          if (!isCaller || !isCallee)
            return ack({ error: "Not a participant" });

          const call = await Call.create({
            caller_id: userId,
            callee_id: to_user_id,
            chat_id,
            type,
            status: "ringing",
            offer,
          });

          const callerUser = await User.findById(userId)
            .select("username display_name avatar_url")
            .lean();

          io.to(`user:${to_user_id}`).emit("call:incoming", {
            call_id: call._id.toString(),
            from_user: {
              _id: userId,
              username: callerUser?.username ?? "",
              display_name: callerUser?.display_name ?? undefined,
              avatar_url: callerUser?.avatar_url ?? undefined,
            },
            chat_id,
            type,
            offer,
          });

          sendPushToUser(to_user_id, {
            title:
              callerUser?.display_name ??
              callerUser?.username ??
              "Incoming call",
            body: `Incoming ${type} call`,
            icon: callerUser?.avatar_url ?? undefined,
            data: {
              call_id: call._id.toString(),
              chat_id,
              type,
              action: "call:incoming",
            },
          }).catch(() => {});

          ack({ call_id: call._id.toString() });
        } catch {
          ack({ error: "Failed to initiate call" });
        }
      },
    );

    socket.on("call:accept", async ({ call_id, answer }) => {
      const call = await Call.findByIdAndUpdate(
        call_id,
        { status: "answered" },
        { new: true },
      );
      if (!call) return;
      io.to(`user:${call.caller_id.toString()}`).emit("call:accepted", {
        call_id,
        answer,
      });
    });

    socket.on("call:decline", async ({ call_id }) => {
      const call = await Call.findByIdAndUpdate(
        call_id,
        { status: "declined", ended_at: new Date() },
        { new: true },
      );
      if (!call) return;
      io.to(`user:${call.caller_id.toString()}`).emit("call:declined", {
        call_id,
      });

      const callerUser = await User.findById(call.caller_id)
        .select("_id username avatar_url")
        .lean();
      const callMsg = await Message.create({
        chat_id: call.chat_id,
        sender_id: call.caller_id,
        content: "",
        call_info: { call_id: call._id, type: call.type, status: "declined" },
      });
      io.to(`chat:${call.chat_id.toString()}`).emit("message:receive", {
        _id: callMsg._id.toString(),
        content: "",
        chat_id: callMsg.chat_id.toString(),
        createdAt: callMsg.createdAt,
        updatedAt: callMsg.updatedAt,
        is_edited: false,
        is_deleted: false,
        seen: [],
        reply_to: null,
        sender: {
          _id: callerUser?._id.toString() ?? call.caller_id.toString(),
          username: callerUser?.username ?? "",
          avatar_url: callerUser?.avatar_url ?? null,
        },
        call_info: {
          call_id: call._id.toString(),
          type: call.type,
          status: "declined",
        },
      });
    });

    socket.on("call:end", async ({ call_id }) => {
      const call = await Call.findById(call_id);
      if (!call) return;

      const wasRinging = call.status === "ringing";
      const duration = wasRinging
        ? undefined
        : Math.floor((Date.now() - call.started_at.getTime()) / 1000);
      const newStatus = wasRinging ? "missed" : "ended";

      await Call.findByIdAndUpdate(call_id, {
        status: newStatus,
        ended_at: new Date(),
        ...(duration !== undefined && { duration }),
      });

      const otherUserId =
        call.caller_id.toString() === userId
          ? call.callee_id.toString()
          : call.caller_id.toString();
      io.to(`user:${otherUserId}`).emit("call:ended", { call_id });

      const callerUser = await User.findById(call.caller_id)
        .select("_id username avatar_url")
        .lean();
      const callMsg = await Message.create({
        chat_id: call.chat_id,
        sender_id: call.caller_id,
        content: "",
        call_info: {
          call_id: call._id,
          type: call.type,
          status: newStatus,
          ...(duration !== undefined && { duration }),
        },
      });
      io.to(`chat:${call.chat_id.toString()}`).emit("message:receive", {
        _id: callMsg._id.toString(),
        content: "",
        chat_id: callMsg.chat_id.toString(),
        createdAt: callMsg.createdAt,
        updatedAt: callMsg.updatedAt,
        is_edited: false,
        is_deleted: false,
        seen: [],
        reply_to: null,
        sender: {
          _id: callerUser?._id.toString() ?? call.caller_id.toString(),
          username: callerUser?.username ?? "",
          avatar_url: callerUser?.avatar_url ?? null,
        },
        call_info: {
          call_id: call._id.toString(),
          type: call.type,
          status: newStatus,
          ...(duration !== undefined && { duration }),
        },
      });
    });

    socket.on("call:ice-candidate", ({ call_id, to_user_id, candidate }) => {
      io.to(`user:${to_user_id}`).emit("call:ice-candidate", {
        call_id,
        candidate,
      });
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
