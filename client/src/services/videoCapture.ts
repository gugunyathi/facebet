export const capturePlayerFrame = (videoElementId: string): string | null => {
  const video = document.getElementById(videoElementId) as HTMLVideoElement;
  if (!video || video.paused || video.ended) return null;

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  
  // Split out the prefix to isolate raw base64 data stream segments
  const parts = dataUrl.split(',');
  return parts.length > 1 ? parts[1] : null;
};

export const submitFrameForEvaluation = async (peerId: string, base64Frame: string) => {
  try {
    const response = await fetch('/api/evaluate-frame', {
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
