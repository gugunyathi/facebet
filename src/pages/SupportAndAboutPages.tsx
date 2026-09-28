import React, { useState } from 'react';
import { 
  HelpCircle, Shield, LifeBuoy, Users, Mail, MessageSquare, 
  FileText, Lock, ChevronDown, ChevronUp, CheckCircle, ExternalLink, 
  Sparkles, Swords, Send, ArrowRight, Video, Camera, Cpu, AlertTriangle
} from 'lucide-react';

export type SubPageType = 
  | 'faq' 
  | 'safety' 
  | 'help' 
  | 'about' 
  | 'contact' 
  | 'community' 
  | 'terms' 
  | 'privacy';

interface SupportAndAboutPagesProps {
  currentPage: SubPageType;
  onNavigate: (page: SubPageType) => void;
  onEnterArena: () => void;
  onConnectWallet: () => void;
  onSignInWithGoogle: () => void;
}

export const SupportAndAboutPages: React.FC<SupportAndAboutPagesProps> = ({
  currentPage,
  onNavigate,
  onEnterArena,
  onConnectWallet,
  onSignInWithGoogle,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('General Inquiry');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail || !contactMessage) return;
    setContactSubmitted(true);
  };

  const navTabs = [
    { id: 'faq', label: 'FAQ', group: 'Support' },
    { id: 'safety', label: 'Safety Center', group: 'Support' },
    { id: 'help', label: 'Help Center', group: 'Support' },
    { id: 'about', label: 'About Us', group: 'About' },
    { id: 'contact', label: 'Contact Us', group: 'About' },
    { id: 'community', label: 'Community', group: 'About' },
    { id: 'terms', label: 'Terms of Service', group: 'Legal' },
    { id: 'privacy', label: 'Privacy Policy', group: 'Legal' },
  ];

  const faqs = [
    {
      q: "What is FACEBET and how do live video battles work?",
      a: "FACEBET is the world's premier peer-to-peer live video battle platform. You match face-to-face against other players in direct WebRTC video. An automated biometric AI referee generates a target facial expression (such as Wink, Smile, Shock, or Surprise). The first player to accurately perform the target expression wins the round and earns tickets, takes the King-of-the-Hill throne, or claims the rollover jackpot pot!"
    },
    {
      q: "Is my webcam or microphone stream recorded or stored anywhere?",
      a: "No! Privacy is our foundational guarantee. All video and audio streams are transmitted directly between players using peer-to-peer WebRTC encrypted via DTLS/SRTP protocols. Our servers never record, process, store, or archive your video feeds. Facial expression recognition operates in real-time without saving biometric images."
    },
    {
      q: "How does the King-of-the-Hill rollover pot work?",
      a: "Every ticket purchase ($1 = 10 Tickets, where each duel entry is just $0.20) contributes to the decentralized jackpot prize pool. When a challenger dethrones the King, or when consecutive wins reach milestones, payouts are awarded. If a round concludes in a tie or skip, the pot rolls over to the next round, allowing the pot to grow exponentially (currently over $2,400+)."
    },
    {
      q: "Which networks and wallets are supported?",
      a: "We natively support Base Mainnet (by Coinbase), the ARC Network (powered by Circle USDC), and standard injected Web3 wallets like MetaMask, Coinbase Wallet, and Rainbow. You can also sign in with Google to generate an instantaneous embedded smart wallet with zero seed phrase friction!"
    },
    {
      q: "What happens if an opponent displays inappropriate behavior?",
      a: "We operate a strict Zero-Tolerance safety system. You have an instant 'Skip' button to disconnect in under 100 milliseconds. Additionally, our automated real-time neural filter detects and blacklists illicit behavior, and our moderation team bans bad actors permanently."
    },
    {
      q: "What are 'Democratized Turns'?",
      a: "Every 10th round in the arena is a Democratized Round! During democratized turns, entry fees are subsidized by the community treasury, queue priority is granted to first-come players, and spectator prediction bonuses are doubled."
    },
    {
      q: "How do I withdraw my winnings?",
      a: "Winnings are credited directly to your connected Web3 wallet address via our audited smart contracts or sent as Circle USDC on Base or ARC. You maintain 100% non-custodial control over your assets at all times."
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-pink-500 selection:text-white pt-20 sm:pt-24 pb-20 px-3 sm:px-6 max-w-6xl mx-auto overflow-x-hidden">
      {/* ── Subpage Navigation Bar (Optimized for all screens) ── */}
      <div className="w-full max-w-4xl mx-auto mb-8 sm:mb-12">
        {/* Mobile Dropdown Selector on very small screens */}
        <div className="block sm:hidden mb-3">
          <label className="text-[11px] font-bold text-zinc-400 mb-1 block uppercase">Select Topic</label>
          <div className="relative">
            <select
              value={currentPage}
              onChange={(e) => onNavigate(e.target.value as SubPageType)}
              className="w-full bg-zinc-900 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500 appearance-none font-bold"
            >
              {navTabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.group}: {tab.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Horizontally scrollable segmented tab strip on tablets & desktops */}
        <div className="hidden sm:flex items-center gap-1.5 p-1.5 bg-zinc-900/90 border border-white/10 rounded-2xl backdrop-blur-xl overflow-x-auto no-scrollbar scroll-smooth">
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id as SubPageType)}
              className={`px-3 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
                currentPage === tab.id
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. FAQ PAGE
      ───────────────────────────────────────────────────────────── */}
      {currentPage === 'faq' && (
        <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-3xl mx-auto">
          <div className="text-center space-y-2 sm:space-y-3">
            <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest text-pink-400">
              Support & Answers
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Frequently Asked Questions
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Everything you need to know about peer-to-peer video face duels, AI gesture referees, smart contract prize pools, and account security.
            </p>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden backdrop-blur-md transition-colors hover:border-purple-500/40"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-3.5 sm:p-5 text-left text-xs sm:text-base font-bold text-zinc-100 hover:text-pink-300 transition-colors cursor-pointer min-h-[48px]"
                >
                  <span className="pr-2">{faq.q}</span>
                  {openFaqIndex === idx ? (
                    <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 shrink-0" />
                  )}
                </button>
                {openFaqIndex === idx && (
                  <div className="px-3.5 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-white/5 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-purple-950/60 to-pink-950/60 border border-purple-500/30 rounded-2xl p-5 sm:p-6 text-center space-y-3 mt-6 sm:mt-8">
            <h3 className="text-sm sm:text-base font-bold text-white">Still have questions?</h3>
            <p className="text-xs text-zinc-300 max-w-md mx-auto">
              Our 24/7 community support team is available on Discord and email to help you with any inquiries.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5 pt-2">
              <button
                onClick={() => onNavigate('contact')}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition cursor-pointer"
              >
                Contact Support
              </button>
              <button
                onClick={onEnterArena}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-xs font-bold text-white shadow-lg cursor-pointer"
              >
                Enter Arena Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. SAFETY CENTER
      ───────────────────────────────────────────────────────────── */}
      {currentPage === 'safety' && (
        <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-4xl mx-auto">
          <div className="text-center space-y-2 sm:space-y-3">
            <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
              Trust & Community Standards
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              FACEBET Safety Center
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
              We are committed to creating a vibrant, respectful, and safe live video gaming arena for everyone worldwide.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">Direct P2P Encryption</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Video and voice calls are routed directly peer-to-peer using WebRTC end-to-end encrypted tunnels. No intermediate server records your stream.
              </p>
            </div>

            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">AI Behavioral Shield</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Automated on-device computer vision models continuously check for prohibited content and harassment, immediately severing bad connections.
              </p>
            </div>

            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">Instant Skip & Blacklist</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                At any moment, you can press the Skip button to immediately disconnect from your opponent and pair with someone new in under 1 second.
              </p>
            </div>

            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">Age & Fair Play Standards</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                FACEBET requires all participants to be 18 years or older. Sybil protection and Web3 wallet signing deter bots and malicious duplicate accounts.
              </p>
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-emerald-500/30 rounded-2xl p-4 sm:p-6 space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-emerald-300 uppercase tracking-wide">Community Safety Guidelines</h4>
            <ul className="text-xs text-zinc-300 space-y-2 list-disc pl-4 sm:pl-5 leading-relaxed">
              <li>Keep clothing and backgrounds respectful and appropriate for streaming.</li>
              <li>Do not harass, demean, or target other players based on race, gender, or orientation.</li>
              <li>Do not use pre-recorded video loops or virtual camera injectors to simulate expressions; our biometric referee automatically detects non-liveness.</li>
              <li>Never share private personal information such as home address, phone number, or private keys with other players.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. HELP CENTER
      ───────────────────────────────────────────────────────────── */}
      {currentPage === 'help' && (
        <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-4xl mx-auto">
          <div className="text-center space-y-2 sm:space-y-3">
            <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">
              Troubleshooting & Guides
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Help Center & Diagnostics
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Guides for camera configuration, WebRTC latency optimization, ticket purchases, and smart contract prize redemption.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-2.5">
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 w-fit">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Camera & Microphone</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Ensure your browser has granted permission for video and audio. In Chrome/Brave, click the padlock next to the URL to enable camera access.
              </p>
              <div className="pt-1 text-[11px] text-cyan-300 font-mono">Status: WebRTC Ready</div>
            </div>

            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-2.5">
              <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400 w-fit">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Network & Firewall</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                If matches take long to connect, verify that your network allows UDP traffic for STUN/TURN servers. Corporate VPNs may block direct WebRTC calls.
              </p>
              <div className="pt-1 text-[11px] text-purple-300 font-mono">ICE Servers: 4 Active</div>
            </div>

            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-2.5">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 w-fit">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Tickets & USDC</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Tickets cost $1 for 10 ($0.20 per duel). You can deposit with credit card via Circle USDC onramp, or deposit directly with Base ETH.
              </p>
              <div className="pt-1 text-[11px] text-amber-300 font-mono">Rate: $0.10 / Ticket</div>
            </div>
          </div>

          <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
            <h4 className="text-xs sm:text-sm font-bold text-white">Hardware Diagnostics Checklist</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Modern Chromium, Safari, or Firefox browser with WebRTC MediaStream API support</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Webcam with at least 720p 30fps resolution for precise landmark facial tracking</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Sufficient ambient facial lighting (avoid strong backlighting or dark rooms)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. ABOUT US
      ───────────────────────────────────────────────────────────── */}
      {currentPage === 'about' && (
        <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-4xl mx-auto">
          <div className="text-center space-y-2 sm:space-y-3">
            <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest text-purple-400">
              Our Vision
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              About FACEBET
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Revolutionizing real-time social interaction through decentralized smart contracts, WebRTC video architecture, and instantaneous computer vision gaming.
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 sm:p-8 space-y-4 leading-relaxed text-xs sm:text-sm text-zinc-300">
            <p>
              Legacy video chat platforms like Chatroulette, Omegle, and Monkey popularized meeting strangers across the world, but were plagued by passive experiences, lack of safety, and zero gameplay incentive.
            </p>
            <p>
              <strong>FACEBET</strong> was created to turn video interaction into a competitive, thrilling, and rewarding sport. By pairing high-speed peer-to-peer WebRTC video with Google Gemini vision models and blockchain escrow contracts, we built an arena where quick reflexes and authentic human expression win real prizes.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-3 border-t border-white/10 text-center">
              <div className="p-3 bg-white/5 rounded-xl">
                <div className="text-xl sm:text-2xl font-black text-pink-400">100%</div>
                <div className="text-[11px] sm:text-xs text-zinc-400">Direct P2P WebRTC</div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl">
                <div className="text-xl sm:text-2xl font-black text-cyan-400">&lt;15ms</div>
                <div className="text-[11px] sm:text-xs text-zinc-400">AI Reaction Referee</div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl">
                <div className="text-xl sm:text-2xl font-black text-amber-400">$2,400+</div>
                <div className="text-[11px] sm:text-xs text-zinc-400">Live Escrow Pot</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. CONTACT US
      ───────────────────────────────────────────────────────────── */}
      {currentPage === 'contact' && (
        <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-2xl mx-auto">
          <div className="text-center space-y-2 sm:space-y-3">
            <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest text-pink-400">
              Get in Touch
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Contact FACEBET
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
              Have questions, feedback, partnership proposals, or bug reports? Our global engineering team is here for you.
            </p>
          </div>

          <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-4 sm:p-8 backdrop-blur-xl">
            {contactSubmitted ? (
              <div className="text-center py-6 sm:py-8 space-y-3">
                <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400 mx-auto animate-bounce" />
                <h3 className="text-base sm:text-lg font-bold text-white">Message Sent Successfully!</h3>
                <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
                  Thank you for reaching out. A support engineer will reply to <strong>{contactEmail}</strong> within 12 hours.
                </p>
                <button
                  onClick={() => setContactSubmitted(false)}
                  className="mt-3 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-xs font-bold text-white rounded-xl transition cursor-pointer"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-3.5 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300">Your Name</label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Alex Mercer"
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300">Email Address</label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="alex@example.com"
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Category</label>
                  <select
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-white focus:outline-none focus:border-pink-500 transition"
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Technical Support">Technical Support / WebRTC Bug</option>
                    <option value="Wallet / Ticket Issue">Wallet / Ticket Issue</option>
                    <option value="Safety / Report User">Safety / Report User</option>
                    <option value="Partnerships & Streaming">Partnerships & Creator Program</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Describe how we can assist you..."
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-extrabold text-xs sm:text-sm py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer h-11"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. COMMUNITY
      ───────────────────────────────────────────────────────────── */}
      {currentPage === 'community' && (
        <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-4xl mx-auto">
          <div className="text-center space-y-2 sm:space-y-3">
            <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">
              Join the Arena
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              FACEBET Global Community
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Connect with over 15,000+ streamers, competitive players, and Web3 gamers across our official community hubs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 sm:p-6 text-center space-y-2.5 hover:border-purple-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">Discord Guild</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Join live voice hangouts, weekly King-of-the-Hill tournaments, and claim spectator ticket drops.
              </p>
              <div className="pt-1">
                <span className="text-xs font-bold text-indigo-300">15,400+ Members</span>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 sm:p-6 text-center space-y-2.5 hover:border-cyan-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">Twitter / X Community</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Catch viral video battle clips, highlight reels, winner announcements, and developer changelogs.
              </p>
              <div className="pt-1">
                <span className="text-xs font-bold text-cyan-300">@FaceBetArena</span>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 sm:p-6 text-center space-y-2.5 hover:border-pink-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">Creator Bounty Program</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Stream your face duels on Twitch, TikTok, or YouTube to earn revenue share and custom streamer badges.
              </p>
              <div className="pt-1">
                <span className="text-xs font-bold text-pink-300">Apply as Creator</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. TERMS OF SERVICE
      ───────────────────────────────────────────────────────────── */}
      {currentPage === 'terms' && (
        <div className="space-y-5 sm:space-y-6 animate-fade-in max-w-3xl mx-auto text-zinc-300 text-xs sm:text-sm leading-relaxed">
          <div className="text-center space-y-1.5 mb-6 sm:mb-8">
            <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">Legal Agreement</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Terms of Service</h1>
            <p className="text-xs text-zinc-400">Last Revised: September 2026</p>
          </div>

          <div className="space-y-4 bg-zinc-900/50 border border-white/10 rounded-2xl p-4 sm:p-8">
            <h3 className="text-sm sm:text-base font-bold text-white">1. Acceptance of Terms</h3>
            <p>
              By accessing or using FACEBET (the &ldquo;Platform&rdquo;), you certify that you are at least 18 years of age and agree to be bound by these Terms of Service. If you do not agree, you must not use the Platform.
            </p>

            <h3 className="text-sm sm:text-base font-bold text-white">2. Nature of the Game & Smart Contracts</h3>
            <p>
              FACEBET provides a skill-based peer-to-peer expression verification competition. All game rules, jackpot distributions, and ticket escrow balances are governed by transparent smart contracts deployed on Base and ARC Network. Users acknowledge that smart contract interactions are irreversible.
            </p>

            <h3 className="text-sm sm:text-base font-bold text-white">3. User Conduct & Video Broadcasting</h3>
            <p>
              Users agree to strictly refrain from broadcasting explicit, hateful, defamatory, or unlawful video or audio. Automated AI filtering and human moderators retain the right to terminate access and blacklist offending wallet addresses immediately.
            </p>

            <h3 className="text-sm sm:text-base font-bold text-white">4. Non-Custodial Asset Operations</h3>
            <p>
              You maintain sole custody of your Web3 wallet, private keys, and session credentials. FACEBET never holds custody of user private keys or unauthorized funds.
            </p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          8. PRIVACY POLICY
      ───────────────────────────────────────────────────────────── */}
      {currentPage === 'privacy' && (
        <div className="space-y-5 sm:space-y-6 animate-fade-in max-w-3xl mx-auto text-zinc-300 text-xs sm:text-sm leading-relaxed">
          <div className="text-center space-y-1.5 mb-6 sm:mb-8">
            <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">Data & Transparency</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Privacy Policy</h1>
            <p className="text-xs text-zinc-400">Last Revised: September 2026</p>
          </div>

          <div className="space-y-4 bg-zinc-900/50 border border-white/10 rounded-2xl p-4 sm:p-8">
            <h3 className="text-sm sm:text-base font-bold text-white">1. Zero Video Storage Guarantee</h3>
            <p>
              We do not store, record, or retain your video or audio frames on our servers. All media data is transmitted directly between client browsers via peer-to-peer WebRTC connections protected by DTLS/SRTP encryption.
            </p>

            <h3 className="text-sm sm:text-base font-bold text-white">2. Biometric Expression Verification</h3>
            <p>
              Facial expression detection executes ephemeral landmark scoring strictly for the purpose of validating game rules (e.g. detecting winks or smiles). No biometric identifiers or templates are preserved or sold to third parties.
            </p>

            <h3 className="text-sm sm:text-base font-bold text-white">3. Public Blockchain Data</h3>
            <p>
              Please note that public transactions on Base and ARC Network (such as ticket purchases and winner payouts) are recorded permanently on the public ledger as inherent to blockchain technology.
            </p>

            <h3 className="text-sm sm:text-base font-bold text-white">4. Cookies and Local Storage</h3>
            <p>
              We utilize local storage solely to remember user session tokens, camera hardware preferences, and audio settings across browser reloads.
            </p>
          </div>
        </div>
      )}

      {/* Persistent Bottom Call to Action on all Subpages */}
      <div className="mt-8 sm:mt-12 text-center pt-6 sm:pt-8 border-t border-white/10">
        <button
          onClick={onEnterArena}
          className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 hover:from-pink-600 hover:to-cyan-600 text-white font-extrabold text-xs sm:text-sm px-6 py-3 rounded-2xl shadow-xl transition-all duration-200 inline-flex items-center justify-center gap-2 cursor-pointer h-12"
        >
          <Swords className="w-4 h-4" />
          <span>Launch FACEBET Arena Now</span>
        </button>
      </div>
    </div>
  );
};
