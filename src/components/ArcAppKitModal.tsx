import React, { useState } from "react";
import {
  MdClose,
  MdCreditCard,
  MdCompareArrows,
  MdSend,
  MdTrendingUp,
  MdCheckCircle,
  MdErrorOutline,
  MdAutoAwesome,
  MdAccountBalanceWallet,
} from "react-icons/md";
import {
  executeArcBridge,
  executeArcSwap,
  executeArcSend,
  executeArcEarnDeposit,
} from "../services/arcAppKitService";
import { ArcOnrampWidget } from "./ArcOnrampWidget";

interface ArcAppKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  userWalletAddress?: string;
  userSession?: any;
}

export const ArcAppKitModal: React.FC<ArcAppKitModalProps> = ({
  isOpen,
  onClose,
  userWalletAddress = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  userSession,
}) => {
  const [activeTab, setActiveTab] = useState<"onramp" | "bridge" | "swap" | "send" | "earn">("onramp");
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [amountUSD, setAmountUSD] = useState<string>("10.00");
  const [recipient, setRecipient] = useState<string>("");
  const [fromChain, setFromChain] = useState<"Base_Sepolia" | "Ethereum_Sepolia" | "Base">("Base_Sepolia");
  const [swapTokenIn, setSwapTokenIn] = useState<"USDC" | "EURC">("USDC");

  const [isOnrampEmbeddedOpen, setIsOnrampEmbeddedOpen] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleAction = async () => {
    setLoading(true);
    setStatusMessage(null);
    setError(null);

    try {
      if (activeTab === "bridge") {
        const res = await executeArcBridge({
          fromChain,
          toChain: "Arc_Testnet",
          amountUSD,
          recipientAddress: recipient || userWalletAddress,
        });
        setStatusMessage(`🎉 Bridge Initiated! ${res.details || `$${amountUSD} transferred to Arc`}`);
      } else if (activeTab === "swap") {
        const tokenOut = swapTokenIn === "USDC" ? "EURC" : "USDC";
        const res = await executeArcSwap({
          tokenIn: swapTokenIn,
          tokenOut,
          amountIn: amountUSD,
        });
        setStatusMessage(`🎉 Swap Completed! ${res.details || `Swapped ${amountUSD} ${swapTokenIn} for ${tokenOut}`}`);
      } else if (activeTab === "send") {
        const targetAddr = recipient.trim() || "0x9876543210123456789012345678901234567890";
        const res = await executeArcSend({
          toAddress: targetAddr,
          amountUSD,
        });
        setStatusMessage(`🎉 Arc Transfer Sent! ${res.details || `Sent $${amountUSD} USDC to ${targetAddr.substring(0, 8)}...`}`);
      } else if (activeTab === "earn") {
        const res = await executeArcEarnDeposit({
          amountUSD,
        });
        setStatusMessage(`🎉 Earn Yield Vault Deposit Settled! ${res.details || `Deposited $${amountUSD} into Arc Earn`}`);
      }
    } catch (err: any) {
      setError(err.message || "Action execution failed on Arc SDK.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0b0826] border border-[#644af1]/60 rounded-2xl max-w-xl w-full p-4 sm:p-6 relative shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-gray-300 hover:text-white transition cursor-pointer"
        >
          <MdClose className="w-5 h-5" />
        </button>

        {/* Header Title */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 rounded-xl shadow-md shrink-0">
            <MdAutoAwesome className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <span>Arc App Kit Hub</span>
              <span className="text-[10px] bg-purple-500/30 text-purple-200 border border-purple-400/40 px-2 py-0.5 rounded-full font-mono font-bold">
                @circle-fin/app-kit
              </span>
            </h2>
            <p className="text-xs text-purple-300 font-medium">
              Bridge, Swap, Send, Earn & Onramp natively on Arc Network
            </p>
          </div>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 overflow-x-auto scrollbar-none">
          {[
            { id: "onramp", label: "Onramp", icon: MdCreditCard },
            { id: "bridge", label: "Bridge", icon: MdCompareArrows },
            { id: "swap", label: "Swap", icon: MdCompareArrows },
            { id: "send", label: "Send", icon: MdSend },
            { id: "earn", label: "Earn Vault", icon: MdTrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer shrink-0 whitespace-nowrap ${
                  isActive
                    ? "bg-purple-600 text-white shadow-md border border-purple-400/50"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Feature Content Panels */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-3.5">
          {activeTab === "onramp" && (
            <div className="space-y-3">
              <div className="text-xs text-purple-200 leading-relaxed bg-purple-950/40 p-3 rounded-lg border border-purple-500/30">
                <strong>Circle Arc Onramp:</strong> Buy USDC or EURC on Arc directly using Debit Cards, Apple Pay, Google Pay, or Bank Transfers.
              </div>
              <button
                onClick={() => setIsOnrampEmbeddedOpen(true)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <MdCreditCard className="w-4 h-4" />
                <span>Launch Circle Onramp Widget Modal</span>
              </button>
            </div>
          )}

          {activeTab === "bridge" && (
            <div className="space-y-3">
              <div className="text-xs text-purple-200 leading-relaxed bg-purple-950/40 p-2.5 rounded-lg border border-purple-500/30">
                <strong>Arc CCTP Bridge:</strong> Transfer USDC between Base or Ethereum and Arc Testnet instantly using Circle App Kit.
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                  From Origin Chain
                </label>
                <select
                  value={fromChain}
                  onChange={(e) => setFromChain(e.target.value as any)}
                  className="w-full bg-black/60 border border-purple-500/40 rounded-lg px-3 py-2 text-xs font-mono text-purple-200"
                >
                  <option value="Base_Sepolia">Base Sepolia</option>
                  <option value="Ethereum_Sepolia">Ethereum Sepolia</option>
                  <option value="Base">Base Mainnet</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Bridge Amount ($ USD)
                </label>
                <input
                  type="text"
                  value={amountUSD}
                  onChange={(e) => setAmountUSD(e.target.value)}
                  className="w-full bg-black/60 border border-purple-500/40 rounded-lg px-3 py-2 text-xs font-mono text-purple-200"
                  placeholder="10.00"
                />
              </div>

              <button
                onClick={handleAction}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs py-2.5 rounded-xl shadow transition cursor-pointer"
              >
                {loading ? "Bridging via App Kit..." : `Bridge $${amountUSD} to Arc`}
              </button>
            </div>
          )}

          {activeTab === "swap" && (
            <div className="space-y-3">
              <div className="text-xs text-purple-200 leading-relaxed bg-purple-950/40 p-2.5 rounded-lg border border-purple-500/30">
                <strong>Arc Same-Chain Swap:</strong> Swap USDC for EURC on Arc instantly with Circle App Kit SDK.
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Pay Token
                  </label>
                  <button
                    onClick={() => setSwapTokenIn(swapTokenIn === "USDC" ? "EURC" : "USDC")}
                    className="w-full bg-black/60 border border-purple-500/40 rounded-lg px-3 py-2 text-xs font-bold text-amber-300 flex items-center justify-between"
                  >
                    <span>{swapTokenIn}</span>
                    <span className="text-[10px] text-gray-400">Click to switch</span>
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Receive Token
                  </label>
                  <div className="w-full bg-black/60 border border-purple-500/40 rounded-lg px-3 py-2 text-xs font-bold text-emerald-300">
                    {swapTokenIn === "USDC" ? "EURC" : "USDC"}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Swap Amount
                </label>
                <input
                  type="text"
                  value={amountUSD}
                  onChange={(e) => setAmountUSD(e.target.value)}
                  className="w-full bg-black/60 border border-purple-500/40 rounded-lg px-3 py-2 text-xs font-mono text-purple-200"
                  placeholder="10.00"
                />
              </div>

              <button
                onClick={handleAction}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs py-2.5 rounded-xl shadow transition cursor-pointer"
              >
                {loading ? "Swapping Tokens..." : `Swap ${amountUSD} ${swapTokenIn}`}
              </button>
            </div>
          )}

          {activeTab === "send" && (
            <div className="space-y-3">
              <div className="text-xs text-purple-200 leading-relaxed bg-purple-950/40 p-2.5 rounded-lg border border-purple-500/30">
                <strong>Arc Direct Transfer:</strong> Send USDC to any recipient wallet address on Arc Network.
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Recipient Wallet Address
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-black/60 border border-purple-500/40 rounded-lg px-3 py-2 text-xs font-mono text-purple-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Transfer Amount ($ USDC)
                </label>
                <input
                  type="text"
                  value={amountUSD}
                  onChange={(e) => setAmountUSD(e.target.value)}
                  className="w-full bg-black/60 border border-purple-500/40 rounded-lg px-3 py-2 text-xs font-mono text-purple-200"
                  placeholder="10.00"
                />
              </div>

              <button
                onClick={handleAction}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs py-2.5 rounded-xl shadow transition cursor-pointer"
              >
                {loading ? "Executing Send..." : `Send $${amountUSD} USDC on Arc`}
              </button>
            </div>
          )}

          {activeTab === "earn" && (
            <div className="space-y-3">
              <div className="text-xs text-purple-200 leading-relaxed bg-purple-950/40 p-2.5 rounded-lg border border-purple-500/30">
                <strong>Arc Earn Vault Yields:</strong> Deposit USDC into Arc lending vaults to earn automated interest yield (~8.45% APY).
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Deposit Amount ($ USDC)
                </label>
                <input
                  type="text"
                  value={amountUSD}
                  onChange={(e) => setAmountUSD(e.target.value)}
                  className="w-full bg-black/60 border border-purple-500/40 rounded-lg px-3 py-2 text-xs font-mono text-purple-200"
                  placeholder="50.00"
                />
              </div>

              <button
                onClick={handleAction}
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs py-2.5 rounded-xl shadow transition cursor-pointer"
              >
                {loading ? "Depositing into Earn Vault..." : `Deposit $${amountUSD} into Arc Earn`}
              </button>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {statusMessage && (
          <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 text-xs p-3 rounded-xl flex items-center space-x-2">
            <MdCheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold">{statusMessage}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-xs p-3 rounded-xl flex items-center space-x-2">
            <MdErrorOutline className="w-5 h-5 text-red-400 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Embedded Onramp Widget Launcher */}
        <ArcOnrampWidget
          isOpen={isOnrampEmbeddedOpen}
          onClose={() => setIsOnrampEmbeddedOpen(false)}
          userWalletAddress={userWalletAddress}
          appUserId={userSession?.peerId}
        />
      </div>
    </div>
  );
};

export default ArcAppKitModal;
