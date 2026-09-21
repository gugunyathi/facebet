import React, { useState } from "react";
import { LocalSide } from "./LocalSide";
import { RemoteSide } from "./RemoteSide";
import { VideoProvider } from "@/utils/constants";
import usePeer from "@/utils/usePeer";
import { DuelModule } from "@/components/DuelModule";

interface MainProps {
  userSession?: any;
  onRequireAuth: () => void;
  onAuthSuccess: (session: any) => void;
  onBuyTicketsSuccess: (tickets: number) => void;
}

const Main: React.FC<MainProps> = ({
  userSession,
  onRequireAuth,
  onAuthSuccess,
  onBuyTicketsSuccess,
}) => {
  const values = usePeer();
  const [arenaMode, setArenaMode] = useState<"boss" | "p2p">("boss");

  return (
    <VideoProvider.Provider value={values}>
      <div className="w-full h-full flex flex-col relative overflow-y-auto">
        {/* Arena Mode Switcher Bar */}
        <div className="w-full bg-[#110c38] border-b border-[#644af1]/30 p-1.5 sm:p-2 flex items-center justify-center gap-2 z-10 shrink-0">
          <button
            onClick={() => setArenaMode("boss")}
            className={`px-2.5 sm:px-3 py-1 rounded-lg font-extrabold text-xs transition flex items-center gap-1.5 ${
              arenaMode === "boss"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow border border-purple-400/50"
                : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
            }`}
          >
            <span>🔮</span>
            <span>P2AI Arena</span>
          </button>

          <button
            onClick={() => setArenaMode("p2p")}
            className={`px-2.5 sm:px-3 py-1 rounded-lg font-extrabold text-xs transition flex items-center gap-1.5 ${
              arenaMode === "p2p"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow"
                : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
            }`}
          >
            <span>⚔️</span>
            <span>P2P Arena</span>
          </button>
        </div>

        {/* Content View */}
        <div className="flex-1 w-full p-2 sm:p-4">
          {arenaMode === "boss" ? (
            <div className="max-w-4xl mx-auto w-full">
              <DuelModule
                userSession={userSession}
                onRequireAuth={onRequireAuth}
                onBuyTickets={onRequireAuth}
              />
            </div>
          ) : (
            <div className="w-full h-full min-h-[500px] flex flex-col md:flex-row relative rounded-2xl overflow-hidden border border-[#644af1]/30">
              <RemoteSide />
              <LocalSide
                userSession={userSession}
                onAuthSuccess={onAuthSuccess}
                onBuyTicketsSuccess={onBuyTicketsSuccess}
              />
            </div>
          )}
        </div>
      </div>
    </VideoProvider.Provider>
  );
};

export default Main;

