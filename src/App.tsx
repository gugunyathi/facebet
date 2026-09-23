import React, { useState } from "react";
import Main from "./features/main/index";
import { AppLayout } from "./layouts/AppLayout";
import { UserSessionData } from "./components/WalletAuth";
import { BurgerMenu } from "./components/BurgerMenu";
import { AboutPage } from "./pages/AboutPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TimelinePage } from "./pages/TimelinePage";
import { WalletConnectModal } from "./components/WalletConnectModal";
import { TrendTicker } from "./components/TrendTicker";
import {
  MdConfirmationNumber,
  MdVisibility,
  MdStars,
  MdGeneratingTokens,
  MdAccountBalanceWallet,
  MdLogout,
} from "react-icons/md";

export function App() {
  const [userSession, setUserSession] = useState<UserSessionData | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("facebet_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [activePage, setActivePage] = useState<"arena" | "about" | "settings" | "timeline">("arena");
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const handleAuthSuccess = (session: UserSessionData) => {
    setUserSession(session);
    try {
      localStorage.setItem("facebet_session", JSON.stringify(session));
    } catch (e) {
      console.warn("Could not save session to localStorage:", e);
    }
    setActivePage("arena");
  };

  const handleBuyTickets = (newTickets: number) => {
    if (userSession) {
      const updated = {
        ...userSession,
        availableTickets: newTickets,
      };
      setUserSession(updated);
      try {
        localStorage.setItem("facebet_session", JSON.stringify(updated));
      } catch (e) {
        console.warn("Could not update session tickets in localStorage:", e);
      }
    }
  };

  const handleLogout = () => {
    setUserSession(null);
    try {
      localStorage.removeItem("facebet_session");
    } catch (e) {
      console.warn("Could not clear session from localStorage:", e);
    }
    // Disconnect injected wallet provider if available
    if (typeof window !== "undefined" && (window as any).ethereum?.disconnect) {
      try {
        (window as any).ethereum.disconnect();
      } catch {}
    }
  };

  return (
    <AppLayout>
      <div className="w-full h-full flex flex-col bg-[#07012c] text-white font-sans overflow-hidden">
        {/* Top Header Navigation */}
        <header className="w-full bg-[#110c38]/95 border-b border-[#644af1]/30 px-2 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between shrink-0 shadow-lg z-20 gap-1.5 sm:gap-3">
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 min-w-0">
            {/* Top Left Burger Menu */}
            <BurgerMenu
              activePage={activePage}
              onSelectPage={setActivePage}
              userSession={userSession}
              onLogout={handleLogout}
            />

            <div className="flex items-center space-x-1.5 sm:space-x-2.5 cursor-pointer min-w-0" onClick={() => setActivePage("arena")}>
              <div className="p-1.5 sm:p-2 bg-gradient-to-tr from-yellow-400 via-amber-500 to-purple-600 rounded-xl shadow-md shrink-0">
                <MdStars className="w-4 h-4 sm:w-6 sm:h-6 text-black" />
              </div>
              <div className="min-w-0">
                <h1 className="font-extrabold text-xs sm:text-lg md:text-xl tracking-wide bg-gradient-to-r from-yellow-300 via-amber-400 to-purple-400 bg-clip-text text-transparent truncate">
                  FACE BET
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-300 font-medium hidden md:block">
                  Hybrid Web3 Game • Base & ARC Networks
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            {/* Live Pool Banner */}
            <div className="hidden lg:flex items-center space-x-2 bg-purple-900/40 border border-purple-500/30 px-3 py-1.5 rounded-xl">
              <MdGeneratingTokens className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs text-gray-300">Lottery Pool:</span>
              <span className="text-xs font-bold text-amber-300">$1 = 10 Tickets</span>
            </div>

            {/* Mode Badge */}
            {userSession ? (
              <div className="flex items-center space-x-1 sm:space-x-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span className="capitalize hidden sm:inline">{userSession.network} Player</span>
                <span className="capitalize sm:hidden">{userSession.network}</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center space-x-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2.5 py-1.5 rounded-full text-xs font-bold">
                <MdVisibility className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden md:inline">Spectator Mode</span>
                <span className="md:hidden">Spectator</span>
              </div>
            )}

            {/* Wallet Connect / Tickets Button + Disconnect */}
            {userSession ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsWalletModalOpen(true)}
                  className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-500 hover:to-yellow-600 text-black font-extrabold text-[11px] sm:text-sm px-2.5 sm:px-3.5 py-1.5 rounded-xl shadow-lg transition flex items-center space-x-1 sm:space-x-1.5 transform active:scale-95"
                >
                  <MdConfirmationNumber className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black shrink-0" />
                  <span>{userSession.availableTickets} Tix</span>
                </button>
                <button
                  onClick={handleLogout}
                  title="Disconnect Wallet"
                  className="bg-red-600/80 hover:bg-red-500 text-white font-extrabold text-[11px] sm:text-sm px-2 sm:px-2.5 py-1.5 rounded-xl shadow-lg transition flex items-center gap-1 transform active:scale-95 border border-red-400/40"
                >
                  <MdLogout className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="hidden sm:inline">Disconnect</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-500 hover:to-yellow-600 text-black font-extrabold text-[11px] sm:text-sm px-2.5 sm:px-3.5 py-1.5 rounded-xl shadow-lg transition flex items-center space-x-1 sm:space-x-1.5 transform active:scale-95"
              >
                <MdAccountBalanceWallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black shrink-0" />
                <span>Connect</span>
              </button>
            )}
          </div>
        </header>

        {/* Global Trend Ticker Widget */}
        <TrendTicker />

        {/* Main Content Area */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          {activePage === "arena" && (
            <Main
              userSession={userSession}
              onRequireAuth={() => setIsWalletModalOpen(true)}
              onAuthSuccess={handleAuthSuccess}
              onBuyTicketsSuccess={handleBuyTickets}
            />
          )}

          {activePage === "about" && (
            <AboutPage
              peerId="arena-peer"
              userSession={userSession}
              onAuthSuccess={handleAuthSuccess}
              onBuyTicketsSuccess={handleBuyTickets}
              onGoToArena={() => setActivePage("arena")}
            />
          )}

          {activePage === "settings" && (
            <SettingsPage onGoToArena={() => setActivePage("arena")} />
          )}

          {activePage === "timeline" && (
            <TimelinePage onGoToArena={() => setActivePage("arena")} />
          )}
        </div>

        {/* Wallet Connection Modal */}
        <WalletConnectModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          userSession={userSession}
          onAuthSuccess={handleAuthSuccess}
          onBuyTicketsSuccess={handleBuyTickets}
        />
      </div>
    </AppLayout>
  );
}

export default App;
