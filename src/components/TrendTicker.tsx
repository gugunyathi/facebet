import React, { useState, useEffect, useMemo } from 'react';
import { API_URL } from '../utils/constants';

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
      const trendResponse = await fetch(`${API_URL}/api/active-trend`);
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
      const statsResponse = await fetch(`${API_URL}/api/game-stats`);
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

  return null;
};

export default TrendTicker;

