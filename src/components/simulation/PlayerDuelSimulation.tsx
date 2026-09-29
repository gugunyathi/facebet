import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Swords, 
  Crown, Zap, Trophy, ShieldCheck, Flame, RefreshCw, Eye
} from 'lucide-react';

interface PlayerDuelSimulationProps {
  onEnterArena?: () => void;
  potAmount?: string;
  onlineCount?: number;
}

export const PlayerDuelSimulation: React.FC<PlayerDuelSimulationProps> = ({
  onEnterArena,
  potAmount = "$2,446.95",
  onlineCount = 2440,
}) => {
  const [phase, setPhase] = useState<'countdown' | 'searching' | 'target' | 'match' | 'celebration'>('target');
  const [targetExpression, setTargetExpression] = useState<'WINK' | 'SMILE' | 'SURPRISE' | 'SHOCK'>('WINK');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(7);
  const [p1Score, setP1Score] = useState<number>(78);
  const [p2Score, setP2Score] = useState<number>(98);
  const [winner, setWinner] = useState<'P1' | 'P2' | null>('P2');
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  const expressionsList: Array<'WINK' | 'SMILE' | 'SURPRISE' | 'SHOCK'> = ['WINK', 'SMILE', 'SURPRISE', 'SHOCK'];
  const expressionEmojis = {
    WINK: '😉',
    SMILE: '😄',
    SURPRISE: '😮',
    SHOCK: '😱',
  };

  const playSoundEffect = (type: 'tick' | 'ding' | 'win' | 'click') => {
    if (!soundEnabled) return;
    try {
      const ctx = audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioCtx) setAudioCtx(ctx);
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'ding') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'win') {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const noteOsc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          noteOsc.connect(noteGain);
          noteGain.connect(ctx.destination);
          const noteTime = now + i * 0.09;
          noteOsc.frequency.setValueAtTime(freq, noteTime);
          noteGain.gain.setValueAtTime(0.12, noteTime);
          noteGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);
          noteOsc.start(noteTime);
          noteOsc.stop(noteTime + 0.4);
        });
      } else if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch (e) {
      console.warn("Audio playback notice:", e);
    }
  };

  useEffect(() => {
    if (!isPlaying) return;

    let timeoutId: any;

    if (phase === 'countdown') {
      timeoutId = setTimeout(() => {
        setPhase('searching');
        setTimerSeconds(10);
        setP1Score(45);
        setP2Score(50);
      }, 1800);
    } else if (phase === 'searching') {
      timeoutId = setTimeout(() => {
        setPhase('target');
        playSoundEffect('tick');
      }, 1500);
    } else if (phase === 'target') {
      const interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 4) {
            clearInterval(interval);
            setPhase('match');
            setP2Score(99);
            playSoundEffect('ding');
            return 3;
          }
          playSoundEffect('tick');
          setP1Score(Math.floor(70 + Math.random() * 15));
          setP2Score(Math.floor(80 + Math.random() * 18));
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else if (phase === 'match') {
      timeoutId = setTimeout(() => {
        setPhase('celebration');
        setWinner('P2');
        playSoundEffect('win');
      }, 1200);
    } else if (phase === 'celebration') {
      timeoutId = setTimeout(() => {
        setPhase('countdown');
        setWinner(null);
        setTimerSeconds(10);
      }, 5500);
    }

    return () => clearTimeout(timeoutId);
  }, [phase, isPlaying, soundEnabled]);

  const handleRestart = () => {
    playSoundEffect('click');
    setPhase('target');
    setWinner(null);
    setTimerSeconds(8);
    setP1Score(75);
    setP2Score(92);
  };

  const handleSelectExpression = (expr: 'WINK' | 'SMILE' | 'SURPRISE' | 'SHOCK') => {
    playSoundEffect('click');
    setTargetExpression(expr);
    setPhase('target');
    setWinner(null);
    setTimerSeconds(8);
  };

  const handleSimulateWin = (selectedWinner: 'P1' | 'P2') => {
    playSoundEffect('win');
    setWinner(selectedWinner);
    if (selectedWinner === 'P2') {
      setP2Score(99);
      setP1Score(65);
    } else {
      setP1Score(99);
      setP2Score(68);
    }
    setPhase('celebration');
  };

  return (
    <div className="w-full max-w-5xl mx-auto rounded-2xl sm:rounded-3xl bg-gradient-to-b from-zinc-900/95 via-purple-950/40 to-black/95 border border-purple-500/30 p-2.5 sm:p-5 shadow-[0_0_50px_rgba(139,92,246,0.18)] backdrop-blur-2xl relative overflow-hidden">
      {/* Decorative ambient glows */}
      <div className="absolute -top-32 -left-32 w-64 sm:w-80 h-64 sm:h-80 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-64 sm:w-80 h-64 sm:h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* ── Top Simulation Status Bar (Mobile-Responsive Header) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/10 relative z-10">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE ARENA MATCH</span>
          </div>

          <div className="flex items-center gap-1 bg-amber-400/15 border border-amber-400/30 px-2.5 py-1 rounded-full text-amber-300 text-[11px] sm:text-xs font-extrabold shadow-sm">
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Pot: {potAmount}</span>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
          <span className="text-[11px] text-zinc-400 font-mono hidden md:inline">
            Referee: <strong className="text-purple-300 font-sans">Gemini AI (12ms)</strong>
          </span>

          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
            {/* Sound Toggle */}
            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playSoundEffect('click');
              }}
              className={`p-1.5 rounded-xl border transition-colors flex items-center gap-1 text-[11px] cursor-pointer ${
                soundEnabled
                  ? 'bg-purple-600/30 border-purple-400 text-purple-300'
                  : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-white'
              }`}
              title={soundEnabled ? "Mute audio" : "Enable sound FX"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden xs:inline">{soundEnabled ? "Sound On" : "Muted"}</span>
            </button>

            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition-colors cursor-pointer"
              title={isPlaying ? "Pause simulation" : "Resume simulation"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            {/* Restart */}
            <button
              onClick={handleRestart}
              className="p-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition-colors cursor-pointer"
              title="Restart round"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Interactive Target Expression Picker Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs relative z-10 border-b border-white/5">
        <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span>Expression Target:</span>
        </span>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {expressionsList.map((expr) => (
            <button
              key={expr}
              onClick={() => handleSelectExpression(expr)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                targetExpression === expr
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {expressionEmojis[expr]} {expr}
            </button>
          ))}
        </div>
      </div>

      {/* ── Mobile-Optimized Center Target Banner (Displays above dual cards on mobile) ── */}
      <div className="block md:hidden my-2">
        <div className="bg-black/90 border border-purple-500/40 rounded-xl p-2.5 flex items-center justify-between gap-2 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-pink-400 animate-pulse" />
            <div>
              <div className="text-[9px] font-black uppercase text-pink-400 tracking-wider">ROUND TARGET</div>
              <div className="text-xs font-black text-amber-300">
                {targetExpression} {expressionEmojis[targetExpression]}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
            <span className="text-cyan-400 text-[10px]">TIMER:</span>
            <span className={`px-2 py-0.5 rounded text-xs ${timerSeconds <= 3 ? 'bg-red-500/30 text-red-300 animate-ping' : 'bg-white/10 text-white'}`}>
              {timerSeconds}s
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Dual Player Arena Stage (Grid adapts fluidly: 1 col on mobile, 2 col on md+) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4 relative my-2 sm:my-3">
        {/* Desktop-only Center HUD Floating Badge */}
        <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex-col items-center">
          <div className="bg-black/90 border border-purple-500/60 shadow-[0_0_30px_rgba(168,85,247,0.4)] rounded-2xl px-4 py-2 flex flex-col items-center gap-1 backdrop-blur-xl animate-bounce-subtle">
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-pink-400 animate-pulse" />
              <span className="text-[10px] sm:text-xs font-black tracking-widest uppercase text-pink-400">
                ROUND TARGET
              </span>
            </div>

            <div className="text-sm sm:text-base font-black text-amber-300 flex items-center gap-1.5 font-sans">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>{targetExpression} {expressionEmojis[targetExpression]}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-300 font-bold">
              <span className="text-cyan-400">TIMER:</span>
              <span className={`px-1.5 py-0.2 rounded ${timerSeconds <= 3 ? 'bg-red-500/30 text-red-300 animate-ping' : 'bg-white/10 text-white'}`}>
                {timerSeconds}s
              </span>
            </div>
          </div>
        </div>

        {/* ── PLAYER 1 (King of the Hill - Defending Champion) ── */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-cyan-500/50 bg-zinc-950 aspect-[4/3] sm:aspect-video group shadow-[0_0_25px_rgba(6,182,212,0.3)]">
          {/* Looping Handheld Camera Motion Feed */}
          <div className="w-full h-full overflow-hidden">
            <img
              src={phase === 'celebration' && winner === 'P2' ? '/simulation/p1_reaction.jpg' : '/simulation/p1_focus.jpg'}
              alt="Player 1 Live Camera Stream"
              className="w-full h-full object-cover select-none animate-video-loop transition-transform duration-700"
            />
          </div>

          {/* Cyber HUD Viewfinder Frame Brackets */}
          <div className="absolute inset-2 border border-cyan-400/30 rounded-xl pointer-events-none">
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />
          </div>

          {/* Futuristic Cyber Stream HUD Overlay */}
          <div className="absolute inset-0 pointer-events-none p-2.5 sm:p-4 flex flex-col justify-between">
            {/* Top Row: Streamer Tag & Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-cyan-500/40 text-[10px] sm:text-[11px] font-bold text-cyan-300 shadow-md">
                <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate max-w-[100px] sm:max-w-[130px]">Alex_King (3 Wins)</span>
              </div>
              <div className="flex items-center gap-1 bg-black/70 px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-mono text-cyan-400 border border-cyan-500/30 shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="font-extrabold">LIVE 25K</span>
              </div>
            </div>

            {/* AI Biometric Face Tracking Scanner Grid Effect */}
            {(phase === 'searching' || phase === 'target' || phase === 'match') && (
              <div className="absolute inset-x-6 sm:inset-x-12 inset-y-6 sm:inset-y-10 pointer-events-none">
                {/* SVG Biometric Face Mesh Wireframe Overlay */}
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible opacity-80">
                  {/* Outer Bounding Box */}
                  <rect x="15" y="15" width="70" height="70" rx="8" fill="none" stroke="#06B6D4" strokeWidth="0.8" strokeDasharray="3 2" />
                  
                  {/* Facial Landmark Tracking Line Connections */}
                  <path d="M 35 38 L 45 38 M 55 38 L 65 38" stroke="#06B6D4" strokeWidth="1" strokeLinecap="round" />
                  <path d="M 50 35 L 50 55 M 42 55 L 58 55" stroke="#06B6D4" strokeWidth="1" />
                  <path d="M 38 68 C 45 74, 55 74, 62 68" fill="none" stroke="#06B6D4" strokeWidth="1" />

                  {/* Pulsing Landmark Points */}
                  <circle cx="35" cy="38" r="1.5" fill="#38BDF8" className="animate-mesh-pulse" />
                  <circle cx="65" cy="38" r="1.5" fill="#38BDF8" className="animate-mesh-pulse" />
                  <circle cx="50" cy="50" r="1.5" fill="#34D399" className="animate-ping" />
                  <circle cx="50" cy="68" r="1.5" fill="#38BDF8" className="animate-mesh-pulse" />
                </svg>

                {/* Vertical Laser Scan Beam */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan shadow-[0_0_8px_#06b6d4]" />
                <span className="absolute top-1 left-1 text-[7px] sm:text-[8px] font-mono text-cyan-300 font-extrabold bg-black/60 px-1 rounded">FACE_ID: #4092</span>
                <span className="absolute bottom-1 right-1 text-[7px] sm:text-[8px] font-mono text-cyan-300 font-extrabold bg-black/60 px-1 rounded">14ms BIOMETRIC</span>
              </div>
            )}

            {/* Reaction Text Banner in Celebration */}
            {phase === 'celebration' && winner === 'P2' && (
              <div className="absolute inset-x-3 sm:inset-x-4 top-1/4 bg-black/90 border border-red-500/60 p-2 sm:p-2.5 rounded-xl text-center backdrop-blur-md animate-fade-in shadow-xl">
                <div className="text-red-400 text-xs sm:text-sm font-black uppercase tracking-wider">
                  ROUND LOST • TRY AGAIN!
                </div>
                <div className="text-[10px] text-zinc-300 font-medium italic mt-0.5">
                  &ldquo;Whoa! Where did that reaction come from?!&rdquo;
                </div>
              </div>
            )}

            {/* Bottom Row: Expression Confidence Meter */}
            <div className="flex items-center justify-between bg-black/80 backdrop-blur-md px-2.5 py-1 sm:py-1.5 rounded-xl border border-white/10 text-xs shadow-md">
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-zinc-300">
                <span className="text-zinc-400">Accuracy:</span>
                <span className="font-mono font-extrabold text-cyan-300">{p1Score}%</span>
              </div>
              <div className="w-20 sm:w-28 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${p1Score}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── PLAYER 2 (Challenger - Winner with Fireworks) ── */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-pink-500/50 bg-zinc-950 aspect-[4/3] sm:aspect-video group shadow-[0_0_25px_rgba(236,72,153,0.3)]">
          {/* Looping Handheld Camera Motion Feed */}
          <div className="w-full h-full overflow-hidden">
            <img
              src={phase === 'celebration' && winner === 'P2' ? '/simulation/p2_win.jpg' : '/simulation/p2_focus.jpg'}
              alt="Player 2 Live Camera Stream"
              className="w-full h-full object-cover select-none animate-video-loop transition-transform duration-700"
            />
          </div>

          {/* Cyber HUD Viewfinder Frame Brackets */}
          <div className="absolute inset-2 border border-pink-400/30 rounded-xl pointer-events-none">
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-pink-400" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-pink-400" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-pink-400" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-pink-400" />
          </div>

          {/* Futuristic Cyber Stream HUD Overlay */}
          <div className="absolute inset-0 pointer-events-none p-2.5 sm:p-4 flex flex-col justify-between">
            {/* Top Row: Streamer Tag & Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-pink-500/40 text-[10px] sm:text-[11px] font-bold text-pink-300 shadow-md">
                <Sparkles className="w-3 h-3 text-pink-400 shrink-0" />
                <span className="truncate max-w-[100px] sm:max-w-[130px]">Elena_Challenger</span>
              </div>
              <div className="flex items-center gap-1 bg-black/70 px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-mono text-pink-400 border border-pink-500/30 shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
                <span className="font-extrabold">P2P VERIFIED</span>
              </div>
            </div>

            {/* AI Biometric Face Mesh Grid Overlay */}
            {(phase === 'searching' || phase === 'target' || phase === 'match') && (
              <div className="absolute inset-x-6 sm:inset-x-12 inset-y-6 sm:inset-y-10 pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible opacity-80">
                  <rect x="15" y="15" width="70" height="70" rx="8" fill="none" stroke="#EC4899" strokeWidth="0.8" strokeDasharray="3 2" />
                  <path d="M 35 38 L 45 38 M 55 38 L 65 38" stroke="#EC4899" strokeWidth="1" strokeLinecap="round" />
                  <path d="M 50 35 L 50 55 M 42 55 L 58 55" stroke="#EC4899" strokeWidth="1" />
                  <path d="M 38 68 C 45 74, 55 74, 62 68" fill="none" stroke="#EC4899" strokeWidth="1" />
                  <circle cx="35" cy="38" r="1.5" fill="#F472B6" className="animate-mesh-pulse" />
                  <circle cx="65" cy="38" r="1.5" fill="#F472B6" className="animate-mesh-pulse" />
                  <circle cx="50" cy="50" r="1.5" fill="#34D399" className="animate-ping" />
                  <circle cx="50" cy="68" r="1.5" fill="#F472B6" className="animate-mesh-pulse" />
                </svg>
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-pink-400 to-transparent animate-scan shadow-[0_0_8px_#ec4899]" />
                <span className="absolute top-1 left-1 text-[7px] sm:text-[8px] font-mono text-pink-300 font-extrabold bg-black/60 px-1 rounded">TRACKING_OK</span>
                <span className="absolute bottom-1 right-1 text-[7px] sm:text-[8px] font-mono text-pink-300 font-extrabold bg-black/60 px-1 rounded">100% MATCH</span>
              </div>
            )}

            {/* Target Match Neon Flash */}
            {(phase === 'match' || phase === 'celebration') && winner === 'P2' && (
              <div className="absolute inset-0 bg-emerald-500/10 border-2 border-emerald-400/80 animate-pulse rounded-2xl pointer-events-none" />
            )}

            {/* Victory Celebration Graphic */}
            {phase === 'celebration' && winner === 'P2' && (
              <div className="absolute inset-x-3 sm:inset-x-4 top-1/5 bg-black/90 border-2 border-amber-400/80 p-2 sm:p-3 rounded-2xl text-center backdrop-blur-xl shadow-[0_0_40px_rgba(251,191,36,0.5)] animate-scale-up">
                <div className="flex items-center justify-center gap-1 text-emerald-400 text-[9px] sm:text-xs font-mono font-black tracking-widest uppercase">
                  <ShieldCheck className="w-3 h-3" />
                  <span>AI VERIFIED MATCH DETECTED</span>
                </div>
                <div className="text-sm sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 tracking-tight mt-0.5">
                  WINNER: $5,000 POT PRIZE!
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-0.5 text-[9px] sm:text-[11px] text-amber-200 font-bold">
                  <span>💰 Payout Credited</span>
                  <span>·</span>
                  <span>👑 New Defending King</span>
                </div>
              </div>
            )}

            {/* Bottom Row: Expression Confidence Meter */}
            <div className="flex items-center justify-between bg-black/80 backdrop-blur-md px-2.5 py-1 sm:py-1.5 rounded-xl border border-white/10 text-xs shadow-md">
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-zinc-300">
                <span className="text-zinc-400">Accuracy:</span>
                <span className="font-mono font-extrabold text-pink-300">{p2Score}%</span>
              </div>
              <div className="w-20 sm:w-28 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-pink-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${p2Score}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Interactive Simulation Controls Bar ── */}
      <div className="mt-2.5 sm:mt-4 pt-2.5 sm:pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5 relative z-10">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-400 font-bold hidden sm:inline">Simulate:</span>
          <button
            onClick={() => handleSimulateWin('P2')}
            className="px-2.5 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 text-[11px] font-bold transition cursor-pointer"
          >
            ⚡ Trigger P2 Win
          </button>
          <button
            onClick={() => handleSimulateWin('P1')}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition cursor-pointer"
          >
            ⚡ Trigger P1 Win
          </button>
        </div>

        <button
          onClick={onEnterArena}
          className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 hover:from-pink-600 hover:to-cyan-600 text-white font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <Swords className="w-4 h-4" />
          <span>Enter Live Arena Now &rarr;</span>
        </button>
      </div>
    </div>
  );
};
