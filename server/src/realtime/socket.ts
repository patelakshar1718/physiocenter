import { Server as HttpServer } from "node:http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AdminJwtPayload } from "../shared/types";

let io: SocketIOServer | null = null;

export function branchRoom(branchId: number): string {
  return `reception:${branchId}`;
}

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: env.CORS_ORIGIN },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Missing auth token"));
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as AdminJwtPayload;
      (socket as Socket & { admin: AdminJwtPayload }).admin = payload;
      next();
    } catch {
      next(new Error("Invalid auth token"));
    }
  });

  io.on("connection", (socket) => {
    const admin = (socket as Socket & { admin: AdminJwtPayload }).admin;
    const requestedBranchId = socket.handshake.query.branchId
      ? Number(socket.handshake.query.branchId)
      : admin.branchId;

    // super-admin (branchId null) can join any branch room by passing ?branchId=
    // scoped admins can only join their own branch room
    if (admin.branchId !== null && requestedBranchId !== admin.branchId) {
      socket.disconnect(true);
      return;
    }
    if (requestedBranchId !== null && requestedBranchId !== undefined) {
      socket.join(branchRoom(requestedBranchId));
    }
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.IO server not initialized");
  return io;
}
