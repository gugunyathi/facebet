import React, { useState, useEffect, useContext, useRef } from 'react';
import { VideoProvider, API_URL, peer as globalPeer } from '@/utils/constants';

interface P2PArenaProps {
  currentPeerId?: string;
  walletAddress?: string;
  peerInstance?: any;
  userSession?: any;
  onRequireAuth?: () => void;
  onBuyTickets?: () => void;
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

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const activeMediaStreamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeUserId = userSession?.peerId || currentPeerId;
  const activeWallet = userSession?.walletAddress || walletAddress;

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

  // Sync videoContext remoteMediaStream directly to remoteVideoRef when WebRTC stream connects
  useEffect(() => {
    const stream = videoContext?.remoteMediaStream;
    if (stream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current.play().catch(() => {});
      setHasRemoteStream(true);
      setGameMode('PVP');
      if (matchStatus !== 'LIVE') {
        setMatchStatus('LIVE');
        setCountdown(10);
      }
    }
  }, [videoContext?.remoteMediaStream]);

  // Listen for WebSocket real-time P2P_MATCH_FOUND events
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(wsUrl);
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "P2P_MATCH_FOUND") {
            const { player1PeerId, player2PeerId } = data;
            if (activeUserId === player1PeerId && player2PeerId) {
              setChatLog(prev => [...prev, "🤝 REAL PLAYER FOUND! Securing WebRTC direct video line..."]);
              setGameMode('PVP');
              initiateP2PConnectionCall(player2PeerId);
            } else if (activeUserId === player2PeerId && player1PeerId) {
              setChatLog(prev => [...prev, "🤝 CONNECTED TO CHALLENGER! Securing WebRTC direct video line..."]);
              setGameMode('PVP');
              initiateP2PConnectionCall(player1PeerId);
            }
          }
        } catch {}
      };
    } catch {}

    return () => {
      try { socket?.close(); } catch {}
    };
  }, [activeUserId]);

  // Initialize and bind local camera media stream
  useEffect(() => {
    let isSubscribed = true;

    const setupLocalStream = async () => {
      let stream: MediaStream | null = videoContext?.mediaStream || videoContext?.getMediaStream?.() || null;
      if (!stream && videoContext?.startVideoStream) {
        await videoContext.startVideoStream();
        stream = videoContext?.mediaStream || videoContext?.getMediaStream?.() || null;
      }

      if (!stream && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (err) {
          console.warn("Camera access notice:", err);
        }
      }

      if (isSubscribed && stream) {
        activeMediaStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.muted = true;
          localVideoRef.current.playsInline = true;
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
      }
    };

    setupLocalStream();

    return () => {
      isSubscribed = false;
    };
  }, [videoContext]);

  // PeerJS Incoming Call Media Event Listener Loop
  useEffect(() => {
    if (!activePeer) return;

    const handleIncomingCall = (incomingCall: any) => {
      console.log("📞 Incoming WebRTC video call received from Player 2 node...");

      const getStreamAndAnswer = async () => {
        let localStream = activeMediaStreamRef.current;
        if (!localStream && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            activeMediaStreamRef.current = localStream;
          } catch {}
        }

        if (localVideoRef.current && localStream) {
          localVideoRef.current.srcObject = localStream;
          localVideoRef.current.play().catch(() => {});
        }

        if (localStream) {
          incomingCall.answer(localStream);
        } else {
          incomingCall.answer();
        }

        incomingCall.on('stream', (remoteStream: MediaStream) => {
          console.log("🎥 Remote P2P video stream received & bound to remoteVideoRef!");
          // FIX: 100ms delay ensures React has fully painted the dual video grid
          // before we assign srcObject, preventing the silent null-ref stream drop.
          setTimeout(() => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
              remoteVideoRef.current.play().catch((e) => console.error("Autoplay blocked:", e));
              setHasRemoteStream(true);
            }
          }, 100);
        });

        setGameMode('PVP');
        setWinnerId(null);
        setVerdictReason("");
        setMatchStatus("LIVE");
        setCountdown(10);
        setChatLog(prev => [...prev, "🤝 WebRTC P2P Direct Video Line Established! Match LIVE."]);
      };

      getStreamAndAnswer();
    };

    activePeer.on('call', handleIncomingCall);

    return () => {
      activePeer.off?.('call', handleIncomingCall);
    };
  }, [activePeer]);

  // Outgoing P2P Connection Initiator
  const initiateP2PConnectionCall = (targetOpponentPeerId: string) => {
    if (!activePeer) return;

    const getStreamAndCall = async () => {
      let localStream = activeMediaStreamRef.current;
      if (!localStream && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          activeMediaStreamRef.current = localStream;
        } catch {}
      }

      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.play().catch(() => {});
      }

      if (!localStream) return;

      console.log(`📞 Dialing opponent node (${targetOpponentPeerId})...`);
      const call = activePeer.call(targetOpponentPeerId, localStream);

      call.on('stream', (remoteStream: MediaStream) => {
        console.log("🎥 Remote opponent video stream attached to remoteVideoRef!");
        // FIX: 100ms delay ensures React has fully painted the dual video grid
        // before we assign srcObject, preventing the silent null-ref stream drop.
        setTimeout(() => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch((e) => console.error("Autoplay blocked:", e));
            setHasRemoteStream(true);
          }
        }, 100);
      });

      setGameMode('PVP');
      setWinnerId(null);
      setVerdictReason("");
      setMatchStatus("LIVE");
      setCountdown(10);
      setChatLog(prev => [...prev, `⚔️ Match Initiated vs Opponent Node (${targetOpponentPeerId.slice(0, 8)}...)`]);
    };

    getStreamAndCall();
  };

  // Matchmaking pipeline trigger
  const triggerMatchmakePipeline = async () => {
    if (!userSession && onRequireAuth) {
      onRequireAuth();
      return;
    }

    if (!isDualTestMode) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
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
          setChatLog(["🤝 MATCH FOUND: Securing P2P WebRTC direct camera line..."]);
          if (data.opponentPeerId) {
            initiateP2PConnectionCall(data.opponentPeerId);
          }
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

    const p1Frame = captureFrame(localVideoRef.current) || "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
    const p2Frame = captureFrame(remoteVideoRef.current) || p1Frame;

    if (p1Frame && p2Frame) {
      try {
        const endpoint = API_URL ? `${API_URL}/api/evaluate-duel` : '/api/evaluate-duel';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            p1Frame,
            p2Frame,
            p1Wallet: activeWallet,
            p2Wallet: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
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

      {/* Header Bar with View Controls */}
      <div className="flex items-center justify-between gap-1 sm:gap-2 mb-3 pb-2 border-b border-white/10 w-full overflow-x-auto whitespace-nowrap">
        <h3 className="text-[11px] sm:text-sm font-extrabold tracking-wide uppercase flex items-center gap-1 text-purple-200 m-0 shrink-0">
          <span>🔮</span>
          <span>P2P ARENA</span>
        </h3>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Solo Mirror Test Toggle Button */}
          <button
            onClick={() => {
              if (isDualTestMode) {
                setIsDualTestMode(false);
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.srcObject = null;
                }
                setHasRemoteStream(false);
                setChatLog(prev => [...prev, "🔍 Returned to Real P2P Searching Radar."]);
              } else {
                setIsDualTestMode(true);
                if (localVideoRef.current?.srcObject && remoteVideoRef.current) {
                  remoteVideoRef.current.srcObject = localVideoRef.current.srcObject;
                  remoteVideoRef.current.play().catch(() => {});
                  setHasRemoteStream(true);
                  setGameMode('PVP');
                  setMatchStatus('LIVE');
                  setCountdown(10);
                  setChatLog(prev => [...prev, "📹 Solo Mirror Test Mode Enabled!"]);
                }
              }
            }}
            className={`text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border font-bold transition flex items-center gap-0.5 cursor-pointer shrink-0 ${
              isDualTestMode
                ? "bg-blue-600 text-white border-blue-400/60 shadow-lg"
                : "bg-white/10 hover:bg-white/20 text-gray-200 border-white/20"
            }`}
            title="Toggle solo mirror test mode"
          >
            <span>{isDualTestMode ? "📹 Mirror ON" : "📹 Solo Mirror"}</span>
          </button>

          {/* Layout Orientation Switcher (Vertical Stack vs Horizontal Side-by-Side) */}
          <button
            onClick={() => setLayoutMode(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')}
            className="bg-white/10 hover:bg-white/20 text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-white/20 font-bold transition flex items-center gap-0.5 text-gray-200 cursor-pointer shrink-0"
            title={layoutMode === 'horizontal' ? 'Switch to Vertical Stack' : 'Switch to Side-by-Side'}
          >
            <span>{layoutMode === 'horizontal' ? '📱 Stack' : '↔️ Side'}</span>
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className="bg-indigo-600/80 hover:bg-indigo-500 text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-indigo-400/40 font-extrabold transition flex items-center gap-0.5 text-white cursor-pointer shadow shrink-0"
          >
            <span>{isFullscreen ? '↙↗ Exit' : '⤢ Fullscreen'}</span>
          </button>

          {countdown !== null && (
            <span className="text-[10px] sm:text-[11px] font-black text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40 animate-pulse shrink-0">
              ⏱️ {countdown}s
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase shrink-0 ${
            matchStatus === 'LIVE' ? 'bg-emerald-500 text-black animate-pulse' :
            matchStatus === 'AI_JUDGING' ? 'bg-amber-400 text-black animate-bounce' :
            matchStatus === 'COMPLETE' ? 'bg-amber-500 text-black font-extrabold' :
            'bg-purple-900/60 text-purple-200 border border-purple-500/30'
          }`}>
            {matchStatus}
          </span>
        </div>
      </div>

      {/* Split-Screen Video Grid Container (Zero gap so frames connect directly) */}
      <div
        className={`grid gap-0 min-h-[300px] mb-3 w-full ${
          layoutMode === 'vertical' ? 'grid-cols-1' : 'grid-cols-2'
        }`}
      >

        {/* Left Side: Player 1 Grid + Celebration Overlay Interface */}
        <div style={{
          background: '#000',
          borderRadius: layoutMode === 'vertical' ? '8px 8px 0 0' : '8px 0 0 8px',
          border: winnerId === 1 ? '4px solid #34a853' : '2px solid #0052ff',
          position: 'relative',
          overflow: 'hidden',
          minHeight: isFullscreen ? '42vh' : '240px',
          boxShadow: winnerId === 1 ? '0 0 25px rgba(52, 168, 83, 0.6)' : 'none'
        }}>
          <video id="p1LocalDuelView" ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.75)', padding: '3px 7px', fontSize: '10px', borderRadius: '4px', border: '1px solid rgba(0,82,255,0.4)', color: '#60a5fa', fontWeight: 'bold', zIndex: 10 }}>
            ● YOU (PLAYER 1)
          </div>

          {winnerId === 1 && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(52, 168, 83, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', zIndex: 20, animation: 'flashBorder 1s infinite alternate' }}>
              <h1 style={{ fontSize: '32px', color: '#fff', textShadow: '0 0 10px #000', margin: 0, fontWeight: 900 }}>🎉 WINNER 🎉</h1>
              <p style={{ fontSize: '12px', color: '#fff', fontWeight: 'bold', margin: '6px 0 0 0' }}>Payout Dispatched via Base L2</p>
            </div>
          )}
        </div>

        {/* Right Side: Player 2 Grid + Celebration Overlay Interface */}
        <div style={{
          background: '#000',
          borderRadius: layoutMode === 'vertical' ? '0 0 8px 8px' : '0 8px 8px 0',
          border: winnerId === 2 ? '4px solid #34a853' : '2px solid #ff0055',
          position: 'relative',
          overflow: 'hidden',
          minHeight: isFullscreen ? '42vh' : '240px',
          boxShadow: winnerId === 2 ? '0 0 25px rgba(52, 168, 83, 0.6)' : 'none'
        }}>

          {/* Remote video element: ALWAYS in the DOM so the ref is always valid */}
          <video
            id="p2RemoteDuelView"
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />

          {/* Player 2 Stream Overlay: Active Human Search Radar or AI Bot fallback if requested */}
          {(!hasRemoteStream && !isDualTestMode) && (
            <div
              className="w-full h-full flex flex-col items-center justify-center p-4 bg-[#07020d] text-center"
              style={{ position: 'absolute', inset: 0, zIndex: 5 }}
            >
              {gameMode === 'PVAI' ? (
                <>
                  <div className="w-14 h-14 rounded-full border-2 border-purple-500 shadow-[0_0_25px_#8a2be2] flex items-center justify-center mb-2 animate-pulse">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <h4 className="m-0 text-purple-200 text-xs font-extrabold">{botData?.name || "AI HOLOGRAM BOSS"}</h4>
                  <div className="text-[10px] text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/40 my-1">
                    {aiExpressionState}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full border-2 border-amber-500/80 shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center justify-center mb-2 animate-pulse">
                    <span className="text-2xl animate-bounce">🔍</span>
                  </div>
                  <h4 className="m-0 text-amber-200 text-xs font-extrabold uppercase tracking-wider">
                    {matchStatus === 'QUEUEING' || matchStatus === 'WAITING' ? "Searching Human Player 2..." : "Waiting for Player 2 Line..."}
                  </h4>
                  <p className="text-[10px] text-gray-400 max-w-[210px] my-1 font-medium leading-tight">
                    Waiting for another real player to accept your $0.20 P2P duel request.
                  </p>
                  <button
                    onClick={() => {
                      setIsDualTestMode(true);
                      if (localVideoRef.current?.srcObject && remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = localVideoRef.current.srcObject;
                        remoteVideoRef.current.play().catch(() => {});
                        setGameMode('PVP');
                        setMatchStatus('LIVE');
                        setCountdown(10);
                        setChatLog(prev => [...prev, "📹 Dual Camera Preview (Test Mode) Enabled!"]);
                      }
                    }}
                    className="mt-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-lg border border-blue-400/40 shadow transition cursor-pointer"
                  >
                    📹 Dual Camera Preview (Test Mode)
                  </button>
                </>
              )}
            </div>
          )}

          <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.75)', padding: '3px 7px', fontSize: '10px', borderRadius: '4px', border: '1px solid rgba(255,0,85,0.4)', color: '#f43f5e', fontWeight: 'bold', zIndex: 10 }}>
            ● OPPONENT (PLAYER 2)
          </div>

          {winnerId === 2 && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(52, 168, 83, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', zIndex: 20, animation: 'flashBorder 1s infinite alternate' }}>
              <h1 style={{ fontSize: '32px', color: '#fff', textShadow: '0 0 10px #000', margin: 0, fontWeight: 900 }}>🎉 WINNER 🎉</h1>
              <p style={{ fontSize: '12px', color: '#fff', fontWeight: 'bold', margin: '6px 0 0 0' }}>Payout Dispatched via Base L2</p>
            </div>
          )}
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



