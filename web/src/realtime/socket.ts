import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectSocket(token: string, branchId: number): Socket {
  if (socket) {
    socket.disconnect();
  }
  socket = io(import.meta.env.VITE_SOCKET_URL, {
    auth: { token },
    query: { branchId: String(branchId) },
  });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
