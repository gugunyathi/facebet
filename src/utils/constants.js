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

export const API_URL = (
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
).replace(/\/+$/, "");

export const WS_URL =
  import.meta.env.VITE_WS_REMOTE_URL ||
  API_URL.replace(/^https:\/\//i, "wss://").replace(/^http:\/\//i, "ws://");

export const getBrowserClientId = () => {
  if (typeof window === "undefined") return "server_client";
  let id = sessionStorage.getItem("facebet_client_id");
  if (!id) {
    id = `client_${Math.random().toString(36).substring(2, 10)}`;
    sessionStorage.setItem("facebet_client_id", id);
  }
  return id;
};

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
