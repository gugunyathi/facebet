import React, { useState, useEffect } from 'react';

export const TrendTicker: React.FC = () => {
  const [aiTrend, setAiTrend] = useState<string>("Loading active AI composite trend profile matrix...");
  const [rolloverPotUSD, setRolloverPotUSD] = useState<string>("0.00");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLiveGameStates = async () => {
    try {
      // Fetch dynamic 30-minute target profile trends from the backend server context
      const trendResponse = await fetch('/api/active-trend');
      const trendData = await trendResponse.json();
      
      // Fetch escrow financial registry metrics tracking cumulative rolling pools
      const statsResponse = await fetch('/api/game-stats');
      const statsData = await statsResponse.json();

      if (trendData.currentTrend) {
        setAiTrend(trendData.currentTrend);
      }
      if (statsData.potUSD) {
        setRolloverPotUSD(statsData.potUSD);
      }
    } catch (error) {
      console.error("Trend Ticker failed to refresh structural game metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveGameStates();
    // Poll the state every 15 seconds to ensure the display updates as pools increase or trends switch
    const updateInterval = setInterval(fetchLiveGameStates, 15000);
    return () => clearInterval(updateInterval);
  }, []);

  return (
    <div 
      className="trend-ticker-bar" 
      style={{
        width: '100%',
        backgroundColor: '#161b22',
        borderBottom: '2px solid #ff8c00',
        padding: '12px 20px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: 'monospace',
        zIndex: 100
      }}
    >
      {/* Active Prize Pot Vault Metadata Tracking Display Counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px' }}>🎰</span>
        <div>
          <div style={{ fontSize: '10px', color: '#8b949e', textTransform: 'uppercase' }}>Rollover Pot</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff8c00' }}>
            ${loading ? "---" : rolloverPotUSD}
          </div>
        </div>
      </div>

      {/* Shifting Real-Time Generative Multimodal AI Expression Targets Banner */}
      <div style={{ flex: 1, marginLeft: '40px', marginRight: '20px' }}>
        <div style={{ fontSize: '10px', color: '#8b949e', textTransform: 'uppercase', marginBottom: '2px' }}>
          🤖 Target Aesthetic (Refreshes every 30m)
        </div>
        <div 
          style={{ 
            fontSize: '13px', 
            color: '#c9d1d9', 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            background: '#0d1117',
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid #30363d'
          }}
          title={aiTrend}
        >
          ✨ {aiTrend}
        </div>
      </div>

      {/* Live System Operation Health Indicator Ticker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#58a6ff' }}>
        <span style={{
          width: '8px', height: '8px', backgroundColor: '#238636', borderRadius: '50%',
          display: 'inline-block', boxShadow: '0 0 8px #238636'
        }} />
        AI JUDGE ACTIVE
      </div>
    </div>
  );
};

export default TrendTicker;
