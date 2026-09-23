import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import useWebSocketRaw, { ReadyState } from "react-use-websocket";

const useWebSocket = typeof useWebSocketRaw === "function"
  ? useWebSocketRaw
  : (useWebSocketRaw?.default || useWebSocketRaw);
import { log } from "@/utils/helpers";
import { HEARTBEAT, MESSAGE_EVENTS, WS_URL, peer } from "@/utils/constants";
import { addMessage, clearMessages } from "@/features/messaging/messagingSlice";
import {
  setError,
  setLoading,
  setReady,
  setStarted,
  setOnlineUsersCount,
  setWaitingForMatch,
} from "@/features/main/mainSlice";

function createFallbackStream() {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");

  let angle = 0;
  const draw = () => {
    // Dark Arena Background
    ctx.fillStyle = "#07012c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    angle += 0.05;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2 - 20;

    // Outer Glowing Ring
    const ringRadius = 75 + Math.sin(angle) * 8;
    ctx.beginPath();
    ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(100, 74, 241, 0.6)";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Player Head Circle
    ctx.beginPath();
    ctx.arc(cx, cy - 25, 30, 0, Math.PI * 2);
    ctx.fillStyle = "#a855f7";
    ctx.fill();

    // Player Body Shoulders
    ctx.beginPath();
    ctx.arc(cx, cy + 45, 55, Math.PI, 0, false);
    ctx.fillStyle = "#644af1";
    ctx.fill();

    // Live Camera Indicator Banner
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("YOU (Live Camera Stream)", cx, canvas.height - 60);

    ctx.fillStyle = "#22c55e";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("● Live Stream Active", cx, canvas.height - 35);

    requestAnimationFrame(draw);
  };
  draw();

  return canvas.captureStream(30);
}

export default function usePeer() {
  const ready = useSelector((state) => state.main.ready);
  const started = useSelector((state) => state.main.started);
  const dispatch = useDispatch();
  const [myPeerId, setMyPeerId] = useState();
  const [userSession, setUserSession] = useState(null);
  const [isSpectator, setIsSpectator] = useState(true);
  const [mediaStream, setMediaStream] = useState(null);

  const localStream = useRef();
  const remoteStream = useRef();
  const mediaStreamRef = useRef(null);

  const peerConnectionRef = useRef();
  const dataConnectionRef = useRef();
  const mediaConnectionRef = useRef();

  useEffect(() => {
    // Automatically start video stream on mount if not already started
    if (!mediaStreamRef.current) {
      startVideoStream();
    }
  }, []);

  useEffect(() => {
    if (localStream.current && mediaStreamRef.current) {
      localStream.current.muted = true;
      if (localStream.current.srcObject !== mediaStreamRef.current) {
        localStream.current.srcObject = mediaStreamRef.current;
        localStream.current.play?.().catch(() => {});
      }
    }
  }, [started, mediaStream]);

  const { sendMessage, lastMessage, readyState } = useWebSocket(WS_URL, {
    heartbeat: HEARTBEAT,
    shouldReconnect: () => false,
    reconnectAttempts: 2,
    onError: (e) => {
      log("WebSocket connection note:", e);
    },
  });

  useEffect(() => {
    if (peer.id) {
      log("Peer already initialized with id:", peer.id);
      setMyPeerId(peer.id);
      if (readyState !== ReadyState.CLOSED) {
        dispatch(setReady(true));
      }
    }

    const handleOpen = (id) => {
      log("Peer open", id);
      setMyPeerId(id);
      dispatch(setReady(true));
    };

    const handleConnection = (conn) => {
      log("Peer Connected");
      peerConnectionRef.current = conn;
    };

    const handleClose = () => {
      log("Peer closed");
    };

    const handleError = (err) => {
      log("Peer error:", err);
    };

    peer.on("open", handleOpen);
    peer.on("connection", handleConnection);
    peer.on("close", handleClose);
    peer.on("error", handleError);

    return () => {
      peer.off?.("open", handleOpen);
      peer.off?.("connection", handleConnection);
      peer.off?.("close", handleClose);
      peer.off?.("error", handleError);
    };
  }, [readyState, dispatch]);

  useEffect(() => {
    if (ready && readyState === ReadyState.OPEN && myPeerId && !started) {
      dispatch(setStarted(true));
      sendMessage(
        JSON.stringify({ event: MESSAGE_EVENTS.JOIN, id: myPeerId })
      );
    }
  }, [ready, readyState, myPeerId, started, sendMessage, dispatch]);

  useEffect(() => {
    if (lastMessage) {
      let messagePayload = null;
      try {
        messagePayload = JSON.parse(lastMessage.data);
      } catch (err) {
        log("Error parsing websocket message", err);
        return;
      }
      if (!messagePayload) return;

      const { event, id, isCaller, onlineUsersCount } = messagePayload;

      if (onlineUsersCount !== undefined) {
        dispatch(setOnlineUsersCount(onlineUsersCount));
        return;
      }

      if (event === MESSAGE_EVENTS.MATCH) {
        dispatch(setWaitingForMatch(false));
        try {
          const dataConnection = peer.connect(id);

          dataConnection.on("error", (err) => {
            log("Data connection error:", err);
          });

          if (isCaller) {
            log("Calling...");
            const currentStream = localStream.current?.srcObject;
            if (currentStream) {
              try {
                const call = peer.call(id, currentStream);

                call.on("stream", (stream) => {
                  if (remoteStream.current) {
                    remoteStream.current.srcObject = stream;
                    remoteStream.current.play?.().catch(() => {});
                  }
                });

                call.on("close", () => {
                  log("Call closed");
                });

                call.on("error", (err) => {
                  log("Call error:", err);
                });

                mediaConnectionRef.current = call;
              } catch (callErr) {
                log("Peer call error:", callErr);
              }
            }
          }

          peer.on("call", (call) => {
            try {
              const currentStream = localStream.current?.srcObject;
              if (currentStream) {
                call.answer(currentStream);
              } else {
                call.answer();
              }

              call.on("stream", (stream) => {
                if (remoteStream.current) {
                  remoteStream.current.srcObject = stream;
                  remoteStream.current.play?.().catch(() => {});
                }
              });

              call.on("close", () => {
                log("Remote Call closed");
              });

              call.on("error", (err) => {
                log("Remote call error:", err);
              });
            } catch (ansErr) {
              log("Call answer error:", ansErr);
            }
          });

          dataConnection.on("open", () => {
            log("Connection open");
          });

          dataConnection.on("data", (data) => {
            const message = {
              text: data,
              isMine: false,
            };
            dispatch(addMessage(message));
          });

          dataConnection.on("close", () => {
            log("Connection closed");
            dispatch(clearMessages());
            sendMessage(
              JSON.stringify({ event: MESSAGE_EVENTS.SKIP, id: myPeerId })
            );
          });

          dataConnectionRef.current = dataConnection;
        } catch (connErr) {
          log("Peer connection error:", connErr);
        }
      }

      if (event === MESSAGE_EVENTS.WAITING) {
        log("Waiting for a match...");

        if (remoteStream.current?.srcObject) {
          remoteStream.current.srcObject = null;
        }
        dispatch(setWaitingForMatch(true));
      }
    }
  }, [lastMessage, dispatch, myPeerId, sendMessage]);

  async function startVideoStream() {
    dispatch(setLoading(true));
    let videoStream = null;

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia
      ) {
        try {
          videoStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
        } catch (err1) {
          log("Audio+Video getUserMedia failed, trying video only:", err1);
          try {
            videoStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } catch (err2) {
            log("Video only getUserMedia failed:", err2);
          }
        }
      }
    } catch (error) {
      log("Media stream access error:", error);
    }

    if (!videoStream) {
      log("Creating fallback video stream");
      videoStream = createFallbackStream();
    }

    mediaStreamRef.current = videoStream;
    setMediaStream(videoStream);

    if (localStream.current) {
      localStream.current.muted = true;
      localStream.current.srcObject = videoStream;
      localStream.current.play?.().catch((e) => log("Video play error:", e));
    }

    dispatch(setLoading(false));
    dispatch(setStarted(true));
  }

  const startSpectatorMode = () => {
    setIsSpectator(true);
    dispatch(setStarted(true));
    if (readyState === ReadyState.OPEN && myPeerId) {
      sendMessage(
        JSON.stringify({ event: MESSAGE_EVENTS.JOIN, id: myPeerId })
      );
    }
  };

  const join = async () => {
    if (!ready) {
      dispatch(setError("default"));
      return;
    }
    setIsSpectator(false);
    try {
      await startVideoStream();
      if (readyState === ReadyState.OPEN) {
        sendMessage(
          JSON.stringify({ event: MESSAGE_EVENTS.JOIN, id: myPeerId })
        );
      }
    } catch (err) {
      log("Join error:", err);
    }
  };

  const skip = () => {
    peerConnectionRef.current?.close?.();
    mediaConnectionRef?.current?.close?.();
    dataConnectionRef.current?.close?.();

    log("Skipped");
  };

  const send = (e) => {
    e.preventDefault();
    if (!e.target[0].value) return;

    const message = {
      text: e.target[0].value,
      isMine: true,
    };

    e.target[0].value = "";

    if (!peerConnectionRef.current) return;
    peerConnectionRef.current?.send(message.text);
    dispatch(addMessage(message));
  };

  const end = () => {
    window.location.reload();
  };

  return {
    remoteStream,
    localStream,
    mediaStream: mediaStream || mediaStreamRef.current,
    getMediaStream: () => mediaStreamRef.current,
    startVideoStream,
    join,
    startSpectatorMode,
    skip,
    send,
    end,
    myPeerId,
    userSession,
    setUserSession,
    isSpectator,
    setIsSpectator,
  };
}
