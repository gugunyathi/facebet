import React, { useContext } from "react";
import { LuVideo } from "react-icons/lu";
import { VideoProvider } from "@/utils/constants";
import { useSelector } from "react-redux";
import { MdVisibility } from "react-icons/md";

interface StartVideoChatOverlayProps {
  userSession?: any;
  onAuthSuccess?: (session: any) => void;
  onBuyTicketsSuccess?: (tickets: number) => void;
}

export const StartVideoChatOverlay: React.FC<StartVideoChatOverlayProps> = ({
  userSession,
}) => {
  const { join, startSpectatorMode, startVideoStream } = useContext(VideoProvider);
  const onlineUsersCount = useSelector((state: any) => state.main.onlineUsersCount);

  const handleStartCamera = async () => {
    await join();
  };

  return (
    <div className="flex h-full items-center justify-center flex-col p-3 sm:p-4 w-full max-w-sm sm:max-w-md mx-auto text-center pointer-events-auto">
      <div className="bg-[#110c38]/90 border border-[#644af1]/50 p-4 sm:p-6 rounded-2xl shadow-2xl backdrop-blur-md space-y-3 sm:space-y-4 w-full">
        <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block">
          FACE BET Live Arena
        </span>

        <p className="text-gray-200 text-xs">
          {onlineUsersCount <= 1
            ? "Waiting for active players in arena..."
            : `${onlineUsersCount - 1} ${
                onlineUsersCount - 1 === 1 ? "player" : "players"
              } live in arena queue`}
        </p>

        <div className="space-y-2 pt-2">
          <button
            onClick={handleStartCamera}
            className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black text-xs py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition"
          >
            <LuVideo className="w-4 h-4" />
            <span>Enable Camera & Enter Queue</span>
          </button>

          <button
            onClick={startSpectatorMode}
            className="w-full bg-[#644af1] hover:bg-[#5239e0] text-white text-xs py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition"
          >
            <MdVisibility className="w-4 h-4 text-amber-300" />
            <span>Watch Live P2P Streams (Spectator)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
