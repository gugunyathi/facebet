import React, { useState, useEffect } from "react";
import { pay } from "@base-org/account";
import { P2PArena } from "@/components/P2PArena";
import { VideoProvider, API_URL } from "@/utils/constants";
import usePeer from "@/utils/usePeer";
import { DuelModule } from "@/components/DuelModule";

const TREASURY_ADDRESS = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";

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
  // By default match human users in P2P arena
  const [arenaMode, setArenaMode] = useState<"boss" | "p2p">("p2p");
  const [isPaying, setIsPaying] = useState(false);
  const [payMessage, setPayMessage] = useState<string | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<any>(null);

  // Sync WebSocket P2P challenge notifications
  useEffect(() => {
    if (values?.p2pChallengeNotification) {
      setActiveChallenge(values.p2pChallengeNotification);
    }
  }, [values?.p2pChallengeNotification]);

  // Periodic polling for waiting human duel challenges (backup for WebSocket)
  useEffect(() => {
    const checkActiveChallenges = async () => {
      try {
        const res = await fetch(`${API_URL}/api/duel/active-challenges`);
        const data = await res.json();
        if (data.success && data.waitingCount > 0) {
          const myPeer = userSession?.peerId || values?.myPeerId;
          const otherChallenge = data.waitingRooms.find((r: any) => r.player1PeerId !== myPeer);
          if (otherChallenge) {
            setActiveChallenge(otherChallenge);
          }
        }
      } catch {}
    };

    const interval = setInterval(checkActiveChallenges, 3500);
    checkActiveChallenges();
    return () => clearInterval(interval);
  }, [userSession, values?.myPeerId]);

  const handleBasePay = async () => {
    setIsPaying(true);
    setPayMessage(null);
    try {
      const isTestnet = typeof localStorage !== "undefined" && localStorage.getItem("facebet_base_testnet") === "true";
      const recipient = userSession?.walletAddress || TREASURY_ADDRESS;

      // Execute @base-org/account pay function for $1.00 USDC on Base
      const payment = await pay({
        amount: "1.00",
        to: recipient,
        testnet: isTestnet,
      });

      const txHash = payment.id || `0x_base_pay_${Date.now()}`;

      const response = await fetch(`${API_URL}/api/buy-tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userSession?.peerId || 'guest_peer',
          walletAddress: recipient,
          network: 'base',
          txHash,
          timestamp: new Date().toISOString()
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        const currentTickets = userSession?.availableTickets || 0;
        const updatedTotal = currentTickets + 10;
        setPayMessage("🎟️ +10 Tickets Credited!");
        if (onBuyTicketsSuccess) {
          onBuyTicketsSuccess(updatedTotal);
        }
      } else {
        throw new Error(data.error || "Failed to confirm ticket purchase on backend.");
      }
    } catch (err: any) {
      console.error("Base Pay ticket purchase error:", err);
      setPayMessage(err.message || "Payment cancelled");
    } finally {
      setIsPaying(false);
      setTimeout(() => setPayMessage(null), 4000);
    }
  };

  return (
    <VideoProvider.Provider value={values}>
      <div className="w-full h-full flex flex-col relative overflow-y-auto">
        {/* Arena Mode Switcher Bar & Base Pay Ticket Control */}
        <div className="w-full bg-[#110c38] border-b border-[#644af1]/30 p-1.5 sm:p-2 flex items-center justify-between gap-1.5 sm:gap-2 z-10 shrink-0 px-2 sm:px-6 overflow-x-auto whitespace-nowrap">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setArenaMode("boss")}
              className={`px-2 sm:px-3 py-1 rounded-lg font-extrabold text-[11px] sm:text-xs transition flex items-center gap-1 shrink-0 ${arenaMode === "boss"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow border border-purple-400/50"
                  : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                }`}
            >
              <span>🔮</span>
              <span>P2AI</span>
            </button>

            <button
              onClick={() => setArenaMode("p2p")}
              className={`px-2 sm:px-3 py-1 rounded-lg font-extrabold text-[11px] sm:text-xs transition flex items-center gap-1 shrink-0 ${arenaMode === "p2p"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow"
                  : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                }`}
            >
              <span>⚔️</span>
              <span>P2P</span>
            </button>
          </div>

          {/* Quick Base USDC Ticket Purchase Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {payMessage && (
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 animate-pulse">
                {payMessage}
              </span>
            )}
            <button
              onClick={handleBasePay}
              disabled={isPaying}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 rounded-lg shadow border border-blue-400/40 transition active:scale-95 disabled:opacity-50 flex items-center gap-1 shrink-0"
            >
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-300 animate-ping"></span>
              <span>
                {isPaying ? "Opening..." : "🔵 Base Pay ($1)"}
              </span>
            </button>
          </div>
        </div>

        {/* Human Challenger Waiting Banner (alerts users in P2PAI mode to switch immediately to P2P Arena) */}
        {activeChallenge && (
          <div className="w-full bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white p-2.5 px-4 flex flex-wrap items-center justify-between gap-2 shadow-2xl animate-pulse border-b-2 border-amber-300 z-20">
            <div className="flex items-center gap-2 text-xs font-extrabold">
              <span className="text-base animate-bounce">⚔️</span>
              <span>REAL PLAYER CHALLENGER ONLINE! A live player ({activeChallenge.player1Wallet?.slice(0, 8) || activeChallenge.challengerPeerId?.slice(0, 8)}...) is requesting a $0.20 P2P Duel!</span>
            </div>
            <button
              onClick={() => {
                setArenaMode("p2p");
                setActiveChallenge(null);
                values?.clearChallengeNotification?.();
              }}
              className="bg-amber-300 hover:bg-amber-200 text-black font-black text-xs px-3.5 py-1.5 rounded-lg shadow-lg uppercase tracking-wider transition transform active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>⚡ Switch to P2P Arena & Accept Duel</span>
            </button>
          </div>
        )}

        {/* Content View */}
        <div className="flex-1 w-full p-2 sm:p-4">
          {arenaMode === "boss" ? (
            <div className="max-w-4xl mx-auto w-full">
              <DuelModule
                userSession={userSession}
                onRequireAuth={onRequireAuth}
                onBuyTickets={handleBasePay}
              />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full">
              <P2PArena
                userSession={userSession}
                onRequireAuth={onRequireAuth}
                onBuyTickets={handleBasePay}
              />
            </div>
          )}
        </div>
      </div>
    </VideoProvider.Provider>
  );
};

export default Main;

