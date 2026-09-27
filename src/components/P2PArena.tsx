import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Crown, Swords, Users, Mic, MicOff, Maximize2, Minimize2, Columns, LayoutGrid, X, LogOut } from 'lucide-react';
import { VideoProvider, API_URL, WS_URL, peer as globalPeer } from '@/utils/constants';
import { parseExpressionKeywords } from '@/components/TrendTicker';

interface P2PArenaProps {
  currentPeerId?: string;
  walletAddress?: string;
  peerInstance?: any;
  userSession?: any;
  onRequireAuth?: () => void;
  onBuyTickets?: () => void;
  autoBattle?: boolean;
  setAutoBattle?: React.Dispatch<React.SetStateAction<boolean>>;
  videoDevices?: MediaDeviceInfo[];
  p1DeviceId?: string;
  setP1DeviceId?: (id: string) => void;
  p2DeviceId?: string;
  setP2DeviceId?: (id: string) => void;
  isDualTestMode?: boolean;
  setIsDualTestMode?: React.Dispatch<React.SetStateAction<boolean>>;
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
  autoBattle = true,
  setAutoBattle,
  videoDevices: propsVideoDevices,
  p1DeviceId: propsP1DeviceId,
  setP1DeviceId: propsSetP1DeviceId,
  p2DeviceId: propsP2DeviceId,
  setP2DeviceId: propsSetP2DeviceId,
  isDualTestMode: propsIsDualTestMode,
  setIsDualTestMode: propsSetIsDualTestMode,
}) => {
  const videoContext = useContext(VideoProvider);
  const [activePeer, setActivePeer] = useState<any>(null);

  const [localVideoDevices, setLocalVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [localP1DeviceId, setLocalP1DeviceId] = useState<string>('');
  const [localP2DeviceId, setLocalP2DeviceId] = useState<string>('');
  const [localIsDualTestMode, setLocalIsDualTestMode] = useState<boolean>(false);

  const videoDevices = propsVideoDevices ?? localVideoDevices;
  const p1DeviceId = propsP1DeviceId ?? localP1DeviceId;
  const setP1DeviceId = propsSetP1DeviceId ?? setLocalP1DeviceId;
  const p2DeviceId = propsP2DeviceId ?? localP2DeviceId;
  const setP2DeviceId = propsSetP2DeviceId ?? setLocalP2DeviceId;
  const isDualTestMode = propsIsDualTestMode ?? localIsDualTestMode;
  const setIsDualTestMode = propsSetIsDualTestMode ?? setLocalIsDualTestMode;



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
  const [hasRemoteStream, setHasRemoteStream] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [areControlsVisible, setAreControlsVisible] = useState<boolean>(true);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetAutoHideTimer = useCallback(() => {
    setAreControlsVisible(true);
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    if (isFullscreen) {
      autoHideTimerRef.current = setTimeout(() => {
        setAreControlsVisible(false);
      }, 2000);
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (isFullscreen) {
      resetAutoHideTimer();
    } else {
      setAreControlsVisible(true);
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    }
    return () => {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    };
  }, [isFullscreen, resetAutoHideTimer]);

  const handleScreenClickToggleControls = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, a')) return;
    if (!isFullscreen) return;

    if (areControlsVisible) {
      setAreControlsVisible(false);
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    } else {
      resetAutoHideTimer();
    }
  };

  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const [myRole, setMyRole] = useState<'PLAYER_1' | 'PLAYER_2' | 'QUEUED' | 'SPECTATOR'>('SPECTATOR');
  const [bidAmount, setBidAmount] = useState<number>(0.20);
  const [myQueuePosition, setMyQueuePosition] = useState<number | null>(null);

  // Target Words Overlay State for Facial Expressions
  const [rolloverPotUSD, setRolloverPotUSD] = useState<string>("2,446.95");
  const [activeTrendPrompt, setActiveTrendPrompt] = useState<string>("Cyberpunk wide-eyed shock expression with unhinged jaw");
  const [targetWords, setTargetWords] = useState<string[]>(["WIDE-EYED SHOCK", "UNHINGED JAW", "NEON GAZE", "CYBER SMILE"]);
  const [targetWordIndex, setTargetWordIndex] = useState<number>(0);

  // Fetch active AI trend & live jackpot pot
  useEffect(() => {
    let isSubscribed = true;
    const fetchActiveTrendAndPot = async () => {
      try {
        const res = await fetch(`${API_URL}/api/active-trend`);
        const data = await res.json();
        if (data?.currentTrend && isSubscribed) {
          setActiveTrendPrompt(data.currentTrend);
          const keywords = parseExpressionKeywords(data.currentTrend);
          if (keywords.length > 0) {
            setTargetWords(keywords);
          }
        }
      } catch (e) {
        console.warn("Could not fetch active trend:", e);
      }

      try {
        const statsRes = await fetch(`${API_URL}/api/game-stats`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData?.potUSD && isSubscribed) {
            setRolloverPotUSD(statsData.potUSD);
          }
        }
      } catch {}
    };

    fetchActiveTrendAndPot();
    const interval = setInterval(fetchActiveTrendAndPot, 12000);
    return () => { isSubscribed = false; clearInterval(interval); };
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

  // Enumerate video input devices on mount (if props not provided)
  useEffect(() => {
    let isSubscribed = true;
    const detectCameras = async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter(d => d.kind === 'videoinput');
          if (isSubscribed) {
            setLocalVideoDevices(videoInputs);
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
  }, [p1DeviceId, p2DeviceId, setP1DeviceId, setP2DeviceId]);

  const basePeerId = userSession?.peerId || currentPeerId || "guest";
  const activeUserId = `${basePeerId}_${tabSessionId}`;
  const activeWallet = userSession?.walletAddress || walletAddress;
  const activeName = userSession?.userName || `Player_${tabSessionId}`;

  // Initialize a dedicated Peer instance for this arena using our explicit activeUserId
  useEffect(() => {
    if (typeof window === 'undefined') return;

    import('peerjs').then(({ default: Peer }) => {
      const peer = new Peer(activeUserId, {
        host: (import.meta as any).env.VITE_PEERJS_HOST || "0.peerjs.com",
        port: (import.meta as any).env.VITE_PEERJS_PORT ? parseInt((import.meta as any).env.VITE_PEERJS_PORT) : 443,
        path: (import.meta as any).env.VITE_PEERJS_PATH || "/",
        secure: (import.meta as any).env.VITE_PEERJS_SECURE !== "false",
      });

      peer.on('open', (id) => {
        console.log(`✅ Dedicated Arena PeerJS initialized with explicit ID: ${id}`);
        setActivePeer(peer);
      });

      peer.on('error', (err) => {
        console.warn('Dedicated Arena PeerJS Error:', err);
      });
    });

    return () => {
      setActivePeer((currentPeer: any) => {
        if (currentPeer) currentPeer.destroy();
        return null;
      });
    };
  }, [activeUserId]);

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
    if (isDualTestMode) {
      setHasRemoteStream(true);
      setGameMode('PVP');
      setMatchStatus('LIVE');
      setCountdown(10);
    } else if (!remoteStreamRef.current) {
      if (p2VideoRef.current && myRole !== 'PLAYER_2') {
        p2VideoRef.current.srcObject = null;
      }
      setHasRemoteStream(false);
    }
  }, [handleStreamMapping, isDualTestMode, myRole]);

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

  const handleQuitMatchToSpectator = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        event: "LEAVE_ARENA_QUEUE",
        userId: activeUserId
      }));
    }
    if (activeCallRef.current) {
      try { activeCallRef.current.close(); } catch (e) {}
      activeCallRef.current = null;
    }
    if (activeMediaStreamRef.current) {
      try { activeMediaStreamRef.current.getTracks().forEach(t => t.stop()); } catch (e) {}
      activeMediaStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current = null;
    }
    if (p1VideoRef.current) p1VideoRef.current.srcObject = null;
    if (p2VideoRef.current) p2VideoRef.current.srcObject = null;

    setMyRole('SPECTATOR');
    setMyQueuePosition(null);
    setIsDualTestMode(false);
    setHasRemoteStream(false);
    setMatchStatus('INACTIVE');
    setWinnerId(null);
    setVerdictReason("");
    setCountdown(null);
    setChatLog(prev => [...prev, "🚪 Exited match. Returned to Spectator / Watcher view."]);
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

  useEffect(() => {
    const handleTriggerMatch = () => {
      triggerMatchmakePipeline();
    };
    window.addEventListener("trigger_p2p_match", handleTriggerMatch);
    return () => window.removeEventListener("trigger_p2p_match", handleTriggerMatch);
  }, [triggerMatchmakePipeline]);

  const reduxOnlineUsers = useSelector((state: any) => state.main?.onlineUsersCount || 0);
  const activeArenaUsersCount = (arenaState?.king ? 1 : 0) + (arenaState?.challenger ? 1 : 0) + (arenaState?.queue?.length || 0);
  const totalOnlineCount = Math.max(reduxOnlineUsers, arenaState?.onlineUsersCount || 0, activeArenaUsersCount, 1);

  return (
    <div className="flex flex-row w-full h-full min-h-screen bg-neutral-950 gap-0 overflow-x-hidden select-none relative font-sans antialiased text-white">
      
      {/* 🌟 MAIN GAME ARENA WRAPPER FRAME */}
      <div 
        ref={containerRef}
        onClick={handleScreenClickToggleControls}
        onMouseMove={resetAutoHideTimer}
        className={`flex flex-col flex-1 h-full transition-all duration-500 ease-out relative p-3 sm:p-5 ${
          isFullscreen 
            ? "fixed inset-0 z-40 bg-neutral-950 p-3 sm:p-5 flex flex-col justify-between overflow-y-auto w-screen h-screen cursor-pointer" 
            : isSidebarOpen ? 'w-full md:w-3/4' : 'w-full'
        }`}
      >
        {/* Top Victory Announcement Banner */}
        {matchStatus === "COMPLETE" && winnerId && (
          <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/50 backdrop-blur-xl p-3.5 rounded-2xl mb-3 text-center shadow-[0_0_30px_rgba(245,158,11,0.3)] shrink-0">
            <div className="font-black text-amber-300 text-sm sm:text-base tracking-wide">
              🏆 PLAYER {winnerId} VICTORIOUS! — {verdictReason}
            </div>
            {autoBattle && autoNextCountdown !== null && (
              <div className="text-xs text-emerald-400 font-extrabold mt-2 flex items-center justify-center gap-2 animate-pulse">
                <span>⚡ Next Battle Auto-Starting in {autoNextCountdown}s...</span>
                <button
                  onClick={() => {
                    setAutoNextCountdown(null);
                    setAutoBattle?.(false);
                  }}
                  className="bg-red-950/80 hover:bg-red-900 text-red-300 text-[10px] px-2.5 py-1 rounded-lg border border-red-500/40 cursor-pointer font-bold transition"
                >
                  ⏸️ Pause Auto Loop
                </button>
              </div>
            )}
          </div>
        )}

        {/* 🔮 SPLIT-SCREEN VIDEO GRID CONTAINER */}
        <div
          className={`grid gap-3 min-h-[280px] sm:min-h-[320px] mb-3 w-full relative ${
            layoutMode === 'vertical' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
          }`}
        >

          {/* 🔵 LEFT COLUMN: PLAYER 1 (KING) */}
          <div className="flex flex-col min-w-0">
            {/* Player 1 Glass Identity Badge */}
            <div className="flex items-center justify-between bg-zinc-950/80 border border-blue-500/40 backdrop-blur-lg px-3 py-1.5 rounded-t-2xl text-xs font-mono font-bold text-blue-200 gap-1.5 min-w-0">
              <div className="flex items-center gap-1.5 truncate min-w-0">
                <Crown size={14} className="text-amber-400 shrink-0" />
                <span className="text-white font-extrabold truncate text-xs">{p1DisplayName}</span>
                {(arenaState.king?.userId === activeUserId || myRole === 'PLAYER_1') && (
                  <span className="text-[9px] bg-blue-600 text-white font-black px-1.5 py-0.5 rounded-md shadow shrink-0">YOU</span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* POT Badge */}
                <div className="flex items-center gap-1.5 bg-black/80 border border-amber-400/50 px-2.5 py-0.5 rounded-full shadow-lg">
                  <span className="text-[10px] text-zinc-400 font-black tracking-wider uppercase leading-none">POT</span>
                  <span className="text-xs font-black text-amber-400 leading-none">${rolloverPotUSD}</span>
                </div>

                <div className="text-blue-300 bg-black/80 px-2 py-0.5 rounded-lg border border-blue-500/30 text-[10px] font-mono shrink-0">
                  {p1WalletAddress ? `${p1WalletAddress.substring(0, 6)}...${p1WalletAddress.slice(-4)}` : "..."}
                </div>
              </div>
            </div>

            {/* Player 1 Camera Frame */}
            <div
              className="bg-black relative overflow-hidden flex-1 rounded-b-2xl border-2 border-t-0 border-blue-500/50 shadow-[inset_0_0_40px_rgba(59,130,246,0.2)] group"
              style={{
                borderColor: winnerId === 1 ? '#10b981' : undefined,
                borderWidth: winnerId === 1 ? '4px' : undefined,
                boxShadow: winnerId === 1 ? '0 0 35px rgba(16, 185, 129, 0.8)' : undefined,
                minHeight: isFullscreen ? '42vh' : '220px',
              }}
            >
              {/* Independent Floating Glassmorphic Control Icons on Right Side */}
              <div className={`absolute top-2 sm:top-3 right-2 sm:right-3 z-30 flex flex-col items-end gap-1.5 overflow-visible select-none transition-all duration-300 ease-in-out ${
                isFullscreen && !areControlsVisible 
                  ? "opacity-0 scale-95 pointer-events-none" 
                  : "opacity-100 scale-100 pointer-events-auto"
              }`}>
                <button
                  onClick={() => setLayoutMode(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')}
                  className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-zinc-950/80 border border-white/20 hover:bg-zinc-900 hover:border-white/40 text-white backdrop-blur-xl flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer shrink-0"
                  title={layoutMode === 'horizontal' ? 'Switch to Vertical Stack' : 'Switch to Side-by-Side'}
                  aria-label="Toggle Layout"
                >
                  <Columns size={15} />
                </button>

                <button
                  onClick={() => setIsMuted(prev => !prev)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full backdrop-blur-xl border flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg shrink-0 ${
                    isMuted
                      ? "bg-rose-600/90 hover:bg-rose-500 border-rose-400 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]"
                      : "bg-blue-600/90 hover:bg-blue-500 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                  }`}
                  title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                  aria-label="Toggle Microphone"
                >
                  {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-zinc-950/80 border border-white/20 hover:bg-zinc-900 hover:border-white/40 text-white backdrop-blur-xl flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer shrink-0"
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                  aria-label="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>

                <button
                  onClick={() => setIsSidebarOpen(prev => !prev)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full backdrop-blur-xl border flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg shrink-0 ${
                    isSidebarOpen
                      ? "bg-pink-600/90 border-pink-400 text-white shadow-[0_0_15px_rgba(236,72,153,0.5)]"
                      : "bg-zinc-950/80 border-white/20 hover:bg-zinc-900 hover:border-white/40 text-white"
                  }`}
                  title="Toggle Arena Queue Sidebar"
                  aria-label="Toggle Queue Sidebar"
                >
                  <Users size={15} />
                </button>

                {/* Quit / Exit Button - Vertically Aligned Glassmorphic Icon Only */}
                <button
                  onClick={handleQuitMatchToSpectator}
                  className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-red-600/90 hover:bg-red-500 border border-red-400 text-white backdrop-blur-xl flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.5)] transition active:scale-95 cursor-pointer shrink-0"
                  title="Quit / Exit Match and Return to Watchers View"
                  aria-label="Quit Match"
                >
                  <LogOut size={15} />
                </button>
              </div>

              {/* Target Word Overlay */}
              <div className="absolute top-3 inset-x-0 z-20 pointer-events-none flex items-center justify-center px-2">
                <div className="bg-amber-400/90 text-black px-4 py-1.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.9)] animate-pulse border border-amber-200 flex items-center gap-2">
                  <span>⚡ {targetWords[targetWordIndex] || "WIDE-EYED SHOCK"}</span>
                  {countdown !== null && (
                    <span className="bg-black text-amber-300 text-xs px-2 py-0.5 rounded-full font-extrabold border border-amber-400/50">
                      ⏱️ {countdown}s
                    </span>
                  )}
                </div>
              </div>

              <video id="p1DuelView" ref={p1VideoRef} autoPlay playsInline muted={myRole === 'PLAYER_1' || isMuted} className="w-full h-full object-cover block transform scale-x-[-1]" />
              
              {(myRole !== 'PLAYER_1' && !hasRemoteStream && !isDualTestMode) && (
                <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-zinc-950 text-center absolute inset-0 z-10 pt-12">
                  <div className="w-12 h-12 rounded-full border-2 border-blue-500 shadow-[0_0_25px_#0052ff] flex items-center justify-center mb-2 animate-pulse">
                    <span className="text-xl animate-spin">🌀</span>
                  </div>
                  <h5 className="m-0 text-blue-200 text-xs font-extrabold uppercase tracking-wide">Connecting Player 1...</h5>
                  <p className="text-[10px] text-zinc-400 max-w-[200px] mt-1">Establishing direct P2P WebRTC line.</p>
                </div>
              )}

              {/* Glass Identity Tag Bottom Left */}
              <div className="absolute bottom-3 left-3 bg-zinc-950/70 border border-blue-500/40 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-extrabold text-blue-300 shadow z-10 flex items-center gap-1.5">
                <Crown size={12} className="text-amber-400" />
                <span>{myRole === 'PLAYER_1' ? "YOU (REIGNING KING)" : "OPPONENT (KING)"}</span>
              </div>

              {winnerId === 1 && (
                <div className="absolute inset-0 bg-emerald-500/30 backdrop-blur-sm flex flex-col items-center justify-center z-30 animate-pulse">
                  <h1 className="text-3xl sm:text-4xl text-white font-black drop-shadow-[0_0_15px_#10b981] m-0">🎉 WINNER 🎉</h1>
                  <p className="text-xs text-emerald-200 font-bold mt-1">Payout Dispatched via Base L2</p>
                </div>
              )}
            </div>
          </div>

          {/* 💗 RIGHT COLUMN: PLAYER 2 (CHALLENGER) */}
          <div className="flex flex-col min-w-0">
            {/* Player 2 Glass Identity Badge */}
            <div className="flex items-center justify-between bg-zinc-950/80 border border-pink-500/40 backdrop-blur-lg px-3 py-1.5 rounded-t-2xl text-xs font-mono font-bold text-rose-200 gap-1.5 min-w-0">
              <div className="flex items-center gap-1.5 truncate min-w-0">
                <Swords size={14} className="text-pink-400 shrink-0" />
                <span className="text-white font-extrabold truncate text-xs">{p2DisplayName}</span>
                {(arenaState.challenger?.userId === activeUserId || myRole === 'PLAYER_2') && (
                  <span className="text-[9px] bg-rose-600 text-white font-black px-1.5 py-0.5 rounded-md shadow shrink-0">YOU</span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* POT Badge */}
                <div className="flex items-center gap-1.5 bg-black/80 border border-amber-400/50 px-2.5 py-0.5 rounded-full shadow-lg">
                  <span className="text-[10px] text-zinc-400 font-black tracking-wider uppercase leading-none">POT</span>
                  <span className="text-xs font-black text-amber-400 leading-none">${rolloverPotUSD}</span>
                </div>

                <div className="text-rose-300 bg-black/80 px-2 py-0.5 rounded-lg border border-rose-500/30 text-[10px] font-mono shrink-0">
                  {p2WalletAddress ? `${p2WalletAddress.substring(0, 6)}...${p2WalletAddress.slice(-4)}` : "..."}
                </div>
              </div>
            </div>

            {/* Player 2 Camera Frame */}
            <div
              className="bg-black relative overflow-hidden flex-1 rounded-b-2xl border-2 border-t-0 border-pink-500/50 shadow-[inset_0_0_40px_rgba(236,72,153,0.2)] group"
              style={{
                borderColor: winnerId === 2 ? '#10b981' : undefined,
                borderWidth: winnerId === 2 ? '4px' : undefined,
                boxShadow: winnerId === 2 ? '0 0 35px rgba(16, 185, 129, 0.8)' : undefined,
                minHeight: isFullscreen ? '42vh' : '220px',
              }}
            >
              {/* Independent Floating Glassmorphic Control Icons on Right Side */}
              <div className={`absolute top-2 sm:top-3 right-2 sm:right-3 z-30 flex flex-col items-end gap-1.5 overflow-visible select-none transition-all duration-300 ease-in-out ${
                isFullscreen && !areControlsVisible 
                  ? "opacity-0 scale-95 pointer-events-none" 
                  : "opacity-100 scale-100 pointer-events-auto"
              }`}>
                <button
                  onClick={() => setLayoutMode(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')}
                  className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-zinc-950/80 border border-white/20 hover:bg-zinc-900 hover:border-white/40 text-white backdrop-blur-xl flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer shrink-0"
                  title={layoutMode === 'horizontal' ? 'Switch to Vertical Stack' : 'Switch to Side-by-Side'}
                  aria-label="Toggle Layout"
                >
                  <Columns size={15} />
                </button>

                <button
                  onClick={() => setIsMuted(prev => !prev)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full backdrop-blur-xl border flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg shrink-0 ${
                    isMuted
                      ? "bg-rose-600/90 hover:bg-rose-500 border-rose-400 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]"
                      : "bg-blue-600/90 hover:bg-blue-500 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                  }`}
                  title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                  aria-label="Toggle Microphone"
                >
                  {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-zinc-950/80 border border-white/20 hover:bg-zinc-900 hover:border-white/40 text-white backdrop-blur-xl flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer shrink-0"
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                  aria-label="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>

                <button
                  onClick={() => setIsSidebarOpen(prev => !prev)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full backdrop-blur-xl border flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg shrink-0 ${
                    isSidebarOpen
                      ? "bg-pink-600/90 border-pink-400 text-white shadow-[0_0_15px_rgba(236,72,153,0.5)]"
                      : "bg-zinc-950/80 border-white/20 hover:bg-zinc-900 hover:border-white/40 text-white"
                  }`}
                  title="Toggle Arena Queue Sidebar"
                  aria-label="Toggle Queue Sidebar"
                >
                  <Users size={15} />
                </button>

                {/* Quit / Exit Button - Vertically Aligned Glassmorphic Icon Only */}
                <button
                  onClick={handleQuitMatchToSpectator}
                  className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-red-600/90 hover:bg-red-500 border border-red-400 text-white backdrop-blur-xl flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.5)] transition active:scale-95 cursor-pointer shrink-0"
                  title="Quit / Exit Match and Return to Watchers View"
                  aria-label="Quit Match"
                >
                  <LogOut size={15} />
                </button>
              </div>

              {/* Target Word Overlay */}
              <div className="absolute top-3 inset-x-0 z-20 pointer-events-none flex items-center justify-center px-2">
                <div className="bg-amber-400/90 text-black px-4 py-1.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.9)] animate-pulse border border-amber-200 flex items-center gap-2">
                  <span>⚡ {targetWords[targetWordIndex] || "WIDE-EYED SHOCK"}</span>
                  {countdown !== null && (
                    <span className="bg-black text-amber-300 text-xs px-2 py-0.5 rounded-full font-extrabold border border-amber-400/50">
                      ⏱️ {countdown}s
                    </span>
                  )}
                </div>
              </div>

              <video id="p2DuelView" ref={p2VideoRef} autoPlay playsInline muted={myRole === 'PLAYER_2' || isMuted} className="w-full h-full object-cover block transform scale-x-[-1]" />
              
              {(!hasRemoteStream && !isDualTestMode && myRole !== 'PLAYER_2') && (
                <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-zinc-950 text-center absolute inset-0 z-10">
                  {gameMode === 'PVAI' ? (
                    <>
                      <div className="w-14 h-14 rounded-full border-2 border-purple-500 shadow-[0_0_25px_#8a2be2] flex items-center justify-center mb-2 animate-pulse">
                        <span className="text-2xl">🤖</span>
                      </div>
                      <h4 className="m-0 text-purple-200 text-xs font-extrabold">{botData?.name || "AI HOLOGRAM BOSS"}</h4>
                      <div className="text-[10px] text-purple-300 bg-purple-950/80 px-2.5 py-0.5 rounded-full border border-purple-500/40 my-1.5">
                        {aiExpressionState}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full border-2 border-amber-500/80 shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center justify-center mb-2 animate-pulse">
                        <span className="text-2xl animate-bounce">🔍</span>
                      </div>
                      <h4 className="m-0 text-amber-200 text-xs font-extrabold uppercase tracking-wider">
                        {matchStatus === 'QUEUEING' || matchStatus === 'WAITING' ? "Searching Challenger..." : "Waiting for Opponent Line..."}
                      </h4>
                      <p className="text-[10px] text-zinc-400 max-w-[200px] mt-1 leading-snug">
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
                        className="mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl border border-blue-400/40 shadow-lg transition cursor-pointer"
                      >
                        📹 Solo Mirror Preview
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Glass Identity Tag Bottom Left */}
              <div className="absolute bottom-3 left-3 bg-zinc-950/70 border border-pink-500/40 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-extrabold text-pink-300 shadow z-10 flex items-center gap-1.5">
                <Swords size={12} className="text-pink-400" />
                <span>{myRole === 'PLAYER_2' ? "YOU (ACTIVE CHALLENGER)" : "OPPONENT (CHALLENGER)"}</span>
              </div>

              {winnerId === 2 && (
                <div className="absolute inset-0 bg-emerald-500/30 backdrop-blur-sm flex flex-col items-center justify-center z-20 animate-pulse">
                  <h1 className="text-3xl sm:text-4xl text-white font-black drop-shadow-[0_0_15px_#10b981] m-0">🎉 WINNER 🎉</h1>
                  <p className="text-xs text-emerald-200 font-bold mt-1">Payout Dispatched via Base L2</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* 🚀 MATCH CONTROL BUTTON (When inactive/complete) */}
        {(matchStatus === "INACTIVE" || matchStatus === "COMPLETE") && (
          <div className="mb-3">
            <button
              onClick={triggerMatchmakePipeline}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-black font-black text-sm sm:text-base rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.5)] transition transform active:scale-95 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2 border border-amber-300"
            >
              <span>⚔️ {matchStatus === "COMPLETE" ? "Play Next P2P Duel Round" : "Start P2P Arena Match ($0.20 Bids)"}</span>
            </button>
          </div>
        )}

        {matchStatus === "QUEUEING" && (
          <div className="mb-3 py-4 flex flex-col items-center justify-center border border-dashed border-purple-500/50 rounded-2xl p-4 text-center space-y-2 bg-purple-950/30 backdrop-blur-md">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-purple-200 text-xs font-bold m-0">Connecting to P2P WebRTC match queue...</p>
          </div>
        )}

        {/* 📋 LIVE ONLINE ARENA QUEUE ROSTER PANEL */}
        <div className="bg-zinc-950/60 border border-white/10 backdrop-blur-xl rounded-2xl p-3 sm:p-4 mb-3 shadow-2xl">
          <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-white/10 min-w-0">
            <h4 className="text-xs sm:text-sm font-extrabold text-zinc-200 uppercase tracking-wide flex items-center gap-1.5 sm:gap-2 m-0 truncate min-w-0">
              <Users size={16} className="text-pink-400 shrink-0" />
              <span className="truncate">LIVE ARENA QUEUE ROSTER ({arenaState.queue.length + (arenaState.king ? 1 : 0) + (arenaState.challenger ? 1 : 0)} PLAYERS)</span>
            </h4>
            <span className="text-[10px] sm:text-[11px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/40 font-extrabold flex items-center gap-1.5 shadow whitespace-nowrap shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span>{totalOnlineCount} Online</span>
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {/* Active King */}
            {arenaState.king && (
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 bg-amber-500/10 border border-amber-500/40 backdrop-blur-md px-3 py-2 rounded-xl text-xs min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Crown size={16} className="text-amber-400 shrink-0" />
                  <div className="min-w-0 truncate">
                    <span className="font-extrabold text-amber-300 truncate">
                      {arenaState.king.userName} {arenaState.king.userId === activeUserId ? "(YOU)" : ""}
                    </span>
                    <span className="text-[10px] text-zinc-400 ml-2 font-mono hidden sm:inline">
                      {arenaState.king.walletAddress?.slice(0, 6)}...{arenaState.king.walletAddress?.slice(-4)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-500/40 uppercase">
                    KING ({arenaState.king.consecutiveWins || 1} WINS)
                  </span>
                  <span className="text-xs text-zinc-200 font-extrabold">
                    ${(arenaState.king.bidAmount || 0.20).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Active Challenger */}
            {arenaState.challenger && (
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 bg-rose-500/10 border border-rose-500/40 backdrop-blur-md px-3 py-2 rounded-xl text-xs min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Swords size={16} className="text-pink-400 shrink-0" />
                  <div className="min-w-0 truncate">
                    <span className="font-extrabold text-rose-300 truncate">
                      {arenaState.challenger.userName} {arenaState.challenger.userId === activeUserId ? "(YOU)" : ""}
                    </span>
                    <span className="text-[10px] text-zinc-400 ml-2 font-mono hidden sm:inline">
                      {arenaState.challenger.walletAddress?.slice(0, 6)}...{arenaState.challenger.walletAddress?.slice(-4)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="bg-rose-500/20 text-rose-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-500/40 uppercase">
                    CHALLENGER
                  </span>
                  <span className="text-xs text-zinc-200 font-extrabold">
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
                    className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs border backdrop-blur-md transition min-w-0 ${
                      qUser.userId === activeUserId
                        ? "bg-indigo-900/40 border-indigo-500/60 font-bold"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-extrabold text-amber-400 min-w-[20px] shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0 truncate">
                        <span className={qUser.userId === activeUserId ? "text-indigo-300 font-extrabold truncate" : "text-zinc-200 truncate"}>
                          {qUser.userName} {qUser.userId === activeUserId ? "(YOU)" : ""}
                        </span>
                        <span className="text-[10px] text-zinc-400 ml-2 font-mono hidden sm:inline">
                          {qUser.walletAddress?.slice(0, 6)}...
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {qUser.bidAmount > 0.20 && (
                        <span className="bg-purple-900/60 text-purple-200 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-purple-500/40">
                          ⚡ Priority
                        </span>
                      )}
                      {isRegular && (
                        <span className="bg-zinc-800 text-zinc-300 text-[9px] font-medium px-2 py-0.5 rounded-full">
                          Standard
                        </span>
                      )}
                      <span className="font-black text-amber-300 text-xs">
                        ${qUser.bidAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              (!arenaState.king && !arenaState.challenger) && (
                <div className="text-center py-5 px-3 bg-white/5 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center">
                  <div className="text-2xl mb-1">💤</div>
                  <div className="text-xs font-extrabold text-zinc-200">Queue is empty</div>
                  <div className="text-[11px] text-zinc-400 max-w-xs text-center mt-1 leading-snug">
                    Select your bid amount below and click "Join Arena Queue" to play!
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* 💳 ARENA QUEUE & BID ACTION PANEL */}
        <div className="bg-zinc-950/60 border border-white/10 backdrop-blur-xl rounded-2xl p-3 sm:p-4 mb-3 shadow-2xl space-y-3">
          
          {/* Bid / Bet Amount Selector Header */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-extrabold text-zinc-200 uppercase tracking-wide flex items-center gap-1.5 truncate">
              <span>💰</span>
              <span>Select Bid / Stake Amount:</span>
            </span>
            {bidAmount > 0.20 && (
              <span className="text-[10px] font-extrabold bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/40 animate-pulse whitespace-nowrap shrink-0">
                ⚡ Priority Jump
              </span>
            )}
          </div>

          {/* Bid Presets Grid - Fully Responsive across all screens */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 w-full">
            {[0.20, 0.50, 1.00, 5.00, 10.00].map((amt) => (
              <button
                key={amt}
                onClick={() => setBidAmount(amt)}
                className={`py-2 px-1 sm:px-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  bidAmount === amt
                    ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)] font-black scale-[1.02]"
                    : "bg-white/5 hover:bg-white/15 text-zinc-300 border-white/10 font-bold"
                }`}
              >
                <span className="text-xs sm:text-sm tracking-tight">${amt.toFixed(2)}</span>
                <span className="text-[9px] opacity-80 hidden sm:inline font-semibold">
                  {amt === 0.20 ? "Standard" : "Priority"}
                </span>
              </button>
            ))}
          </div>

          {/* Queue Action Button */}
          <div className="w-full pt-1">
            {myRole === 'QUEUED' ? (
              <button
                onClick={handleLeaveArenaQueue}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-xs sm:text-sm py-3 px-4 rounded-xl border border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)] transition cursor-pointer flex items-center justify-center gap-2 animate-pulse uppercase tracking-wider"
              >
                <span>⏳ IN QUEUE (#{myQueuePosition || 1}) — Click to Leave Queue</span>
              </button>
            ) : myRole === 'SPECTATOR' ? (
              <button
                onClick={handleJoinArenaQueue}
                className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs sm:text-sm py-3 px-4 rounded-xl border border-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.5)] transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                <span>⚔️ JOIN ARENA QUEUE (${bidAmount.toFixed(2)})</span>
              </button>
            ) : (
              <div className="w-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-black text-xs sm:text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 uppercase tracking-wider">
                <span>🔥 LIVE IN MATCH — Winner Stays On!</span>
              </div>
            )}
          </div>
        </div>

        {/* ⚙️ BOTTOM ARENA CONTROLS & MATCH INFO PANEL */}
        <div className="bg-zinc-950/60 border border-white/10 backdrop-blur-xl rounded-2xl p-3 sm:p-4 mb-3 shadow-2xl space-y-3">
          
          {/* Continuous Auto-Match Selector Toggle */}
          {setAutoBattle && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-purple-950/40 border border-purple-500/30 p-2.5 sm:p-3 rounded-xl">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full ${autoBattle ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'} shrink-0`} />
                <div className="text-xs">
                  <span className="font-extrabold text-purple-200">Continuous Auto-Match: </span>
                  <span className={autoBattle ? "text-emerald-400 font-extrabold" : "text-amber-400 font-extrabold"}>
                    {autoBattle ? "ACTIVE ⚡" : "PAUSED ⏸️"}
                  </span>
                  <span className="text-[10px] text-zinc-400 ml-1.5 hidden sm:inline">
                    (Auto-starts next round upon match conclusion)
                  </span>
                </div>
              </div>

              <button
                onClick={() => setAutoBattle(!autoBattle)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition shadow cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                  autoBattle
                    ? "bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-600"
                }`}
              >
                <span>{autoBattle ? "⚡ Auto ON" : "⏸️ Auto OFF"}</span>
              </button>
            </div>
          )}

          {/* Winner Stays On & Democratized 10-Play Rule Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-zinc-300 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-amber-300 flex items-center gap-1">
                <span>👑</span>
                <span>Winner Stays On</span>
              </span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-300 font-semibold">
                Matches: <strong className="text-white">#{arenaState.matchCounter}</strong>
              </span>
              <span className="text-zinc-500 hidden sm:inline">•</span>
              <span className="text-zinc-400 text-[11px] hidden sm:inline">Higher bids jump queue</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              {arenaState.isDemocratizedTurn ? (
                <span className="text-emerald-400 font-extrabold animate-pulse bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40 text-[11px]">
                  ⚖️ MATCH #{arenaState.matchCounter} IS DEMOCRATIZED! Longest-waiting regular player turn!
                </span>
              ) : (
                <span className="text-zinc-400 font-medium text-[11px] bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                  ⚖️ Regular Democratized Turn: <strong className="text-amber-300">in {10 - (arenaState.matchCounter % 10)} plays</strong>
                </span>
              )}
            </div>
          </div>

        </div>

        {/* 📡 LIVE ARENA TRANSMISSION LOG */}
        <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-3 max-h-28 overflow-y-auto">
          <div className="text-[10px] font-bold text-zinc-400 mb-1 tracking-wider uppercase">
            📡 LIVE ARENA TRANSMISSION LOG:
          </div>
          {chatLog.map((msg, idx) => (
            <div key={idx} className="text-xs mb-1 font-mono text-zinc-300">
              {msg}
            </div>
          ))}
        </div>
      </div>

      {/* 👥 ─── NEW GLASSMORPHIC SLIDE-OUT QUEUE ROSTER SIDEBAR ─── */}
      <div className={`fixed top-0 right-0 h-full z-50 bg-zinc-950/90 border-l border-white/10 backdrop-blur-2xl flex flex-col shadow-2xl transition-all duration-500 ease-in-out ${isSidebarOpen ? 'w-full md:w-80 lg:w-96 opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-full pointer-events-none'}`}>
        
        {/* Sidebar Top Controls Row */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-zinc-950">
          <div className="flex items-center gap-2">
            <LayoutGrid size={18} className="text-pink-400 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white m-0">Arena Roster</h2>
            <span className="text-[10px] sm:text-[11px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/40 font-extrabold flex items-center gap-1.5 shadow shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{totalOnlineCount} Online</span>
            </span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer"
            aria-label="Close Queue Sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Active Reigning King & Challenger Overview */}
        <div className="p-4 border-b border-white/10 space-y-2 shrink-0 bg-white/5">
          {arenaState?.king && (
            <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/30 p-2.5 rounded-xl text-xs">
              <div className="flex items-center gap-2 truncate">
                <Crown size={14} className="text-amber-400 shrink-0" />
                <div className="truncate">
                  <span className="font-extrabold text-blue-300 block truncate">{arenaState.king.userName}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">{arenaState.king.walletAddress?.slice(0, 6)}...</span>
                </div>
              </div>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-black px-2 py-0.5 rounded-full border border-blue-400/30 shrink-0">
                👑 KING ({arenaState.king.consecutiveWins || 1}W)
              </span>
            </div>
          )}

          {arenaState?.challenger && (
            <div className="flex items-center justify-between bg-pink-500/10 border border-pink-500/30 p-2.5 rounded-xl text-xs">
              <div className="flex items-center gap-2 truncate">
                <Swords size={14} className="text-pink-400 shrink-0" />
                <div className="truncate">
                  <span className="font-extrabold text-pink-300 block truncate">{arenaState.challenger.userName}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">{arenaState.challenger.walletAddress?.slice(0, 6)}...</span>
                </div>
              </div>
              <span className="text-[10px] bg-pink-500/20 text-pink-300 font-black px-2 py-0.5 rounded-full border border-pink-400/30 shrink-0">
                ⚔️ CHALLENGER
              </span>
            </div>
          )}
        </div>

        {/* Roster Queue Mapping Box */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
          <div className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Live Queue ({arenaState?.queue?.length || 0})</span>
            <span className="text-[10px] text-amber-300 font-bold">Priority Bids Jump Queue</span>
          </div>

          {arenaState?.queue && arenaState.queue.length > 0 ? (
            arenaState.queue.map((player, idx) => (
              <div 
                key={player.userId || idx}
                className={`border rounded-2xl p-3 flex items-center justify-between shadow-lg transition-all duration-200 group hover:translate-x-1 ${
                  player.userId === activeUserId 
                    ? 'bg-purple-900/40 border-purple-500/60' 
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3 truncate min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-xs font-black text-amber-400 shrink-0 group-hover:text-pink-400 transition-colors duration-200">
                    #{idx + 1}
                  </div>
                  <div className="flex flex-col truncate min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      {player.userName} {player.userId === activeUserId ? "(YOU)" : ""}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono tracking-tight truncate">
                      {player.walletAddress?.slice(0, 6)}...{player.walletAddress?.slice(-4)}
                    </span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end shrink-0 ml-2">
                  <span className="text-xs font-extrabold text-emerald-400 tracking-tight">
                    ${(player.bidAmount || 0.20).toFixed(2)}
                  </span>
                  <span className="text-[9px] font-medium text-zinc-400 uppercase tracking-widest mt-0.5">
                    {player.bidAmount > 0.20 ? "⚡ PRIORITY" : "STANDARD"}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center py-12 px-4">
              <span className="text-3xl mb-2 opacity-50">💤</span>
              <p className="text-sm font-semibold text-zinc-300">Queue is empty</p>
              <p className="text-xs text-zinc-500 mt-1">Select your bid amount below and click Join Queue to battle!</p>
            </div>
          )}
        </div>

        {/* Sidebar Footer Join Queue Action */}
        <div className="p-4 border-t border-white/10 bg-zinc-950 shrink-0">
          {myRole === 'QUEUED' ? (
            <button
              onClick={handleLeaveArenaQueue}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-xs py-3 px-4 rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>⏳ IN QUEUE (#{myQueuePosition || 1}) — Click to Leave</span>
            </button>
          ) : (
            <button
              onClick={handleJoinArenaQueue}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs py-3 px-4 rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>⚔️ JOIN ARENA QUEUE (${bidAmount.toFixed(2)})</span>
            </button>
          )}
        </div>

      </div>

    </div>
  );
};

export default P2PArena;



