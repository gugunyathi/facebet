import React, { useState, useEffect } from "react";
import { MdTimeline, MdConfirmationNumber, MdStars, MdOpenInNew, MdRefresh, MdSwapHoriz, MdReceiptLong, MdFilterList } from "react-icons/md";
import { API_URL } from "../utils/constants";

interface TimelinePageProps {
  onGoToArena: () => void;
}

const MOCK_TRANSACTIONS = [
  {
    id: "tx-1",
    type: "jackpot_win",
    title: "Jackpot Winnings Claimed",
    token: "$FBET",
    amount: "+1,240.00 FBET",
    usdValue: "$124.00",
    network: "Base Mainnet",
    time: "2 mins ago",
    txHash: "0x49f8b21c93ad8e1f0a2",
    status: "Confirmed"
  },
  {
    id: "tx-2",
    type: "bid_entry",
    title: "P2P Priority Queue Bid",
    token: "$FBET",
    amount: "-5.00 FBET",
    usdValue: "$0.50",
    network: "ARC Network",
    time: "14 mins ago",
    txHash: "0x88c12a7e44f91a3c77d",
    status: "Settled"
  },
  {
    id: "tx-3",
    type: "transfer",
    title: "$FBET Cross-Chain Bridge Deposit",
    token: "$FBET",
    amount: "+500.00 FBET",
    usdValue: "$50.00",
    network: "Base Mainnet",
    time: "1 hour ago",
    txHash: "0x119a00f8e3c77b2191e",
    status: "Confirmed"
  },
  {
    id: "tx-4",
    type: "ticket_purchase",
    title: "Duel Tickets Purchase (10x)",
    token: "USDC",
    amount: "-1.00 USDC",
    usdValue: "$1.00",
    network: "ARC Network",
    time: "3 hours ago",
    txHash: "0x992b414e01c44e9821f",
    status: "Confirmed"
  },
  {
    id: "tx-5",
    type: "bid_entry",
    title: "Standard Arena Match Stake",
    token: "Base ETH",
    amount: "-0.00008 ETH",
    usdValue: "$0.20",
    network: "Base Mainnet",
    time: "5 hours ago",
    txHash: "0x331e9a71f8c20a1bb7d",
    status: "Settled"
  },
  {
    id: "tx-6",
    type: "jackpot_win",
    title: "King-of-the-Hill Bonus Payout",
    token: "$FBET",
    amount: "+2,150.00 FBET",
    usdValue: "$215.00",
    network: "ARC Network",
    time: "1 day ago",
    txHash: "0x554c9102b33e11a884f",
    status: "Confirmed"
  }
];

export const TimelinePage: React.FC<TimelinePageProps> = ({ onGoToArena }) => {
  const [activeTab, setActiveTab] = useState<"timeline" | "transactions">("timeline");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokenFilter, setTokenFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/timeline`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.timeline)) {
          setEvents(data.timeline);
        }
      }
    } catch {
      // Retain existing timeline events gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
    const interval = setInterval(fetchTimeline, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredTransactions = MOCK_TRANSACTIONS.filter(tx => {
    if (tokenFilter !== "ALL" && tx.token !== tokenFilter) return false;
    if (typeFilter !== "ALL" && tx.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="w-full h-full overflow-y-auto bg-[#07012c] text-white p-4 sm:p-8 flex justify-center">
      <div className="max-w-3xl w-full space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-tr from-amber-400 to-purple-500 text-black rounded-2xl shadow-lg">
              <MdTimeline className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">FACEBET Activity &amp; Ledger</h1>
              <p className="text-xs text-gray-300">
                Live lottery draws, $FBET transfers, bid entries &amp; verified records on Base &amp; ARC
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={fetchTimeline}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold p-2.5 rounded-xl shadow transition cursor-pointer"
              title="Refresh Records"
            >
              <MdRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onGoToArena}
              className="bg-[#644af1] hover:bg-[#5239e0] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition cursor-pointer"
            >
              ← Back to Arena
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center space-x-2 bg-[#110c38] p-1.5 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveTab("timeline")}
            className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "timeline"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <MdTimeline className="w-4 h-4" />
            <span>Lottery Timeline</span>
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "transactions"
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-lg font-black"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <MdReceiptLong className="w-4 h-4" />
            <span>$FBET Transaction Ledger</span>
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#110c38]/90 border border-amber-500/30 rounded-xl p-3 text-center">
            <div className="text-[10px] text-gray-400 font-semibold uppercase">Total Pool</div>
            <div className="text-base sm:text-lg font-extrabold text-amber-300">$2,450.00</div>
          </div>

          <div className="bg-[#110c38]/90 border border-purple-500/30 rounded-xl p-3 text-center">
            <div className="text-[10px] text-gray-400 font-semibold uppercase">$FBET Circulating</div>
            <div className="text-base sm:text-lg font-extrabold text-purple-300">245,000 $FBET</div>
          </div>

          <div className="bg-[#110c38]/90 border border-cyan-500/30 rounded-xl p-3 text-center">
            <div className="text-[10px] text-gray-400 font-semibold uppercase">Tickets Issued</div>
            <div className="text-base sm:text-lg font-extrabold text-cyan-300">24,500</div>
          </div>

          <div className="bg-[#110c38]/90 border border-emerald-500/30 rounded-xl p-3 text-center">
            <div className="text-[10px] text-gray-400 font-semibold uppercase">Arena Matches</div>
            <div className="text-base sm:text-lg font-extrabold text-emerald-300">1,280 Live</div>
          </div>
        </div>

        {/* TAB 1: LOTTERY TIMELINE */}
        {activeTab === "timeline" && (
          <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-white/10">
            {events.map((evt) => (
              <div
                key={evt.id || evt._id}
                className="relative pl-10 bg-[#110c38]/80 border border-white/10 rounded-2xl p-4 shadow-lg hover:border-[#644af1]/50 transition"
              >
                <div className="absolute left-2.5 top-5 w-3.5 h-3.5 rounded-full bg-gradient-to-r from-amber-400 to-purple-500 border-2 border-[#07012c] shadow"></div>

                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span className="font-semibold text-purple-300">{evt.network || "Base Mainnet"}</span>
                  <span>{evt.time || (evt.createdAt ? new Date(evt.createdAt).toLocaleTimeString() : "Just now")}</span>
                </div>

                <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                  {evt.type === "jackpot" && <MdStars className="text-amber-400" />}
                  {(evt.type === "pool" || evt.type === "ticket_buy") && <MdConfirmationNumber className="text-purple-400" />}
                  <span>{evt.title}</span>
                </h3>

                {evt.amount && (
                  <div className="mt-2 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg inline-block">
                    Prize: {evt.amount}
                  </div>
                )}

                {evt.tickets && (
                  <div className="mt-2 ml-2 text-xs font-bold text-purple-300 bg-purple-500/10 border border-purple-500/30 px-3 py-1.5 rounded-lg inline-block">
                    {evt.tickets}
                  </div>
                )}

                {evt.wallet && (
                  <div className="mt-2 text-xs text-gray-300 font-mono flex items-center justify-between">
                    <span>Wallet: {evt.wallet}</span>
                    {evt.txHash && (
                      <span className="text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer">
                        <span>{evt.txHash.substring(0, 10)}...</span>
                        <MdOpenInNew className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: TRANSACTION HISTORY WITH TOKEN FILTERING */}
        {activeTab === "transactions" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-[#110c38] border border-white/10 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MdFilterList className="text-amber-400 w-5 h-5 shrink-0" />
                <span className="text-xs font-extrabold text-zinc-300 uppercase">Token Filter:</span>
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {["ALL", "$FBET", "USDC", "Base ETH"].map((tok) => (
                    <button
                      key={tok}
                      onClick={() => setTokenFilter(tok)}
                      className={`px-3 py-1 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                        tokenFilter === tok
                          ? "bg-amber-400 text-black shadow"
                          : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                      }`}
                    >
                      {tok}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-zinc-300 uppercase">Type:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-black/50 border border-white/20 text-xs font-bold text-white rounded-xl px-3 py-1.5 outline-none cursor-pointer"
                >
                  <option value="ALL">All Types</option>
                  <option value="jackpot_win">Jackpot Winnings</option>
                  <option value="bid_entry">Bid Entries / Stakes</option>
                  <option value="transfer">Token Transfers</option>
                  <option value="ticket_purchase">Ticket Purchases</option>
                </select>
              </div>
            </div>

            {/* Transaction List */}
            <div className="space-y-3">
              {filteredTransactions.length === 0 ? (
                <div className="bg-[#110c38]/60 border border-white/10 p-8 rounded-2xl text-center text-gray-400 text-xs">
                  No transactions match the selected filters.
                </div>
              ) : (
                filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-[#110c38]/90 border border-white/10 hover:border-amber-500/40 rounded-2xl p-4 shadow-lg transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start space-x-3 min-w-0">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        tx.type === "jackpot_win" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" :
                        tx.type === "bid_entry" ? "bg-purple-500/20 text-purple-300 border border-purple-500/40" :
                        tx.type === "transfer" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" :
                        "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      }`}>
                        <MdSwapHoriz className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-extrabold text-white truncate">{tx.title}</h4>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-white/10 text-amber-300 border border-white/10">
                            {tx.token}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>{tx.network}</span>
                          <span>•</span>
                          <span>{tx.time}</span>
                          <span>•</span>
                          <span className="text-purple-300">{tx.txHash.substring(0, 10)}...</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-sm font-black ${tx.amount.startsWith("+") ? "text-emerald-400" : "text-amber-300"}`}>
                        {tx.amount}
                      </div>
                      <div className="text-[10px] text-gray-400 font-semibold">
                        Eq. {tx.usdValue} ({tx.status})
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelinePage;
