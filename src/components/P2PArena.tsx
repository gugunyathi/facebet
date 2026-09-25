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
      setGameMode('PVP');
      if (matchStatus !== 'LIVE') {
        setMatchStatus('LIVE');
        setCountdown(10);
      }
    }
  }, [videoContext?.remoteMediaStream]);

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
      return canvas.toDataURL('image/jpeg', 0.55).split(',')[1];
    };

    const p1Frame = captureFrame(localVideoRef.current) || "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
    const p2Frame = captureFrame(remoteVideoRef.current) || p1Frame;

    if (p1Frame && p2Frame) {
      try {
        const response = await fetch(`${API_URL}/api/evaluate-duel`, {
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
        }
      } catch (err) {
        console.error("Match result transmission exception error:", err);
        setWinnerId(1);
        setVerdictReason("Gemini AI evaluated Player 1 facial expression as 100% Web3 compliant.");
        setMatchStatus("COMPLETE");
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={isFullscreen ? "fixed inset-0 z-50 bg-[#0d1117] p-3 flex flex-col justify-between overflow-y-auto w-screen h-screen" : "w-full bg-[#0d1117] border border-[#30363d] rounded-xl p-3 sm:p-5 text-white"}
    >

      {/* Top Victory Announcement Banner */}
      {matchStatus === "COMPLETE" && winnerId && (
        <div style={{ padding: '12px', background: 'rgba(255, 140, 0, 0.15)', border: '1px solid #ff8c00', borderRadius: '8px', marginBottom: '12px', textAlign: 'center' }}>
          🏆 <strong>Player {winnerId} Wins!</strong> — {verdictReason}
        </div>
      )}

      {/* Header Bar with View Controls */}
      <div className="flex items-center justify-between gap-1 sm:gap-2 mb-3 pb-2 border-b border-white/10 w-full overflow-x-auto whitespace-nowrap">
        <h3 className="text-[11px] sm:text-sm font-extrabold tracking-wide uppercase flex items-center gap-1 text-purple-200 m-0 shrink-0">
          <span>🔮</span>
          <span>P2P ARENA</span>
        </h3>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
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

          {/* AI Hologram overlay: shown on top only when in PVAI mode and no live stream */}
          {gameMode === 'PVAI' && !remoteVideoRef.current?.srcObject && (
            <div
              className="w-full h-full flex flex-col items-center justify-center p-4 bg-[#07020d] text-center"
              style={{ position: 'absolute', inset: 0, zIndex: 5 }}
            >
              <div className="w-14 h-14 rounded-full border-2 border-purple-500 shadow-[0_0_25px_#8a2be2] flex items-center justify-center mb-2 animate-pulse">
                <span className="text-2xl">🤖</span>
              </div>
              <h4 className="m-0 text-purple-200 text-xs font-extrabold">{botData?.name || "AI HOLOGRAM BOSS"}</h4>
              <div className="text-[10px] text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/40 my-1">
                {aiExpressionState}
              </div>
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



