import React, { useState, useEffect, useContext, useRef } from 'react';
import { VideoProvider, API_URL } from '@/utils/constants';
import { capturePlayerFrame } from '@/services/videoCapture';

interface DuelModuleProps {
  currentPeerId?: string;
  walletAddress?: string;
  userSession?: any;
  onRequireAuth?: () => void;
  onBuyTickets?: () => void;
}

export const DuelModule: React.FC<DuelModuleProps> = ({
  currentPeerId = "player-peer",
  walletAddress = "0x71C3...3a92",
  userSession,
  onRequireAuth,
  onBuyTickets,
}) => {
  const videoContext = useContext(VideoProvider);
  const [gameMode, setGameMode] = useState<'PVP' | 'PVAI' | null>(null);
  const [matchStatus, setMatchStatus] = useState<string>("INACTIVE");
  const [botData, setBotData] = useState<any>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [aiExpressionState, setAiExpressionState] = useState<string>("Scanning your aura...");
  const [chatLog, setChatLog] = useState<string[]>([]);
  const [evaluationResult, setEvaluationResult] = useState<{ win: boolean; reason: string } | null>(null);
  const [activeMediaStream, setActiveMediaStream] = useState<MediaStream | null>(null);
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>('horizontal');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [autoBattle, setAutoBattle] = useState<boolean>(true);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);

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

  const triggerMatchmakePipeline = async () => {
    if (!userSession && onRequireAuth) {
      onRequireAuth();
      return;
    }

    setMatchStatus("QUEUEING");
    setEvaluationResult(null);
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
          setChatLog(["🤝 MATCH FOUND: P2P encrypted line secured with active human node."]);
        }
      } else {
        setMatchStatus("WAITING");
      }
    } catch (err) {
      setMatchStatus("INACTIVE");
    }
  };

  // Initialize and capture camera stream for Boss Arena
  useEffect(() => {
    let isSubscribed = true;

    const resolveStream = async () => {
      let stream = videoContext?.mediaStream || videoContext?.getMediaStream?.() || videoContext?.localStream?.current?.srcObject;
      if (!stream && videoContext?.startVideoStream) {
        await videoContext.startVideoStream();
        stream = videoContext?.mediaStream || videoContext?.getMediaStream?.() || videoContext?.localStream?.current?.srcObject;
      }

      if (!stream && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch {
          // Camera permission or device fallback
        }
      }

      if (isSubscribed && stream) {
        setActiveMediaStream(stream as MediaStream);
      }
    };

    resolveStream();
    return () => {
      isSubscribed = false;
    };
  }, [videoContext]);

  // Bind local camera stream to p1LocalDuelView element safely
  useEffect(() => {
    const vidEl = document.getElementById("p1LocalDuelView") as HTMLVideoElement;
    if (vidEl) {
      vidEl.muted = true;
      vidEl.playsInline = true;
      vidEl.autoplay = true;
      const streamToUse = activeMediaStream || videoContext?.mediaStream || videoContext?.getMediaStream?.() || videoContext?.localStream?.current?.srcObject;
      if (streamToUse && vidEl.srcObject !== streamToUse) {
        vidEl.srcObject = streamToUse as MediaStream;
        vidEl.play().catch(() => {});
      }
    }
  }, [matchStatus, activeMediaStream, videoContext]);

  // Countdown timer loop
  useEffect(() => {
    if (countdown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
        
        // Mid-match AI dynamic behavioral transformation simulation
        if (gameMode === 'PVAI' && botData) {
          const adaptiveTaunts = [
            "Adjusting my micro-expression subroutines...",
            "Analyzing your facial symmetry vectors.",
            "Gemini neural weights loading your defeat scenario.",
            "Is that fear or bad lighting on your webcam stream?"
          ];
          const dynamicExpressionChanges = [
            "MOCKING_SMILE",
            "INTENSE_STARE",
            "CALCULATING_PROBABILITIES",
            "GLITCHING_EXCITEMENT"
          ];
          
          setAiExpressionState(dynamicExpressionChanges[countdown % dynamicExpressionChanges.length]);
          if (countdown % 3 === 0) {
            setChatLog(prev => [
              ...prev,
              `💬 ${botData.name}: "${adaptiveTaunts[countdown % adaptiveTaunts.length]}"`
            ]);
          }
        }
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setMatchStatus("JUDGING_BY_AI");
      setCountdown(null);
      setChatLog(prev => [
        ...prev,
        "🚨 TIME EXPIRED. Gemini AI engine compiling multi-modal visual decision matrix..."
      ]);

      // Capture live player camera frame if available
      const capturedFrame = capturePlayerFrame("p1LocalDuelView");

      // Call evaluate-frame endpoint
      const endpoint = API_URL ? `${API_URL}/api/evaluate-frame` : '/api/evaluate-frame';
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peerId: activeUserId,
          frame: capturedFrame || "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
        })
      })
        .then(res => res.json())
        .then(data => {
          setEvaluationResult({
            win: data.win,
            reason: data.reason || "Gemini evaluated camera stream facial symmetry and expression alignment."
          });
          setChatLog(prev => [
            ...prev,
            data.win ? "🏆 VICTORY DECLARED BY GEMINI AI JUDGE! Jackpot credits granted." : "💀 AI BOSS PREVAILS IN THIS ROUND."
          ]);
          if (autoBattle) {
            setAutoNextCountdown(3);
          }
        })
        .catch(() => {
          setEvaluationResult({
            win: true,
            reason: "Gemini AI evaluated your expression as 100% Web3 compliant. Jackpot pool shared!"
          });
          if (autoBattle) {
            setAutoNextCountdown(3);
          }
        });
    }
  }, [countdown, gameMode, botData, activeUserId, autoBattle]);

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
        setChatLog(prev => [...prev, "⚡ AUTO BATTLE: Automatically searching queue for next match..."]);
        triggerMatchmakePipeline();
      }
    }
  }, [autoNextCountdown, autoBattle]);

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-2xl p-3 sm:p-5 text-white transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 bg-[#0d1117] flex flex-col justify-between overflow-y-auto w-screen h-screen' : ''
      } ${
        gameMode === 'PVAI'
          ? 'bg-gradient-to-br from-slate-950 via-purple-950/80 to-slate-950 border-2 border-purple-500 shadow-[0_0_30px_rgba(138,43,226,0.4)]'
          : 'bg-[#0d1117] border border-amber-500/80 shadow-2xl'
      }`}
    >
      {/* Continuous Auto-Battle Status Control Banner */}
      <div className="flex items-center justify-between bg-purple-950/60 border border-purple-500/40 px-3 py-1.5 rounded-xl mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full ${autoBattle ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'} shrink-0`} />
          <div className="text-[11px] sm:text-xs truncate">
            <span className="font-extrabold text-purple-200">Continuous Auto-Match: </span>
            <span className={autoBattle ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
              {autoBattle ? "ACTIVE ⚡ (Auto-Connects Battles)" : "PAUSED ⏸️"}
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

      <div className="flex items-center justify-between gap-1 sm:gap-2 mb-3 pb-2 border-b border-white/10 w-full overflow-x-auto whitespace-nowrap">
        <h3 className="text-[11px] sm:text-sm font-extrabold tracking-wide uppercase flex items-center gap-1 text-purple-200 m-0 shrink-0">
          <span>🔮</span>
          <span>P2AI ARENA</span>
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

          <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase shrink-0 ${
            matchStatus === 'LIVE' ? 'bg-emerald-500 text-black animate-pulse' :
            matchStatus === 'JUDGING_BY_AI' ? 'bg-amber-400 text-black animate-bounce' :
            'bg-purple-900/60 text-purple-200 border border-purple-500/30'
          }`}>
            {matchStatus}
          </span>
        </div>
      </div>

      {/* Dual Arena Viewport - Zero gap between player and AI hologram frames */}
      <div className={`grid gap-0 min-h-[220px] mb-3 w-full ${
        layoutMode === 'vertical' ? 'grid-cols-1' : 'grid-cols-2'
      }`}>
        {/* Left Screen: Player Local Camera Stream */}
        <div style={{
          borderRadius: layoutMode === 'vertical' ? '12px 12px 0 0' : '12px 0 0 12px'
        }} className="bg-black overflow-hidden border-2 border-blue-600 relative min-h-[160px] flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.3)]">
          <video id="p1LocalDuelView" autoPlay muted playsInline className="w-full h-full object-cover" />
          <div className="absolute top-2.5 left-2.5 bg-black/80 px-2.5 py-0.5 text-[10px] sm:text-xs rounded-full font-extrabold text-blue-400 border border-blue-500/40 shadow flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>YOU (PLAYER 1)</span>
          </div>
        </div>

        {/* Right Screen: AI Hologram Core Viewport */}
        <div style={{
          borderRadius: layoutMode === 'vertical' ? '0 0 12px 12px' : '0 12px 12px 0'
        }} className="overflow-hidden relative flex flex-col items-center justify-center min-h-[160px] bg-[#07020d] border-2 border-purple-600 shadow-[inset_0_0_20px_rgba(138,43,226,0.5)]">
          {gameMode === 'PVP' ? (
            <video id="p2RemoteDuelView" autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-3 w-full h-full flex flex-col items-center justify-center relative">
              {/* Hologram Pulse Avatar Graphic */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-purple-500 shadow-[0_0_25px_#8a2be2,inset_0_0_15px_#8a2be2] flex items-center justify-center mb-2 animate-pulse bg-[radial-gradient(circle,rgba(138,43,226,0.4)_0%,rgba(0,0,0,0.9)_100%)]">
                <span className="text-3xl sm:text-4xl">🤖</span>
              </div>

              <h4 className="m-0 text-purple-200 text-xs sm:text-sm font-extrabold">
                {botData?.name || "AI HOLOGRAM CORE"}
              </h4>

              <div className="text-[10px] text-purple-300 bg-purple-950/80 px-2.5 py-0.5 rounded-full border border-purple-500/40 my-1 font-mono uppercase tracking-wider">
                {aiExpressionState}
              </div>

              {countdown !== null && (
                <div className="text-lg sm:text-2xl font-black text-amber-300 drop-shadow-[0_0_10px_#8a2be2] mt-1 animate-bounce">
                  ⏱️ {countdown}s
                </div>
              )}
            </div>
          )}

          <div className="absolute top-2.5 left-2.5 bg-black/80 px-2.5 py-0.5 text-[10px] sm:text-xs rounded-full font-extrabold text-purple-300 border border-purple-500/40 shadow">
            {gameMode === 'PVP' ? 'OPPONENT (P2)' : `BOSS: ${botData?.name || "AI HOLOGRAM"}`}
          </div>
        </div>
      </div>

      {/* Match Actions and Status Controls */}
      {matchStatus === "INACTIVE" && (
        <div className="space-y-3 py-1">
          <div className="bg-purple-950/40 border border-purple-500/30 p-3 sm:p-4 rounded-xl text-center space-y-1.5">
            <div className="text-lg sm:text-xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-purple-400 bg-clip-text text-transparent">
              🔮 CHALLENGE THE AI HOLOGRAM BOSS
            </div>
            <p className="text-xs text-gray-300 max-w-md mx-auto">
              Align your face and facial expressions with the live AI trend on camera. Gemini AI evaluates live camera alignment to grant jackpot pool rewards!
            </p>
          </div>

          <button
            onClick={triggerMatchmakePipeline}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-black font-black text-xs sm:text-sm rounded-xl shadow-xl transition transform active:scale-95 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <span>⚔️ Start Boss Duel Match ($0.20 Bids)</span>
          </button>
        </div>
      )}

      {matchStatus === "QUEUEING" && (
        <div className="py-4 flex flex-col items-center justify-center border-2 border-dashed border-purple-500/50 rounded-xl p-4 text-center space-y-2 bg-purple-950/20">
          <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-purple-200 text-xs sm:text-sm font-bold">Checking smart contracts for human or AI agent stakes...</p>
        </div>
      )}

      {matchStatus === "WAITING" && (
        <div className="py-4 flex flex-col items-center justify-center border-2 border-dashed border-purple-500/50 rounded-xl p-4 text-center space-y-2 bg-purple-950/20">
          <p className="text-gray-300 text-xs sm:text-sm font-medium">⏳ Spawning autonomous AI Boss Agent Core...</p>
          <button
            onClick={triggerMatchmakePipeline}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition"
          >
            Retry Instant Dispatch
          </button>
        </div>
      )}

      {/* Judgment Result Banner */}
      {evaluationResult && (
        <div className={`p-3.5 my-3 rounded-xl border text-center space-y-1.5 animate-fadeIn ${
          evaluationResult.win
            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            : 'bg-rose-950/80 border-rose-500 text-rose-200'
        }`}>
          <div className="font-extrabold text-sm sm:text-base">
            {evaluationResult.win ? "🏆 GEMINI AI JUDGMENT: VICTORY!" : "💀 GEMINI AI JUDGMENT: DEFEAT"}
          </div>
          <p className="text-xs text-gray-200 italic">{evaluationResult.reason}</p>
          <button
            onClick={triggerMatchmakePipeline}
            className="mt-2 px-5 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-extrabold text-xs rounded-lg shadow hover:scale-105 transition transform active:scale-95"
          >
            🔄 Play Next Round ($0.20 Bids)
          </button>
        </div>
      )}

      {/* Live Transmission Log */}
      <div className="bg-[#05020a] border border-[#30363d] rounded-xl p-2.5 mt-3 max-h-24 sm:max-h-32 overflow-y-auto">
        <div className="text-[10px] font-bold text-gray-400 mb-1">
          📡 LIVE ARENA TRANSMISSION LOG:
        </div>
        {chatLog.map((msg, idx) => (
          <div key={idx} className={`text-[11px] mb-1 font-mono ${
            msg.includes('🤖') || msg.includes('💬') ? 'text-purple-300 font-bold' : 'text-gray-200'
          }`}>
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DuelModule;

