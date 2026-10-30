import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { FloatingBubbles } from '../components/FloatingBubbles';
import { LoadingDrop } from '../components/LoadingDrop';
import { PageTransition } from '../components/PageTransition';
import { motion } from 'framer-motion';
import { levelService } from '../services/levelService';
import { audioManager } from '../audio/AudioManager';
import {
  Star,
  Lock,
  Play,
  Dices,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const LevelsPage = () => {
  const navigate = useNavigate();
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shakingId, setShakingId] = useState(null);

  // Fetch / Refresh levels from server
  const fetchLevels = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await levelService.list();
      setLevels(data || []);
      setLoading(false);
    } catch (err) {
      console.error('[LevelsPage] Error fetching levels:', err);
      setError(err?.response?.data?.error || err.message || 'Failed to load levels');
      setLoading(false);
    }
  };

  // Fetch when page mounts or gains focus (upon returning from a level)
  useEffect(() => {
    fetchLevels();

    const handleFocus = () => {
      fetchLevels();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Compute total stars earned across all levels
  const totalStars = useMemo(() => {
    return levels.reduce((acc, lvl) => acc + (lvl.stars || 0), 0);
  }, [levels]);

  // Find the next unlocked level to highlight
  const nextUnlockedLevelId = useMemo(() => {
    const firstUnplayed = levels.find((lvl) => lvl.unlocked && (lvl.stars === 0 || lvl.stars === undefined));
    if (firstUnplayed) return firstUnplayed.id;
    // Otherwise the last unlocked level
    const unlocked = levels.filter((lvl) => lvl.unlocked);
    return unlocked.length > 0 ? unlocked[unlocked.length - 1].id : 1;
  }, [levels]);

  // Group levels by difficulty: Tutorial, Easy, Medium, Hard
  const groupedLevels = useMemo(() => {
    const groups = {
      Tutorial: [],
      Easy: [],
      Medium: [],
      Hard: [],
    };

    levels.forEach((lvl) => {
      const diff = (lvl.difficulty || '').toLowerCase();
      if (diff === 'tutorial' || lvl.id === 1) {
        groups.Tutorial.push(lvl);
      } else if (diff === 'easy' || lvl.id <= 5) {
        groups.Easy.push(lvl);
      } else if (diff === 'medium' || lvl.id <= 12) {
        groups.Medium.push(lvl);
      } else {
        groups.Hard.push(lvl);
      }
    });

    return groups;
  }, [levels]);

  const handleTileClick = (lvl) => {
    audioManager.play('click');
    if (!lvl.unlocked) {
      // Trigger subtle shake animation
      setShakingId(lvl.id);
      setTimeout(() => setShakingId(null), 500);
      return;
    }
    navigate(`/play/${lvl.id}`);
  };

  const handlePracticeClick = () => {
    audioManager.play('click');
    const randomSeed = Math.floor(Math.random() * 900000) + 100000;
    navigate(`/practice/${randomSeed}`);
  };

  return (
    <PageTransition>
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden">
        {/* Soft Ambient Floating Bubbles Background (Light on CPU & respects reduced motion) */}
        <FloatingBubbles count={14} />

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-white/90 backdrop-blur-sm rounded-3xl p-4 sm:p-5 border-2 border-sky-100 shadow-soft">
            <div>
              <span className="text-[10px] font-heading font-black tracking-widest text-sky-blue uppercase block mb-0.5">
                HAPPY DROP
              </span>
          <h1 className="text-xl sm:text-2xl font-heading font-black text-navy">
            LEVEL SELECT
          </h1>
        </div>

        {/* Player's Total Stars & Practice Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-amber-50 border border-amber-200 shadow-inner">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            <span className="font-heading font-black text-navy text-sm">
              {totalStars} <span className="text-navy/50 text-xs font-bold">Stars</span>
            </span>
          </div>

          <Button
            variant="secondary"
            onClick={handlePracticeClick}
            className="!py-2 !px-3.5 !text-xs font-heading font-bold"
            title="Random Practice Level"
          >
            <Dices className="w-4 h-4 mr-1 text-sky-blue" /> Practice
          </Button>
        </div>
      </div>

      {/* Friendly Loading Drop Animation */}
      {loading && (
        <div className="py-16">
          <LoadingDrop message="Loading stages..." />
        </div>
      )}

      {/* Error State with Retry Button */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl border-2 border-rose-100 shadow-soft text-center max-w-md mx-auto my-6">
          <AlertCircle className="w-12 h-12 text-coral-pink mb-3" />
          <h3 className="text-lg font-heading font-black text-navy mb-1">
            Could Not Load Levels
          </h3>
          <p className="text-xs text-navy/70 mb-4">{error}</p>
          <Button variant="primary" onClick={fetchLevels}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Retry
          </Button>
        </div>
      )}

      {/* Level Groups Grid */}
      {!loading && !error && (
        <div className="space-y-6">
          {Object.entries(groupedLevels).map(([groupName, groupLevels]) => {
            if (groupLevels.length === 0) return null;

            return (
              <div
                key={groupName}
                className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-sky-100 shadow-soft"
              >
                {/* Difficulty Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    <h2 className="text-xs sm:text-sm font-heading font-black text-navy tracking-wider uppercase">
                      {groupName} Stages
                    </h2>
                  </div>
                  <span className="text-[11px] font-heading font-bold text-navy/50">
                    {groupLevels.filter((l) => l.stars >= 1).length} / {groupLevels.length} cleared
                  </span>
                </div>

                {/* Responsive Grid: 4 columns on mobile, 5 to 6 on desktop */}
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5 sm:gap-3.5">
                  {groupLevels.map((lvl) => {
                    const isLocked = !lvl.unlocked;
                    const isHighlight = lvl.id === nextUnlockedLevelId;
                    const isShaking = shakingId === lvl.id;

                    return (
                      <motion.div
                        key={lvl.id}
                        initial={{ opacity: 0, y: 14, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          delay: Math.min(0.5, (lvl.id - 1) * 0.035),
                          type: 'spring',
                          stiffness: 280,
                          damping: 20,
                        }}
                        onClick={() => handleTileClick(lvl)}
                        className={`aspect-square relative rounded-2xl flex flex-col items-center justify-between p-2 select-none transition-all duration-200 cursor-pointer ${
                          isShaking ? 'animate-shake' : ''
                        } ${
                          isLocked
                            ? 'bg-slate-100 border-2 border-slate-200 opacity-60 hover:opacity-75'
                            : isHighlight
                            ? 'bg-gradient-to-b from-sky-50 to-white border-3 border-sky-400 shadow-md ring-4 ring-sky-100 scale-[1.03]'
                            : 'bg-white border-2 border-sky-100 hover:border-sky-300 hover:scale-[1.02] shadow-soft'
                        }`}
                      >
                        {/* Highlight Pulse Tag */}
                        {isHighlight && (
                          <span className="absolute -top-2 px-1.5 py-0.5 rounded-full bg-sky-500 text-white font-heading font-black text-[9px] uppercase tracking-wider shadow-sm animate-pulse">
                            Next
                          </span>
                        )}

                        {/* Level Number or Lock Icon */}
                        <div className="flex-1 flex items-center justify-center">
                          {isLocked ? (
                            <div className="p-2 rounded-full bg-slate-200/80 text-slate-500">
                              <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                          ) : (
                            <span
                              className={`text-xl sm:text-2xl font-heading font-black ${
                                isHighlight ? 'text-sky-600' : 'text-navy'
                              }`}
                            >
                              {lvl.id}
                            </span>
                          )}
                        </div>

                        {/* 0 to 3 Stars Indicator */}
                        <div className="flex items-center gap-0.5 pb-0.5">
                          {[1, 2, 3].map((starIdx) => (
                            <Star
                              key={starIdx}
                              className={`w-3 h-3 ${
                                !isLocked && starIdx <= (lvl.stars || 0)
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-200 fill-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
        </div>
      </div>
    </PageTransition>
  );
};
