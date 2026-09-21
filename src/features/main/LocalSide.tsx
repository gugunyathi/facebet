import React, { useContext } from "react";
import { useSelector } from "react-redux";
import ChatOverlay from "../messaging/index";
import { StartVideoChatOverlay } from "./components/StartVideoChatOverlay";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { VideoProvider } from "@/utils/constants";
import { Side } from "@/layouts/Side";
import { ErrorOverlay } from "./components/ErrorOverlay";

interface LocalSideProps {
  userSession?: any;
  onAuthSuccess?: (session: any) => void;
  onBuyTicketsSuccess?: (tickets: number) => void;
}

export const LocalSide: React.FC<LocalSideProps> = ({
  userSession,
  onAuthSuccess,
  onBuyTicketsSuccess,
}) => {
  const { localStream } = useContext(VideoProvider);
  const started = useSelector((state: any) => state.main.started);
  const loading = useSelector((state: any) => state.main.loading);
  const error = useSelector((state: any) => state.main.error);

  const renderOverlay = () => {
    if (error) {
      return <ErrorOverlay message={error} />;
    }

    if (loading) {
      return <LoadingOverlay />;
    }

    if (!started) {
      return (
        <StartVideoChatOverlay
          userSession={userSession}
          onAuthSuccess={onAuthSuccess}
          onBuyTicketsSuccess={onBuyTicketsSuccess}
        />
      );
    }

    return <ChatOverlay />;
  };

  return <Side videoRef={localStream}>{renderOverlay()}</Side>;
};
