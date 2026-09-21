import React, { useState, useEffect } from "react";
import { MdTimeline, MdConfirmationNumber, MdStars, MdOpenInNew, MdRefresh } from "react-icons/md";

interface TimelinePageProps {
  onGoToArena: () => void;
}

export const TimelinePage: React.FC<TimelinePageProps> = ({ onGoToArena }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/timeline");
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

  return (
    <div className="w-full h-full overflow-y-auto bg-[#07012c] text-white p-4 sm:p-8 flex justify-center">
      <div className="max-w-2xl w-full space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-500 text-black rounded-2xl shadow-lg">
              <MdTimeline className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Lottery Timeline</h1>
              <p className="text-xs text-gray-300">
                Live activity, jackpot winners, and verified draw records on Base & ARC
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchTimeline}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold p-2.5 rounded-xl shadow transition"
              title="Refresh Timeline"
            >
              <MdRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onGoToArena}
              className="bg-[#644af1] hover:bg-[#5239e0] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg transition"
            >
              ← Back to Arena
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-[#110c38]/90 border border-amber-500/30 rounded-xl p-3 text-center">
            <div className="text-[10px] text-gray-400 font-semibold uppercase">Total Pool</div>
            <div className="text-lg font-extrabold text-amber-300">$2,450.00</div>
          </div>

          <div className="bg-[#110c38]/90 border border-purple-500/30 rounded-xl p-3 text-center">
            <div className="text-[10px] text-gray-400 font-semibold uppercase">Tickets Issued</div>
            <div className="text-lg font-extrabold text-purple-300">24,500</div>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-[#110c38]/90 border border-emerald-500/30 rounded-xl p-3 text-center">
            <div className="text-[10px] text-gray-400 font-semibold uppercase">Arena Matches</div>
            <div className="text-lg font-extrabold text-emerald-300">1,280 Live</div>
          </div>
        </div>

        {/* Timeline Events List */}
        <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-white/10">
          {events.map((evt) => (
            <div
              key={evt.id || evt._id}
              className="relative pl-10 bg-[#110c38]/80 border border-white/10 rounded-2xl p-4 shadow-lg hover:border-[#644af1]/50 transition"
            >
              {/* Timeline Bullet Point */}
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
      </div>
    </div>
  );
};

export default TimelinePage;
