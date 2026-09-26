import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  MdMenu,
  MdClose,
  MdVideocam,
  MdInfoOutline,
  MdSettings,
  MdTimeline,
  MdConfirmationNumber,
  MdAccountBalanceWallet,
  MdStars,
  MdLogout,
  MdCreditCard,
} from "react-icons/md";
import { UserSessionData } from "./WalletAuth";

interface BurgerMenuProps {
  activePage: "arena" | "about" | "settings" | "timeline";
  onSelectPage: (page: "arena" | "about" | "settings" | "timeline") => void;
  userSession: UserSessionData | null;
  onLogout: () => void;
  onOpenArcOnramp?: () => void;
  onOpenArcAppKit?: () => void;
  autoBattle?: boolean;
  setAutoBattle?: React.Dispatch<React.SetStateAction<boolean>>;
  videoDevices?: MediaDeviceInfo[];
  p1DeviceId?: string;
  setP1DeviceId?: (id: string) => void;
  p2DeviceId?: string;
  setP2DeviceId?: (id: string) => void;
  isDualTestMode?: boolean;
  onToggleSoloMirror?: () => void;
}

export const BurgerMenu: React.FC<BurgerMenuProps> = ({
  activePage,
  onSelectPage,
  userSession,
  onLogout,
  onOpenArcOnramp,
  onOpenArcAppKit,
  autoBattle,
  setAutoBattle,
  videoDevices = [],
  p1DeviceId = '',
  setP1DeviceId,
  p2DeviceId = '',
  setP2DeviceId,
  isDualTestMode = false,
  onToggleSoloMirror,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    {
      id: "arena" as const,
      label: "Live Arena Stream",
      icon: MdVideocam,
      desc: "Watch active P2P video matches face-to-face",
    },
    {
      id: "about" as const,
      label: "Web3 Auth & About",
      icon: MdInfoOutline,
      desc: "Verify wallet, $1 = 10 tickets & game info",
    },
    {
      id: "timeline" as const,
      label: "FACE BET Timeline",
      icon: MdTimeline,
      desc: "Live draws, winner logs & jackpot records",
    },
    {
      id: "settings" as const,
      label: "Settings",
      icon: MdSettings,
      desc: "Web3 network, video quality & sound options",
    },
  ];

  const handleNavigate = (page: "arena" | "about" | "settings" | "timeline") => {
    onSelectPage(page);
    setIsOpen(false);
  };

  return (
    <>
      {/* Top-Left Hamburger Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open Navigation Menu"
        className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition focus:outline-none flex items-center justify-center shrink-0 shadow-md"
      >
        <MdMenu className="w-6 h-6" />
      </button>

      {/* Slide-over Backdrop & Drawer rendered via Portal at document.body level */}
      {isOpen && typeof document !== "undefined" && createPortal(
        <>
          {/* Slide-over Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/80 z-[99988] transition-opacity"
          />

          {/* Sliding Drawer Menu */}
          <div
            className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-[#0a0624] border-r border-[#644af1]/60 text-white z-[99999] shadow-[0_0_50px_rgba(0,0,0,0.9)] transition-transform duration-300 transform flex flex-col translate-x-0"
          >
            {/* Drawer Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#130d42] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-tr from-yellow-400 via-amber-500 to-purple-600 rounded-xl">
              <MdStars className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="font-extrabold text-base tracking-wide bg-gradient-to-r from-yellow-300 via-amber-400 to-purple-300 bg-clip-text text-transparent">
                FACE BET
              </h2>
              <p className="text-[10px] text-gray-300">Base & ARC Web3 Navigation</p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close Navigation Menu"
            className="p-1.5 bg-[#251973] hover:bg-[#322396] rounded-lg text-gray-300 hover:text-white transition"
          >
            <MdClose className="w-5 h-5" />
          </button>
        </div>

        {/* User Session Quick Info */}
        <div className="p-4 bg-[#140e47] border-b border-white/10 shrink-0">
          {userSession ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-bold uppercase tracking-wider">
                  Verified Player
                </span>
                <span className="capitalize text-xs font-semibold text-purple-300">
                  {userSession.network} Net
                </span>
              </div>
              <div className="text-xs font-mono text-gray-300 truncate">
                {userSession.walletAddress}
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-gray-400">Available Tickets:</span>
                <span className="font-extrabold text-amber-300 text-sm flex items-center gap-1">
                  <MdConfirmationNumber className="text-amber-400 w-4 h-4" />
                  {userSession.availableTickets}
                </span>
              </div>
              <button
                onClick={() => { onLogout(); setIsOpen(false); }}
                className="w-full mt-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition border border-red-400/40"
              >
                <MdLogout className="w-4 h-4" />
                Disconnect Wallet
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold">
                <MdAccountBalanceWallet className="w-4 h-4" />
                <span>Free Spectator Mode</span>
              </div>
              <p className="text-[11px] text-gray-300 leading-snug">
                Watching live P2P streams. Authenticate via Web3 in About menu to enter lottery queue ($1 = 10 tickets).
              </p>
              <button
                onClick={() => handleNavigate("about")}
                className="w-full mt-1 bg-[#644af1] hover:bg-[#5239e0] text-white text-xs font-bold py-2 px-3 rounded-lg transition shadow-md"
              >
                Connect Wallet / Web3 Auth →
              </button>
            </div>
          )}
        </div>

        {/* Global Controls */}
        <div className="p-3 border-b border-white/10 space-y-3 shrink-0 bg-[#0f0933]">
          {/* Continuous Auto-Battle Status Control Banner */}
          <div className="flex flex-col bg-[#1c135c] border border-[#644af1]/50 p-2.5 rounded-xl gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full ${autoBattle ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'} shrink-0`} />
              <div className="text-[11px] sm:text-xs truncate">
                <span className="font-extrabold text-purple-200">Continuous Auto-Match: </span>
                <span className={autoBattle ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                  {autoBattle ? "ACTIVE ⚡" : "PAUSED ⏸️"}
                </span>
              </div>
            </div>
            <button
              onClick={() => setAutoBattle?.(prev => !prev)}
              className={`w-full text-xs py-1.5 rounded-lg font-black border transition cursor-pointer shrink-0 ${
                autoBattle
                  ? "bg-emerald-600 text-white border-emerald-400 hover:bg-emerald-500"
                  : "bg-gray-800 text-gray-200 border-gray-600 hover:bg-gray-700"
              }`}
            >
              {autoBattle ? "⚡ Auto ON" : "⏸️ Auto OFF"}
            </button>
          </div>

          {/* Camera Device & Solo Mirror Controls */}
          <div className="flex flex-col bg-[#1c135c] border border-[#644af1]/50 p-2.5 rounded-xl gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-extrabold text-purple-200 flex items-center gap-1.5">
                <MdVideocam className="w-4 h-4 text-purple-300 shrink-0" />
                <span>Camera & Mirror</span>
              </span>
              {onToggleSoloMirror && (
                <button
                  onClick={onToggleSoloMirror}
                  className={`text-[10px] px-2 py-0.5 rounded-lg font-black border transition cursor-pointer shrink-0 ${
                    isDualTestMode
                      ? "bg-blue-600 text-white border-blue-400 shadow-md"
                      : "bg-[#281a7a] hover:bg-[#34239c] text-gray-200 border-purple-400/40"
                  }`}
                  title="Toggle solo mirror test mode"
                >
                  {isDualTestMode ? "📹 Mirror ON" : "📹 Solo Mirror"}
                </button>
              )}
            </div>

            {videoDevices && videoDevices.length > 0 ? (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-gray-300 text-[11px] font-semibold">Camera 1:</span>
                  <select
                    value={p1DeviceId || ''}
                    onChange={(e) => setP1DeviceId?.(e.target.value)}
                    className="bg-[#0c082d] text-gray-100 text-[11px] rounded px-2 py-1 border border-purple-400 outline-none focus:border-purple-300 max-w-[150px] truncate cursor-pointer font-medium"
                  >
                    {videoDevices.map((dev, i) => (
                      <option key={dev.deviceId || i} value={dev.deviceId}>
                        {dev.label ? dev.label.slice(0, 18) : `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {videoDevices.length > 1 && (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-gray-300 text-[11px] font-semibold">Camera 2:</span>
                    <select
                      value={p2DeviceId || ''}
                      onChange={(e) => setP2DeviceId?.(e.target.value)}
                      className="bg-[#0c082d] text-gray-100 text-[11px] rounded px-2 py-1 border border-rose-400 outline-none focus:border-rose-300 max-w-[150px] truncate cursor-pointer font-medium"
                    >
                      {videoDevices.map((dev, i) => (
                        <option key={dev.deviceId || i} value={dev.deviceId}>
                          {dev.label ? dev.label.slice(0, 18) : `Camera ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[10px] text-gray-400 italic">
                Detecting connected camera hardware...
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Arc Fiat Onramp Button */}
            <button
              onClick={() => {
                onOpenArcOnramp?.();
                setIsOpen(false);
              }}
              className="flex-1 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-extrabold text-[10px] px-2 py-1.5 rounded-xl shadow-lg transition flex justify-center items-center space-x-1 border border-purple-400/60 cursor-pointer"
              title="Buy USDC/EURC on Arc with Fiat & Cards"
            >
              <MdCreditCard className="w-3.5 h-3.5 text-purple-200 shrink-0" />
              <span>Arc Onramp</span>
            </button>

            {/* Arc App Kit Hub Button */}
            <button
              onClick={() => {
                onOpenArcAppKit?.();
                setIsOpen(false);
              }}
              className="flex-1 bg-[#281878] hover:bg-[#321f96] text-purple-200 border border-purple-400/60 font-extrabold text-[10px] px-2 py-1.5 rounded-xl shadow-md transition flex justify-center items-center space-x-1 cursor-pointer"
              title="Arc App Kit Hub (Bridge, Swap, Send, Earn)"
            >
              <MdAccountBalanceWallet className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Arc Kit Hub</span>
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto bg-[#0a0624]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full text-left p-3 rounded-xl transition flex items-start space-x-3 border ${
                  isActive
                    ? "bg-[#644af1] border-[#7c63ff] text-white shadow-lg"
                    : "bg-[#181050] border-white/10 text-gray-200 hover:bg-[#22176e] hover:text-white"
                }`}
              >
                <div
                  className={`p-2 rounded-lg mt-0.5 ${
                    isActive ? "bg-[#4f35cf] text-white" : "bg-[#251973] text-gray-200"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm leading-tight flex items-center justify-between">
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-300 mt-0.5 leading-tight truncate">
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-white/10 bg-[#07012c] text-center text-[10px] text-gray-300 space-y-2 shrink-0">
          {userSession && (
            <button
              onClick={() => { onLogout(); setIsOpen(false); }}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition border border-red-400/40"
            >
              <MdLogout className="w-4 h-4" />
              Logout / Disconnect Wallet
            </button>
          )}
          <div>FACE BET • Face-to-Face P2P Arena</div>
          <div className="text-purple-300">Base &amp; ARC Smart Contracts</div>
        </div>
      </div>
        </>,
        document.body
      )}
    </>
  );
};

export default BurgerMenu;
