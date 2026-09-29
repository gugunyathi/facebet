import React, { useState, useEffect } from "react";
import Main from "./features/main/index";
import { AppLayout } from "./layouts/AppLayout";
import { UserSessionData } from "./components/WalletAuth";
import { BurgerMenu } from "./components/BurgerMenu";
import { AboutPage } from "./pages/AboutPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TimelinePage } from "./pages/TimelinePage";
import { LandingPage } from "./pages/LandingPage";
import { SubPageType } from "./pages/SupportAndAboutPages";
import { GoogleSignInModal } from "./components/GoogleSignInModal";
import { WalletConnectModal } from "./components/WalletConnectModal";
import { ArcOnrampWidget } from "./components/ArcOnrampWidget";
import { ArcAppKitModal } from "./components/ArcAppKitModal";
import { UnifiedWalletChainButton } from "./components/UnifiedWalletChainButton";
import { TrendTicker } from "./components/TrendTicker";
import { FacebetLogo } from "./components/FacebetLogo";
import { useCurrency } from "./context/CurrencyContext";

function GlobalCurrencyToggle() {
  const { currencyMode, toggleCurrencyMode } = useCurrency();
  return (
    <button
      onClick={toggleCurrencyMode}
      className="flex items-center gap-1.5 bg-purple-950/80 hover:bg-purple-900 border border-amber-400/50 px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-black text-amber-300 transition shadow cursor-pointer shrink-0"
      title="Global Display Preference: Toggle between USD ($) and FBET"
    >
      <span className="text-[10px] text-zinc-400 uppercase hidden xs:inline">Display:</span>
      <span className="bg-black/60 px-1.5 py-0.5 rounded text-white">{currencyMode === 'FBET' ? '$FBET' : '$USD'}</span>
    </button>
  );
}
import {
  MdConfirmationNumber,
  MdVisibility,
  MdStars,
  MdGeneratingTokens,
  MdAccountBalanceWallet,
  MdLogout,
  MdCreditCard,
  MdHome,
  MdOutlineSportsEsports,
} from "react-icons/md";

const getInitialRoute = (): { view: "landing" | "play"; subPage: SubPageType | null } => {
  if (typeof window === "undefined") return { view: "landing", subPage: null };
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (path === "/play" || path === "/arena") {
    return { view: "play", subPage: null };
  }
  const validSubPages: SubPageType[] = ['faq', 'safety', 'help', 'about', 'contact', 'community', 'terms', 'privacy'];
  const matched = validSubPages.find(sp => path === `/${sp}`);
  if (matched) {
    return { view: "landing", subPage: matched };
  }
  return { view: "landing", subPage: null };
};

export function App() {
  const [route, setRoute] = useState(getInitialRoute());
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
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isArcOnrampOpen, setIsArcOnrampOpen] = useState(false);
  const [isArcAppKitOpen, setIsArcAppKitOpen] = useState(false);

  // Sync browser back/forward buttons with routing state
  useEffect(() => {
    const handlePopState = () => {
      setRoute(getInitialRoute());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateToPlay = () => {
    setRoute({ view: "play", subPage: null });
    if (typeof window !== "undefined") {
      window.history.pushState(null, '', '/play');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navigateToLanding = (subPage: SubPageType | null = null) => {
    setRoute({ view: "landing", subPage });
    if (typeof window !== "undefined") {
      window.history.pushState(null, '', subPage ? `/${subPage}` : '/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
    navigateToPlay();
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

  // If on Landing Page (main URL `/`, or subpages `/faq`, `/safety`, etc.)
  if (route.view === "landing") {
    return (
      <>
        <LandingPage
          onEnterArena={navigateToPlay}
          onConnectWallet={() => setIsWalletModalOpen(true)}
          onSignInWithGoogle={() => setIsGoogleModalOpen(true)}
          userSession={userSession}
          currentSubPage={route.subPage}
          onSelectSubPage={(sub) => setRoute({ view: "landing", subPage: sub })}
          selectedChain={selectedChain}
          setSelectedChain={setSelectedChain}
          selectedEnv={selectedEnv}
          setSelectedEnv={setSelectedEnv}
          setUserSession={setUserSession}
          onLogout={handleLogout}
        />

        {/* Global Wallet Connect Modal */}
        <WalletConnectModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          userSession={userSession}
          onAuthSuccess={handleAuthSuccess}
          onBuyTicketsSuccess={handleBuyTickets}
        />

        {/* Google Sign-in Modal */}
        <GoogleSignInModal
          isOpen={isGoogleModalOpen}
          onClose={() => setIsGoogleModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  // If in Arena App (`/play`)
  return (
    <AppLayout>
      <div className="w-full h-full flex flex-col bg-[#07012c] text-white font-sans overflow-hidden">
        {/* Top Header Navigation in Arena App */}
        <header className="w-full bg-[#110c38] border-b border-[#644af1]/30 px-1.5 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between shrink-0 shadow-lg z-50 relative overflow-visible gap-1 sm:gap-2">
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

            <div className="flex items-center space-x-1.5 sm:space-x-2 cursor-pointer shrink-0" onClick={() => setActivePage("arena")}>
              <div className="p-0.5 sm:p-1 bg-[#160d46] border border-purple-500/40 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.35)] shrink-0 flex items-center justify-center">
                <FacebetLogo className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h1 className="font-black text-xs sm:text-base md:text-lg tracking-wider bg-gradient-to-r from-yellow-300 via-amber-400 to-purple-400 bg-clip-text text-transparent truncate">
                FACEBET
              </h1>
            </div>
          </div>

          {/* Right Header Cluster: Pool Info + Global Currency Toggle + Unified Wallet & Chain Selector Button */}
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            {/* Global Currency Display Preference Toggle */}
            <GlobalCurrencyToggle />

            {/* Live Pool Banner */}
            <div className="hidden lg:flex items-center space-x-2 bg-purple-900/40 border border-purple-500/30 px-3 py-1.5 rounded-xl">
              <MdGeneratingTokens className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs text-gray-300">Lottery Pool:</span>
              <span className="text-xs font-bold text-amber-300">$1 = 10 Tickets</span>
            </div>

            {/* Google Quick Sign In (if disconnected) */}
            {!userSession && (
              <button
                onClick={() => setIsGoogleModalOpen(true)}
                className="bg-white hover:bg-zinc-100 text-black font-bold text-[10px] sm:text-xs px-2 sm:px-2.5 py-1.5 rounded-xl shadow transition flex items-center gap-1 cursor-pointer shrink-0"
                title="Sign in with Google"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="hidden sm:inline">Google</span>
              </button>
            )}

            {/* Quick Ticket Badge when Connected */}
            {userSession && (
              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 font-black text-[10px] sm:text-xs px-2 sm:px-2.5 py-1.5 rounded-xl shadow transition flex items-center space-x-1 cursor-pointer shrink-0"
                title="View / Purchase Tickets"
              >
                <MdConfirmationNumber className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{userSession.availableTickets} Tix</span>
              </button>
            )}

            {/* Unified Connect Wallet & Chain Selector Button (Shows chain, address & dropdown when connected) */}
            <UnifiedWalletChainButton
              userSession={userSession}
              selectedChain={selectedChain}
              setSelectedChain={setSelectedChain}
              selectedEnv={selectedEnv}
              setSelectedEnv={setSelectedEnv}
              setUserSession={setUserSession}
              onConnectWallet={() => setIsWalletModalOpen(true)}
              onLogout={handleLogout}
              onOpenTicketsModal={() => setIsWalletModalOpen(true)}
            />
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
              onGoToHome={() => navigateToLanding(null)}
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

        {/* Google Sign-in Modal */}
        <GoogleSignInModal
          isOpen={isGoogleModalOpen}
          onClose={() => setIsGoogleModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
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

