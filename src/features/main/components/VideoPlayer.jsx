import React, { useEffect, useRef } from "react";

export const VideoPlayer = ({ isLocal = true, videoRef, stream = null, ...props }) => {
  const internalRef = useRef(null);
  const refToUse = videoRef || internalRef;
  const isPlayingRef = useRef(false);

  useEffect(() => {
    const el = refToUse.current;
    if (!el) return;

    if (isLocal) {
      el.muted = true;
      el.volume = 0;
    }
    el.autoplay = true;
    el.playsInline = true;

    if (stream && el.srcObject !== stream) {
      el.srcObject = stream;
    }

    const safePlayVideo = async () => {
      if (!el || isPlayingRef.current) return;
      try {
        isPlayingRef.current = true;
        if (el.paused) {
          await el.play();
        }
      } catch (err) {
        if (err.name !== "AbortError" && err.name !== "NotAllowedError") {
          console.warn("Video stream play notice:", err.message);
        }
      } finally {
        isPlayingRef.current = false;
      }
    };

    safePlayVideo();

    el.addEventListener("loadedmetadata", safePlayVideo);
    el.addEventListener("canplay", safePlayVideo);

    return () => {
      el.removeEventListener("loadedmetadata", safePlayVideo);
      el.removeEventListener("canplay", safePlayVideo);
    };
  }, [refToUse, isLocal, stream]);

  return (
    <video
      id={isLocal ? "local-video" : "remote-video"}
      autoPlay
      playsInline
      muted={isLocal}
      ref={refToUse}
      className={
        "w-full h-full object-cover absolute top-0 left-0 " +
        (isLocal ? "bg-[#07012c]" : "bg-[#644af1]") +
        (isLocal ? " transform scale-x-[-1]" : "")
      }
      {...props}
    />
  );
};
