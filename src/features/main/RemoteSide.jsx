import React, { useContext } from "react";
import { useSelector } from "react-redux";
import { Side } from "@/layouts/Side";
import { WelcomeOverlay } from "./components/WelcomeOverlay";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { RemoteVideoOverlay } from "./components/RemoteVideoOverlay";
import { VideoProvider } from "@/utils/constants";

export const RemoteSide = () => {
  const started = useSelector((state) => state.main.started);
  const loading = useSelector((state) => state.main.loading);
  const waiting = useSelector((state) => state.main.waitingForMatch);
  // Use remoteMediaStream (state) instead of remoteStream (ref) — triggers re-render when stream arrives
  const { remoteStream, remoteMediaStream } = useContext(VideoProvider);

  function renderOverlay() {
    if (loading) {
      return <LoadingOverlay />;
    }

    if (waiting) {
      return <LoadingOverlay message="Waiting for a match..." />;
    }

    if (!started) {
      return <WelcomeOverlay />;
    }

    return <RemoteVideoOverlay />;
  }

  return (
    <Side videoRef={remoteStream} stream={remoteMediaStream} isLocal={false}>
      {renderOverlay()}
    </Side>
  );
};
