import React, { useState } from "react";
import Main from "./features/main/index";
import { AppLayout } from "./layouts/AppLayout";
import { UserSessionData } from "./components/WalletAuth";
import { BurgerMenu } from "./components/BurgerMenu";
import { AboutPage } from "./pages/AboutPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TimelinePage } from "./pages/TimelinePage";
import { WalletConnectModal } from "./components/WalletConnectModal";
import { ArcOnrampWidget } from "./components/ArcOnrampWidget";
import { ArcAppKitModal } from "./components/ArcAppKitModal";
import { TrendTicker } from "./components/TrendTicker";
import {
  MdConfirmationNumber,
  MdVisibility,
  MdStars,
  MdGeneratingTokens,
  MdAccountBalanceWallet,
  MdLogout,
  MdCreditCard,
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
  const [isArcOnrampOpen, setIsArcOnrampOpen] = useState(false);
  const [isArcAppKitOpen, setIsArcAppKitOpen] = useState(false);

  const [selectedChain, setSelectedChain] = useState<'base' | 'arc'>(() => {
    if (userSession?.network === 'arc') return 'arc';
    return 'base';
  });

  const [selectedEnv, setSelectedEnv] = useState<'mainnet' | 'testnet'>(() => {
    if (typeof localStorage !== "undefined" && localStorage.getItem("facebet_base_testnet") === "true") {
      return 'testnet';
    }
    return 'mainnet';
  });

  const [autoBattle, setAutoBattle] = useState<boolean>(true);

  // Global Camera Hardware & Solo Mirror state
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [p1DeviceId, setP1DeviceId] = useState<string>('');
  const [p2DeviceId, setP2DeviceId] = useState<string>('');
  const [isDualTestMode, setIsDualTestMode] = useState<boolean>(false);

  React.useEffect(() => {
    let isSubscribed = true;
    const detectCameras = async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter(d => d.kind === 'videoinput');
          if (isSubscribed) {
            setVideoDevices(videoInputs);
            if (videoInputs.length > 0) {
              if (!p1DeviceId) setP1DeviceId(videoInputs[0].deviceId);
              if (!p2DeviceId) setP2DeviceId(videoInputs[1]?.deviceId || videoInputs[0].deviceId);
            }
          }
        }
      } catch (e) {
        console.warn("Could not list video input devices:", e);
      }
    };
    detectCameras();
    return () => { isSubscribed = false; };
  }, []);

  const handleToggleSoloMirror = () => {
    setIsDualTestMode(prev => !prev);
  };

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
        <header className="w-full bg-[#110c38]/95 border-b border-[#644af1]/30 px-1.5 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between shrink-0 shadow-lg z-20 gap-1 sm:gap-2">
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            {/* Top Left Burger Menu */}
            <BurgerMenu
              activePage={activePage}
              onSelectPage={setActivePage}
              userSession={userSession}
              onLogout={handleLogout}
              onOpenArcOnramp={() => setIsArcOnrampOpen(true)}
              onOpenArcAppKit={() => setIsArcAppKitOpen(true)}
              autoBattle={autoBattle}
              setAutoBattle={setAutoBattle}
              videoDevices={videoDevices}
              p1DeviceId={p1DeviceId}
              setP1DeviceId={setP1DeviceId}
              p2DeviceId={p2DeviceId}
              setP2DeviceId={setP2DeviceId}
              isDualTestMode={isDualTestMode}
              onToggleSoloMirror={handleToggleSoloMirror}
            />

            <div className="flex items-center space-x-1 sm:space-x-2 cursor-pointer shrink-0" onClick={() => setActivePage("arena")}>
              <div className="p-1 sm:p-1.5 bg-gradient-to-tr from-yellow-400 via-amber-500 to-purple-600 rounded-xl shadow-md shrink-0">
                <MdStars className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
              </div>
              <h1 className="font-extrabold text-[11px] sm:text-base md:text-lg tracking-wide bg-gradient-to-r from-yellow-300 via-amber-400 to-purple-400 bg-clip-text text-transparent truncate hidden sm:block">
                FACE BET
              </h1>
            </div>
          </div>

          {/* Network & Environment Selector Dropdowns (ARC/Base & Mainnet/Testnet) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 my-auto">
            {/* Chain Selector: ARC / Base */}
            <select
              value={selectedChain}
              onChange={(e) => {
                const val = e.target.value as 'base' | 'arc';
                setSelectedChain(val);
                if (userSession) {
                  const updated = { ...userSession, network: val };
                  setUserSession(updated);
                  try { localStorage.setItem("facebet_session", JSON.stringify(updated)); } catch {}
                }
              }}
              className="bg-[#1e155b] hover:bg-[#281c78] text-white font-extrabold text-[10px] sm:text-xs py-0.5 sm:py-1 px-1 sm:px-2 rounded-lg border border-purple-500/50 outline-none cursor-pointer shadow transition shrink-0"
              aria-label="Select Blockchain Network"
            >
              <option value="base" className="bg-[#110c38] text-white font-bold">🔵 Base</option>
              <option value="arc" className="bg-[#110c38] text-white font-bold">⚡ ARC</option>
            </select>

            {/* Environment Selector: Mainnet / Testnet */}
            <select
              value={selectedEnv}
              onChange={(e) => {
                const val = e.target.value as 'mainnet' | 'testnet';
                setSelectedEnv(val);
                if (typeof localStorage !== "undefined") {
                  localStorage.setItem("facebet_base_testnet", val === 'testnet' ? "true" : "false");
                }
              }}
              className="bg-[#1e155b] hover:bg-[#281c78] text-amber-300 font-extrabold text-[10px] sm:text-xs py-0.5 sm:py-1 px-1 sm:px-2 rounded-lg border border-amber-500/50 outline-none cursor-pointer shadow transition shrink-0"
              aria-label="Select Environment"
            >
              <option value="mainnet" className="bg-[#110c38] text-emerald-400 font-bold">🟢 Mainnet</option>
              <option value="testnet" className="bg-[#110c38] text-amber-300 font-bold">🟡 Testnet</option>
            </select>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">


            {/* Live Pool Banner */}
            <div className="hidden lg:flex items-center space-x-2 bg-purple-900/40 border border-purple-500/30 px-3 py-1.5 rounded-xl">
              <MdGeneratingTokens className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs text-gray-300">Lottery Pool:</span>
              <span className="text-xs font-bold text-amber-300">$1 = 10 Tickets</span>
            </div>

            {/* Wallet Connect / Tickets Button + Disconnect */}
            {userSession ? (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setIsWalletModalOpen(true)}
                  className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-500 hover:to-yellow-600 text-black font-black text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-lg transition flex items-center space-x-1 transform active:scale-95 shrink-0"
                >
                  <MdConfirmationNumber className="w-3.5 h-3.5 text-black shrink-0" />
                  <span>{userSession.availableTickets} Tix</span>
                </button>
                <button
                  onClick={handleLogout}
                  title="Disconnect Wallet"
                  className="bg-red-600/80 hover:bg-red-500 text-white font-extrabold text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-xl shadow transition flex items-center gap-1 transform active:scale-95 border border-red-400/40 shrink-0"
                >
                  <MdLogout className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-500 hover:to-yellow-600 text-black font-black text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-lg transition flex items-center space-x-1 transform active:scale-95 shrink-0"
              >
                <MdAccountBalanceWallet className="w-3.5 h-3.5 text-black shrink-0" />
                <span>Connect</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          {activePage === "arena" && (
            <Main
              userSession={userSession}
              onRequireAuth={() => setIsWalletModalOpen(true)}
              onAuthSuccess={handleAuthSuccess}
              onBuyTicketsSuccess={handleBuyTickets}
              autoBattle={autoBattle}
              setAutoBattle={setAutoBattle}
              videoDevices={videoDevices}
              p1DeviceId={p1DeviceId}
              setP1DeviceId={setP1DeviceId}
              p2DeviceId={p2DeviceId}
              setP2DeviceId={setP2DeviceId}
              isDualTestMode={isDualTestMode}
              setIsDualTestMode={setIsDualTestMode}
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

        {/* Arc Fiat Onramp Circle Widget Modal */}
        <ArcOnrampWidget
          isOpen={isArcOnrampOpen}
          onClose={() => setIsArcOnrampOpen(false)}
          userWalletAddress={userSession?.walletAddress}
          appUserId={userSession?.peerId}
          onDepositSettledSuccess={(ticketsAdded) => {
            handleBuyTickets((userSession?.availableTickets || 0) + ticketsAdded);
          }}
        />

        {/* Arc App Kit Hub Modal */}
        <ArcAppKitModal
          isOpen={isArcAppKitOpen}
          onClose={() => setIsArcAppKitOpen(false)}
          userWalletAddress={userSession?.walletAddress}
          userSession={userSession}
        />
      </div>
    </AppLayout>
  );
}

export default App;
