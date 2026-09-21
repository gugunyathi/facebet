import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

const PRESET_TRENDS = [
  "Target a high-contrast 1980s Y2K Cyberpunk aesthetic with holographic facial alignment.",
  "Neon Synthwave Glitch: Intense energetic grin with ambient purple background luminescence.",
  "Retro Pixel Matrix: Calm stoic gaze framed by cyan neon geometric lighting.",
  "Solarpunk Cyber-Symmetry: Broad confident smile with warm golden-hour facial highlights.",
  "Vaporwave Memory Core: Mysterious side-profile expression with soft pastel gradient shadows."
];

let presetIndex = 0;

export let currentGlobalAITrend = PRESET_TRENDS[0];

export async function startCompositeCronScheduler() {
  console.log("⏱️ AI Composite 30-minute generation schedule initialized.");
  
  // Fire instantly on server startup
  await refreshAIEvaluationTrend();

  // Run automatically every 30 minutes
  setInterval(async () => {
    await refreshAIEvaluationTrend();
  }, 30 * 60 * 1000);
}

async function refreshAIEvaluationTrend() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is missing. Cycling preset AI evaluation trend.");
      presetIndex = (presetIndex + 1) % PRESET_TRENDS.length;
      currentGlobalAITrend = PRESET_TRENDS[presetIndex];
      return;
    }

    // Simulated prediction market and news narrative context injection
    const newsContext = "Hyper-volatile trading day. Memetic internet trends leaning heavily into retro-futurism and hyper-expressive shock humor.";

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are the core trend-setter machine for 'Lottery Live'. Based on this external live market context: "${newsContext}", synthesize a highly specific, composite visual facial puzzle target for the next 30 minutes. 
      Output exactly one highly descriptive sentence naming a concrete aesthetic style, required micro-expression details, clothing features, or background color tones. Do not wrap in markdown or JSON codeblocks.`
    });

    if (response.text) {
      currentGlobalAITrend = response.text.trim();
      console.log(`🤖 NEW 30-MINUTE AI COMPOSITE TARGET DEPLOYED: "${currentGlobalAITrend}"`);
    }
  } catch (error: any) {
    const errorMsg = typeof error?.message === 'string' ? error.message : JSON.stringify(error || '');
    const isTransientOrQuotaError = 
      error?.status === "RESOURCE_EXHAUSTED" || 
      error?.status === "UNAVAILABLE" || 
      error?.status === 503 || 
      error?.status === 429 ||
      errorMsg.includes("429") || 
      errorMsg.includes("503") || 
      errorMsg.includes("quota") || 
      errorMsg.includes("high demand") || 
      errorMsg.includes("UNAVAILABLE");

    if (isTransientOrQuotaError) {
      console.warn("Gemini API high demand or quota threshold reached for trend generation. Cycling preset trend profile.");
    } else {
      console.error("Failed to generate 30-minute composite context target:", errorMsg);
    }
    
    presetIndex = (presetIndex + 1) % PRESET_TRENDS.length;
    currentGlobalAITrend = PRESET_TRENDS[presetIndex];
    console.log(`🤖 PRESET 30-MINUTE AI COMPOSITE TARGET DEPLOYED: "${currentGlobalAITrend}"`);
  }
}

