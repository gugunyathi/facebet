import mongoose, { Schema } from 'mongoose';

export interface IFeedItem {
  userId: string;
  walletAddress: string;
  network: 'base' | 'arc' | 'solana' | 'arbitrum';
  videoUrl: string;
  txHash: string;
  aiReason: string;
  likes: number;
  createdAt: Date;
}

const FeedItemSchema = new Schema<IFeedItem>({
  userId: { type: String, required: true },
  walletAddress: { type: String, required: true },
  network: { type: String, enum: ['base', 'arc', 'solana', 'arbitrum'], required: true },
  videoUrl: { type: String, required: true }, // URL path to the stored 10-second clip
  txHash: { type: String, required: true, unique: true }, // The cryptographic hash order token
  aiReason: { type: String, required: true }, // The reason Gemini granted the lottery win
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Index chronologically for immediate TikTok-style endless scrolling delivery optimization
FeedItemSchema.index({ createdAt: -1 });

export const FeedItem = mongoose.models.FeedItem || mongoose.model<IFeedItem>('FeedItem', FeedItemSchema);

export default FeedItem;
