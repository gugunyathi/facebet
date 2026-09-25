import React, { useState, useEffect } from "react";
import { API_URL } from "../utils/constants";
import { MdSettings, MdVideocam, MdMic, MdPublic, MdNotifications, MdVolumeUp, MdCheck, MdHistory, MdPerson } from "react-icons/md";

interface SettingsPageProps {
  onGoToArena: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onGoToArena }) => {
  const [network, setNetwork] = useState<"base" | "arc">("base");
  const [quality, setQuality] = useState<"720p" | "1080p">("720p");
  const [autoMatch, setAutoMatch] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [saved, setSaved] = useState(false);
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  const userId = localStorage.getItem("peerId") || "guest_session";

  useEffect(() => {
    const fetchUserSessionAndHistory = async () => {
      try {
        const historyRes = await fetch(`${API_URL}/api/user/history/${userId}`);
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          if (historyData.success) {
            setUserHistory(historyData.history);
          }
        }

        const sessionRes = await fetch(`${API_URL}/api/user/session/${userId}`);
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.success) {
            setSessionInfo(sessionData.session);
          }
        }
      } catch {
        // Retain state gracefully
      }
    };

    fetchUserSessionAndHistory();
  }, [userId]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-[#07012c] text-white p-4 sm:p-8 flex justify-center">
      <div className="max-w-2xl w-full space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-600 rounded-2xl shadow-lg">
              <MdSettings className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Arena Settings</h1>
              <p className="text-xs text-gray-300">
                Configure your Web3 network preferences, media devices, and stream quality
              </p>
            </div>
          </div>

          <button
            onClick={onGoToArena}
            className="bg-[#644af1] hover:bg-[#5239e0] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg transition"
          >
            ← Back to Arena
          </button>
        </div>

        {/* Network & Web3 Preferences */}
        <div className="bg-[#110c38]/90 border border-[#644af1]/30 rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <MdPublic className="text-purple-400" />
            <span>Preferred Web3 Network</span>
          </h2>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => {
                setNetwork("base");
                localStorage.setItem("facebet_base_testnet", "false");
              }}
              className={`p-4 rounded-xl border text-left transition ${
                network === "base" && localStorage.getItem("facebet_base_testnet") !== "true"
                  ? "bg-blue-600/20 border-blue-500 text-white"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              <div className="font-bold text-xs sm:text-sm">Base Mainnet</div>
              <div className="text-[10px] sm:text-xs text-gray-300 mt-1">
                Base L2 ($1 = 10 tickets)
              </div>
            </button>

            <button
              onClick={() => {
                setNetwork("base");
                localStorage.setItem("facebet_base_testnet", "true");
              }}
              className={`p-4 rounded-xl border text-left transition ${
                network === "base" && localStorage.getItem("facebet_base_testnet") === "true"
                  ? "bg-amber-600/20 border-amber-500 text-white"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              <div className="font-bold text-xs sm:text-sm">Base Sepolia</div>
              <div className="text-[10px] sm:text-xs text-gray-300 mt-1">
                Testnet Sandbox Mode
              </div>
            </button>

            <button
              onClick={() => {
                setNetwork("arc");
                localStorage.setItem("facebet_base_testnet", "false");
              }}
              className={`p-4 rounded-xl border text-left transition ${
                network === "arc"
                  ? "bg-purple-600/20 border-purple-500 text-white"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              <div className="font-bold text-xs sm:text-sm">ARC Network</div>
              <div className="text-[10px] sm:text-xs text-gray-300 mt-1">
                Zero gas P2P stream verification
              </div>
            </button>
          </div>
        </div>

        {/* Video & Audio Quality */}
        <div className="bg-[#110c38]/90 border border-[#644af1]/30 rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <MdVideocam className="text-purple-400" />
            <span>Media & Camera Settings</span>
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center space-x-3">
                <MdVideocam className="text-gray-300 w-5 h-5" />
                <div>
                  <div className="text-xs font-bold">Stream Resolution</div>
                  <div className="text-[11px] text-gray-300">
                    Adjust WebRTC PeerJS bitrate and resolution
                  </div>
                </div>
              </div>

              <select
                value={quality}
                onChange={(e: any) => setQuality(e.target.value)}
                className="bg-[#07012c] border border-purple-500/50 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none"
              >
                <option value="720p">720p HD (Recommended)</option>
                <option value="1080p">1080p Full HD</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center space-x-3">
                <MdMic className="text-gray-300 w-5 h-5" />
                <div>
                  <div className="text-xs font-bold">Auto-Skip Disconnected Peers</div>
                  <div className="text-[11px] text-gray-300">
                    Automatically find next match if opponent leaves
                  </div>
                </div>
              </div>

              <button
                onClick={() => setAutoMatch(!autoMatch)}
                className={`w-12 h-6 rounded-full transition p-1 ${
                  autoMatch ? "bg-emerald-500" : "bg-gray-700"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition transform ${
                    autoMatch ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center space-x-3">
                <MdVolumeUp className="text-gray-300 w-5 h-5" />
                <div>
                  <div className="text-xs font-bold">Arena Sound Effects</div>
                  <div className="text-[11px] text-gray-300">
                    Play audio cue when a match or jackpot occurs
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`w-12 h-6 rounded-full transition p-1 ${
                  soundEnabled ? "bg-emerald-500" : "bg-gray-700"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition transform ${
                    soundEnabled ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Signed-In User Activity & Session History (Backend Persisted) */}
        <div className="bg-[#110c38]/90 border border-amber-500/30 rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <MdHistory className="text-amber-400" />
            <span>User Session & Backend Activity Log</span>
          </h2>

          <div className="text-xs text-gray-300 space-y-1 bg-black/30 p-3 rounded-xl border border-white/5 font-mono">
            <div><span className="text-gray-400">User Session ID:</span> {userId}</div>
            {sessionInfo?.walletAddress && (
              <div><span className="text-gray-400">Connected Wallet:</span> {sessionInfo.walletAddress}</div>
            )}
            <div><span className="text-gray-400">Preferred Network:</span> {sessionInfo?.network || network}</div>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {userHistory.length === 0 ? (
              <div className="text-xs text-gray-400 italic p-3 text-center bg-white/5 rounded-xl">
                No stored user activities recorded yet for this session. Connect a wallet or buy a ticket to begin!
              </div>
            ) : (
              userHistory.map((item, idx) => (
                <div key={idx} className="p-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{item.title}</div>
                    {item.details && <div className="text-[11px] text-gray-300">{item.details}</div>}
                  </div>
                  <div className="text-[10px] text-gray-400 text-right font-mono">
                    {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : "Recent"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm py-3 px-6 rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
        >
          {saved ? (
            <>
              <MdCheck className="w-5 h-5 text-emerald-300" />
              <span>Settings Saved!</span>
            </>
          ) : (
            <span>Save Preferences</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
