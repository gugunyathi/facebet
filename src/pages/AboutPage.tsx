import React from "react";
import { WalletAuth, UserSessionData } from "@/components/WalletAuth";
import { MdStars, MdVideocam, MdHelpOutline, MdVisibility } from "react-icons/md";
import { useSelector } from "react-redux";

interface AboutPageProps {
  peerId?: string;
  userSession: UserSessionData | null;
  onAuthSuccess: (session: UserSessionData) => void;
  onBuyTicketsSuccess: (tickets: number) => void;
  onGoToArena: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  peerId = "spectator-peer",
  userSession,
  onAuthSuccess,
  onBuyTicketsSuccess,
  onGoToArena,
}) => {
  const onlineUsersCount = useSelector((state: any) => state.main?.onlineUsersCount || 0);

  return (
    <div className="w-full h-full overflow-y-auto bg-[#07012c] text-white p-4 sm:p-8 flex justify-center">
      <div className="max-w-2xl w-full space-y-6 pb-12">
        {/* Header Badge */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-tr from-yellow-400 via-amber-500 to-purple-600 rounded-2xl shadow-lg">
              <MdStars className="w-8 h-8 text-black" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
                face-to-face
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-yellow-300 via-amber-400 to-purple-300 bg-clip-text text-transparent">
                CHAIN GANG Arena
              </h1>
            </div>
          </div>

          <button
            onClick={onGoToArena}
            className="bg-[#644af1] hover:bg-[#5239e0] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg transition flex items-center space-x-2"
          >
            <MdVideocam className="w-4 h-4" />
            <span>Go to Split Video Arena</span>
          </button>
        </div>

        {/* Live Arena Status Card */}
        <div className="bg-[#110c38]/90 border border-[#644af1]/40 rounded-2xl p-5 shadow-xl">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
            Lottery Live Arena
          </div>
          <div className="text-lg font-bold text-amber-300 flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
            <span>
              {onlineUsersCount <= 1
                ? "Waiting for active players in arena..."
                : `${onlineUsersCount - 1} ${
                    onlineUsersCount - 1 === 1 ? "player" : "players"
                  } currently live in arena queue`}
            </span>
          </div>
        </div>

        {/* Lottery Live Web3 Auth Section */}
        <div className="bg-[#110c38]/90 border border-[#644af1]/40 rounded-2xl p-6 shadow-xl space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <MdHelpOutline className="text-purple-400" />
              <span>Lottery Live Web3 Auth</span>
            </h2>
            <p className="text-sm font-semibold text-amber-300 mt-1">
              Verify wallet to broadcast live and enter $1 = 10 ticket queue
            </p>
          </div>

          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/10">
            Sign in with your Web3 Wallet on Base or ARC Network. Authenticated players automatically receive 10 tickets ($1 value) and access to the live P2P video matching lobby.
          </p>

          {/* Interactive Web3 Auth Component */}
          <WalletAuth
            peerId={peerId}
            userSession={userSession}
            onAuthSuccess={onAuthSuccess}
            onBuyTicketsSuccess={onBuyTicketsSuccess}
          />

          <div className="pt-3 border-t border-white/10 text-center">
            <button
              onClick={onGoToArena}
              className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition"
            >
              <MdVisibility className="w-4 h-4 text-amber-400" />
              <span>Continue in Free Spectator Mode (Watch Live P2P Streams)</span>
            </button>
          </div>
        </div>

        {/* Informational Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="text-amber-400 font-bold text-sm mb-1">👀 Free Spectators</div>
            <p className="text-xs text-gray-300">
              No sign-in required! Watch active peer streams live in high definition without broadcasting your own webcam.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="text-emerald-400 font-bold text-sm mb-1">🎮 Verified Players</div>
            <p className="text-xs text-gray-300">
              Connect your Base or ARC wallet to broadcast your stream, match 1-on-1 face-to-face, and claim lottery pool entry tickets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
