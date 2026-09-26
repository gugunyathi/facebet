import React from "react";
import { createPortal } from "react-dom";
import { MdClose, MdAccountBalanceWallet, MdStars } from "react-icons/md";
import { WalletAuth, UserSessionData } from "./WalletAuth";

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  peerId?: string;
  userSession: UserSessionData | null;
  onAuthSuccess: (session: UserSessionData) => void;
  onBuyTicketsSuccess: (tickets: number) => void;
}

export const WalletConnectModal: React.FC<WalletConnectModalProps> = ({
  isOpen,
  onClose,
  peerId = "arena-peer",
  userSession,
  onAuthSuccess,
  onBuyTicketsSuccess,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
      <div className="bg-[#110c38] border border-[#644af1]/50 rounded-2xl max-w-lg w-full p-6 relative shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-gray-300 hover:text-white transition"
          aria-label="Close Modal"
        >
          <MdClose className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-yellow-400 via-amber-500 to-purple-600 rounded-xl shadow-md">
            <MdAccountBalanceWallet className="w-6 h-6 text-black" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white">Connect Web3 Wallet</h2>
            <p className="text-xs text-amber-300 font-semibold">
              FACE BET • Base & ARC Network
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/10">
          Connect your Web3 wallet on Base or ARC Network to verify identity, broadcast camera, and claim 10 tickets ($1 value) for live lottery pool draws.
        </p>

        {/* Wallet Auth Buttons */}
        <WalletAuth
          peerId={peerId}
          userSession={userSession}
          onAuthSuccess={(session) => {
            onAuthSuccess(session);
            onClose();
          }}
          onBuyTicketsSuccess={onBuyTicketsSuccess}
        />
      </div>
    </div>,
    document.body
  );
};

export default WalletConnectModal;
