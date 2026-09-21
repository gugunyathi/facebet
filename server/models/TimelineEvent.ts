import mongoose, { Schema } from 'mongoose';

export interface ITimelineEvent {
  id: string;
  type: 'jackpot' | 'match' | 'pool' | 'ticket_buy';
  title: string;
  amount?: string;
  tickets?: string;
  wallet?: string;
  network?: string;
  time?: string;
  txHash?: string;
  createdAt: Date;
}

const TimelineEventSchema = new Schema<ITimelineEvent>({
  id: { type: String, required: true, unique: true },
  type: { type: String, enum: ['jackpot', 'match', 'pool', 'ticket_buy'], required: true },
  title: { type: String, required: true },
  amount: { type: String },
  tickets: { type: String },
  wallet: { type: String },
  network: { type: String, default: 'Base Mainnet' },
  time: { type: String },
  txHash: { type: String },
  createdAt: { type: Date, default: Date.now }
});

TimelineEventSchema.index({ createdAt: -1 });

export const TimelineEvent = mongoose.models.TimelineEvent || mongoose.model<ITimelineEvent>('TimelineEvent', TimelineEventSchema);

export const inMemoryTimelineEvents: ITimelineEvent[] = [
  {
    id: "draw-8492",
    type: "jackpot",
    title: "Round #8492 Lottery Winner",
    amount: "$250 USD",
    tickets: "10 Tickets",
    wallet: "0x8f3a...912b",
    network: "Base Mainnet",
    time: "2 minutes ago",
    txHash: "0xa81f3d...92bc",
    createdAt: new Date(Date.now() - 2 * 60 * 1000)
  },
  {
    id: "draw-8491",
    type: "match",
    title: "Live Face-to-Face P2P Arena Match",
    tickets: "2 Verified Players matched",
    network: "ARC Network",
    time: "12 minutes ago",
    createdAt: new Date(Date.now() - 12 * 60 * 1000)
  },
  {
    id: "draw-8490",
    type: "jackpot",
    title: "Round #8491 Lottery Winner",
    amount: "$180 USD",
    tickets: "20 Tickets",
    wallet: "0x3c1b...fa74",
    network: "Base Mainnet",
    time: "25 minutes ago",
    txHash: "0x772a11...440e",
    createdAt: new Date(Date.now() - 25 * 60 * 1000)
  },
  {
    id: "draw-8489",
    type: "pool",
    title: "Lottery Pool Refreshed ($1 = 10 Tickets)",
    tickets: "1,000 Tickets Issued",
    network: "ARC Network",
    time: "40 minutes ago",
    createdAt: new Date(Date.now() - 40 * 60 * 1000)
  }
];

export default TimelineEvent;
