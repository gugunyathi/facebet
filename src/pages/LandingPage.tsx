import React, { useState, useEffect } from 'react';
import { 
  Swords, Crown, Zap, Shield, Sparkles, Video, Play, 
  HelpCircle, ChevronRight, CheckCircle2, Flame, Trophy, 
  Globe, Lock, ArrowUpRight, MessageCircle, Heart, Star, Users,
  Menu, X, Radio, ArrowRight
} from 'lucide-react';
import { PlayerDuelSimulation } from '@/components/simulation/PlayerDuelSimulation';
import { SupportAndAboutPages, SubPageType } from '@/pages/SupportAndAboutPages';
import { UnifiedWalletChainButton } from '@/components/UnifiedWalletChainButton';
import { FacebetLogo } from '@/components/FacebetLogo';
import { API_URL } from '@/utils/constants';

interface LandingPageProps {
  onEnterArena: () => void;
  onConnectWallet: () => void;
  onSignInWithGoogle: () => void;
  userSession?: any;
  currentSubPage?: SubPageType | null;
  onSelectSubPage?: (page: SubPageType | null) => void;
  selectedChain?: 'base' | 'arc';
  setSelectedChain?: (chain: 'base' | 'arc') => void;
  selectedEnv?: 'mainnet' | 'testnet';
  setSelectedEnv?: (env: 'mainnet' | 'testnet') => void;
  setUserSession?: React.Dispatch<React.SetStateAction<any>>;
  onLogout?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterArena,
  onConnectWallet,
  onSignInWithGoogle,
  userSession,
  currentSubPage = null,
  onSelectSubPage,
  selectedChain = 'base',
  setSelectedChain = () => {},
  selectedEnv = 'mainnet',
  setSelectedEnv = () => {},
  setUserSession = () => {},
  onLogout = () => {},
}) => {
  const [activeSubPage, setActiveSubPage] = useState<SubPageType | null>(currentSubPage);
  const [livePotUSD, setLivePotUSD] = useState<string>("2,446.95");
  const [liveOnlineCount, setLiveOnlineCount] = useState<number>(2440);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Sync subpage changes with prop if provided
  useEffect(() => {
    setActiveSubPage(currentSubPage);
  }, [currentSubPage]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleSubPageNavigate = (page: SubPageType | null) => {
    setIsMobileMenuOpen(false);
    setActiveSubPage(page);
    if (onSelectSubPage) {
      onSelectSubPage(page);
    }
    if (page) {
      window.history.pushState(null, '', `/${page}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.history.pushState(null, '', '/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Fetch real-time live pot stats from server
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/api/game-stats`);
        if (res.ok) {
          const data = await res.json();
          if (data.potUSD) {
            setLivePotUSD(data.potUSD);
          }
        }
      } catch (e) {
        console.warn("Could not fetch pot stats:", e);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 8000);
    return () => clearInterval(interval);
  }, []);

  // If a subpage (FAQ, Safety, About, etc.) is currently active, render the dedicated subpage view
  if (activeSubPage) {
    return (
      <div className="min-h-screen bg-black text-white font-sans selection:bg-pink-500 selection:text-white">
        {/* Navigation Bar */}
        <header className="fixed top-0 inset-x-0 z-50 bg-black/85 backdrop-blur-xl border-b border-white/10 px-3 sm:px-8 py-3 flex items-center justify-between">
          <div 
            onClick={() => handleSubPageNavigate(null)} 
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#140b3b] border border-purple-500/40 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform p-0.5">
              <FacebetLogo className="w-6 h-6" />
            </div>
            <span className="font-black text-base sm:text-lg tracking-tight bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
              FACEBET
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => handleSubPageNavigate(null)}
              className="text-xs font-bold text-zinc-400 hover:text-white transition cursor-pointer px-2 sm:px-3 py-1.5"
            >
              &larr; Back to Home
            </button>
            <button
              onClick={onEnterArena}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-extrabold text-xs px-3 sm:px-4 py-2 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Launch App</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <SupportAndAboutPages
          currentPage={activeSubPage}
          onNavigate={(page) => handleSubPageNavigate(page)}
          onEnterArena={onEnterArena}
          onConnectWallet={onConnectWallet}
          onSignInWithGoogle={onSignInWithGoogle}
        />

        {/* Footer */}
        <footer className="border-t border-white/10 py-8 px-4 text-center text-xs text-zinc-500">
          <p>&copy; {new Date().getFullYear()} FACEBET Inc. All rights reserved. 100% Peer-to-Peer Encrypted WebRTC.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-pink-500 selection:text-white relative overflow-x-hidden pb-16 sm:pb-0">
      {/* ─────────────────────────────────────────────────────────────
          1. STICKY TOP NAVIGATION BAR (Optimized for Mobile & Desktop)
      ───────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-black/85 backdrop-blur-xl border-b border-white/10 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between transition-all">
        {/* Brand Logo & Live Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div 
            onClick={() => handleSubPageNavigate(null)}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-[#140b3b] border border-purple-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(236,72,153,0.35)] group-hover:scale-105 transition-transform p-0.5 sm:p-1">
              <FacebetLogo className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-base sm:text-xl tracking-tight bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent leading-none">
                FACEBET
              </span>
              <span className="text-[8px] sm:text-[9px] font-mono font-bold tracking-widest text-zinc-400 uppercase hidden xs:inline">
                Expression Arena
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>2,440+ Online</span>
          </div>
        </div>

        {/* Clean Center Navigation Links on Desktop */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-xs font-bold text-zinc-300">
          <a href="#simulation" className="hover:text-pink-400 transition-colors">
            Live Duel Demo
          </a>
          <a href="#how-it-works" className="hover:text-purple-400 transition-colors">
            How It Works
          </a>
          <a href="#jackpot" className="hover:text-amber-400 transition-colors">
            Rollover Pot
          </a>
          <button 
            onClick={() => handleSubPageNavigate('safety')} 
            className="hover:text-cyan-400 transition-colors cursor-pointer"
          >
            Safety
          </button>
          <button 
            onClick={() => handleSubPageNavigate('faq')} 
            className="hover:text-pink-400 transition-colors cursor-pointer"
          >
            FAQ
          </button>
          <button 
            onClick={() => handleSubPageNavigate('about')} 
            className="hover:text-purple-400 transition-colors cursor-pointer"
          >
            About
          </button>
        </nav>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Sign in with Google (Desktop & Tablet) */}
          <button
            onClick={onSignInWithGoogle}
            className="hidden sm:flex bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-xs px-3 sm:px-3.5 py-2 rounded-xl shadow-md transition-all duration-200 items-center gap-1.5 hover:scale-105 active:scale-95 cursor-pointer min-h-[36px]"
            title="Sign in with your Google account"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="hidden md:inline">Google Sign In</span>
            <span className="md:hidden">Google</span>
          </button>

          {/* Unified Connect Wallet & Chain Selector Button (Desktop & Tablet) */}
          <div className="hidden sm:block">
            <UnifiedWalletChainButton
              userSession={userSession}
              selectedChain={selectedChain}
              setSelectedChain={setSelectedChain}
              selectedEnv={selectedEnv}
              setSelectedEnv={setSelectedEnv}
              setUserSession={setUserSession}
              onConnectWallet={onConnectWallet}
              onLogout={onLogout}
            />
          </div>

          {/* Enter Arena / Play Now Button */}
          <button
            onClick={onEnterArena}
            className="bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 hover:from-pink-600 hover:to-cyan-600 text-white font-extrabold text-xs px-3 sm:px-4 py-2 rounded-xl shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all duration-200 flex items-center gap-1.5 hover:scale-105 active:scale-95 cursor-pointer min-h-[36px]"
          >
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span>Play Now</span>
          </button>

          {/* Mobile Hamburger Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Open mobile menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE NAVIGATION DRAWER (Slide-over overlay on phones)
      ───────────────────────────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/95 backdrop-blur-2xl flex flex-col pt-16 px-4 pb-6 overflow-y-auto animate-fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#140b3b] border border-purple-500/40 flex items-center justify-center p-0.5">
                <FacebetLogo className="w-6 h-6" />
              </div>
              <span className="font-black text-lg text-white">FACEBET Menu</span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-xl bg-white/10 text-zinc-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Quick Action Buttons */}
          <div className="py-4 space-y-2.5 border-b border-white/10">
            <button
              onClick={() => { setIsMobileMenuOpen(false); onEnterArena(); }}
              className="w-full bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 text-white font-extrabold text-sm py-3 rounded-xl shadow-lg flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Launch Arena (/play)</span>
            </button>

            <button
              onClick={() => { setIsMobileMenuOpen(false); onSignInWithGoogle(); }}
              className="w-full bg-white text-zinc-950 font-bold text-sm py-3 rounded-xl shadow flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Sign in with Google</span>
            </button>

            {userSession ? (
              <div className="w-full flex justify-center py-1">
                <UnifiedWalletChainButton
                  userSession={userSession}
                  selectedChain={selectedChain}
                  setSelectedChain={setSelectedChain}
                  selectedEnv={selectedEnv}
                  setSelectedEnv={setSelectedEnv}
                  setUserSession={setUserSession}
                  onConnectWallet={onConnectWallet}
                  onLogout={onLogout}
                />
              </div>
            ) : (
              <button
                onClick={() => { setIsMobileMenuOpen(false); onConnectWallet(); }}
                className="w-full bg-zinc-800 text-white font-bold text-sm py-3 rounded-xl border border-white/15 flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Connect Web3 Wallet</span>
              </button>
            )}
          </div>

          {/* Mobile Links List */}
          <div className="py-4 space-y-1 text-sm font-bold">
            <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 py-1">Game & Features</div>
            <a
              href="#simulation"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2.5 px-3 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white"
            >
              🎮 Live Duel Simulation
            </a>
            <a
              href="#how-it-works"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2.5 px-3 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white"
            >
              ⚡ How It Works
            </a>
            <a
              href="#jackpot"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2.5 px-3 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white"
            >
              🏆 Rollover Pot (${livePotUSD})
            </a>

            <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 pt-3 py-1">Support</div>
            <button
              onClick={() => handleSubPageNavigate('faq')}
              className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white cursor-pointer"
            >
              💬 FAQ
            </button>
            <button
              onClick={() => handleSubPageNavigate('safety')}
              className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white cursor-pointer"
            >
              🛡️ Safety Center
            </button>
            <button
              onClick={() => handleSubPageNavigate('help')}
              className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white cursor-pointer"
            >
              🔧 Help Center
            </button>

            <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 pt-3 py-1">About & Legal</div>
            <button
              onClick={() => handleSubPageNavigate('about')}
              className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white cursor-pointer"
            >
              ✨ About Us
            </button>
            <button
              onClick={() => handleSubPageNavigate('contact')}
              className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white cursor-pointer"
            >
              ✉️ Contact Us
            </button>
            <button
              onClick={() => handleSubPageNavigate('community')}
              className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white cursor-pointer"
            >
              👥 Community & Discord
            </button>
            <button
              onClick={() => handleSubPageNavigate('terms')}
              className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white cursor-pointer"
            >
              📜 Terms of Service
            </button>
            <button
              onClick={() => handleSubPageNavigate('privacy')}
              className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white cursor-pointer"
            >
              🔒 Privacy Policy
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. DYNAMIC MARQUEE TICKER (Live event announcements)
      ───────────────────────────────────────────────────────────── */}
      <div className="mt-14 sm:mt-16 bg-gradient-to-r from-purple-950 via-zinc-950 to-pink-950 border-b border-white/10 py-1.5 overflow-hidden whitespace-nowrap text-[11px] sm:text-xs font-mono font-bold text-zinc-300">
        <div className="inline-flex items-center gap-6 animate-marquee">
          <span className="flex items-center gap-1.5 text-amber-300">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>LIVE ESCROW POT: ${livePotUSD}</span>
          </span>
          <span className="text-zinc-600">·</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>2,440+ PLAYERS ACTIVE WORLDWIDE</span>
          </span>
          <span className="text-zinc-600">·</span>
          <span className="text-pink-300">👑 KING #142 DEFENDING WITH 3 CONSECUTIVE WINS</span>
          <span className="text-zinc-600">·</span>
          <span className="text-cyan-300">⚡ 100% DIRECT P2P WEBRTC ENCRYPTED VIDEO</span>
          <span className="text-zinc-600">·</span>
          <span className="text-purple-300">🎁 DEMOCRATIZED TURN IN 3 MATCHES</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. HERO SECTION (Fluid Typography, High Converting)
      ───────────────────────────────────────────────────────────── */}
      <section className="pt-8 sm:pt-16 md:pt-20 pb-12 sm:pb-20 px-3 sm:px-6 relative">
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[200px] sm:h-[350px] bg-gradient-to-b from-purple-600/20 via-pink-600/15 to-transparent blur-3xl rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-6 relative z-10">
          {/* Hero Brand Header with Logo & Title (Just above Game Face On!) */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#140b3b] border-2 border-purple-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.5)] p-1.5 sm:p-2 transition-transform hover:scale-105">
              <FacebetLogo className="w-9 h-9 sm:w-12 sm:h-12" />
            </div>
            <span className="font-black text-3xl sm:text-5xl md:text-6xl tracking-tight bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
              FACEBET
            </span>
          </div>

          {/* Eyebrow Kicker */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-white/5 border border-white/15 text-pink-300 text-[10px] sm:text-xs font-extrabold tracking-wide uppercase shadow-sm">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-pink-400 animate-spin" />
            <span>The World&apos;s 1st P2P Video Expression Arena</span>
          </div>

          {/* Primary Fluid Responsive Headline */}
          <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08]">
            Game Face On!{' '}
            <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400">
              Battle Expressions.
            </span>
            <span className="block mt-1">Win Big JackPots.</span>
          </h1>

          {/* Punchy Subtitle */}
          <p className="text-xs sm:text-base md:text-lg text-zinc-300 max-w-2xl mx-auto font-normal leading-relaxed px-2">
            Meet real players 1-on-1 in live encrypted WebRTC video. Our AI computer vision referee detects winks, smiles, and reactions in milliseconds. Dethrone the King and take home the jackpot.
          </p>

          {/* Massive Action Button Bar (Full width on phones, side-by-side on sm+) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 pt-2 sm:pt-4 max-w-lg sm:max-w-none mx-auto w-full px-2">
            {/* Google Sign In CTA */}
            <button
              onClick={onSignInWithGoogle}
              className="w-full sm:w-auto px-5 sm:px-6 py-3.5 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-950 font-extrabold text-xs sm:text-base shadow-xl flex items-center justify-center gap-2.5 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer min-h-[48px]"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Sign in with Google</span>
            </button>

            {/* Connect Wallet CTA */}
            <button
              onClick={onConnectWallet}
              className="w-full sm:w-auto px-5 sm:px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black font-black text-xs sm:text-base shadow-xl flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer min-h-[48px]"
            >
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span>Connect Wallet (Web3)</span>
            </button>

            {/* Watch Gameplay CTA */}
            <button
              onClick={onEnterArena}
              className="w-full sm:w-auto px-5 sm:px-6 py-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-white font-extrabold text-xs sm:text-base border border-white/20 shadow-xl flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer min-h-[48px]"
            >
              <Play className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Watch Live Matches &rarr;</span>
            </button>
          </div>

          {/* Trust Metadata Strip */}
          <div className="flex flex-wrap items-center justify-center gap-y-1.5 gap-x-4 pt-2 text-[11px] sm:text-xs text-zinc-400 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Free Demo Matches Included</span>
            </div>
            <span aria-hidden="true" className="text-zinc-600 hidden xs:inline">·</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>100% P2P WebRTC Encrypted</span>
            </div>
            <span aria-hidden="true" className="text-zinc-600 hidden xs:inline">·</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Base & ARC Smart Escrow</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. INTERACTIVE SIMULATION SECTION (Player 1 vs Player 2)
      ───────────────────────────────────────────────────────────── */}
      <section id="simulation" className="py-6 sm:py-10 px-2.5 sm:px-6 relative">
        <div className="max-w-5xl mx-auto space-y-3 sm:space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-tight">
              Live Duel Simulation & Biometric Tracking
            </h2>
            <p className="text-[11px] sm:text-xs md:text-sm text-zinc-400 max-w-lg mx-auto">
              Watch how our biometric neural referee validates expressions between Player 1 and Player 2 in real time.
            </p>
          </div>

          {/* Interactive Duel Simulation Component */}
          <PlayerDuelSimulation
            onEnterArena={onEnterArena}
            potAmount={`$${livePotUSD}`}
            onlineCount={liveOnlineCount}
          />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. HOW IT WORKS (3 Simple Steps)
      ───────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-12 sm:py-20 px-3 sm:px-6 bg-zinc-950/70 border-y border-white/5">
        <div className="max-w-5xl mx-auto space-y-8 sm:space-y-12">
          <div className="text-center space-y-1.5">
            <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest text-pink-400">
              Simple 3-Step Gameplay
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              How to Battle on FACEBET
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
              No complicated setups. Sign in, enable your camera, and out-react your opponent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Step 1 */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-3 hover:border-pink-500/40 transition">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center font-black text-lg sm:text-xl">
                1
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">Connect & Queue</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Sign in with Google or connect your Base/ARC wallet. Claim 10 tickets for $1 ($0.20 per duel) or practice in the solo mirror testing mode.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-3 hover:border-purple-500/40 transition">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-lg sm:text-xl">
                2
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">Face Off Live</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Connect instantly with a live player. When the round begins, follow the target expression (Wink, Shock, Smile, Open Mouth) before the countdown runs out.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-3 hover:border-cyan-500/40 transition">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-lg sm:text-xl">
                3
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">Take Throne & Pot</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                The referee AI judges the winner in under 15ms. The winner claims the King-of-the-Hill throne and accumulates rewards from the compounding jackpot pot!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. LIVE ESCROW JACKPOT POT BREAKDOWN
      ───────────────────────────────────────────────────────────── */}
      <section id="jackpot" className="py-12 sm:py-20 px-3 sm:px-6 relative">
        <div className="max-w-4xl mx-auto rounded-2xl sm:rounded-3xl bg-gradient-to-r from-purple-950/70 via-black to-pink-950/70 border border-purple-500/30 p-5 sm:p-10 shadow-2xl relative overflow-hidden text-center space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] sm:text-xs font-bold">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Transparent Smart Contract Accounting</span>
          </div>

          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white">
            Current Rollover Pot:{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">
              ${livePotUSD} <span className="text-base sm:text-2xl font-bold text-amber-200">({(parseFloat(livePotUSD.replace(/,/g, '')) * 10).toLocaleString()} $FBET)</span>
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-zinc-300 max-w-xl mx-auto leading-relaxed">
            Every match stake ($0.20 to $5.00 / $FBET equivalent) fuels the active $FBET jackpot prize pool and community reserve on Base &amp; ARC. If nobody dethrones the King, the pot compounds into the next challenger!
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-2 sm:pt-4 border-t border-white/10 text-left">
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10">
              <div className="text-[10px] sm:text-xs text-zinc-400">Entry Stake</div>
              <div className="text-sm sm:text-lg font-black text-white">0.20 FBET</div>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10">
              <div className="text-[10px] sm:text-xs text-zinc-400">Win Rate Bonus</div>
              <div className="text-sm sm:text-lg font-black text-emerald-400">Up to 5x</div>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10">
              <div className="text-[10px] sm:text-xs text-zinc-400">Democratized Turn</div>
              <div className="text-sm sm:text-lg font-black text-pink-400">Every 10th</div>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10">
              <div className="text-[10px] sm:text-xs text-zinc-400">Token Ticker</div>
              <div className="text-sm sm:text-lg font-black text-amber-300">$FBET</div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onEnterArena}
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 hover:from-pink-600 hover:to-cyan-600 text-white font-black text-xs sm:text-sm shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer min-h-[48px]"
            >
              Play for the $FBET Pot &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          FBET TOKEN UTILITY & CROSS-CHAIN ECOSYSTEM
      ───────────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-16 px-3 sm:px-6 relative bg-gradient-to-b from-transparent via-purple-950/30 to-black">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] sm:text-xs font-extrabold uppercase">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Native Token Ecosystem</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Powered by <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300">$FBET Token</span> on Base &amp; ARC
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-xl mx-auto">
              $FBET is the native utility token powering all core mechanics across the FACEBET arena.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-900/80 border border-amber-500/30 p-5 rounded-2xl space-y-2 backdrop-blur-md shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-black text-lg">
                🏆
              </div>
              <h3 className="text-sm font-black text-white uppercase">Jackpot Prize (POT)</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Accumulates from match stakes and ticket buy-ins. Claimed by the reigning King-of-the-Hill or tournament champion in $FBET.
              </p>
            </div>

            <div className="bg-zinc-900/80 border border-purple-500/30 p-5 rounded-2xl space-y-2 backdrop-blur-md shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 font-black text-lg">
                ⚡
              </div>
              <h3 className="text-sm font-black text-white uppercase">Queue Bids &amp; Jumps</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Stake $FBET (0.20 to 10.00 FBET) to bypass the regular queue, secure priority match placement, and outbid rivals.
              </p>
            </div>

            <div className="bg-zinc-900/80 border border-cyan-500/30 p-5 rounded-2xl space-y-2 backdrop-blur-md shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-black text-lg">
                🌐
              </div>
              <h3 className="text-sm font-black text-white uppercase">Base &amp; ARC Cross-Chain</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Fully deployed and bridged on Base L2 and ARC Network. Instant deposits, lightning-fast settlement, and non-custodial payouts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. COMPARISON: FACEBET VS LEGACY VIDEO CHAT
      ───────────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 px-3 sm:px-6 bg-zinc-950/80 border-t border-white/5">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <div className="text-center space-y-1.5">
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
              Why FACEBET Outperforms Legacy Video Apps
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Say goodbye to awkward silences and unsafe legacy random chats.
            </p>
          </div>

          <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-zinc-900/60 overflow-hidden">
            <div className="grid grid-cols-3 p-3 sm:p-4 border-b border-white/10 text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider">
              <div>Feature</div>
              <div>Legacy Apps</div>
              <div className="text-pink-400">FACEBET</div>
            </div>

            {[
              { f: "Social Engagement", legacy: "Passive staring", facebet: "Active expression battles & duels" },
              { f: "Prize Incentives", legacy: "None", facebet: "$2,400+ Smart Contract Rollover Pots" },
              { f: "Referee Accuracy", legacy: "None", facebet: "Biometric landmark AI referee (<15ms)" },
              { f: "Privacy & Streams", legacy: "Often logged centrally", facebet: "100% P2P encrypted WebRTC (Zero logs)" },
              { f: "Safety Moderation", legacy: "Manual, slow", facebet: "Real-time neural filter + instant skip" },
            ].map((row, idx) => (
              <div key={idx} className="grid grid-cols-3 p-3 sm:p-4 border-b border-white/5 text-[11px] sm:text-xs text-zinc-300 hover:bg-white/5 transition-colors">
                <div className="font-bold text-white pr-1">{row.f}</div>
                <div className="text-zinc-500 pr-1">{row.legacy}</div>
                <div className="text-emerald-300 font-semibold">{row.facebet}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          9. BOTTOM COMPREHENSIVE FOOTER WITH ALL REQUIRED LINKS
      ───────────────────────────────────────────────────────────── */}
      <footer className="bg-black border-t border-white/10 pt-12 sm:pt-16 pb-16 sm:pb-12 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8 pb-10 border-b border-white/10">
          {/* Col 1: Brand Info */}
          <div className="sm:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#140b3b] border border-purple-500/40 flex items-center justify-center p-0.5">
                <FacebetLogo className="w-6 h-6" />
              </div>
              <span className="font-black text-lg text-white">FACEBET</span>
            </div>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              The premier live video gaming arena with automated AI refereeing, peer-to-peer WebRTC streaming, and decentralized prize pools.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={onSignInWithGoogle}
                className="bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                Sign in with Google
              </button>
              <button
                onClick={onConnectWallet}
                className="bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                Connect Wallet
              </button>
            </div>
          </div>

          {/* Col 2: Play & Features */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-200">Arena</h4>
            <ul className="text-xs space-y-2 text-zinc-400">
              <li>
                <button onClick={onEnterArena} className="hover:text-pink-400 transition cursor-pointer">
                  Launch /play
                </button>
              </li>
              <li>
                <a href="#simulation" className="hover:text-pink-400 transition">
                  Live Duel Demo
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-pink-400 transition">
                  Game Rules
                </a>
              </li>
              <li>
                <a href="#jackpot" className="hover:text-pink-400 transition">
                  Jackpot Pool
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Support (FAQ, Safety, Help) */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-200">Support</h4>
            <ul className="text-xs space-y-2 text-zinc-400">
              <li>
                <button onClick={() => handleSubPageNavigate('faq')} className="hover:text-pink-400 transition cursor-pointer">
                  FAQ
                </button>
              </li>
              <li>
                <button onClick={() => handleSubPageNavigate('safety')} className="hover:text-pink-400 transition cursor-pointer">
                  Safety Center
                </button>
              </li>
              <li>
                <button onClick={() => handleSubPageNavigate('help')} className="hover:text-pink-400 transition cursor-pointer">
                  Help Center
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: About & Legal (About Us, Contact, Community, Terms, Privacy) */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-200">About & Legal</h4>
            <ul className="text-xs space-y-2 text-zinc-400">
              <li>
                <button onClick={() => handleSubPageNavigate('about')} className="hover:text-pink-400 transition cursor-pointer">
                  About Us
                </button>
              </li>
              <li>
                <button onClick={() => handleSubPageNavigate('contact')} className="hover:text-pink-400 transition cursor-pointer">
                  Contact Us
                </button>
              </li>
              <li>
                <button onClick={() => handleSubPageNavigate('community')} className="hover:text-pink-400 transition cursor-pointer">
                  Community
                </button>
              </li>
              <li>
                <button onClick={() => handleSubPageNavigate('terms')} className="hover:text-pink-400 transition cursor-pointer">
                  Terms Of Service
                </button>
              </li>
              <li>
                <button onClick={() => handleSubPageNavigate('privacy')} className="hover:text-pink-400 transition cursor-pointer">
                  Privacy Policy
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Disclaimer */}
        <div className="max-w-6xl mx-auto pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500 text-center sm:text-left">
          <p>&copy; {new Date().getFullYear()} FACEBET Inc. All rights reserved.</p>
          <p>Operates on Base Mainnet & ARC Network. Must be 18+ to enter jackpot pool.</p>
        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────
          10. MOBILE FLOATING ACTION DOCK (Single-tap entry on phones)
      ───────────────────────────────────────────────────────────── */}
      <div className="sm:hidden fixed bottom-3 inset-x-3 z-40 bg-zinc-950/95 backdrop-blur-xl border border-white/20 rounded-2xl p-2 shadow-2xl flex items-center gap-2">
        <button
          onClick={onSignInWithGoogle}
          className="flex-1 bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-xs py-2.5 rounded-xl shadow flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer min-h-[44px]"
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Google Sign In</span>
        </button>

        <button
          onClick={onEnterArena}
          className="flex-1 bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 text-white font-black text-xs py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer min-h-[44px]"
        >
          <Zap className="w-4 h-4 shrink-0" />
          <span>Play Now &rarr;</span>
        </button>
      </div>
    </div>
  );
};
