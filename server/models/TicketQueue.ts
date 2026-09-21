import mongoose, { Schema } from 'mongoose';

export interface ITicketQueue {
  userId: string;
  walletAddress: string;
  network: 'base' | 'arc' | 'solana' | 'arbitrum';
  txHash: string; // Derived from client wallet transaction
  ticketIndex: number; // Ticket 1 through 10 from the $1 entry
  timestamp: Date; // Block timestamp of the transaction
  loginDuration: number; // Tie-breaker 1: total seconds logged in
  txCount: number; // Tie-breaker 2: lifetime user transactions
  status: 'queued' | 'playing' | 'processed';
  createdAt: Date;
}

const TicketQueueSchema = new Schema<ITicketQueue>({
  userId: { type: String, required: true },
  walletAddress: { type: String, required: true },
  network: { type: String, enum: ['base', 'arc', 'solana', 'arbitrum'], required: true },
  txHash: { type: String, required: true, unique: true }, // Derived from client wallet transaction
  ticketIndex: { type: Number, required: true }, // Ticket 1 through 10 from the $1 entry
  timestamp: { type: Date, required: true }, // Block timestamp of the transaction
  loginDuration: { type: Number, required: true }, // Tie-breaker 1: total seconds logged in
  txCount: { type: Number, required: true }, // Tie-breaker 2: lifetime user transactions
  status: { type: String, enum: ['queued', 'playing', 'processed'], default: 'queued' },
  createdAt: { type: Date, default: Date.now }
});

// Compound index heavily optimized for strict queue sorting rules:
// Oldest timestamp first -> Longest logged-in next -> Most plays last
TicketQueueSchema.index({ status: 1, timestamp: 1, loginDuration: -1, txCount: -1 });

export const TicketQueue = mongoose.models.TicketQueue || mongoose.model<ITicketQueue>('TicketQueue', TicketQueueSchema);

export default TicketQueue;
