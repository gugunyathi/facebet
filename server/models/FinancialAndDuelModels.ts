import mongoose from 'mongoose';

// A. Ledger Schema tracking Paystack and Crypto asset intakes
const PaymentLedgerSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  walletAddress: { type: String, default: null },
  email: { type: String, default: null }, // Required for Paystack invoicing
  method: { type: String, enum: ['paystack', 'crypto'], required: true },
  network: { type: String, enum: ['base', 'arc', 'fiat'], required: true },
  referenceOrHash: { type: String, required: true, unique: true },
  amountUSD: { type: Number, required: true },
  ticketsGranted: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

export const PaymentLedger = mongoose.models.PaymentLedger || mongoose.model('PaymentLedger', PaymentLedgerSchema);

// B. Duel Arena Match Room tracking schema
const DuelRoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  player1PeerId: { type: String, required: true },
  player1Wallet: { type: String, required: true },
  player2PeerId: { type: String, default: null }, // Null until second challenger binds
  player2Wallet: { type: String, default: null },
  stakeAmountUSD: { type: Number, required: true },
  status: { type: String, enum: ['waiting', 'active', 'judging', 'complete'], default: 'waiting' },
  winnerWallet: { type: String, default: null },
  createdAt: { type: Date, default: Date.now, expires: 1800 } // Ttl cleanup after 30 minutes
});

export const DuelRoom = mongoose.models.DuelRoom || mongoose.model('DuelRoom', DuelRoomSchema);

// In-memory fallbacks when MongoDB is not connected
export const inMemoryPaymentLedger: any[] = [];
export const inMemoryDuelRooms: any[] = [];
