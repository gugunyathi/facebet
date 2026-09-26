import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MdClose, MdCreditCard, MdCheckCircle, MdErrorOutline, MdLock, MdFlashOn } from "react-icons/md";
import { createOnrampKit } from "@circle-fin/onramp-kit";
import { API_URL } from "../utils/constants";

interface ArcOnrampWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  userWalletAddress?: string;
  appUserId?: string;
  onDepositSettledSuccess?: (ticketsAdded: number, amountUSD: number) => void;
}

export const ArcOnrampWidget: React.FC<ArcOnrampWidgetProps> = ({
  isOpen,
  onClose,
  userWalletAddress = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  appUserId = "user-arc-player",
  onDepositSettledSuccess,
}) => {
  const [destinationAddress, setDestinationAddress] = useState<string>(userWalletAddress);
  const [currency, setCurrency] = useState<"USDC" | "EURC">("USDC");
  const [amountUSD, setAmountUSD] = useState<number>(10.00);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [settledSuccess, setSettledSuccess] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    if (userWalletAddress) {
      setDestinationAddress(userWalletAddress);
    }
  }, [userWalletAddress]);

  // Mint session and initialize Onramp widget
  const handleStartOnramp = async () => {
    setError(null);
    setSettledSuccess(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/onramp/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appUserId: appUserId || destinationAddress,
          destinationAddress: destinationAddress.trim() || userWalletAddress,
          currency,
          amountUSD,
          referrerDomain: typeof window !== "undefined" ? window.location.hostname : "localhost",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.sessionToken) {
        throw new Error(data.error || "Could not generate Arc Onramp session token.");
      }

      setSessionToken(data.sessionToken);

      // Attempt mounting via official @circle-fin/onramp-kit createOnrampKit
      setTimeout(() => {
        try {
          if (containerRef.current) {
            const kit = createOnrampKit();
            widgetRef.current = kit.mountIframe({
              session: data.sessionToken,
              container: containerRef.current,
              onDepositSettled: async ({ payload }: any) => {
                console.log("Arc Onramp Deposit Settled:", payload);
                await handleDepositSettledOnBackend(payload?.amount || amountUSD);
              },
              onDepositNotCompleted: ({ code }: any) => {
                console.warn("Arc Onramp Deposit Not Completed:", code);
              },
            });
          }
        } catch (pkgErr) {
          console.warn("@circle-fin/onramp-kit mount fallback to iframe container:", pkgErr);
        }
      }, 100);
    } catch (err: any) {
      console.error("Arc Onramp initialization error:", err);
      setError(err.message || "Failed to initialize Arc Onramp widget.");
    } finally {
      setLoading(false);
    }
  };

  const handleDepositSettledOnBackend = async (settledAmountUSD: number) => {
    try {
      const res = await fetch(`${API_URL}/api/onramp/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appUserId,
          destinationAddress,
          amountUSD: settledAmountUSD || amountUSD,
          currency,
          txHash: `0x_arc_onramp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const ticketsGranted = data.ticketsGranted || Math.max(10, Math.floor(settledAmountUSD * 10));
        setSettledSuccess(`🎉 Onramp Deposit Settled! +${ticketsGranted} Tickets ($${settledAmountUSD} Arc ${currency}) credited to your account!`);
        if (onDepositSettledSuccess) {
          onDepositSettledSuccess(ticketsGranted, settledAmountUSD);
        }
      }
    } catch (backendErr) {
      console.error("Failed to process backend deposit settlement:", backendErr);
    }
  };

  const handleSimulateSandboxDeposit = async () => {
    setLoading(true);
    await handleDepositSettledOnBackend(amountUSD);
    setLoading(false);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[99999] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0e0a2d] border border-[#644af1]/60 rounded-2xl max-w-xl w-full p-4 sm:p-6 relative shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        
        {/* Modal Close Button */}
        <button
          onClick={() => {
            if (widgetRef.current?.close) {
              try { widgetRef.current.close(); } catch {}
            }
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-gray-300 hover:text-white transition cursor-pointer"
          aria-label="Close Onramp Modal"
        >
          <MdClose className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 rounded-xl shadow-md shrink-0">
            <MdCreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <span>Arc Fiat Onramp</span>
              <span className="text-[10px] bg-purple-500/30 text-purple-200 border border-purple-400/40 px-2 py-0.5 rounded-full font-mono font-bold">
                Circle App Kit
              </span>
            </h2>
            <p className="text-xs text-purple-300 font-medium">
              Buy USDC or EURC on Arc directly with Fiat, Apple Pay & Cards
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-purple-950/40 border border-purple-500/30 rounded-xl p-3 text-xs text-purple-200 leading-relaxed flex items-start gap-2">
          <MdLock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong>Circle Powered Onramp on Arc Network:</strong> Complete purchases securely using Card, Apple Pay, Google Pay, or EU/US Bank Transfers. Received stablecoins settle directly into your Arc wallet address.
          </div>
        </div>

        {/* Input Configuration Form */}
        {!sessionToken ? (
          <div className="space-y-3.5 bg-white/5 border border-white/10 p-4 rounded-xl">
            {/* Destination Address */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                Destination Arc Wallet Address
              </label>
              <input
                type="text"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-black/60 border border-purple-500/40 rounded-lg px-3 py-2 text-xs font-mono text-purple-200 focus:outline-none focus:border-purple-400"
              />
            </div>

            {/* Currency & Preset Amounts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Stablecoin Token
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrency("USDC")}
                    className={`flex-1 py-1.5 rounded-lg border font-extrabold text-xs transition cursor-pointer ${
                      currency === "USDC"
                        ? "bg-purple-600 text-white border-purple-400 shadow-md"
                        : "bg-black/40 text-gray-400 border-white/10"
                    }`}
                  >
                    💵 USDC (Arc)
                  </button>
                  <button
                    onClick={() => setCurrency("EURC")}
                    className={`flex-1 py-1.5 rounded-lg border font-extrabold text-xs transition cursor-pointer ${
                      currency === "EURC"
                        ? "bg-purple-600 text-white border-purple-400 shadow-md"
                        : "bg-black/40 text-gray-400 border-white/10"
                    }`}
                  >
                    💶 EURC (Arc)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Purchase Amount ($ USD)
                </label>
                <div className="flex gap-1.5">
                  {[5, 10, 25, 50].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmountUSD(amt)}
                      className={`flex-1 py-1.5 rounded-lg border font-extrabold text-xs transition cursor-pointer ${
                        amountUSD === amt
                          ? "bg-amber-500 text-black border-amber-300 shadow-md"
                          : "bg-black/40 text-gray-300 border-white/10"
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Granted Tickets Preview */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 flex items-center justify-between text-xs">
              <span className="text-gray-300 font-semibold">You will receive on Arc:</span>
              <span className="text-amber-300 font-extrabold flex items-center gap-1 text-sm">
                <MdFlashOn className="w-4 h-4 text-amber-400" />
                +{Math.max(10, Math.floor(amountUSD * 10))} Lottery Tickets (${amountUSD} {currency})
              </span>
            </div>

            {/* Launch Onramp Button */}
            <button
              onClick={handleStartOnramp}
              disabled={loading || !destinationAddress}
              className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-black text-sm py-3 rounded-xl shadow-lg transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <MdCreditCard className="w-5 h-5" />
              <span>{loading ? "Generating Arc Onramp Session..." : "Launch Circle Arc Onramp Widget"}</span>
            </button>
          </div>
        ) : (
          /* Embedded Widget Frame Container */
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-purple-950/80 px-3 py-1.5 rounded-lg border border-purple-500/40 text-xs">
              <span className="text-purple-200 font-semibold">
                Arc Onramp Session Active ({currency} Destination: {destinationAddress.substring(0, 6)}...{destinationAddress.slice(-4)})
              </span>
              <button
                onClick={() => setSessionToken(null)}
                className="text-amber-300 hover:text-white underline font-bold"
              >
                Change Config
              </button>
            </div>

            {/* Target Container Element for Onramp SDK */}
            <div
              id="onramp-root"
              ref={containerRef}
              className="w-full h-[480px] bg-black/90 border-2 border-purple-500/60 rounded-xl overflow-hidden relative shadow-inner flex flex-col items-center justify-center"
            >
              <iframe
                src={`https://onramp-demo.arc.io/?destinationAddress=${encodeURIComponent(destinationAddress)}&currency=${currency}&amount=${amountUSD}&session=${encodeURIComponent(sessionToken)}`}
                className="w-full h-full border-0 rounded-xl"
                title="Arc Onramp Widget"
                allow="camera; payment; geolocation"
              />
            </div>

            {/* Sandbox Simulation Button */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <span className="text-gray-300 text-center sm:text-left">
                Testing in Sandbox? Click below to simulate instant settlement:
              </span>
              <button
                onClick={handleSimulateSandboxDeposit}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg shadow transition cursor-pointer shrink-0"
              >
                {loading ? "Settling..." : "✅ Simulate Deposit Settlement"}
              </button>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {settledSuccess && (
          <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 text-xs p-3 rounded-xl flex items-center space-x-2 animate-bounce">
            <MdCheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold">{settledSuccess}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-xs p-3 rounded-xl flex items-center space-x-2">
            <MdErrorOutline className="w-5 h-5 text-red-400 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ArcOnrampWidget;
