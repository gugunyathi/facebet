import { useState } from 'react';

interface PurchasePayload {
  userId: string;
  walletAddress: string;
  network: 'base' | 'arc' | 'solana' | 'arbitrum';
  txHash: string;
  loginTime: number; // Used to calculate total login duration tie-breaker
  totalLifetimePlays: number; // Tie-breaker 2
}

export const useTransactionBridge = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const processTicketPurchase = async (payload: PurchasePayload) => {
    setIsProcessing(true);
    try {
      // Calculate total seconds spent online since session authorization initialization
      const loginDurationSeconds = Math.floor((Date.now() - payload.loginTime) / 1000);

      const response = await fetch('/api/buy-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: payload.userId,
          walletAddress: payload.walletAddress,
          network: payload.network,
          txHash: payload.txHash,
          timestamp: new Date().toISOString(), // Precise execution timestamp tracking
          loginDuration: loginDurationSeconds,
          txCount: payload.totalLifetimePlays
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to process blockchain tickets.");

      console.log(`🎫 Successfully generated 10 Lottery Live tickets from Hash: ${payload.txHash}`);
      return { success: true, ticketsAdded: data.ticketsAdded };
    } catch (error: any) {
      console.error("Web3 Bridge Engine encountered a submission exception:", error);
      alert(`Payment Processing Mismatch: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      setIsProcessing(false);
    }
  };

  return { processTicketPurchase, isProcessing };
};
