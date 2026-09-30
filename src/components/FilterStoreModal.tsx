import React, { useState, useEffect } from 'react';
import { X, Sparkles, Trophy, Flame, Check, Lock, ShoppingBag, Zap, Award } from 'lucide-react';
import { API_URL } from '@/utils/constants';

export interface FaceFilter {
  id: string;
  name: string;
  category: 'expressions' | 'hats' | 'halloween' | 'xmas' | 'masks';
  emoji: string;
  price: number;
  boost: number;
  keywords: string[];
  placement: 'top' | 'face' | 'eyes';
}

export interface FilterLeaderboardItem {
  filterId: string;
  name: string;
  emoji: string;
  category: string;
  boost: number;
  wins: number;
}

interface FilterStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  peerId: string;
  userTickets: number;
  onTicketsUpdated?: (newTickets: number) => void;
  onEquippedFilterChanged?: (filter: FaceFilter | null) => void;
}

export const FilterStoreModal: React.FC<FilterStoreModalProps> = ({
  isOpen,
  onClose,
  peerId,
  userTickets,
  onTicketsUpdated,
  onEquippedFilterChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'leaderboard'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [catalog, setCatalog] = useState<FaceFilter[]>([]);
  const [leaderboard, setLeaderboard] = useState<FilterLeaderboardItem[]>([]);
  const [ownedFilters, setOwnedFilters] = useState<string[]>([]);
  const [equippedFilterId, setEquippedFilterId] = useState<string | null>(null);
  const [dailyStreak, setDailyStreak] = useState<number>(0);
  const [dailyClaimEligible, setDailyClaimEligible] = useState<boolean>(false);
  const [tickets, setTickets] = useState<number>(userTickets);
  const [loading, setLoading] = useState<boolean>(false);
  const [claimingDaily, setClaimingDaily] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    setTickets(userTickets);
  }, [userTickets]);

  const fetchData = async () => {
    if (!peerId) return;
    setLoading(true);
    try {
      // Fetch catalog
      const catRes = await fetch(`${API_URL}/api/store/catalog`);
      const catData = await catRes.json();
      if (catData.success) {
        setCatalog(catData.filters || []);
      }

      // Fetch user inventory
      const invRes = await fetch(`${API_URL}/api/store/inventory/${peerId}`);
      const invData = await invRes.json();
      if (invData.success) {
        setOwnedFilters(invData.inventory.owned || []);
        setEquippedFilterId(invData.inventory.equipped || null);
        setDailyStreak(invData.inventory.dailyStreak || 0);
        setDailyClaimEligible(!!invData.inventory.dailyClaimEligible);

        // Notify parent component of equipped filter
        const eqFilter = (catData.filters || []).find((f: FaceFilter) => f.id === invData.inventory.equipped) || null;
        onEquippedFilterChanged?.(eqFilter);
      }

      // Fetch Leaderboard
      const lbRes = await fetch(`${API_URL}/api/store/leaderboard`);
      const lbData = await lbRes.json();
      if (lbData.success) {
        setLeaderboard(lbData.leaderboard || []);
      }
    } catch (err) {
      console.error("Store data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, peerId]);

  const handleClaimDaily = async () => {
    if (claimingDaily || !dailyClaimEligible) return;
    setClaimingDaily(true);
    try {
      const res = await fetch(`${API_URL}/api/store/claim-daily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerId }),
      });
      const data = await res.json();
      if (data.success) {
        setDailyStreak(data.dailyStreak);
        setDailyClaimEligible(false);
        setTickets(data.totalTickets);
        onTicketsUpdated?.(data.totalTickets);
        setActionMessage(`🔥 Claimed +${data.ticketsAwarded} Tickets! (${data.dailyStreak}-Day Streak)`);
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        setActionMessage(data.error || "Claim failed");
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err: any) {
      setActionMessage("Network error claiming daily reward");
      setTimeout(() => setActionMessage(null), 3000);
    } finally {
      setClaimingDaily(false);
    }
  };

  const handleBuyFilter = async (filter: FaceFilter) => {
    if (tickets < filter.price) {
      setActionMessage(`⚠️ Insufficient tickets. Need ${filter.price} tickets.`);
      setTimeout(() => setActionMessage(null), 3000);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/store/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerId, filterId: filter.id }),
      });
      const data = await res.json();
      if (data.success) {
        setOwnedFilters(data.inventory.owned || []);
        setTickets(data.remainingTickets);
        onTicketsUpdated?.(data.remainingTickets);
        setActionMessage(`🎉 Unlocked ${filter.emoji} ${filter.name}!`);
        setTimeout(() => setActionMessage(null), 3000);
      } else {
        setActionMessage(data.error || "Purchase failed");
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err: any) {
      setActionMessage("Error buying filter");
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleEquipFilter = async (filterId: string | null) => {
    try {
      const res = await fetch(`${API_URL}/api/store/equip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerId, filterId }),
      });
      const data = await res.json();
      if (data.success) {
        setEquippedFilterId(data.inventory.equipped);
        const eqFilter = catalog.find(f => f.id === data.inventory.equipped) || null;
        onEquippedFilterChanged?.(eqFilter);
        setActionMessage(data.inventory.equipped ? `✨ Equipped ${eqFilter?.emoji} ${eqFilter?.name}` : "Filter unequipped");
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      console.error("Equip filter error:", err);
    }
  };

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Items' },
    { id: 'expressions', label: 'Expressions 😱' },
    { id: 'hats', label: 'Hats 👑' },
    { id: 'halloween', label: 'Halloween 🎃' },
    { id: 'xmas', label: 'Xmas 🎅' },
    { id: 'masks', label: 'Masks 🥷' },
  ];

  const filteredCatalog = selectedCategory === 'all'
    ? catalog
    : catalog.filter(f => f.category === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                Facebet Cosmetic Store
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  AI Boosted
                </span>
              </h2>
              <p className="text-xs text-slate-400">Equip animated overlays to increase Gemini duel win probability</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Daily Streak Counter */}
            <button
              onClick={handleClaimDaily}
              disabled={!dailyClaimEligible || claimingDaily}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
                dailyClaimEligible
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-amber-400/50 shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 cursor-not-allowed'
              }`}
            >
              <Flame className={`w-4 h-4 ${dailyClaimEligible ? 'text-yellow-300 animate-bounce' : 'text-slate-500'}`} />
              <span>
                {dailyClaimEligible
                  ? `Claim Daily (+${3 + Math.min(dailyStreak, 6)} 🎟️)`
                  : `Streak: ${dailyStreak} Days (Claimed)`}
              </span>
            </button>

            {/* Ticket Counter */}
            <div className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 font-bold text-xs flex items-center gap-1.5 shadow-inner">
              <span>🎟️</span>
              <span>{tickets} Tickets</span>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Status Banner */}
        {actionMessage && (
          <div className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white text-xs font-semibold text-center animate-in slide-in-from-top duration-200">
            {actionMessage}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-4 bg-slate-900 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 ${
              activeTab === 'catalog'
                ? 'border-cyan-400 text-cyan-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Filter Store</span>
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 ${
              activeTab === 'leaderboard'
                ? 'border-amber-400 text-amber-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Top 5 Winning Filters</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'catalog' ? (
            <>
              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      selectedCategory === cat.id
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Grid of Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredCatalog.map((filter) => {
                  const isOwned = ownedFilters.includes(filter.id);
                  const isEquipped = equippedFilterId === filter.id;

                  return (
                    <div
                      key={filter.id}
                      className={`relative p-4 rounded-xl border transition-all flex flex-col justify-between ${
                        isEquipped
                          ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-500/10'
                          : isOwned
                          ? 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl filter drop-shadow-md select-none">{filter.emoji}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> +{Math.round(filter.boost * 100)}% Win Odds
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div>
                        <h4 className="font-bold text-white text-sm flex items-center gap-2">
                          {filter.name}
                          {isEquipped && <Check className="w-4 h-4 text-cyan-400" />}
                        </h4>
                        <div className="flex flex-wrap gap-1 my-2">
                          {filter.keywords.map((kw, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              #{kw}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                        {isEquipped ? (
                          <button
                            onClick={() => handleEquipFilter(null)}
                            className="w-full py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold transition flex items-center justify-center gap-1"
                          >
                            Unequip Filter
                          </button>
                        ) : isOwned ? (
                          <button
                            onClick={() => handleEquipFilter(filter.id)}
                            className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1 shadow-md shadow-cyan-500/20"
                          >
                            Equip Filter
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBuyFilter(filter)}
                            className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                          >
                            <span>Buy for {filter.price} 🎟️</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Leaderboard Tab */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/30 flex items-center gap-3">
                <Award className="w-8 h-8 text-amber-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-white">Top 5 Winning Filters This Week</h3>
                  <p className="text-xs text-slate-400">
                    Calculated from actual Gemini AI battle decisions. Equip high-performing filters to maximize your win streaks!
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {leaderboard.map((item, index) => {
                  const isOwned = ownedFilters.includes(item.filterId);
                  const isEquipped = equippedFilterId === item.filterId;
                  const filterObj = catalog.find(f => f.id === item.filterId);

                  const rankBadges = ['🥇 1st', '🥈 2nd', '🥉 3rd', '4th', '5th'];

                  return (
                    <div
                      key={item.filterId}
                      className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-wrap items-center justify-between gap-4 transition hover:border-slate-600"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-black text-amber-400 w-12">{rankBadges[index] || `#${index + 1}`}</span>
                        <span className="text-3xl select-none">{item.emoji}</span>
                        <div>
                          <h4 className="font-bold text-white text-sm flex items-center gap-2">
                            {item.name}
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                              +{Math.round(item.boost * 100)}% Win Odds
                            </span>
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Category: <span className="capitalize text-slate-300">{item.category}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-cyan-400">{item.wins} Wins</div>
                          <div className="text-[10px] text-slate-500">This Week</div>
                        </div>

                        {filterObj && (
                          isEquipped ? (
                            <span className="px-3 py-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-500/40 text-xs font-bold">
                              Equipped
                            </span>
                          ) : isOwned ? (
                            <button
                              onClick={() => handleEquipFilter(item.filterId)}
                              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-md shadow-cyan-500/20"
                            >
                              Equip
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBuyFilter(filterObj)}
                              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md shadow-amber-500/20"
                            >
                              Buy {filterObj.price} 🎟️
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
