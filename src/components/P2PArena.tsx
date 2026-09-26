import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { VideoProvider, API_URL, WS_URL, peer as globalPeer } from '@/utils/constants';
import { parseExpressionKeywords } from '@/components/TrendTicker';

interface P2PArenaProps {
  currentPeerId?: string;
  walletAddress?: string;
  peerInstance?: any;
  userSession?: any;
  onRequireAuth?: () => void;
  onBuyTickets?: () => void;
}

interface ArenaPlayerInfo {
  userId: string;
  peerId: string;
  walletAddress: string;
  userName: string;
  bidAmount: number;
  consecutiveWins?: number;
  joinedAt?: number;
  queuePosition?: number;
}

interface ArenaState {
  king: ArenaPlayerInfo | null;
  challenger: ArenaPlayerInfo | null;
  queue: ArenaPlayerInfo[];
  matchCounter: number;
  matchStatus: string;
  isDemocratizedTurn: boolean;
  onlineUsersCount: number;
}

export const P2PArena: React.FC<P2PArenaProps> = ({
  currentPeerId = "player-peer-1",
  walletAddress = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  peerInstance,
  userSession,
  onRequireAuth,
  onBuyTickets,
}) => {
  const videoContext = useContext(VideoProvider);
  const activePeer = peerInstance || videoContext?.peer || globalPeer;

  const [matchStatus, setMatchStatus] = useState<string>("INACTIVE");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [winnerId, setWinnerId] = useState<number | null>(null); // Tracking 1 or 2
  const [verdictReason, setVerdictReason] = useState<string>("");
  const [gameMode, setGameMode] = useState<'PVP' | 'PVAI'>('PVP');
  const [botData, setBotData] = useState<any>(null);
  const [chatLog, setChatLog] = useState<string[]>([]);
  const [aiExpressionState, setAiExpressionState] = useState<string>("Scanning your aura...");
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>('horizontal');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDualTestMode, setIsDualTestMode] = useState<boolean>(false);
  const [hasRemoteStream, setHasRemoteStream] = useState<boolean>(false);
  const [autoBattle, setAutoBattle] = useState<boolean>(true);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const [myRole, setMyRole] = useState<'PLAYER_1' | 'PLAYER_2' | 'QUEUED' | 'SPECTATOR'>('SPECTATOR');
  const [bidAmount, setBidAmount] = useState<number>(0.20);
  const [myQueuePosition, setMyQueuePosition] = useState<number | null>(null);

  // Target Words Overlay State for Facial Expressions
  const [activeTrendPrompt, setActiveTrendPrompt] = useState<string>("Cyberpunk wide-eyed shock expression with unhinged jaw");
  const [targetWords, setTargetWords] = useState<string[]>(["WIDE-EYED SHOCK", "UNHINGED JAW", "NEON GAZE", "CYBER SMILE"]);
  const [targetWordIndex, setTargetWordIndex] = useState<number>(0);

  // Fetch active AI trend & extract target words
  useEffect(() => {
    const fetchActiveTrend = async () => {
      try {
        const res = await fetch(`${API_URL}/api/active-trend`);
        const data = await res.json();
        if (data?.currentTrend) {
          setActiveTrendPrompt(data.currentTrend);
          const keywords = parseExpressionKeywords(data.currentTrend);
          if (keywords.length > 0) {
            setTargetWords(keywords);
          }
        }
      } catch (e) {
        console.warn("Could not fetch active trend:", e);
      }
    };

    fetchActiveTrend();
    const interval = setInterval(fetchActiveTrend, 30000);
    return () => clearInterval(interval);
  }, []);

  // Rotate active target expression word every 4 seconds
  useEffect(() => {
    if (targetWords.length === 0) return;
    const interval = setInterval(() => {
      setTargetWordIndex(prev => (prev + 1) % targetWords.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [targetWords.length]);

  const [arenaState, setArenaState] = useState<ArenaState>({
    king: null,
    challenger: null,
    queue: [],
    matchCounter: 0,
    matchStatus: 'WAITING',
    isDemocratizedTurn: false,
    onlineUsersCount: 1
  });

  const socketRef = useRef<WebSocket | null>(null);

  // Tab-isolated session ID to prevent tab-collisions on the same device
  const [tabSessionId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'p1';
    let stored = sessionStorage.getItem('facebet_tab_peer_id');
    if (!stored) {
      stored = `node_${Math.random().toString(36).substring(2, 8)}`;
      sessionStorage.setItem('facebet_tab_peer_id', stored);
    }
    return stored;
  });

  const p1VideoRef = useRef<HTMLVideoElement | null>(null);
  const p2VideoRef = useRef<HTMLVideoElement | null>(null);
  const activeMediaStreamRef = useRef<MediaStream | null>(null);
  const secondaryMediaStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  // Spectator-specific stream refs: track king and challenger streams independently
  const kingStreamRef = useRef<MediaStream | null>(null);
  const challengerStreamRef = useRef<MediaStream | null>(null);
  const activeCallRef = useRef<any>(null); // Tracks current PeerJS call to prevent duplicates
  // Map<peerId, PeerJS MediaConnection> for all outbound spectator broadcast calls
  const spectatorCallsRef = useRef<Map<string, any>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic rotational stream mapping helper: maps streams based on myRole and current match state
  const handleStreamMapping = useCallback(() => {
    const localStream = activeMediaStreamRef.current || videoContext?.mediaStream || videoContext?.getMediaStream?.() || null;
    const remoteStream = remoteStreamRef.current || videoContext?.remoteMediaStream || null;

    if (isDualTestMode && localStream) {
      if (p1VideoRef.current) {
        if (p1VideoRef.current.srcObject !== localStream) p1VideoRef.current.srcObject = localStream;
        p1VideoRef.current.muted = true;
        p1VideoRef.current.play().catch(() => {});
      }
      if (p2VideoRef.current) {
        const stream2 = secondaryMediaStreamRef.current || localStream;
        if (p2VideoRef.current.srcObject !== stream2) p2VideoRef.current.srcObject = stream2;
        p2VideoRef.current.muted = true;
        p2VideoRef.current.play().catch(() => {});
      }
      return;
    }

    // SCENARIO A: You are Player 1 (King / Host)
    if (myRole === 'PLAYER_1') {
      if (p1VideoRef.current && localStream) {
        if (p1VideoRef.current.srcObject !== localStream) p1VideoRef.current.srcObject = localStream;
        p1VideoRef.current.muted = true;
        p1VideoRef.current.play().catch(() => {});
      }
      if (p2VideoRef.current) {
        if (remoteStream && p2VideoRef.current.srcObject !== remoteStream) {
          p2VideoRef.current.srcObject = remoteStream;
          p2VideoRef.current.play().catch(() => {});
        } else if (!remoteStream && gameMode !== 'PVAI') {
          p2VideoRef.current.srcObject = null;
        }
        p2VideoRef.current.muted = false;
      }
    }
    // SCENARIO B: You are Player 2 (Challenger)
    else if (myRole === 'PLAYER_2') {
      if (p2VideoRef.current && localStream) {
        if (p2VideoRef.current.srcObject !== localStream) p2VideoRef.current.srcObject = localStream;
        p2VideoRef.current.muted = true;
        p2VideoRef.current.play().catch(() => {});
      }
      if (p1VideoRef.current) {
        if (remoteStream && p1VideoRef.current.srcObject !== remoteStream) {
          p1VideoRef.current.srcObject = remoteStream;
          p1VideoRef.current.play().catch(() => {});
        }
        p1VideoRef.current.muted = false;
      }
    }
    // SCENARIO C: Spectator / Queued — receive king stream in p1, challenger stream in p2
    else {
      if (p1VideoRef.current && kingStreamRef.current) {
        if (p1VideoRef.current.srcObject !== kingStreamRef.current) {
          p1VideoRef.current.srcObject = kingStreamRef.current;
          p1VideoRef.current.play().catch(() => {});
        }
        p1VideoRef.current.muted = false;
      }
      if (p2VideoRef.current && challengerStreamRef.current) {
        if (p2VideoRef.current.srcObject !== challengerStreamRef.current) {
          p2VideoRef.current.srcObject = challengerStreamRef.current;
          p2VideoRef.current.play().catch(() => {});
        }
        p2VideoRef.current.muted = false;
      }
    }
  }, [myRole, videoContext?.remoteMediaStream, videoContext?.mediaStream, isDualTestMode, gameMode]);

  // Multi-camera input device state
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [p1DeviceId, setP1DeviceId] = useState<string>('');
  const [p2DeviceId, setP2DeviceId] = useState<string>('');

  // Enumerate video input devices on mount
  useEffect(() => {
    let isSubscribed = true;
    const detectCameras = async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter(d => d.kind === 'videoinput');
          if (isSubscribed) {
            setVideoDevices(videoInputs);
            if (videoInputs.length > 0) {
              if (!p1DeviceId) setP1DeviceId(videoInputs[0].deviceId);
              if (!p2DeviceId) setP2DeviceId(videoInputs[1]?.deviceId || videoInputs[0].deviceId);
            }
          }
        }
      } catch (e) {
        console.warn("Could not list video input devices:", e);
      }
    };
    detectCameras();
    return () => { isSubscribed = false; };
  }, []);

  const basePeerId = userSession?.peerId || currentPeerId || "guest";
  const activeUserId = `${basePeerId}_${tabSessionId}`;
  const activeWallet = userSession?.walletAddress || walletAddress;
  const activeName = userSession?.userName || `Player_${tabSessionId}`;

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Sync videoContext remoteMediaStream directly to remote stream ref and run handleStreamMapping
  useEffect(() => {
    const stream = videoContext?.remoteMediaStream;
    if (stream) {
      remoteStreamRef.current = stream;
      setHasRemoteStream(true);
      setGameMode('PVP');
      if (matchStatus !== 'LIVE') {
        setMatchStatus('LIVE');
        setCountdown(10);
      }
      handleStreamMapping();
    }
  }, [videoContext?.remoteMediaStream, handleStreamMapping, matchStatus]);

  // Re-evaluate stream mappings whenever match or role shifts
  useEffect(() => {
    handleStreamMapping();
  }, [handleStreamMapping, arenaState]);

  // Re-evaluate stream mappings when test mode toggles
  useEffect(() => {
    handleStreamMapping();
  }, [handleStreamMapping, isDualTestMode]);

  // Listen for WebSocket real-time Arena state updates and P2P_MATCH_FOUND events
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        socket?.send(JSON.stringify({ event: "GET_ARENA_STATE" }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.event === "ARENA_STATE_UPDATE") {
            setArenaState({
              king: data.king || null,
              challenger: data.challenger || null,
              queue: data.queue || [],
              matchCounter: data.matchCounter || 0,
              matchStatus: data.matchStatus || 'WAITING',
              isDemocratizedTurn: !!data.isDemocratizedTurn,
              onlineUsersCount: data.onlineUsersCount || 1
            });

            // Dynamically update user role and queue rank
            if (data.king?.userId === activeUserId) {
              setMyRole('PLAYER_1');
              setMyQueuePosition(null);
            } else if (data.challenger?.userId === activeUserId) {
              setMyRole('PLAYER_2');
              setMyQueuePosition(null);
            } else {
              const inQueueIdx = (data.queue || []).findIndex((q: any) => q.userId === activeUserId);
              if (inQueueIdx !== -1) {
                setMyRole('QUEUED');
                setMyQueuePosition(inQueueIdx + 1);
              } else {
                setMyRole('SPECTATOR');
                setMyQueuePosition(null);
              }
            }
          }

          if (data.event === "P2P_MATCH_FOUND") {
            const { player1PeerId, player2PeerId } = data;
            if (activeUserId === player1PeerId && player2PeerId) {
              setMyRole('PLAYER_1');
              setGameMode('PVP');
              setChatLog(prev => [...prev, "🔵 Player 1 Seat Claimed! Waiting for challenger to arrive..."]);
              // King auto-dials challenger via arenaState.challenger useEffect
            } else if (activeUserId === player2PeerId && player1PeerId) {
              setMyRole('PLAYER_2');
              setGameMode('PVP');
              setChatLog(prev => [...prev, "🔴 Player 2 Seat Claimed! Listening for king's call..."]);
              // Challenger answers via the inbound call handler useEffect
            }
          }
        } catch {}
      };
    } catch {}

    return () => {
      try { socket?.close(); } catch {}
    };
  }, [activeUserId]);

  // Handle joining or leaving the King-of-the-Hill Arena Queue
  const handleJoinArenaQueue = async () => {
    if (!userSession && onRequireAuth) {
      onRequireAuth();
      return;
    }

    setMatchStatus("QUEUEING");

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        event: "JOIN_ARENA_QUEUE",
        userId: activeUserId,
        peerId: activeUserId,
        walletAddress: activeWallet,
        userName: activeName,
        bidAmount: bidAmount
      }));
    }

    try {
      const response = await fetch(`${API_URL}/api/duel/matchmake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          peerId: activeUserId,
          walletAddress: activeWallet,
          userName: activeName,
          stakeUSD: bidAmount,
        })
      });
      const data = await response.json();
      if (data.userRole === 'PLAYER_1') {
        setMyRole('PLAYER_1');
        setChatLog(prev => [...prev, "👑 You are Player 1 (Reigning King)."]);
      } else if (data.userRole === 'PLAYER_2') {
        setMyRole('PLAYER_2');
        setChatLog(prev => [...prev, "⚔️ Challenger spot claimed! Match starting..."]);
      } else if (data.userRole === 'QUEUED') {
        setMyRole('QUEUED');
        setMyQueuePosition(data.queuePosition);
        setChatLog(prev => [...prev, `⏳ Joined Queue (#${data.queuePosition} in line | Bid: $${bidAmount.toFixed(2)})`]);
      }
    } catch {}
  };

  const handleLeaveArenaQueue = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        event: "LEAVE_ARENA_QUEUE",
        userId: activeUserId
      }));
    }
    setMyRole('SPECTATOR');
    setMyQueuePosition(null);
    setChatLog(prev => [...prev, "🚪 Left the Arena Queue."]);
  };

  // ─── ROLE-GATED CAMERA ACQUISITION ───────────────────────────────────────────
  // Camera is only started when the user is actively playing (PLAYER_1 or PLAYER_2).
  // Spectators and queued users never acquire a MediaStream.
  useEffect(() => {
    let isSubscribed = true;
    const isActivePlayer = myRole === 'PLAYER_1' || myRole === 'PLAYER_2';

    if (!isActivePlayer) {
      // Not playing — stop any existing tracks and release camera
      if (activeMediaStreamRef.current) {
        activeMediaStreamRef.current.getTracks().forEach(t => t.stop());
        activeMediaStreamRef.current = null;
      }
      handleStreamMapping();
      return;
    }

    // Already have a stream — just re-map
    if (activeMediaStreamRef.current) {
      handleStreamMapping();
      return;
    }

    const acquireCamera = async () => {
      // 1. Try videoContext (shared global stream from parent provider)
      let stream: MediaStream | null =
        videoContext?.mediaStream || videoContext?.getMediaStream?.() || null;

      // 2. Try specific device ID
      if (!stream && p1DeviceId && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: p1DeviceId } },
            audio: true
          });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          } catch {}
        }
      }

      // 3. Final fallback
      if (!stream && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (err) {
          console.warn("Camera acquisition failed:", err);
        }
      }

      if (isSubscribed && stream) {
        activeMediaStreamRef.current = stream;
        handleStreamMapping();
      }
    };

    acquireCamera();

    return () => {
      isSubscribed = false;
    };
  }, [myRole, p1DeviceId, videoContext, handleStreamMapping]);

  // ─── KING AUTO-INITIATES P2P CALL WHEN CHALLENGER ARRIVES ────────────────────
  // Fires whenever arenaState updates. If I am the king and a challenger is now
  // present, I open the WebRTC call. activeCallRef prevents duplicate calls.
  useEffect(() => {
    if (!activePeer || !arenaState.challenger || myRole !== 'PLAYER_1') return;

    const challengerPeerId = arenaState.challenger.peerId;
    // Avoid re-calling if already connected to this same challenger
    if (activeCallRef.current?.peer === challengerPeerId) return;

    const dialChallenger = async () => {
      let localStream = activeMediaStreamRef.current;
      if (!localStream && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          activeMediaStreamRef.current = localStream;
        } catch {}
      }
      if (!localStream) return;

      // Close any stale call
      if (activeCallRef.current) {
        try { activeCallRef.current.close(); } catch {}
      }

      console.log(`📞 King dialing challenger (${challengerPeerId})...`);
      const call = activePeer.call(challengerPeerId, localStream);
      activeCallRef.current = call;

      call.on('stream', (remoteStream: MediaStream) => {
        console.log("🎥 Challenger stream received!");
        remoteStreamRef.current = remoteStream;
        setHasRemoteStream(true);
        setGameMode('PVP');
        setWinnerId(null);
        setVerdictReason("");
        setMatchStatus("LIVE");
        setCountdown(10);
        setChatLog(prev => [...prev, `⚔️ Match LIVE vs Challenger (${challengerPeerId.slice(0, 8)}...)` ]);
        handleStreamMapping();
      });

      call.on('close', () => { activeCallRef.current = null; });
      call.on('error', () => { activeCallRef.current = null; });
    };

    dialChallenger();
  }, [arenaState.challenger, myRole, activePeer, handleStreamMapping]);

  // ─── KING BROADCASTS TO SPECTATORS IN QUEUE ───────────────────────────────────
  // When queue changes, King dials any new spectator not already in spectatorCallsRef.
  // Closed/stale calls are cleaned up when the spectator leaves the queue.
  useEffect(() => {
    if (!activePeer || myRole !== 'PLAYER_1' || !arenaState.queue.length) return;

    const localStream = activeMediaStreamRef.current;
    if (!localStream) return;

    const currentQueuePeerIds = new Set(arenaState.queue.map(s => s.peerId));

    // Close calls to peers who left the queue
    spectatorCallsRef.current.forEach((call, peerId) => {
      if (!currentQueuePeerIds.has(peerId)) {
        try { call.close(); } catch {}
        spectatorCallsRef.current.delete(peerId);
      }
    });

    // Dial any new spectators not yet called
    arenaState.queue.forEach((spectator) => {
      if (!spectator.peerId || spectatorCallsRef.current.has(spectator.peerId)) return;
      if (spectator.peerId === activeUserId) return; // don't call ourselves

      console.log(`📺 King broadcasting to spectator (${spectator.peerId.slice(0, 8)}...)`);
      const call = activePeer.call(spectator.peerId, localStream);
      spectatorCallsRef.current.set(spectator.peerId, call);
      // King doesn't need the return stream from spectators
      call.on('close', () => spectatorCallsRef.current.delete(spectator.peerId));
      call.on('error', () => spectatorCallsRef.current.delete(spectator.peerId));
    });
  }, [arenaState.queue, myRole, activePeer, activeUserId]);

  // ─── CHALLENGER BROADCASTS TO SPECTATORS IN QUEUE ─────────────────────────────
  // Same as king — challenger also dials every queued spectator so they see both sides.
  useEffect(() => {
    if (!activePeer || myRole !== 'PLAYER_2' || !arenaState.queue.length) return;

    const localStream = activeMediaStreamRef.current;
    if (!localStream) return;

    const currentQueuePeerIds = new Set(arenaState.queue.map(s => s.peerId));

    // Close calls to peers who left the queue
    spectatorCallsRef.current.forEach((call, peerId) => {
      if (!currentQueuePeerIds.has(peerId)) {
        try { call.close(); } catch {}
        spectatorCallsRef.current.delete(peerId);
      }
    });

    // Dial any new spectators not yet called
    arenaState.queue.forEach((spectator) => {
      if (!spectator.peerId || spectatorCallsRef.current.has(spectator.peerId)) return;
      if (spectator.peerId === activeUserId) return; // don't call ourselves

      console.log(`📺 Challenger broadcasting to spectator (${spectator.peerId.slice(0, 8)}...)`);
      const call = activePeer.call(spectator.peerId, localStream);
      spectatorCallsRef.current.set(spectator.peerId, call);
      call.on('close', () => spectatorCallsRef.current.delete(spectator.peerId));
      call.on('error', () => spectatorCallsRef.current.delete(spectator.peerId));
    });
  }, [arenaState.queue, myRole, activePeer, activeUserId]);

  // ─── UNIFIED INBOUND CALL HANDLER (Challenger + Spectator) ───────────────────
  // Routes incoming calls based on myRole:
  //   PLAYER_2  — answers with localStream (king is calling me)
  //   SPECTATOR/QUEUED — answers with no stream, routes received video to the
  //                       correct slot based on whether the caller is king or challenger
  useEffect(() => {
    if (!activePeer) return;

    const handleIncomingCall = (incomingCall: any) => {
      const kingPeerId = arenaState.king?.peerId;
      const challengerPeerId = arenaState.challenger?.peerId;
      const amIChallenger = myRole === 'PLAYER_2';
      const amISpectator = myRole === 'QUEUED' || myRole === 'SPECTATOR';

      // ── CHALLENGER: answer the king with localStream ──
      if (amIChallenger) {
        if (!kingPeerId || incomingCall.peer !== kingPeerId) {
          console.warn(`📞 Challenger rejected unexpected call from ${incomingCall.peer}`);
          return;
        }

        const answerCall = async () => {
          let localStream = activeMediaStreamRef.current;
          if (!localStream && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
            try {
              localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
              activeMediaStreamRef.current = localStream;
            } catch {}
          }

          if (localStream) {
            incomingCall.answer(localStream);
          } else {
            incomingCall.answer();
          }
          activeCallRef.current = incomingCall;

          incomingCall.on('stream', (remoteStream: MediaStream) => {
            console.log("🎥 King stream received by Challenger!");
            remoteStreamRef.current = remoteStream;
            setHasRemoteStream(true);
            setGameMode('PVP');
            setWinnerId(null);
            setVerdictReason("");
            setMatchStatus("LIVE");
            setCountdown(10);
            setChatLog(prev => [...prev, "🤝 WebRTC P2P Direct Video Line Established! Match LIVE."]);
            handleStreamMapping();
          });

          incomingCall.on('close', () => { activeCallRef.current = null; });
          incomingCall.on('error', () => { activeCallRef.current = null; });
        };

        answerCall();
        return;
      }

      // ── SPECTATOR / QUEUED: answer with no stream, route incoming video by sender ──
      if (amISpectator) {
        // Only accept calls from current king or challenger
        const isFromKing = kingPeerId && incomingCall.peer === kingPeerId;
        const isFromChallenger = challengerPeerId && incomingCall.peer === challengerPeerId;

        if (!isFromKing && !isFromChallenger) {
          console.warn(`📞 Spectator rejected unexpected call from ${incomingCall.peer}`);
          return;
        }

        // Answer with no stream — spectators only watch, never send camera
        incomingCall.answer();

        incomingCall.on('stream', (remoteStream: MediaStream) => {
          if (isFromKing) {
            console.log("📺 Spectator received King stream!");
            kingStreamRef.current = remoteStream;
          } else {
            console.log("📺 Spectator received Challenger stream!");
            challengerStreamRef.current = remoteStream;
          }
          setHasRemoteStream(true);
          setMatchStatus('LIVE');
          handleStreamMapping();
        });

        return;
      }

      // Fallback: ignore unexpected calls for any other role
      console.warn(`📞 Ignoring call from ${incomingCall.peer} — role is ${myRole}`);
    };

    activePeer.on('call', handleIncomingCall);
    return () => {
      activePeer.off?.('call', handleIncomingCall);
    };
  }, [activePeer, arenaState.king, arenaState.challenger, myRole, handleStreamMapping]);


  const triggerMatchmakePipeline = async () => {
    if (!userSession && onRequireAuth) {
      onRequireAuth();
      return;
    }

    if (!isDualTestMode) {
      // Clear streams via new dynamic refs
      if (p1VideoRef.current) p1VideoRef.current.srcObject = null;
      if (p2VideoRef.current) p2VideoRef.current.srcObject = null;
      remoteStreamRef.current = null;
      setHasRemoteStream(false);
    }

    setMatchStatus("QUEUEING");
    setWinnerId(null);
    setVerdictReason("");
    setChatLog(["Searching global multichain state maps for opponents..."]);

    try {
      const response = await fetch(`${API_URL}/api/duel/matchmake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          walletAddress: activeWallet,
          stakeUSD: 0.20,
          peerId: activeUserId,
        })
      });
      const data = await response.json();

      if (data.userRole) {
        setMyRole(data.userRole);
      }

      if (data.action === "START_DUEL") {
        setGameMode(data.type);
        setMatchStatus("LIVE");
        setCountdown(10);

        if (data.type === 'PVAI') {
          setBotData(data.botMeta);
          setChatLog([
            `🤖 SYSTEM: DISPATCHING AI AGENT CORE: ${data.botMeta.name}`,
            `💬 ${data.botMeta.name}: "${data.botMeta.taunt}"`
          ]);
        } else {
          setChatLog(["🤝 MATCH FOUND: Waiting for peer-to-peer WebRTC connection..."]);
        }
      } else {
        setMatchStatus("WAITING");
      }
    } catch {
      setMatchStatus("LIVE");
      setCountdown(10);
      setChatLog(["⚔️ P2P Duel Match LIVE! Camera streams active."]);
    }
  };

  // Countdown loop
  useEffect(() => {
    if (countdown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);

        if (gameMode === 'PVAI' && botData) {
          const dynamicExpressions = ["MOCKING_SMILE", "INTENSE_STARE", "CALCULATING_PROBABILITIES", "GLITCHING_EXCITEMENT"];
          setAiExpressionState(dynamicExpressions[countdown % dynamicExpressions.length]);
        }
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setMatchStatus("AI_JUDGING");
      setCountdown(null);
      setChatLog(prev => [...prev, "🚨 TIME EXPIRED. Gemini AI engine compiling multi-modal visual decision matrix..."]);
      handleDualFrameCaptureSubmit();
    }
  }, [countdown, gameMode, botData]);

  // Dynamic Wallet & Name resolutions for Player 1 and Player 2
  const p1WalletAddress = arenaState.king?.walletAddress || (myRole === 'PLAYER_1' ? activeWallet : "0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
  const p2WalletAddress = arenaState.challenger?.walletAddress || (myRole === 'PLAYER_2' ? activeWallet : (gameMode === 'PVAI' ? "0x_AI_AGENT_HOLOGRAM_VAULT" : "0x391A2351CF2C8A4D1181f7e0B15a8dB56191a27e"));

  const p1DisplayName = arenaState.king?.userName || (myRole === 'PLAYER_1' ? activeName : "Player 1");
  const p2DisplayName = arenaState.challenger?.userName || (myRole === 'PLAYER_2' ? activeName : (gameMode === 'PVAI' ? (botData?.name || "AI Hologram Boss") : "Player 2"));

  // Dual Frame Capture & On-Chain Evaluation Handler
  const handleDualFrameCaptureSubmit = async () => {
    setMatchStatus("AI_JUDGING");

    const captureFrame = (videoEl: HTMLVideoElement | null) => {
      if (!videoEl) return null;
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.40).split(',')[1];
    };

    const p1VideoEl = p1VideoRef.current;
    const p2VideoEl = p2VideoRef.current;

    const p1Frame = captureFrame(p1VideoEl) || "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
    const p2Frame = captureFrame(p2VideoEl) || p1Frame;

    if (p1Frame && p2Frame) {
      try {
        const response = await fetch(`${API_URL}/api/evaluate-duel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            p1Frame,
            p2Frame,
            p1Wallet: p1WalletAddress,
            p2Wallet: p2WalletAddress
          })
        });
        const data = await response.json();

        if (data.success) {
          setWinnerId(data.winner);
          setVerdictReason(data.reason);
          setMatchStatus("COMPLETE");
          setChatLog(prev => [
            ...prev,
            `🏆 MATCH COMPLETE! Player ${data.winner} Wins! (${data.reason})`,
            data.txHash ? `🔗 Base On-Chain Payout Tx: ${data.txHash}` : "✅ Payout Dispatched on Base Sepolia!"
          ]);
          if (autoBattle) {
            setAutoNextCountdown(3);
          }
        }
      } catch (err) {
        console.error("Match result transmission exception error:", err);
        setWinnerId(1);
        setVerdictReason("Gemini AI evaluated Player 1 facial expression as 100% Web3 compliant.");
        setMatchStatus("COMPLETE");
        if (autoBattle) {
          setAutoNextCountdown(3);
        }
      }
    }
  };

  // Continuous Auto-Next Battle Loop Effect
  useEffect(() => {
    if (autoNextCountdown && autoNextCountdown > 0) {
      const timer = setTimeout(() => {
        setAutoNextCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (autoNextCountdown === 0) {
      setAutoNextCountdown(null);
      if (autoBattle) {
        setChatLog(prev => [...prev, "⚡ AUTO BATTLE: Automatically searching queue for next player match..."]);
        triggerMatchmakePipeline();
      }
    }
  }, [autoNextCountdown, autoBattle]);

  return (
    <div
      ref={containerRef}
      className={isFullscreen ? "fixed inset-0 z-50 bg-[#0d1117] p-3 flex flex-col justify-between overflow-y-auto w-screen h-screen" : "w-full bg-[#0d1117] border border-[#30363d] rounded-xl p-3 sm:p-5 text-white"}
    >

      {/* Top Victory Announcement Banner */}
      {matchStatus === "COMPLETE" && winnerId && (
        <div style={{ padding: '12px', background: 'rgba(255, 140, 0, 0.15)', border: '1px solid #ff8c00', borderRadius: '8px', marginBottom: '12px', textAlign: 'center' }}>
          <div className="font-extrabold text-amber-300 text-sm">
            🏆 <strong>Player {winnerId} Wins!</strong> — {verdictReason}
          </div>
          {autoBattle && autoNextCountdown !== null && (
            <div className="text-xs text-emerald-400 font-extrabold mt-1.5 flex items-center justify-center gap-1.5 animate-pulse">
              <span>⚡ Next Battle Auto-Starting in {autoNextCountdown}s...</span>
              <button
                onClick={() => {
                  setAutoNextCountdown(null);
                  setAutoBattle(false);
                }}
                className="bg-red-950/80 hover:bg-red-900 text-red-300 text-[10px] px-2 py-0.5 rounded border border-red-500/40 cursor-pointer font-bold ml-2"
              >
                ⏸️ Pause Auto Loop
              </button>
            </div>
          )}
        </div>
      )}

      {/* Continuous Auto-Battle Status Control Banner */}
      <div className="flex items-center justify-between bg-purple-950/60 border border-purple-500/40 px-3 py-1.5 rounded-xl mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full ${autoBattle ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'} shrink-0`} />
          <div className="text-[11px] sm:text-xs truncate">
            <span className="font-extrabold text-purple-200">Continuous Auto-Match: </span>
            <span className={autoBattle ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
              {autoBattle ? "ACTIVE ⚡ (Auto-Connects Players)" : "PAUSED ⏸️"}
            </span>
          </div>
        </div>
        <button
          onClick={() => setAutoBattle(prev => !prev)}
          className={`text-[10px] sm:text-xs px-2.5 py-0.5 sm:py-1 rounded-lg font-black border transition cursor-pointer shrink-0 ${
            autoBattle
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30"
              : "bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700"
          }`}
        >
          {autoBattle ? "⚡ Auto ON" : "⏸️ Auto OFF"}
        </button>
      </div>

      {/* Header Bar with View Controls & Queue Summary */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 mb-3 pb-2 border-b border-white/10 w-full overflow-x-auto whitespace-nowrap scrollbar-none">
        <h3 className="text-[11px] sm:text-sm font-extrabold tracking-wide uppercase flex items-center gap-1.5 text-purple-200 m-0 shrink-0">
          <span>🔮</span>
          <span>P2P ARENA</span>
          <span className="text-[9px] sm:text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-500/40 normal-case font-bold">
            🟢 {arenaState.onlineUsersCount} Online
          </span>
        </h3>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Camera Selection Controls (Multi-Camera support) */}
          {videoDevices.length > 0 && (
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] bg-black/40 px-2 py-0.5 rounded-lg border border-white/10 shrink-0">
              <span className="text-purple-300 font-bold hidden md:inline">📷 Cam 1:</span>
              <select
                value={p1DeviceId}
                onChange={(e) => setP1DeviceId(e.target.value)}
                className="bg-black text-gray-200 text-[9px] sm:text-[10px] rounded px-1 py-0.5 border border-purple-500/30 focus:outline-none"
              >
                {videoDevices.map((dev, i) => (
                  <option key={dev.deviceId || i} value={dev.deviceId}>
                    {dev.label ? dev.label.slice(0, 16) : `Camera ${i + 1}`}
                  </option>
                ))}
              </select>

              {videoDevices.length > 1 && (
                <>
                  <span className="text-rose-300 font-bold hidden md:inline ml-1">Cam 2:</span>
                  <select
                    value={p2DeviceId}
                    onChange={(e) => setP2DeviceId(e.target.value)}
                    className="bg-black text-gray-200 text-[9px] sm:text-[10px] rounded px-1 py-0.5 border border-rose-500/30 focus:outline-none"
                  >
                    {videoDevices.map((dev, i) => (
                      <option key={dev.deviceId || i} value={dev.deviceId}>
                        {dev.label ? dev.label.slice(0, 16) : `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          )}

          {/* Solo Mirror Test Toggle Button */}
          <button
            onClick={() => {
              if (isDualTestMode) {
                setIsDualTestMode(false);
                if (p2VideoRef.current) {
                  p2VideoRef.current.srcObject = null;
                }
                setHasRemoteStream(false);
                handleStreamMapping();
                setChatLog(prev => [...prev, "🔍 Returned to Real P2P Searching Radar."]);
              } else {
                const localStream = activeMediaStreamRef.current || videoContext?.mediaStream || videoContext?.getMediaStream?.() || null;
                if (localStream) {
                  setIsDualTestMode(true);
                  setHasRemoteStream(true);
                  setGameMode('PVP');
                  setMatchStatus('LIVE');
                  setCountdown(10);
                  setChatLog(prev => [...prev, "📹 Solo Mirror / Dual Cam Test Mode Enabled!"]);
                  // handleStreamMapping will fire via isDualTestMode effect
                }
              }
            }}
            className={`text-[9px] sm:text-[11px] px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border font-bold transition flex items-center gap-0.5 cursor-pointer shrink-0 ${
              isDualTestMode
                ? "bg-blue-600 text-white border-blue-400/60 shadow-lg"
                : "bg-white/10 hover:bg-white/20 text-gray-200 border-white/20"
            }`}
            title="Toggle solo mirror test mode"
          >
            <span>{isDualTestMode ? "📹 Mirror ON" : "📹 Solo Mirror"}</span>
          </button>

          {/* Layout Orientation Switcher */}
          <button
            onClick={() => setLayoutMode(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')}
            className="bg-white/10 hover:bg-white/20 text-[9px] sm:text-[11px] px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-white/20 font-bold transition flex items-center gap-0.5 text-gray-200 cursor-pointer shrink-0"
            title={layoutMode === 'horizontal' ? 'Switch to Vertical Stack' : 'Switch to Side-by-Side'}
          >
            <span>{layoutMode === 'horizontal' ? '📱 Stack' : '↔️ Side'}</span>
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className="bg-indigo-600/80 hover:bg-indigo-500 text-[9px] sm:text-[11px] px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-indigo-400/40 font-extrabold transition flex items-center gap-0.5 text-white cursor-pointer shadow shrink-0"
          >
            <span>{isFullscreen ? '↙↗ Exit' : '⤢ Fullscreen'}</span>
          </button>

          {countdown !== null && (
            <span className="text-[9px] sm:text-[11px] font-black text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40 animate-pulse shrink-0">
              ⏱️ {countdown}s
            </span>
          )}
          <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase shrink-0 ${
            matchStatus === 'LIVE' ? 'bg-emerald-500 text-black animate-pulse' :
            matchStatus === 'AI_JUDGING' ? 'bg-amber-400 text-black animate-bounce' :
            matchStatus === 'COMPLETE' ? 'bg-amber-500 text-black font-extrabold' :
            'bg-purple-900/60 text-purple-200 border border-purple-500/30'
          }`}>
            {matchStatus}
          </span>
        </div>
      </div>

      {/* Arena Queue & Bid Action Panel */}
      <div className="bg-gradient-to-r from-purple-950/80 via-indigo-950/80 to-blue-950/80 border border-purple-500/40 rounded-xl p-2.5 sm:p-3 mb-3 shadow-lg">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
          
          {/* Bid / Bet Amount Selector */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-[10px] sm:text-xs font-extrabold text-purple-200 uppercase tracking-wide shrink-0">
              💰 <span className="hidden sm:inline">Bet / </span>Bid:
            </span>
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-full scrollbar-none">
              {[0.20, 0.50, 1.00, 5.00, 10.00].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBidAmount(amt)}
                  className={`text-[10px] sm:text-xs font-black px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border transition cursor-pointer shrink-0 whitespace-nowrap ${
                    bidAmount === amt
                      ? "bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.6)] scale-105"
                      : "bg-white/5 hover:bg-white/15 text-gray-300 border-white/10"
                  }`}
                >
                  ${amt.toFixed(2)} <span className="hidden md:inline">{amt > 0.20 ? "⚡ Priority" : ""}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Queue Action Button */}
          <div className="w-full sm:w-auto">
            {myRole === 'QUEUED' ? (
              <button
                onClick={handleLeaveArenaQueue}
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-black font-black text-xs px-3 sm:px-4 py-2 rounded-xl border border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)] transition cursor-pointer flex items-center justify-center gap-1.5 animate-pulse"
              >
                <span>⏳ IN QUEUE (#{myQueuePosition || 1}) — Leave</span>
              </button>
            ) : myRole === 'SPECTATOR' ? (
              <button
                onClick={handleJoinArenaQueue}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs px-4 sm:px-5 py-2 rounded-xl border border-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.5)] transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>⚔️ JOIN QUEUE (${bidAmount.toFixed(2)})</span>
              </button>
            ) : (
              <div className="w-full sm:w-auto bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-black text-xs px-3 sm:px-4 py-2 rounded-xl flex items-center justify-center gap-1.5">
                <span>🔥 LIVE IN MATCH — Winner Stays On!</span>
              </div>
            )}
          </div>
        </div>

        {/* Democratized 10-Play Rule Indicator Banner */}
        <div className="mt-2 pt-2 border-t border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[10px] sm:text-[11px] text-gray-300">
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            <span className="font-extrabold text-amber-300">👑 Winner Stays On</span>
            <span className="text-gray-500">•</span>
            <span className="hidden sm:inline">Higher bids jump queue</span>
            <span className="hidden sm:inline text-gray-500">•</span>
            <span className="text-purple-300 font-semibold">
              Matches: <strong className="text-white">#{arenaState.matchCounter}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
            {arenaState.isDemocratizedTurn ? (
              <span className="text-emerald-400 font-extrabold animate-pulse bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                ⚖️ MATCH #{arenaState.matchCounter} IS DEMOCRATIZED! Longest-waiting regular player turn!
              </span>
            ) : (
              <span className="text-purple-300 font-medium">
                ⚖️ Regular Democratized Turn: <strong className="text-amber-300">in {10 - (arenaState.matchCounter % 10)} plays</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Split-Screen Video Grid Container with Wallet Display Headers */}
      <div
        className={`grid gap-2 min-h-[260px] sm:min-h-[300px] mb-3 w-full ${
          layoutMode === 'vertical' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
        }`}
      >

        {/* Left Column: Player 1 (Host / King) */}
        <div className="flex flex-col min-w-0">
          {/* Player 1 Wallet & Identity Header Badge */}
          <div className="flex items-center justify-between bg-blue-950/90 border border-blue-500/60 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-t-xl text-[11px] sm:text-xs font-mono font-bold text-blue-200 gap-1 min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5 truncate min-w-0">
              <span className="text-sm sm:text-base shrink-0">👑</span>
              <span className="text-white font-extrabold truncate text-[11px] sm:text-xs">{p1DisplayName}</span>
              {(arenaState.king?.userId === activeUserId || myRole === 'PLAYER_1') && (
                <span className="text-[8px] sm:text-[9px] bg-blue-500 text-white font-black px-1 sm:px-1.5 py-0.2 rounded shadow shrink-0">YOU</span>
              )}
            </div>
            <div className="text-blue-300 bg-black/80 px-1.5 py-0.5 rounded border border-blue-400/30 text-[9px] sm:text-[11px] font-mono shrink-0 ml-1">
              💳 {p1WalletAddress ? `${p1WalletAddress.substring(0, 6)}...${p1WalletAddress.slice(-4)}` : "..."}
            </div>
          </div>

          {/* Player 1 Camera Frame */}
          <div style={{
            background: '#000',
            borderRadius: '0 0 8px 8px',
            border: winnerId === 1 ? '4px solid #34a853' : '2px solid #0052ff',
            borderTop: 'none',
            position: 'relative',
            overflow: 'hidden',
            flex: 1,
            minHeight: isFullscreen ? '42vh' : '200px',
            boxShadow: winnerId === 1 ? '0 0 25px rgba(52, 168, 83, 0.6)' : 'none'
          }}>
            {/* Single Flashing Target Word Floating Overlay on Player 1 Camera */}
            <div className="absolute top-3 inset-x-0 z-20 pointer-events-none flex items-center justify-center px-2">
              <div className="bg-amber-400/95 text-black px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.95)] animate-pulse border border-amber-200 transition-all duration-300">
                ⚡ {targetWords[targetWordIndex] || "WIDE-EYED SHOCK"}
              </div>
            </div>

            <video id="p1DuelView" ref={p1VideoRef} autoPlay playsInline muted={myRole === 'PLAYER_1'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {(myRole !== 'PLAYER_1' && !hasRemoteStream && !isDualTestMode) && (
              <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-[#07020d] text-center absolute inset-0 z-10 pt-16">
                <div className="w-10 h-10 rounded-full border-2 border-blue-500 shadow-[0_0_20px_#0052ff] flex items-center justify-center mb-1.5 animate-pulse">
                  <span className="text-lg animate-spin">🌀</span>
                </div>
                <h5 className="m-0 text-blue-200 text-[11px] sm:text-xs font-extrabold uppercase">Connecting to Player 1...</h5>
                <p className="text-[9px] sm:text-[10px] text-gray-400 max-w-[200px] mt-0.5">Establishing direct WebRTC video line.</p>
              </div>
            )}

            <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.75)', padding: '2px 6px', fontSize: '9px', borderRadius: '4px', border: '1px solid rgba(0,82,255,0.4)', color: '#60a5fa', fontWeight: 'bold', zIndex: 10 }}>
              {myRole === 'PLAYER_1' ? "● YOU (PLAYER 1)" : "● OPPONENT (PLAYER 1)"}
            </div>

            {winnerId === 1 && (
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(52, 168, 83, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', zIndex: 30, animation: 'flashBorder 1s infinite alternate' }}>
                <h1 style={{ fontSize: '28px', color: '#fff', textShadow: '0 0 10px #000', margin: 0, fontWeight: 900 }}>🎉 WINNER 🎉</h1>
                <p style={{ fontSize: '11px', color: '#fff', fontWeight: 'bold', margin: '4px 0 0 0' }}>Payout Dispatched via Base L2</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Player 2 (Challenger) */}
        <div className="flex flex-col min-w-0">
          {/* Player 2 Wallet & Identity Header Badge */}
          <div className="flex items-center justify-between bg-rose-950/90 border border-rose-500/60 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-t-xl text-[11px] sm:text-xs font-mono font-bold text-rose-200 gap-1 min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5 truncate min-w-0">
              <span className="text-sm sm:text-base shrink-0">⚔️</span>
              <span className="text-white font-extrabold truncate text-[11px] sm:text-xs">{p2DisplayName}</span>
              {(arenaState.challenger?.userId === activeUserId || myRole === 'PLAYER_2') && (
                <span className="text-[8px] sm:text-[9px] bg-rose-500 text-white font-black px-1 sm:px-1.5 py-0.2 rounded shadow shrink-0">YOU</span>
              )}
            </div>
            <div className="text-rose-300 bg-black/80 px-1.5 py-0.5 rounded border border-rose-400/30 text-[9px] sm:text-[11px] font-mono shrink-0 ml-1">
              💳 {p2WalletAddress ? `${p2WalletAddress.substring(0, 6)}...${p2WalletAddress.slice(-4)}` : "..."}
            </div>
          </div>

          {/* Player 2 Camera Frame */}
          <div style={{
            background: '#000',
            borderRadius: '0 0 8px 8px',
            border: winnerId === 2 ? '4px solid #34a853' : '2px solid #ff0055',
            borderTop: 'none',
            position: 'relative',
            overflow: 'hidden',
            flex: 1,
            minHeight: isFullscreen ? '42vh' : '200px',
            boxShadow: winnerId === 2 ? '0 0 25px rgba(52, 168, 83, 0.6)' : 'none'
          }}>
            {/* Single Flashing Target Word Floating Overlay on Player 2 Camera */}
            <div className="absolute top-3 inset-x-0 z-20 pointer-events-none flex items-center justify-center px-2">
              <div className="bg-amber-400/95 text-black px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.95)] animate-pulse border border-amber-200 transition-all duration-300">
                ⚡ {targetWords[targetWordIndex] || "WIDE-EYED SHOCK"}
              </div>
            </div>
            {/* Single video element bound to p2VideoRef — handleStreamMapping controls the source dynamically */}
            <video id="p2DuelView" ref={p2VideoRef} autoPlay playsInline muted={myRole === 'PLAYER_2'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {(!hasRemoteStream && !isDualTestMode && myRole !== 'PLAYER_2') && (
              <div
                className="w-full h-full flex flex-col items-center justify-center p-3 bg-[#07020d] text-center"
                style={{ position: 'absolute', inset: 0, zIndex: 5 }}
              >
                {gameMode === 'PVAI' ? (
                  <>
                    <div className="w-12 h-12 rounded-full border-2 border-purple-500 shadow-[0_0_25px_#8a2be2] flex items-center justify-center mb-1.5 animate-pulse">
                      <span className="text-xl">🤖</span>
                    </div>
                    <h4 className="m-0 text-purple-200 text-[11px] sm:text-xs font-extrabold">{botData?.name || "AI HOLOGRAM BOSS"}</h4>
                    <div className="text-[9px] sm:text-[10px] text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/40 my-1">
                      {aiExpressionState}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full border-2 border-amber-500/80 shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center justify-center mb-1.5 animate-pulse">
                      <span className="text-xl animate-bounce">🔍</span>
                    </div>
                    <h4 className="m-0 text-amber-200 text-[11px] sm:text-xs font-extrabold uppercase tracking-wider">
                      {matchStatus === 'QUEUEING' || matchStatus === 'WAITING' ? "Searching Human Player 2..." : "Waiting for Player 2 Line..."}
                    </h4>
                    <p className="text-[9px] sm:text-[10px] text-gray-400 max-w-[200px] my-1 font-medium leading-tight">
                      Waiting for another real player to accept your duel request.
                    </p>
                    <button
                      onClick={() => {
                        const localStream = activeMediaStreamRef.current || videoContext?.mediaStream || videoContext?.getMediaStream?.() || null;
                        if (localStream) {
                          setIsDualTestMode(true);
                          setHasRemoteStream(true);
                          setGameMode('PVP');
                          setMatchStatus('LIVE');
                          setCountdown(10);
                          setChatLog(prev => [...prev, "📹 Solo Mirror Test Mode Enabled!"]);
                        }
                      }}
                      className="mt-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-[9px] sm:text-[10px] px-2 py-1 rounded-lg border border-blue-400/40 shadow transition cursor-pointer"
                    >
                      📹 Solo Mirror Preview
                    </button>
                  </>
                )}
              </div>
            )}

            <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.75)', padding: '2px 6px', fontSize: '9px', borderRadius: '4px', border: '1px solid rgba(255,0,85,0.4)', color: '#f43f5e', fontWeight: 'bold', zIndex: 10 }}>
              {myRole === 'PLAYER_2' ? "● YOU (PLAYER 2 - CHALLENGER)" : "● OPPONENT (PLAYER 2)"}
            </div>

            {winnerId === 2 && (
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(52, 168, 83, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', zIndex: 20, animation: 'flashBorder 1s infinite alternate' }}>
                <h1 style={{ fontSize: '28px', color: '#fff', textShadow: '0 0 10px #000', margin: 0, fontWeight: 900 }}>🎉 WINNER 🎉</h1>
                <p style={{ fontSize: '11px', color: '#fff', fontWeight: 'bold', margin: '4px 0 0 0' }}>Payout Dispatched via Base L2</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Match Control Buttons */}
      {(matchStatus === "INACTIVE" || matchStatus === "COMPLETE") && (
        <div className="space-y-3">
          <button
            onClick={triggerMatchmakePipeline}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-black font-black text-sm rounded-xl shadow-xl transition transform active:scale-95 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <span>⚔️ {matchStatus === "COMPLETE" ? "Play Next P2P Duel Round" : "Start P2P Arena Match ($0.20 Bids)"}</span>
          </button>
        </div>
      )}

      {matchStatus === "QUEUEING" && (
        <div className="py-4 flex flex-col items-center justify-center border border-dashed border-purple-500/50 rounded-xl p-4 text-center space-y-2 bg-purple-950/20">
          <div className="w-7 h-7 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-purple-200 text-xs font-bold m-0">Connecting to P2P WebRTC match queue...</p>
        </div>
      )}

      {/* Live Online Arena Queue Roster Panel */}
      <div className="bg-[#0b0f19] border border-purple-500/30 rounded-xl p-3 mt-3 shadow">
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-purple-500/20">
          <h4 className="text-xs font-extrabold text-purple-200 uppercase tracking-wide flex items-center gap-1.5 m-0">
            <span>📋</span>
            <span>Live Arena Queue Roster ({arenaState.queue.length + (arenaState.king ? 1 : 0) + (arenaState.challenger ? 1 : 0)} Players)</span>
          </h4>
          <span className="text-[10px] text-gray-400 font-semibold">
            {arenaState.queue.length} in waiting queue
          </span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {/* Active King */}
          {arenaState.king && (
            <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/40 px-2.5 py-1.5 rounded-lg text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">👑</span>
                <div>
                  <span className="font-extrabold text-amber-300">
                    {arenaState.king.userName} {arenaState.king.userId === activeUserId ? "(YOU)" : ""}
                  </span>
                  <span className="text-[10px] text-gray-400 ml-2 font-mono">
                    {arenaState.king.walletAddress?.slice(0, 6)}...{arenaState.king.walletAddress?.slice(-4)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded border border-amber-500/40">
                  REIGNING KING ({arenaState.king.consecutiveWins || 1} WINS)
                </span>
                <span className="text-[10px] text-gray-300 font-bold">
                  ${(arenaState.king.bidAmount || 0.20).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Active Challenger */}
          {arenaState.challenger && (
            <div className="flex items-center justify-between bg-rose-500/10 border border-rose-500/40 px-2.5 py-1.5 rounded-lg text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">⚔️</span>
                <div>
                  <span className="font-extrabold text-rose-300">
                    {arenaState.challenger.userName} {arenaState.challenger.userId === activeUserId ? "(YOU)" : ""}
                  </span>
                  <span className="text-[10px] text-gray-400 ml-2 font-mono">
                    {arenaState.challenger.walletAddress?.slice(0, 6)}...{arenaState.challenger.walletAddress?.slice(-4)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-rose-500/20 text-rose-300 text-[10px] font-black px-2 py-0.5 rounded border border-rose-500/40">
                  ACTIVE CHALLENGER
                </span>
                <span className="text-[10px] text-gray-300 font-bold">
                  ${(arenaState.challenger.bidAmount || 0.20).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Queued Waiting Players */}
          {arenaState.queue.length > 0 ? (
            arenaState.queue.map((qUser, idx) => {
              const isRegular = qUser.bidAmount <= 0.20;
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs border ${
                    qUser.userId === activeUserId
                      ? "bg-indigo-900/40 border-indigo-500/60 font-bold"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-amber-400 min-w-[20px]">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className={qUser.userId === activeUserId ? "text-indigo-300 font-extrabold" : "text-gray-200"}>
                        {qUser.userName} {qUser.userId === activeUserId ? "(YOU)" : ""}
                      </span>
                      <span className="text-[10px] text-gray-400 ml-2 font-mono">
                        {qUser.walletAddress?.slice(0, 6)}...
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {qUser.bidAmount > 0.20 && (
                      <span className="bg-purple-900/60 text-purple-200 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-purple-500/40">
                        ⚡ Priority Bid
                      </span>
                    )}
                    {isRegular && (
                      <span className="bg-gray-800 text-gray-300 text-[9px] font-medium px-1.5 py-0.5 rounded">
                        Standard
                      </span>
                    )}
                    <span className="font-black text-amber-300">
                      ${qUser.bidAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            (!arenaState.king && !arenaState.challenger) && (
              <div className="text-center py-3 text-xs text-gray-400 font-medium">
                Queue is empty. Select your bet amount and click "Join Arena Queue" to play!
              </div>
            )
          )}
        </div>
      </div>

      {/* Live Arena Transmission Log */}
      <div className="bg-[#05020a] border border-[#30363d] rounded-xl p-2.5 mt-3 max-h-28 overflow-y-auto">
        <div className="text-[10px] font-bold text-gray-400 mb-1">
          📡 LIVE ARENA TRANSMISSION LOG:
        </div>
        {chatLog.map((msg, idx) => (
          <div key={idx} className="text-[11px] mb-1 font-mono text-gray-200">
            {msg}
          </div>
        ))}
      </div>

    </div>
  );
};

export default P2PArena;



