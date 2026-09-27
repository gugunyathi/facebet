import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MdExpandMore, MdCheck } from "react-icons/md";
import { UserSessionData } from "./WalletAuth";

interface CombinedChainSelectorProps {
  selectedChain: 'base' | 'arc';
  setSelectedChain: (chain: 'base' | 'arc') => void;
  selectedEnv: 'mainnet' | 'testnet';
  setSelectedEnv: (env: 'mainnet' | 'testnet') => void;
  userSession: UserSessionData | null;
  setUserSession: React.Dispatch<React.SetStateAction<UserSessionData | null>>;
}

export interface NetworkOption {
  id: string;
  chain: 'base' | 'arc';
  env: 'mainnet' | 'testnet';
  label: string;
  badge: string;
  badgeColor: string;
  icon: string;
}

export const NETWORK_OPTIONS: NetworkOption[] = [
  {
    id: "base-mainnet",
    chain: "base",
    env: "mainnet",
    label: "Base Mainnet",
    badge: "🟢 Mainnet",
    badgeColor: "bg-emerald-500/30 text-emerald-300 border-emerald-500/50",
    icon: "🔵",
  },
  {
    id: "base-testnet",
    chain: "base",
    env: "testnet",
    label: "Base Sepolia",
    badge: "🟡 Testnet",
    badgeColor: "bg-amber-500/30 text-amber-300 border-amber-500/50",
    icon: "🔵",
  },
  {
    id: "arc-mainnet",
    chain: "arc",
    env: "mainnet",
    label: "ARC Network",
    badge: "🟢 Mainnet",
    badgeColor: "bg-emerald-500/30 text-emerald-300 border-emerald-500/50",
    icon: "⚡",
  },
  {
    id: "arc-testnet",
    chain: "arc",
    env: "testnet",
    label: "ARC Testnet",
    badge: "🟡 Testnet",
    badgeColor: "bg-amber-500/30 text-amber-300 border-amber-500/50",
    icon: "⚡",
  },
];

export const CombinedChainSelector: React.FC<CombinedChainSelectorProps> = ({
  selectedChain,
  setSelectedChain,
  selectedEnv,
  setSelectedEnv,
  userSession,
  setUserSession,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Keep dropdown within viewport bounds
      const maxLeft = Math.max(8, window.innerWidth - 270);
      setCoords({
        top: rect.bottom + 6,
        left: Math.min(Math.max(8, rect.left), maxLeft),
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

  // Close dropdown on click outside
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

  const currentOption =
    NETWORK_OPTIONS.find((opt) => opt.chain === selectedChain && opt.env === selectedEnv) ||
    NETWORK_OPTIONS[1];

  const handleSelect = (option: NetworkOption) => {
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

    setIsOpen(false);
  };

  return (
    <div
      className="relative shrink-0 my-auto"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Select Network & Environment"
        className="bg-[#1e155b] hover:bg-[#281c78] text-white border border-[#644af1]/80 px-2 sm:px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-md transition text-xs font-extrabold cursor-pointer shrink-0"
      >
        <span className="text-sm">{currentOption.icon}</span>
        <span className="truncate">{currentOption.label}</span>
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold border uppercase tracking-wider ${currentOption.badgeColor}`}
        >
          {currentOption.env === "testnet" ? "Testnet" : "Mainnet"}
        </span>
        <MdExpandMore className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Popout Dropdown Menu via Portal to document.body for top z-index floating */}
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
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
            className="w-64 bg-[#0a0624] border-2 border-[#644af1] rounded-2xl p-2 shadow-[0_20px_60px_rgba(0,0,0,0.98)] flex flex-col space-y-1.5 animate-in fade-in duration-150 text-white font-sans select-none"
          >
            <div className="px-2.5 py-1.5 text-[10px] font-black uppercase text-purple-300 tracking-wider border-b border-white/10 mb-0.5 flex items-center justify-between">
              <span>Network & Environment</span>
              <span className="text-amber-400 font-mono">1-Click Switch</span>
            </div>

            {NETWORK_OPTIONS.map((opt) => {
              const isSelected = opt.chain === selectedChain && opt.env === selectedEnv;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition text-left cursor-pointer border ${
                    isSelected
                      ? "bg-[#644af1] border-purple-400 text-white shadow-lg font-extrabold"
                      : "bg-[#150e3c] hover:bg-[#23185a] border-white/10 text-gray-200"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-lg">{opt.icon}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white leading-tight">{opt.label}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {opt.chain.toUpperCase()} • {opt.env.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${opt.badgeColor}`}>
                      {opt.badge}
                    </span>
                    {isSelected && <MdCheck className="w-4 h-4 text-emerald-300 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};

export default CombinedChainSelector;
