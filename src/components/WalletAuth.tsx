import React, { useState } from "react";
import {
  MdAccountBalanceWallet,
  MdCheckCircle,
  MdErrorOutline,
  MdConfirmationNumber,
  MdFlashOn,
} from "react-icons/md";
import { createBaseAccountSDK } from "@base-org/account";
import { SignInWithBaseButton } from "@base-org/account-ui/react";
import { useTransactionBridge } from "../hooks/useTransactionBridge";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
    };
  }
}

export interface UserSessionData {
  peerId: string;
  walletAddress: string;
  network: "base" | "arc";
  availableTickets: number;
  isQueued: boolean;
}

interface WalletAuthProps {
  peerId: string;
  userSession: UserSessionData | null;
  onAuthSuccess: (session: UserSessionData) => void;
  onBuyTicketsSuccess?: (tickets: number) => void;
}

// Base Network Chain Config
const BASE_CHAIN = {
  chainId: "0x2105", // 8453
  chainName: "Base Mainnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org"],
};

// ARC Network Chain Config
const ARC_CHAIN = {
  chainId: "0x12d0", // 4816
  chainName: "ARC Network",
  nativeCurrency: { name: "ARC", symbol: "ARC", decimals: 18 },
  rpcUrls: ["https://rpc.arc.network"],
  blockExplorerUrls: ["https://explorer.arc.network"],
};

export const WalletAuth: React.FC<WalletAuthProps> = ({
  peerId,
  userSession,
  onAuthSuccess,
  onBuyTicketsSuccess,
}) => {
  const [loading, setLoading] = useState<"base" | "arc" | "buy" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const connectWallet = async (network: "base" | "arc") => {
    setError(null);
    setStatusMessage(null);
    setLoading(network);

    try {
      // 1. Fetch or generate nonce for SIWE
      let nonce = window.crypto.randomUUID().replace(/-/g, "");
      try {
        const nonceRes = await fetch("/api/auth/nonce");
        if (nonceRes.ok) {
          nonce = await nonceRes.text();
        }
      } catch (nonceErr) {
        console.warn("Using local nonce fallback:", nonceErr);
      }

      let walletAddress = "";
      let signature = "";
      let message = "";

      // 2. Try Base Account SDK (Coinbase Wallet) for Base Network
      if (network === "base") {
        try {
          setStatusMessage("Initializing Coinbase / Base Account SDK...");
          const baseSDK = createBaseAccountSDK({ appName: "FACE BET" });
          const provider = baseSDK.getProvider();

          // Switch to Base mainnet
          try {
            await provider.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0x2105" }],
            });
          } catch (switchErr) {
            console.warn("Switch chain warning on Base SDK:", switchErr);
          }

          // Request wallet_connect with signInWithEthereum
          setStatusMessage("Authenticating with Coinbase / Base Wallet...");
          const connectRes: any = await provider.request({
            method: "wallet_connect",
            params: [
              {
                version: "1",
                capabilities: {
                  signInWithEthereum: {
                    nonce,
                    chainId: "0x2105",
                  },
                },
              },
            ],
          });

          if (connectRes?.accounts && connectRes.accounts.length > 0) {
            const acc = connectRes.accounts[0];
            walletAddress = acc.address;
            const siweCap = acc.capabilities?.signInWithEthereum;
            if (siweCap) {
              message = siweCap.message || "";
              signature = siweCap.signature || "";
            }
          }
        } catch (baseSdkErr: any) {
          console.warn("Base SDK connect method failed or unsupported, using standard injected fallback:", baseSdkErr);
        }
      }

      // 3. Fallback to standard injected Web3 provider (MetaMask, Coinbase Extension, etc.)
      if (!walletAddress) {
        if (typeof window === "undefined" || !window.ethereum) {
          throw new Error("No Web3 wallet detected. Please install Coinbase Wallet or MetaMask extension, or use Demo mode.");
        }

        setStatusMessage("Connecting to browser wallet extension...");
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        if (!accounts || accounts.length === 0) {
          throw new Error("No wallet account selected.");
        }
        walletAddress = accounts[0];

        // Switch to target chain
        const targetChain = network === "base" ? BASE_CHAIN : ARC_CHAIN;
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: targetChain.chainId }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [targetChain],
              });
            } catch (addErr) {
              console.warn("Could not add network automatically:", addErr);
            }
          }
        }

        // Sign SIWE payload
        setStatusMessage(`Signing payload for ${network.toUpperCase()}...`);
        message = `FACE BET Authentication\n\nPeer ID: ${peerId || "spectator-peer"}\nNetwork: ${network.toUpperCase()}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;
        
        signature = await window.ethereum.request({
          method: "personal_sign",
          params: [message, walletAddress],
        });
      }

      // 4. Submit verification to server
      setStatusMessage("Verifying signature with server...");
      const verifyResponse = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: walletAddress,
          message,
          signature,
          peerId: peerId || `peer-${Math.random().toString(36).slice(2, 8)}`,
          network,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok || (!verifyData.ok && !verifyData.success)) {
        throw new Error(verifyData.error || "Failed to authenticate wallet session.");
      }

      setStatusMessage("Successfully authenticated! 10 Lottery Tickets credited.");
      onAuthSuccess(verifyData.user);
    } catch (err: any) {
      console.error("Wallet auth error:", err);
      setError(err.message || "An unexpected error occurred during wallet authentication.");
    } finally {
      setLoading(null);
    }
  };

  const handleDemoAuth = async (network: "base" | "arc") => {
    setError(null);
    setLoading(network);
    setStatusMessage("Authenticating in Demo Web3 Mode...");

    try {
      const mockAddress = `0x${Array(40)
        .fill(0)
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join("")}`;

      const response = await fetch("/api/auth-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          peerId: peerId || `peer-demo-${Math.random().toString(36).slice(2, 8)}`,
          walletAddress: mockAddress,
          network,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setStatusMessage("Demo Wallet Authenticated! 10 Tickets Credited.");
        onAuthSuccess(data.user);
      } else {
        throw new Error(data.error || "Demo auth failed");
      }
    } catch (err: any) {
      setError(err.message || "Demo auth failed.");
    } finally {
      setLoading(null);
    }
  };

  const { processTicketPurchase } = useTransactionBridge();

  const buyTickets = async () => {
    if (!userSession) return;
    setLoading("buy");
    setError(null);
    try {
      const mockHash = `0x_tx_${Math.random().toString(36).substring(2, 15)}`;
      const result = await processTicketPurchase({
        userId: userSession.peerId,
        walletAddress: userSession.walletAddress,
        network: userSession.network || 'base',
        txHash: mockHash,
        loginTime: Date.now() - 60000,
        totalLifetimePlays: userSession.availableTickets || 0
      });

      if (result.success) {
        const newTotal = (userSession.availableTickets || 0) + 10;
        setStatusMessage(`Bought +10 Tickets! Total: ${newTotal}`);
        if (onBuyTicketsSuccess) {
          onBuyTicketsSuccess(newTotal);
        }
      } else {
        throw new Error(result.error || "Failed to purchase tickets");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="w-full bg-[#110c38]/90 backdrop-blur-md border border-[#644af1]/30 rounded-2xl p-5 shadow-2xl text-white">
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-[#644af1] to-[#a855f7] rounded-xl shadow-lg">
            <MdAccountBalanceWallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">Lottery Live Web3 Auth</h3>
            <p className="text-xs text-gray-300">
              Verify wallet to broadcast live and enter $1 = 10 ticket queue
            </p>
          </div>
        </div>

        {userSession && (
          <div className="flex items-center space-x-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-full text-xs font-semibold">
            <MdCheckCircle className="w-4 h-4" />
            <span>Verified Player</span>
          </div>
        )}
      </div>

      {userSession ? (
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs text-gray-400">Connected Wallet</div>
              <div className="font-mono font-medium text-sm text-purple-200 truncate max-w-[240px]">
                {userSession.walletAddress}
              </div>
              <div className="text-xs text-purple-400 mt-0.5 capitalize flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                {userSession.network} Network Active
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-purple-900/40 border border-purple-500/40 px-3 py-1.5 rounded-lg text-right">
                <div className="text-[10px] text-gray-300 uppercase tracking-wider font-semibold">
                  Tickets
                </div>
                <div className="font-extrabold text-amber-300 text-lg flex items-center justify-end gap-1">
                  <MdConfirmationNumber className="w-4 h-4 text-amber-400" />
                  {userSession.availableTickets}
                </div>
              </div>

              <button
                onClick={buyTickets}
                disabled={loading === "buy"}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold text-xs px-3 py-2 rounded-lg shadow-lg hover:scale-105 transition active:scale-95 disabled:opacity-50 flex items-center gap-1"
              >
                <MdFlashOn className="w-4 h-4" />
                {loading === "buy" ? "Buying..." : "+10 Tickets ($1)"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-gray-300">
            Sign in with your Web3 Wallet on <span className="text-blue-400 font-semibold">Base</span> or{" "}
            <span className="text-purple-400 font-semibold">ARC Network</span>. Authenticated players automatically receive 10 tickets ($1 value) and access to the live P2P video matching lobby.
          </p>

          <div className="flex flex-col gap-3">
            {/* Native Sign in with Base Button */}
            <div className="w-full flex justify-center">
              <SignInWithBaseButton
                colorScheme="dark"
                onClick={() => connectWallet("base")}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => connectWallet("base")}
                disabled={loading !== null}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg transition transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-blue-300"></span>
                <span>{loading === "base" ? "Connecting Base..." : "Connect Coinbase Wallet"}</span>
              </button>

              <button
                onClick={() => connectWallet("arc")}
                disabled={loading !== null}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg transition transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-purple-300"></span>
                <span>{loading === "arc" ? "Connecting ARC..." : "Connect ARC Wallet"}</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
            <span>No wallet extension? Use instant demo mode:</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleDemoAuth("base")}
                className="text-blue-300 hover:text-white underline font-semibold"
              >
                Demo Base
              </button>
              <span>•</span>
              <button
                onClick={() => handleDemoAuth("arc")}
                className="text-purple-300 hover:text-white underline font-semibold"
              >
                Demo ARC
              </button>
            </div>
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="mt-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs p-2.5 rounded-lg flex items-center space-x-2">
          <MdCheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {error && (
        <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-2.5 rounded-lg flex items-center space-x-2">
          <MdErrorOutline className="w-4 h-4 text-red-400 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}
    </div>
  );
};

export default WalletAuth;
