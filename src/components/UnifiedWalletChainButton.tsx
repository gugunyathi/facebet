import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  MdAccountBalanceWallet, 
  MdExpandMore, 
  MdCheck, 
  MdContentCopy, 
  MdOpenInNew, 
  MdLogout, 
  MdConfirmationNumber,
  MdCreditCard,
  MdShield
} from "react-icons/md";
import { UserSessionData } from "./WalletAuth";
import { NETWORK_OPTIONS, NetworkOption } from "./CombinedChainSelector";

interface UnifiedWalletChainButtonProps {
  userSession: UserSessionData | null;
  selectedChain: 'base' | 'arc';
  setSelectedChain: (chain: 'base' | 'arc') => void;
  selectedEnv: 'mainnet' | 'testnet';
  setSelectedEnv: (env: 'mainnet' | 'testnet') => void;
  setUserSession: React.Dispatch<React.SetStateAction<UserSessionData | null>>;
  onConnectWallet: () => void;
  onLogout: () => void;
  onOpenTicketsModal?: () => void;
}

export const UnifiedWalletChainButton: React.FC<UnifiedWalletChainButtonProps> = ({
  userSession,
  selectedChain,
  setSelectedChain,
  selectedEnv,
  setSelectedEnv,
  setUserSession,
  onConnectWallet,
  onLogout,
  onOpenTicketsModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const currentOption =
    NETWORK_OPTIONS.find((opt) => opt.chain === selectedChain && opt.env === selectedEnv) ||
    NETWORK_OPTIONS[0];

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 280;
      // Position menu aligned with right side of button on desktop, but bounded within viewport
      let left = rect.right - menuWidth;
      if (left < 8) left = 8;
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }
      setCoords({
        top: rect.bottom + 6,
        left,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelectNetwork = (option: NetworkOption) => {
    setSelectedChain(option.chain);
    setSelectedEnv(option.env);

    if (typeof localStorage !== "undefined") {
      localStorage.setItem("facebet_base_testnet", option.env === "testnet" ? "true" : "false");
    }

    if (userSession) {
      const updated = { ...userSession, network: option.chain };
      setUserSession(updated);
      try {
        localStorage.setItem("facebet_session", JSON.stringify(updated));
      } catch (e) {
        console.warn("Could not save session network update:", e);
      }
    }
  };

  const handleCopyAddress = () => {
    if (userSession?.walletAddress) {
      navigator.clipboard.writeText(userSession.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr?: string) => {
    if (!addr) return "...";
    if (addr.startsWith("0x_google_")) {
      return `google:${addr.slice(10, 16)}...`;
    }
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getExplorerUrl = () => {
    const addr = userSession?.walletAddress || "";
    if (selectedChain === "base") {
      return selectedEnv === "testnet" 
        ? `https://sepolia.basescan.org/address/${addr}`
        : `https://basescan.org/address/${addr}`;
    }
    return selectedEnv === "testnet"
      ? `https://explorer.testnet.arc.io/address/${addr}`
      : `https://explorer.arc.io/address/${addr}`;
  };

  // ─────────────────────────────────────────────────────────────
  // 1. DISCONNECTED STATE: Single prominent "Connect Wallet" button
  // ─────────────────────────────────────────────────────────────
  if (!userSession) {
    return (
      <div className="relative shrink-0">
        <button
          ref={buttonRef}
          onClick={onConnectWallet}
          className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-500 hover:to-yellow-600 text-black font-black text-[11px] sm:text-xs px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl shadow-lg transition-all duration-200 flex items-center gap-1.5 transform active:scale-95 cursor-pointer shrink-0"
          title="Connect Web3 Wallet or Sign In"
        >
          <span className="text-xs sm:text-sm">{currentOption.icon}</span>
          <MdAccountBalanceWallet className="w-4 h-4 text-black shrink-0" />
          <span className="hidden xs:inline">Connect Wallet</span>
          <span className="xs:hidden">Connect</span>
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. CONNECTED STATE: Combined Chain + Address + Dropdown Arrow
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="relative shrink-0 my-auto">
      {/* Combined Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Manage Wallet & Network"
        className={`bg-zinc-900/90 hover:bg-zinc-800 text-white border transition-all duration-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl flex items-center gap-1.5 sm:gap-2 shadow-lg cursor-pointer shrink-0 ${
          isOpen ? "border-pink-500 ring-2 ring-pink-500/30" : "border-white/15 hover:border-purple-500/50"
        }`}
      >
        {/* Network & Chain Icon Badge */}
        <div className="flex items-center gap-1">
          <span className="text-xs sm:text-sm">{currentOption.icon}</span>
          <span className="text-[10px] sm:text-xs font-bold text-zinc-300 hidden md:inline">
            {selectedChain === "base" ? "Base" : "ARC"}
          </span>
          <span
            className={`text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase tracking-wider border hidden sm:inline ${currentOption.badgeColor}`}
          >
            {selectedEnv === "testnet" ? "Testnet" : "Mainnet"}
          </span>
        </div>

        <span className="text-zinc-600 hidden sm:inline">|</span>

        {/* Truncated Address */}
        <span className="font-mono text-[10px] sm:text-xs font-extrabold text-amber-300">
          {formatAddress(userSession.walletAddress)}
        </span>

        {/* Dropdown Chevron Arrow */}
        <MdExpandMore
          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-pink-400" : ""}`}
        />
      </button>

      {/* Floating Dropdown Management Menu */}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 99999,
            }}
            className="w-72 bg-[#0c0828] border-2 border-purple-500/80 rounded-2xl p-3 shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col space-y-2.5 animate-in fade-in duration-150 text-white font-sans select-none backdrop-blur-2xl"
          >
            {/* Account Card Header */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                    {currentOption.icon}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Connected Wallet</div>
                    <div className="text-xs font-mono font-bold text-white">
                      {formatAddress(userSession.walletAddress)}
                    </div>
                  </div>
                </div>

                {/* Copy address button */}
                <button
                  onClick={handleCopyAddress}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition cursor-pointer"
                  title="Copy Wallet Address"
                >
                  {copied ? <MdCheck className="w-3.5 h-3.5 text-emerald-400" /> : <MdContentCopy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Tickets Balance & Explorer Link */}
              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                <div className="flex items-center gap-1 text-amber-300 font-extrabold">
                  <MdConfirmationNumber className="w-3.5 h-3.5" />
                  <span>{userSession.availableTickets || 0} Tickets</span>
                </div>
                <a
                  href={getExplorerUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-zinc-400 hover:text-cyan-400 transition"
                >
                  <span>Explorer</span>
                  <MdOpenInNew className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Network & Chain Selector Section */}
            <div className="space-y-1">
              <div className="px-1 text-[10px] font-black uppercase text-purple-300 tracking-wider flex items-center justify-between">
                <span>Select Chain & Network</span>
                <span className="text-[9px] font-mono text-zinc-500">1-Click Switch</span>
              </div>

              <div className="space-y-1">
                {NETWORK_OPTIONS.map((opt) => {
                  const isSelected = opt.chain === selectedChain && opt.env === selectedEnv;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectNetwork(opt)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl transition text-left cursor-pointer border ${
                        isSelected
                          ? "bg-purple-600/40 border-purple-400 text-white shadow font-extrabold"
                          : "bg-white/5 hover:bg-white/10 border-white/5 text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-base">{opt.icon}</span>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold leading-tight">{opt.label}</span>
                          <span className="text-[9px] text-zinc-400 font-mono">
                            {opt.chain.toUpperCase()} • {opt.env.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full border ${opt.badgeColor}`}>
                          {opt.badge}
                        </span>
                        {isSelected && <MdCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions: Buy Tickets + Disconnect */}
            <div className="pt-1.5 border-t border-white/10 flex items-center gap-2">
              {onOpenTicketsModal && (
                <button
                  onClick={() => { setIsOpen(false); onOpenTicketsModal(); }}
                  className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <MdConfirmationNumber className="w-3.5 h-3.5" />
                  <span>+ Tickets</span>
                </button>
              )}
              <button
                onClick={() => { setIsOpen(false); onLogout(); }}
                className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-bold py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <MdLogout className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default UnifiedWalletChainButton;
