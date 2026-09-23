import React, { useState } from "react";
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
} from "react-icons/md";
import { UserSessionData } from "./WalletAuth";

interface BurgerMenuProps {
  activePage: "arena" | "about" | "settings" | "timeline";
  onSelectPage: (page: "arena" | "about" | "settings" | "timeline") => void;
  userSession: UserSessionData | null;
  onLogout: () => void;
}

export const BurgerMenu: React.FC<BurgerMenuProps> = ({
  activePage,
  onSelectPage,
  userSession,
  onLogout,
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

      {/* Slide-over Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity"
        />
      )}

      {/* Sliding Drawer Menu */}
      <div
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-[#0c082d] border-r border-[#644af1]/40 text-white z-50 shadow-2xl transition-transform duration-300 transform flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#110c38]">
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
            className="p-1.5 bg-white/5 hover:bg-white/15 rounded-lg text-gray-300 hover:text-white transition"
          >
            <MdClose className="w-5 h-5" />
          </button>
        </div>

        {/* User Session Quick Info */}
        <div className="p-4 bg-white/5 border-b border-white/10">
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
                className="w-full mt-1 flex items-center justify-center gap-2 bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition border border-red-400/30"
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
                className="w-full mt-1 bg-[#644af1] hover:bg-[#5239e0] text-white text-xs font-bold py-2 px-3 rounded-lg transition"
              >
                Connect Wallet / Web3 Auth →
              </button>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full text-left p-3 rounded-xl transition flex items-start space-x-3 border ${
                  isActive
                    ? "bg-[#644af1]/20 border-[#644af1] text-white"
                    : "bg-white/5 border-transparent text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div
                  className={`p-2 rounded-lg mt-0.5 ${
                    isActive ? "bg-[#644af1] text-white" : "bg-white/10 text-gray-300"
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
                  <div className="text-[11px] text-gray-400 mt-0.5 leading-tight truncate">
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-white/10 bg-[#07012c] text-center text-[10px] text-gray-300 space-y-2">
          {userSession && (
            <button
              onClick={() => { onLogout(); setIsOpen(false); }}
              className="w-full flex items-center justify-center gap-2 bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition border border-red-400/30"
            >
              <MdLogout className="w-4 h-4" />
              Logout / Disconnect Wallet
            </button>
          )}
          <div>FACE BET • Face-to-Face P2P Arena</div>
          <div className="text-purple-300">Base &amp; ARC Smart Contracts</div>
        </div>
      </div>
    </>
  );
};

export default BurgerMenu;
