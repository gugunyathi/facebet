import Peer from "peerjs";
import { createContext } from "react";

export const debugMode = import.meta.env.VITE_DEBUG_MODE === "true" || false;

export const VideoProvider = createContext();

export const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

export const peer = new Peer({
  host: import.meta.env.VITE_PEERJS_HOST || "0.peerjs.com",
  port: import.meta.env.VITE_PEERJS_PORT
    ? parseInt(import.meta.env.VITE_PEERJS_PORT)
    : 443,
  path: import.meta.env.VITE_PEERJS_PATH || "/",
  secure: import.meta.env.VITE_PEERJS_SECURE !== "false",
  config: {
    iceServers,
  },
});

peer.on("error", (err) => {
  if (debugMode) {
    console.warn("PeerJS initial error/warning:", err);
  }
});

const isSecure =
  typeof window !== "undefined" && window.location.protocol === "https:";
const wsProtocol = isSecure ? "wss:" : "ws:";
const defaultWsHost =
  typeof window !== "undefined" ? window.location.host : "localhost:3000";

export const WS_URL =
  import.meta.env.VITE_WS_REMOTE_URL || `${wsProtocol}//${defaultWsHost}`;

export const API_URL = (
  import.meta.env.VITE_API_URL || WS_URL.replace(/^wss:\/\//i, "https://").replace(/^ws:\/\//i, "http://")
).replace(/\/+$/, "");

export const HEARTBEAT = {
  message: "ping",
  interval: 58000,
  timeout: 120000,
  returnMessage: "pong",
};

export const MESSAGE_EVENTS = {
  MATCH: "match",
  WAITING: "waiting",
  JOIN: "join",
  SKIP: "skip",
};
