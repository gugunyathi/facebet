import React from 'react';

interface PvPArenaProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  activeMatchBid: number;
}

export const PvPArena: React.FC<PvPArenaProps> = ({ localStream, remoteStream, activeMatchBid }) => {
  return (
    <div className="w-full h-full bg-[#050505] p-3 sm:p-4 rounded-xl flex flex-col">
      <div className="flex items-center justify-between mb-3 text-xs sm:text-sm">
        <span className="bg-[#ff1493] text-white px-2.5 py-1 rounded-full font-bold">
          ⚔️ Live PvP Feature Duel
        </span>
        <span className="text-amber-400 font-bold">
          Escrow Stake Pool: ${(activeMatchBid * 2).toFixed(2)}
        </span>
      </div>

      {/* Grid container establishing standard split window visibility parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-[260px]">
        
        {/* Left Side Window Pane: Local Controlling Player Frame View */}
        <div className="relative bg-black rounded-lg overflow-hidden border-2 border-[#0052FF] min-h-[140px]">
          {localStream ? (
            <video 
              ref={(el) => { if (el) el.srcObject = localStream; }}
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-gray-500 text-xs">
              Local Camera Offline
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] text-[#0052FF] font-bold">
            YOU (P1)
          </div>
        </div>

        {/* Right Side Window Pane: Remote Opponent Player Frame View */}
        <div className="relative bg-black rounded-lg overflow-hidden border-2 border-[#ff1493] min-h-[140px]">
          {remoteStream ? (
            <video 
              ref={(el) => { if (el) el.srcObject = remoteStream; }}
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full text-gray-500 text-xs text-center p-3">
              <span>Searching for Match...</span>
              <span className="text-[10px] text-gray-400 mt-1">Matching priority queue by block time & hash order</span>
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] text-[#ff1493] font-bold">
            OPPONENT (P2)
          </div>
        </div>

      </div>
    </div>
  );
};

export default PvPArena;
