import React, { useEffect, useState, useRef } from 'react';
import { MdFavorite, MdShare, MdVerified, MdGeneratingTokens } from 'react-icons/md';

interface FeedPost {
  _id: string;
  walletAddress: string;
  network: string;
  videoUrl: string;
  txHash: string;
  aiReason: string;
  likes: number;
}

export const VerticalFeed: React.FC = () => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [skip, setSkip] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchFeedData = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/vertical-feed?limit=5&skip=${skip}`);
      if (res.ok) {
        const data = await res.json();
        if (data.timeline && data.timeline.length > 0) {
          setPosts((prev) => [...prev, ...data.timeline]);
          setSkip((prev) => prev + data.timeline.length);
        }
      }
    } catch {
      // Retain existing posts gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedData();
  }, []);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // Trigger lazy loading of the next batch when user scrolls close to the bottom container threshold
    if (scrollHeight - scrollTop <= clientHeight + 150) {
      fetchFeedData();
    }
  };

  const toggleLike = (postId: string) => {
    setLikedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId
          ? { ...p, likes: p.likes + (likedPosts[postId] ? -1 : 1) }
          : p
      )
    );
  };

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="w-full h-full overflow-y-scroll snap-y snap-mandatory bg-black text-white relative select-none"
      style={{
        scrollSnapType: 'y mandatory',
      }}
    >
      {posts.length === 0 && !loading && (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="p-4 bg-purple-900/40 border border-purple-500/30 rounded-2xl">
            <MdGeneratingTokens className="w-12 h-12 text-amber-400 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-white">No Winning Clips Yet</h3>
          <p className="text-sm text-gray-400 max-w-md">
            Be the first player to win a 10-second Lottery Live round! Winning clips auto-post here for the global community feed.
          </p>
        </div>
      )}

      {posts.map((post) => (
        <div 
          key={post._id}
          className="w-full h-full snap-start relative flex items-center justify-center overflow-hidden bg-slate-950"
          style={{
            scrollSnapAlign: 'start',
          }}
        >
          {/* Native HTML5 Auto-looping Video Component Block */}
          <video 
            src={post.videoUrl}
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback placeholder gradient when video URL buffer is empty or corrupt
              (e.target as HTMLElement).style.display = 'none';
            }}
          />

          {/* Background Ambient Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90 pointer-events-none" />

          {/* Right Action Bar (Likes & Share) */}
          <div className="absolute right-4 bottom-24 flex flex-col items-center space-y-6 z-10">
            <button
              onClick={() => toggleLike(post._id)}
              className="flex flex-col items-center group transition transform active:scale-90"
            >
              <div className={`p-3 rounded-full backdrop-blur-md border transition ${
                likedPosts[post._id] 
                  ? 'bg-rose-600/80 border-rose-400 text-white shadow-lg shadow-rose-500/50' 
                  : 'bg-black/40 border-white/20 text-white hover:bg-black/60'
              }`}>
                <MdFavorite className={`w-6 h-6 ${likedPosts[post._id] ? 'fill-current text-white' : 'text-white'}`} />
              </div>
              <span className="text-xs font-bold text-white mt-1 shadow-sm">
                {(post.likes || 0) + (likedPosts[post._id] ? 1 : 0)}
              </span>
            </button>

            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Lottery Live Winning Frame',
                    text: post.aiReason,
                    url: window.location.href,
                  }).catch(() => {});
                }
              }}
              className="flex flex-col items-center group transition transform active:scale-90"
            >
              <div className="p-3 bg-black/40 hover:bg-black/60 border border-white/20 rounded-full backdrop-blur-md text-white">
                <MdShare className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-white mt-1">Share</span>
            </button>
          </div>

          {/* TikTok-Style Bottom Graphic Metadata Description Overlays */}
          <div className="absolute bottom-6 left-4 right-20 bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2 z-10">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-amber-400 text-sm flex items-center gap-1">
                <MdVerified className="text-emerald-400 w-4 h-4" />
                {post.walletAddress ? `${post.walletAddress.substring(0, 6)}...${post.walletAddress.substring(post.walletAddress.length - 4)}` : 'Anonymous Player'}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider bg-purple-900/60 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-md">
                {(post.network || 'BASE').toUpperCase()}
              </span>
            </div>

            <p className="text-xs text-gray-200 leading-relaxed font-medium">
              🤖 <span className="text-amber-300 font-semibold">Gemini Win Verdict:</span> "{post.aiReason}"
            </p>

            {post.txHash && (
              <div className="text-[10px] text-gray-400 font-mono flex items-center space-x-1">
                <span>TX:</span>
                <span className="truncate max-w-[180px]">{post.txHash}</span>
              </div>
            )}
          </div>
        </div>
      ))}

      {loading && (
        <div className="p-4 text-center text-xs text-amber-300 animate-pulse bg-black/80">
          Loading vertical feed clips...
        </div>
      )}
    </div>
  );
};

export default VerticalFeed;
