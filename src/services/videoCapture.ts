import { API_URL } from '../utils/constants';

let sharedCanvas: HTMLCanvasElement | null = null;

export const capturePlayerFrame = (videoElementId: string): string | null => {
  const video = document.getElementById(videoElementId) as HTMLVideoElement;
  if (!video || video.paused || video.ended || !video.videoWidth) return null;

  if (!sharedCanvas) {
    sharedCanvas = document.createElement('canvas');
  }

  // Downscale to 320x240 for high performance & minimal bandwidth
  const targetWidth = 320;
  const targetHeight = 240;

  if (sharedCanvas.width !== targetWidth || sharedCanvas.height !== targetHeight) {
    sharedCanvas.width = targetWidth;
    sharedCanvas.height = targetHeight;
  }

  const ctx = sharedCanvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
  // Compress at 0.55 quality JPEG for fast Gemini multi-modal evaluation
  const dataUrl = sharedCanvas.toDataURL('image/jpeg', 0.55);
  
  // Split out the prefix to isolate raw base64 data stream segments
  const parts = dataUrl.split(',');
  return parts.length > 1 ? parts[1] : null;
};

export const submitFrameForEvaluation = async (peerId: string, base64Frame: string) => {
  try {
    const response = await fetch(`${API_URL}/api/evaluate-frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId, frame: base64Frame })
    });
    return await response.json();
  } catch (error) {
    console.error("Failed to submit game frame for evaluation:", error);
    return { win: false, error: true, reason: "Network transmission error." };
  }
};
