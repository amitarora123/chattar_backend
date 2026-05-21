import { Message, MessageReaction, MessageSeen } from "./message.types";
import { Server as IOServer } from "socket.io";

export interface StatusReactionPayload {
  user_id: string;
  emoji: string;
  created_at: Date;
}

export interface StatusCommentPayload {
  _id: string;
  user_id: string;
  text: string;
  created_at: Date;
}

export interface StatusViewPayload {
  user_id: string;
  viewed_at: string;
}

export interface RTCSdp {
  type: "offer" | "answer" | "pranswer" | "rollback";
  sdp?: string;
}

export interface RTCIceCandidateData {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

export interface CallUser {
  _id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

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
  "message:reaction": (data: {
    message_id: string;
    reactions: MessageReaction[];
  }) => void;
  "status:new": (data: {
    status: Record<string, unknown>;
    authorId: string;
  }) => void;
  "status:delete": (data: { status_id: string; authorId: string }) => void;
  "status:react": (data: {
    status_id: string;
    reactions: StatusReactionPayload[];
  }) => void;
  "status:comment": (data: {
    status_id: string;
    comment: StatusCommentPayload;
  }) => void;
  "status:view": (data: { status_id: string; view: StatusViewPayload }) => void;
  "status:poll_vote": (data: {
    status_id: string;
    option_index: number;
    votes: string[];
  }) => void;
  "call:incoming": (data: {
    call_id: string;
    from_user: CallUser;
    chat_id: string;
    type: "audio" | "video";
    offer: RTCSdp;
  }) => void;
  "call:accepted": (data: { call_id: string; answer: RTCSdp }) => void;
  "call:declined": (data: { call_id: string }) => void;
  "call:ended": (data: { call_id: string }) => void;
  "call:ice-candidate": (data: {
    call_id: string;
    candidate: RTCIceCandidateData;
  }) => void;
  "call:busy": (data: { call_id: string }) => void;
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

  "message:react": (
    data: { room: string; message_id: string; reaction: string },
    callback: (response: { error?: string; data?: MessageReaction[] }) => void,
  ) => void;
  "call:initiate": (
    data: {
      to_user_id: string;
      chat_id: string;
      type: "audio" | "video";
      offer: RTCSdp;
    },
    ack: (res: { error?: string; call_id?: string }) => void,
  ) => void;
  "call:accept": (data: { call_id: string; answer: RTCSdp }) => void;
  "call:decline": (data: { call_id: string }) => void;
  "call:end": (data: { call_id: string }) => void;
  "call:ice-candidate": (data: {
    call_id: string;
    to_user_id: string;
    candidate: RTCIceCandidateData;
  }) => void;
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
