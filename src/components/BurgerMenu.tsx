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
  MdPerson,
  MdHistory,
  MdEmojiEvents,
  MdSwapHoriz,
} from "react-icons/md";
import { UserSessionData } from "./WalletAuth";
import { FacebetLogo } from "./FacebetLogo";

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

const MOCK_USER_HISTORY = {
  duelsPlayed: 24,
  duelsWon: 18,
  kingReigns: 3,
  winRate: "75%",
  avgReactionMs: "184ms",
  transactions: [
    { id: "p-1", title: "Jackpot Winnings Payout", amount: "+1,240.00 FBET", time: "2 hrs ago", type: "win" },
    { id: "p-2", title: "Priority Queue Bid Stake", amount: "-5.00 FBET", time: "5 hrs ago", type: "bid" },
    { id: "p-3", title: "Cross-Chain Deposit ($FBET)", amount: "+500.00 FBET", time: "1 day ago", type: "deposit" },
    { id: "p-4", title: "Duel Entry Tickets (10x)", amount: "-1.00 USDC", time: "2 days ago", type: "ticket" }
  ]
};

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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<"gameplay" | "transactions">("gameplay");

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
      label: "FACE BET Timeline & Ledger",
      icon: MdTimeline,
      desc: "Live draws, $FBET transfers & winner logs",
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
        className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition focus:outline-none flex items-center justify-center shrink-0 shadow-md cursor-pointer"
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
            className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-[#0a0624] border-r border-[#644af1]/60 text-white z-[99999] shadow-[0_0_50px_rgba(0,0,0,0.9)] transition-transform duration-300 transform flex flex-col translate-x-0 overflow-y-auto"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#130d42] shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-[#1c1257] border border-purple-500/40 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.35)] flex items-center justify-center">
                  <FacebetLogo className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base tracking-wide bg-gradient-to-r from-yellow-300 via-amber-400 to-purple-300 bg-clip-text text-transparent">
                    FACEBET
                  </h2>
                  <p className="text-[10px] text-gray-300">Base &amp; ARC Web3 Navigation</p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close Navigation Menu"
                className="p-1.5 bg-[#251973] hover:bg-[#322396] rounded-lg text-gray-300 hover:text-white transition cursor-pointer"
              >
                <MdClose className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Main Navigation Items */}
            <nav className="p-3 space-y-1.5 border-b border-white/10 bg-[#0e083d] shrink-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full text-left p-2.5 rounded-xl transition flex items-start space-x-3 border cursor-pointer ${
                      isActive
                        ? "bg-[#644af1] border-[#7c63ff] text-white shadow-lg"
                        : "bg-[#181050] border-white/10 text-gray-200 hover:bg-[#22176e] hover:text-white"
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${
                        isActive ? "bg-[#4f35cf] text-white" : "bg-[#251973] text-gray-200"
                      }`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs sm:text-sm leading-tight flex items-center justify-between">
                        <span>{item.label}</span>
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        )}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-purple-200 mt-0.5 leading-snug">
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* 2. User Session / Profile Quick Info */}
            <div className="p-4 bg-[#140e47] border-b border-white/10 shrink-0">
              {userSession ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <MdPerson className="w-3.5 h-3.5" />
                      <span>Verified Player</span>
                    </span>
                    <span className="capitalize text-xs font-semibold text-purple-300">
                      {userSession.network} Net
                    </span>
                  </div>
                  <div className="text-xs font-mono text-gray-300 truncate bg-black/30 p-1.5 rounded border border-white/5">
                    {userSession.walletAddress}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-gray-400">Tickets &amp; $FBET:</span>
                    <span className="font-extrabold text-amber-300 text-xs flex items-center gap-1">
                      <MdConfirmationNumber className="text-amber-400 w-3.5 h-3.5" />
                      {userSession.availableTickets} (2,450 FBET)
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full mt-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs py-2 px-3 rounded-xl transition shadow cursor-pointer"
                  >
                    <MdEmojiEvents className="w-4 h-4" />
                    <span>View User Profile &amp; History</span>
                  </button>

                  <button
                    onClick={() => { onLogout(); setIsOpen(false); }}
                    className="w-full mt-1 flex items-center justify-center gap-2 bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition border border-red-400/40 cursor-pointer"
                  >
                    <MdLogout className="w-3.5 h-3.5" />
                    Disconnect Wallet
                  </button>
                </div>
              ) : (
                <div className="text-center py-2 space-y-2">
                  <p className="text-xs text-purple-200">Connect wallet or sign in with Google to track profile &amp; history.</p>
                </div>
              )}
            </div>

            {/* 3. Hardware Camera Settings inside Drawer */}
            <div className="p-4 space-y-3 bg-[#0a0624] flex-1">
              <div className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <MdVideocam className="text-purple-400 w-4 h-4" />
                <span>Camera Device Selection</span>
              </div>

              {videoDevices.length > 0 ? (
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] text-gray-300 block mb-1">Primary Camera (Player 1)</label>
                    <select
                      value={p1DeviceId}
                      onChange={(e) => setP1DeviceId?.(e.target.value)}
                      className="w-full bg-[#181050] border border-white/20 text-xs text-white rounded-xl p-2 outline-none cursor-pointer"
                    >
                      {videoDevices.map((d, idx) => (
                        <option key={d.deviceId || idx} value={d.deviceId}>
                          {d.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-300 block mb-1">Secondary Camera (Player 2 / Dual)</label>
                    <select
                      value={p2DeviceId}
                      onChange={(e) => setP2DeviceId?.(e.target.value)}
                      className="w-full bg-[#181050] border border-white/20 text-xs text-white rounded-xl p-2 outline-none cursor-pointer"
                    >
                      {videoDevices.map((d, idx) => (
                        <option key={d.deviceId || idx} value={d.deviceId}>
                          {d.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {onToggleSoloMirror && (
                    <div className="pt-1">
                      <button
                        onClick={onToggleSoloMirror}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                          isDualTestMode
                            ? "bg-purple-600 border-purple-400 text-white shadow-lg animate-pulse"
                            : "bg-[#181050] hover:bg-[#22176e] border-white/10 text-gray-200"
                        }`}
                      >
                        <span>📹 {isDualTestMode ? "Disable Dual Solo Mirror" : "Enable Dual Solo Mirror (1 Cam)"}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[10px] text-gray-400 italic">
                  Detecting connected camera hardware...
                </div>
              )}
            </div>

            {/* Drawer Footer Buttons */}
            <div className="p-3 border-t border-white/10 bg-[#0e083d] flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  onOpenArcOnramp?.();
                  setIsOpen(false);
                }}
                className="flex-1 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-extrabold text-[10px] px-2 py-2 rounded-xl shadow transition flex justify-center items-center space-x-1 border border-purple-400/60 cursor-pointer"
              >
                <MdCreditCard className="w-3.5 h-3.5 text-purple-200 shrink-0" />
                <span>Arc Onramp</span>
              </button>

              <button
                onClick={() => {
                  onOpenArcAppKit?.();
                  setIsOpen(false);
                }}
                className="flex-1 bg-[#281878] hover:bg-[#321f96] text-purple-200 border border-purple-400/60 font-extrabold text-[10px] px-2 py-2 rounded-xl shadow transition flex justify-center items-center space-x-1 cursor-pointer"
              >
                <MdAccountBalanceWallet className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Arc Kit Hub</span>
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* USER PROFILE & GAMEPLAY HISTORY MODAL */}
      {isProfileModalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0e083d] border border-purple-500/50 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-[#160d4a] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-500 text-black rounded-2xl font-black">
                  <MdPerson className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Player Profile &amp; History</h3>
                  <p className="text-xs text-gray-300 font-mono">{userSession?.walletAddress || "Connected Web3 Wallet"}</p>
                </div>
              </div>

              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-gray-300 hover:text-white transition cursor-pointer"
              >
                <MdClose className="w-5 h-5" />
              </button>
            </div>

            {/* Player Quick Stats Banner */}
            <div className="p-4 bg-gradient-to-r from-purple-950/60 via-black to-indigo-950/60 border-b border-white/10 grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl">
                <div className="text-[10px] text-gray-400 font-bold uppercase">Duels Won</div>
                <div className="text-base font-black text-emerald-400">{MOCK_USER_HISTORY.duelsWon} / {MOCK_USER_HISTORY.duelsPlayed}</div>
              </div>
              <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl">
                <div className="text-[10px] text-gray-400 font-bold uppercase">King Reigns</div>
                <div className="text-base font-black text-amber-300">{MOCK_USER_HISTORY.kingReigns}</div>
              </div>
              <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl">
                <div className="text-[10px] text-gray-400 font-bold uppercase">Win Rate</div>
                <div className="text-base font-black text-cyan-300">{MOCK_USER_HISTORY.winRate}</div>
              </div>
            </div>

            {/* Profile Tab Selector */}
            <div className="flex border-b border-white/10 bg-[#120a3d]">
              <button
                onClick={() => setProfileTab("gameplay")}
                className={`flex-1 py-3 text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  profileTab === "gameplay"
                    ? "bg-purple-600 text-white border-b-2 border-amber-400"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <MdEmojiEvents className="w-4 h-4" />
                <span>Gameplay History</span>
              </button>
              <button
                onClick={() => setProfileTab("transactions")}
                className={`flex-1 py-3 text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  profileTab === "transactions"
                    ? "bg-amber-500 text-black border-b-2 border-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <MdHistory className="w-4 h-4" />
                <span>Personal Transactions ($FBET)</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {profileTab === "gameplay" ? (
                <div className="space-y-3">
                  <div className="bg-[#181050]/80 border border-white/10 p-3.5 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <MdEmojiEvents className="text-amber-400 w-4 h-4" />
                        <span>P2P Arena Duel #1042</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">Target: Cyberpunk Wide-Eyed Shock • 12ms Ref AI</div>
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      VICTORY (+250 FBET)
                    </span>
                  </div>

                  <div className="bg-[#181050]/80 border border-white/10 p-3.5 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <MdStars className="text-amber-400 w-4 h-4" />
                        <span>King-of-the-Hill Reign #88</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">Defended Throne for 4 consecutive rounds</div>
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      CROWNED
                    </span>
                  </div>

                  <div className="bg-[#181050]/80 border border-white/10 p-3.5 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <MdEmojiEvents className="text-purple-400 w-4 h-4" />
                        <span>P2P Arena Duel #1039</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">Target: Unhinged Jaw Surprise</div>
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      COMPLETED
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {MOCK_USER_HISTORY.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-[#181050]/80 border border-white/10 p-3.5 rounded-2xl flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40">
                          <MdSwapHoriz className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{tx.title}</div>
                          <div className="text-[11px] text-gray-400">{tx.time} • Base &amp; ARC Smart Contract</div>
                        </div>
                      </div>
                      <div className={`text-xs font-black ${tx.amount.startsWith("+") ? "text-emerald-400" : "text-amber-300"}`}>
                        {tx.amount}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#160d4a] border-t border-white/10 flex justify-end">
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default BurgerMenu;
