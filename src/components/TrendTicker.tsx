import React, { useState, useEffect, useMemo } from 'react';

const DEFAULT_TREND = "A hyper-saturated 1980s cassette-futurism portrait capturing a cartoonishly exaggerated, wide-eyed shock expression with an unhinged jaw";
const DEFAULT_POT = "2,449.54";

// Helper function to extract 1, 2, or 3 word max keywords describing facial expression and mood
export function parseExpressionKeywords(fullTrendText: string): string[] {
  if (!fullTrendText) return ["WIDE-EYED SHOCK", "UNHINGED GRIN", "NEON GAZE", "CYBER SMILE"];

  const rawKeywords: string[] = [];

  // Expression patterns to prioritize
  const expressionPatterns = [
    /wide-eyed\s+shock/i,
    /unhinged\s+jaw/i,
    /intense\s+grin/i,
    /energetic\s+grin/i,
    /cartoonishly\s+exaggerated/i,
    /stoic\s+gaze/i,
    /broad\s+smile/i,
    /confident\s+smile/i,
    /side-profile\s+expression/i,
    /cyberpunk\s+aesthetic/i,
    /neon\s+glitch/i,
    /retro\s+pixel/i,
    /synthwave\s+glow/i,
    /cassette\s+futurism/i,
    /golden\s+highlights/i,
    /pastel\s+shadows/i
  ];

  for (const pattern of expressionPatterns) {
    const match = fullTrendText.match(pattern);
    if (match) {
      rawKeywords.push(match[0].toUpperCase());
    }
  }

  // Clean and split by delimiters
  const segments = fullTrendText
    .replace(/["'“”]/g, '')
    .split(/[:;,.]|\bwith\b|\band\b|\bcapturing\b|\btarget\b|\baesthetic\b|\bportrait\b/i);

  for (const segment of segments) {
    const cleaned = segment.trim();
    if (!cleaned) continue;

    const words = cleaned.split(/\s+/).filter(w => w.length > 1);
    if (words.length === 0) continue;

    if (words.length <= 3) {
      const phrase = words.join(" ").toUpperCase();
      if (phrase.length <= 22) {
        rawKeywords.push(phrase);
      }
    } else {
      for (let i = 0; i < words.length - 1; i += 2) {
        const chunk = words.slice(i, i + 3).join(" ").toUpperCase();
        const chunkWords = chunk.split(/\s+/);
        if (chunkWords.length <= 3 && chunk.length >= 3 && chunk.length <= 22) {
          rawKeywords.push(chunk);
        }
      }
    }
  }

  // Deduplicate and filter strictly to 1, 2, or 3 words max
  const filtered = Array.from(new Set(rawKeywords)).filter(kw => {
    const wordCount = kw.trim().split(/\s+/).length;
    return wordCount >= 1 && wordCount <= 3;
  });

  // Fallback defaults if fewer than 4 extracted
  const fallbacks = [
    "WIDE-EYED SHOCK",
    "UNHINGED GRIN",
    "NEON GAZE",
    "CYBER SMILE",
    "STOIC FOCUS",
    "HYPER GLITCH",
    "AURA SYNCED"
  ];

  for (const fallback of fallbacks) {
    if (filtered.length >= 6) break;
    if (!filtered.includes(fallback)) {
      filtered.push(fallback);
    }
  }

  return filtered;
}

export const TrendTicker: React.FC = () => {
  const [aiTrend, setAiTrend] = useState<string>(DEFAULT_TREND);
  const [rolloverPotUSD, setRolloverPotUSD] = useState<string>(DEFAULT_POT);
  const [loading, setLoading] = useState<boolean>(false);
  const [keywordIndex, setKeywordIndex] = useState<number>(0);
  const [isFading, setIsFading] = useState<boolean>(false);

  const keywords = useMemo(() => parseExpressionKeywords(aiTrend), [aiTrend]);

  const fetchLiveGameStates = async () => {
    try {
      const trendResponse = await fetch('/api/active-trend');
      if (trendResponse.ok) {
        const trendData = await trendResponse.json();
        if (trendData?.currentTrend) {
          setAiTrend(trendData.currentTrend);
        }
      }
    } catch {
      // Retain active/default trend gracefully
    }

    try {
      const statsResponse = await fetch('/api/game-stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData?.potUSD) {
          setRolloverPotUSD(statsData.potUSD);
        }
      }
    } catch {
      // Retain pot gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveGameStates();
    const updateInterval = setInterval(fetchLiveGameStates, 15000);
    return () => clearInterval(updateInterval);
  }, []);

  // Cycle keywords every 2.2 seconds like an AI Hologram Aura Scanner
  useEffect(() => {
    if (keywords.length === 0) return;

    const cycleInterval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setKeywordIndex((prev) => (prev + 1) % keywords.length);
        setIsFading(false);
      }, 200);
    }, 2200);

    return () => clearInterval(cycleInterval);
  }, [keywords]);

  const activeKeyword = keywords[keywordIndex % keywords.length] || "WIDE-EYED SHOCK";

  return (
    <div className="w-full bg-[#161b22] border-b-2 border-amber-500 px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-2 sm:gap-4 font-mono z-20 text-xs shrink-0 select-none">
      {/* Active Prize Pot Vault Metadata Tracking Display Counter */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-base sm:text-lg">🎰</span>
        <div>
          <div className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wider leading-none">Pot</div>
          <div className="text-xs sm:text-sm font-extrabold text-amber-400 leading-tight">
            ${loading ? "---" : rolloverPotUSD}
          </div>
        </div>
      </div>

      {/* Shifting Real-Time Generative Multimodal AI Expression Target Keywords (1-3 Words Max) */}
      <div className="flex-1 min-w-0 mx-1 sm:mx-3 flex items-center gap-1.5 sm:gap-2">
        <div className="text-[9px] sm:text-[10px] text-amber-400 font-extrabold uppercase tracking-wider hidden sm:flex items-center gap-1 shrink-0">
          <span>🔮</span>
          <span>TARGET MOOD:</span>
        </div>

        <div 
          className="relative overflow-hidden bg-[#0d1117] px-2.5 sm:px-3 py-1 rounded-lg border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)] flex items-center gap-2 max-w-full sm:max-w-md cursor-default"
          title={`Full Active AI Target: ${aiTrend}`}
        >
          {/* Animated Aura Scanner Indicator Pulse */}
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
          
          <span 
            className={`text-[11px] sm:text-xs font-black tracking-wider text-amber-300 font-mono uppercase whitespace-nowrap transition-all duration-200 ${
              isFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}
          >
            ✨ {activeKeyword}
          </span>

          <span className="text-[9px] text-purple-400 font-mono hidden md:inline ml-auto shrink-0 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-500/40">
            {keywordIndex + 1}/{keywords.length}
          </span>
        </div>
      </div>

      {/* Live System Operation Health Indicator Ticker */}
      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-sky-400 shrink-0">
        <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#238636] shrink-0 animate-pulse" />
        <span className="hidden xs:inline">AI JUDGE ACTIVE</span>
        <span className="xs:hidden">LIVE</span>
      </div>
    </div>
  );
};

export default TrendTicker;

