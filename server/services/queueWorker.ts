import { TicketQueue } from '../models/TicketQueue';

export interface TicketMemoryItem {
  userId: string;
  walletAddress: string;
  network: 'base' | 'arc' | 'solana' | 'arbitrum';
  txHash: string;
  ticketIndex: number;
  timestamp: Date;
  loginDuration: number;
  txCount: number;
  status: 'queued' | 'playing' | 'processed';
  createdAt: Date;
}

export const inMemoryTickets: TicketMemoryItem[] = [];

export const QueueWorker = {
  isLoopRunning: false,
  activePlayer: null as any,

  async startEngineLoop(
    broadcastCallback: (message: any) => void,
    evaluateCallback: (player: any) => Promise<boolean>
  ) {
    if (this.isLoopRunning) return;
    this.isLoopRunning = true;
    console.log("🚀 Lottery Live Queue Worker loop successfully activated.");

    while (this.isLoopRunning) {
      let nextTicket: any = null;

      try {
        // 1. Fetch next ticket matching sorting criteria: oldest time -> max login -> max lifetime tx
        nextTicket = await (TicketQueue as any).findOne({ status: 'queued' })
          .sort({ timestamp: 1, loginDuration: -1, txCount: -1 });
      } catch {
        // Fallback to in-memory queue if MongoDB is disconnected or errors out
      }

      if (!nextTicket) {
        // Sort in-memory queue by timestamp asc, loginDuration desc, txCount desc
        const queuedMem = inMemoryTickets
          .filter(t => t.status === 'queued')
          .sort((a, b) => {
            if (a.timestamp.getTime() !== b.timestamp.getTime()) {
              return a.timestamp.getTime() - b.timestamp.getTime();
            }
            if (a.loginDuration !== b.loginDuration) {
              return b.loginDuration - a.loginDuration;
            }
            return b.txCount - a.txCount;
          });

        if (queuedMem.length > 0) {
          nextTicket = queuedMem[0];
        }
      }

      if (!nextTicket) {
        // Queue is empty, pause briefly before checking for new blockchain hashes
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }

      // 2. Lock the ticket state to 'playing'
      nextTicket.status = 'playing';
      if (typeof nextTicket.save === 'function') {
        try {
          await nextTicket.save();
        } catch {
          // ignore
        }
      }
      this.activePlayer = nextTicket;

      console.log(`🎯 Active 10s Window Started for Wallet: ${nextTicket.walletAddress}`);

      // 3. Broadcast execution state down to PeerJS frontend network frames
      broadcastCallback({
        action: 'START_ROUND_CLOCK',
        userId: nextTicket.userId,
        peerId: nextTicket.userId, // Preserving original clone peer maps
        duration: 10
      });

      // 4. Sleep for exactly 10000ms to allow local webcam streams to capture frames
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // 5. Fire frame evaluation callback (Gemini verification logic)
      const didWin = await evaluateCallback(nextTicket);

      // 6. Update ticket to finalized processing state
      nextTicket.status = 'processed';
      if (typeof nextTicket.save === 'function') {
        try {
          await nextTicket.save();
        } catch {
          // ignore
        }
      }
      this.activePlayer = null;

      if (didWin) {
        console.log(`🎉 Wallet ${nextTicket.walletAddress} hit the AI element! Pausing for celebration...`);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // 5-second celebration window
      }
      
      // Loop cascades instantly to the next queued player hash
    }
  }
};
