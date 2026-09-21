import React from 'react';

interface PvPArenaProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  activeMatchBid: number;
}

export const PvPArena: React.FC<PvPArenaProps> = ({ localStream, remoteStream, activeMatchBid }) => {
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#050505', padding: '15px', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '14px', background: '#ff1493', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' }}>
          ⚔️ Live PvP Feature Duel
        </span>
        <span style={{ color: '#ff8c00', fontWeight: 'bold' }}>
          Escrow Stake Pool: ${(activeMatchBid * 2).toFixed(2)}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', height: '50vh' }}>
        <div style={{ position: 'relative', background: '#000', borderRadius: '8px', overflow: 'hidden', border: '2px solid #0052FF' }}>
          {localStream ? (
            <video 
              ref={(el) => { if (el) el.srcObject = localStream; }}
              autoPlay 
              muted 
              playsInline 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#666', fontSize: '12px' }}>
              Local Camera Offline
            </div>
          )}
          <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: '#0052FF', fontWeight: 'bold' }}>
            YOU (P1)
          </div>
        </div>

        <div style={{ position: 'relative', background: '#000', borderRadius: '8px', overflow: 'hidden', border: '2px solid #ff1493' }}>
          {remoteStream ? (
            <video 
              ref={(el) => { if (el) el.srcObject = remoteStream; }}
              autoPlay 
              playsInline 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#666', fontSize: '12px', textAlign: 'center', padding: '10px' }}>
              <span>Searching for Match...</span>
              <span style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>Matching priority queue by block time & hash order</span>
            </div>
          )}
          <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: '#ff1493', fontWeight: 'bold' }}>
            OPPONENT (P2)
          </div>
        </div>
      </div>
    </div>
  );
};

export default PvPArena;
