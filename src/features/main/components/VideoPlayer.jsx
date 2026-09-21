import React, { useEffect, useRef } from "react";

export const VideoPlayer = ({ isLocal = true, videoRef, stream = null, ...props }) => {
  const internalRef = useRef(null);
  const refToUse = videoRef || internalRef;

  useEffect(() => {
    const el = refToUse.current;
    if (!el) return;

    // Explicitly set DOM properties required for browser autoplay policy
    if (isLocal) {
      el.muted = true;
      el.volume = 0;
    }
    el.autoplay = true;
    el.playsInline = true;

    if (stream && el.srcObject !== stream) {
      el.srcObject = stream;
    }

    const playVideo = () => {
      if (el.paused) {
        el.play?.().catch((err) => {
          console.warn("Autoplay interaction catch:", err);
        });
      }
    };

    playVideo();

    el.addEventListener("loadedmetadata", playVideo);
    el.addEventListener("canplay", playVideo);

    return () => {
      el.removeEventListener("loadedmetadata", playVideo);
      el.removeEventListener("canplay", playVideo);
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

