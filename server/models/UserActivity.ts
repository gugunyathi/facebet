import mongoose, { Schema } from 'mongoose';

export interface IUserActivity {
  userId: string;
  walletAddress?: string;
  network?: 'base' | 'arc' | 'solana' | 'arbitrum' | 'none';
  activityType: 'wallet_signin' | 'ticket_buy' | 'round_play' | 'jackpot_win' | 'setting_update';
  title: string;
  details?: string;
  txHash?: string;
  ticketsAdded?: number;
  payoutAmount?: string;
  timestamp: Date;
}

const UserActivitySchema = new Schema<IUserActivity>({
  userId: { type: String, required: true, index: true },
  walletAddress: { type: String },
  network: { type: String, default: 'none' },
  activityType: { 
    type: String, 
    enum: ['wallet_signin', 'ticket_buy', 'round_play', 'jackpot_win', 'setting_update'],
    required: true 
  },
  title: { type: String, required: true },
  details: { type: String },
  txHash: { type: String },
  ticketsAdded: { type: Number },
  payoutAmount: { type: String },
  timestamp: { type: Date, default: Date.now }
});

UserActivitySchema.index({ userId: 1, timestamp: -1 });

export const UserActivity = mongoose.models.UserActivity || mongoose.model<IUserActivity>('UserActivity', UserActivitySchema);

export const inMemoryUserActivities: IUserActivity[] = [];

export default UserActivity;
