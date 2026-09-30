import mongoose from 'mongoose';

// ─── Face Filter Store Catalog ────────────────────────────────────────────────
// Cosmetic overlays that increase Gemini duel win probability. Boosts double
// when the equipped filter's category matches the active duel theme category.
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

export const FILTER_CATALOG: FaceFilter[] = [
  { id: 'shock-eyes',    name: 'Shock Eyes',     category: 'expressions', emoji: '😱', price: 3, boost: 0.04, keywords: ['SHOCK', 'WIDE-EYED'],       placement: 'face' },
  { id: 'unhinged-grin', name: 'Unhinged Grin',  category: 'expressions', emoji: '🤪', price: 3, boost: 0.04, keywords: ['GRIN', 'UNHINGED'],        placement: 'face' },
  { id: 'star-struck',   name: 'Star Struck',    category: 'expressions', emoji: '🤩', price: 5, boost: 0.06, keywords: ['STARSTRUCK', 'HYPE'],       placement: 'eyes' },
  { id: 'crown',         name: 'Royal Crown',    category: 'hats',        emoji: '👑', price: 8, boost: 0.08, keywords: ['ROYAL', 'KING'],           placement: 'top'  },
  { id: 'cowboy',        name: 'Cowboy Hat',     category: 'hats',        emoji: '🤠', price: 4, boost: 0.05, keywords: ['WILD WEST', 'COWBOY'],     placement: 'top'  },
  { id: 'tophat',        name: 'Top Hat',        category: 'hats',        emoji: '🎩', price: 4, boost: 0.05, keywords: ['CLASSY', 'GENTLEMAN'],     placement: 'top'  },
  { id: 'pumpkin',       name: 'Pumpkin Head',   category: 'halloween',   emoji: '🎃', price: 5, boost: 0.06, keywords: ['SPOOKY', 'PUMPKIN'],       placement: 'face' },
  { id: 'ghost',         name: 'Ghost Mode',     category: 'halloween',   emoji: '👻', price: 5, boost: 0.06, keywords: ['SPOOKY', 'GHOST'],         placement: 'face' },
  { id: 'witch-hat',     name: 'Witch Hat',      category: 'halloween',   emoji: '🧙', price: 6, boost: 0.07, keywords: ['SPOOKY', 'WITCH'],         placement: 'top'  },
  { id: 'santa-hat',     name: 'Santa Hat',      category: 'xmas',        emoji: '🎅', price: 5, boost: 0.06, keywords: ['FESTIVE', 'SANTA'],        placement: 'top'  },
  { id: 'reindeer',      name: 'Reindeer',       category: 'xmas',        emoji: '🦌', price: 5, boost: 0.06, keywords: ['FESTIVE', 'REINDEER'],     placement: 'top'  },
  { id: 'snowman',       name: 'Snow Face',      category: 'xmas',        emoji: '⛄', price: 4, boost: 0.05, keywords: ['FESTIVE', 'FROSTY'],       placement: 'face' },
  { id: 'ninja-mask',    name: 'Ninja Mask',     category: 'masks',       emoji: '🥷', price: 6, boost: 0.07, keywords: ['STEALTH', 'NINJA'],        placement: 'face' },
  { id: 'robot-mask',    name: 'Cyber Mask',     category: 'masks',       emoji: '🤖', price: 7, boost: 0.08, keywords: ['CYBER', 'NEON'],           placement: 'face' },
  { id: 'party-mask',    name: 'Party Shades',   category: 'masks',       emoji: '🥸', price: 3, boost: 0.04, keywords: ['DISGUISE', 'PARTY'],       placement: 'eyes' },
];

export const getFilterById = (id: string | null | undefined): FaceFilter | null =>
  id ? FILTER_CATALOG.find((f) => f.id === id) || null : null;

// ─── Boost helper (used by evaluate-duel prompt injection) ────────────────────
// Base boost, doubled when the filter category matches the theme category.
export const computeFilterBoost = (
  filterId: string | null | undefined,
  themeCategory: FaceFilter['category'] | null | undefined,
): number => {
  const f = getFilterById(filterId);
  if (!f) return 0;
  return f.category === themeCategory ? f.boost * 2 : f.boost;
};

// ─── Daily Streak Rewards ─────────────────────────────────────────────────────
// Growing bonus tickets for consecutive-day claims (capped).
export const DAILY_BASE_TICKETS = 3;
export const DAILY_STREAK_BONUS_PER_DAY = 1;
export const DAILY_STREAK_MAX = 7;

export const dailyClaimReward = (streak: number): { tickets: number; nextStreak: number } => {
  const capped = Math.max(1, Math.min(streak, DAILY_STREAK_MAX));
  const tickets = DAILY_BASE_TICKETS + (capped - 1) * DAILY_STREAK_BONUS_PER_DAY;
  return { tickets, nextStreak: capped };
};

// Returns the correct next-streak counter given the last-claim timestamp.
// - Same UTC day → not eligible.
// - Exactly next UTC day → increments streak.
// - Missed a day → resets to 1.
export const evaluateStreak = (lastClaimAt: Date | null | undefined, now: Date = new Date()) => {
  const toDayNum = (d: Date) => Math.floor(d.getTime() / 86_400_000);
  const today = toDayNum(now);
  if (!lastClaimAt) return { eligible: true, nextStreak: 1 };
  const last = toDayNum(new Date(lastClaimAt));
  if (last === today) return { eligible: false, nextStreak: 0 };
  if (last === today - 1) return { eligible: true, nextStreak: 0 }; // caller adds current streak + 1
  return { eligible: true, nextStreak: 1 };
};

// ─── Inventory Mongoose Model ─────────────────────────────────────────────────
const InventorySchema = new mongoose.Schema({
  peerId:       { type: String, required: true, unique: true, index: true },
  owned:        { type: [String], default: [] },
  equipped:     { type: String, default: null },
  lastDailyAt:  { type: Date, default: null },
  dailyStreak:  { type: Number, default: 0 },
});

export const Inventory =
  (mongoose.models.Inventory as any) ||
  mongoose.model('Inventory', InventorySchema);

// ─── In-Memory Fallback (when Mongo is unavailable) ───────────────────────────
export interface InventoryDoc {
  peerId: string;
  owned: string[];
  equipped: string | null;
  lastDailyAt: Date | null;
  dailyStreak: number;
}

export const inMemoryInventory = new Map<string, InventoryDoc>();

export const getOrCreateInventory = async (peerId: string, isMongoConnected: boolean): Promise<InventoryDoc> => {
  if (isMongoConnected) {
    try {
      const doc = await (Inventory as any).findOneAndUpdate(
        { peerId },
        { $setOnInsert: { peerId, owned: [], equipped: null, lastDailyAt: null, dailyStreak: 0 } },
        { upsert: true, new: true },
      );
      return {
        peerId: doc.peerId,
        owned: doc.owned || [],
        equipped: doc.equipped || null,
        lastDailyAt: doc.lastDailyAt || null,
        dailyStreak: doc.dailyStreak || 0,
      };
    } catch {
      /* fallthrough to memory */
    }
  }
  let mem = inMemoryInventory.get(peerId);
  if (!mem) {
    mem = { peerId, owned: [], equipped: null, lastDailyAt: null, dailyStreak: 0 };
    inMemoryInventory.set(peerId, mem);
  }
  return mem;
};

// ─── Filter Leaderboard Stats ───────────────────────────────────────────
const FilterWinSchema = new mongoose.Schema({
  filterId:  { type: String, required: true, index: true },
  wins:      { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

export const FilterWin =
  (mongoose.models.FilterWin as any) ||
  mongoose.model('FilterWin', FilterWinSchema);

export const inMemoryFilterWins = new Map<string, number>();

export const recordFilterWin = async (filterId: string | null | undefined, isMongoConnected: boolean) => {
  if (!filterId) return;
  if (isMongoConnected) {
    try {
      await (FilterWin as any).findOneAndUpdate(
        { filterId },
        { $inc: { wins: 1 }, $set: { updatedAt: new Date() } },
        { upsert: true }
      );
      return;
    } catch {}
  }
  const current = inMemoryFilterWins.get(filterId) || 0;
  inMemoryFilterWins.set(filterId, current + 1);
};

export const getFilterLeaderboard = async (isMongoConnected: boolean) => {
  let stats: Array<{ filterId: string; wins: number }> = [];

  if (isMongoConnected) {
    try {
      const docs = await (FilterWin as any).find({}).sort({ wins: -1 }).limit(5);
      stats = docs.map((d: any) => ({ filterId: d.filterId, wins: d.wins }));
    } catch {}
  }

  if (stats.length === 0) {
    // Fallback to in-memory map or default catalog preview stats
    const memEntries = Array.from(inMemoryFilterWins.entries())
      .map(([filterId, wins]) => ({ filterId, wins }))
      .sort((a, b) => b.wins - a.wins);

    if (memEntries.length > 0) {
      stats = memEntries.slice(0, 5);
    } else {
      // Default seeded leaderboard for instant wow factor
      stats = [
        { filterId: 'crown', wins: 142 },
        { filterId: 'robot-mask', wins: 98 },
        { filterId: 'ninja-mask', wins: 76 },
        { filterId: 'star-struck', wins: 64 },
        { filterId: 'pumpkin', wins: 41 },
      ];
    }
  }

  return stats.map(s => {
    const item = getFilterById(s.filterId);
    return {
      filterId: s.filterId,
      name: item?.name || s.filterId,
      emoji: item?.emoji || '👑',
      category: item?.category || 'hats',
      boost: item?.boost || 0.08,
      wins: s.wins
    };
  });
};

export const saveInventory = async (doc: InventoryDoc, isMongoConnected: boolean) => {
  if (isMongoConnected) {
    try {
      await (Inventory as any).findOneAndUpdate(
        { peerId: doc.peerId },
        {
          owned: doc.owned,
          equipped: doc.equipped,
          lastDailyAt: doc.lastDailyAt,
          dailyStreak: doc.dailyStreak,
        },
        { upsert: true, new: true },
      );
      return;
    } catch {
      /* fallthrough */
    }
  }
  inMemoryInventory.set(doc.peerId, { ...doc });
};

