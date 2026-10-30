import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { CountingNumber } from '../components/CountingNumber';
import { LoadingDrop } from '../components/LoadingDrop';
import { PageTransition } from '../components/PageTransition';
import { progressService } from '../services/progressService';
import {
  Trophy,
  Star,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Award,
  Lock,
  Clock,
  Layers,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

const ALL_ACHIEVEMENTS = [
  { id: 'First Drop', title: 'First Drop', desc: 'Clear your first puzzle' },
  { id: 'Halfway', title: 'Halfway Hero', desc: 'Complete 10 levels' },
  { id: 'All Clear', title: 'Grand Master', desc: 'Complete all 20 levels' },
  { id: 'Perfect Five', title: 'Perfectionist', desc: 'Earn 3 stars on 5 levels' },
];

export const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [progressList, setProgressList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, progressData] = await Promise.all([
        progressService.stats(),
        progressService.progress().catch(() => []),
      ]);
      setStats(statsData);
      setProgressList(Array.isArray(progressData) ? progressData : []);
      setLoading(false);
    } catch (err) {
      console.error('[DashboardPage] Failed to fetch data:', err);
      setError(err?.response?.data?.error || err.message || 'Failed to load player stats');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'recently';
    const diff = (Date.now() - new Date(dateString).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <LoadingDrop message="Loading player profile..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-coral-pink mx-auto mb-3" />
        <h3 className="text-xl font-heading font-black text-navy mb-1">Could Not Load Profile</h3>
        <p className="text-xs text-navy/70 mb-5">{error}</p>
        <Button variant="primary" onClick={fetchDashboardData}>
          <RefreshCw className="w-4 h-4 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  const levelsCompleted = stats?.levelsCompleted ?? 0;
  const totalStars = stats?.totalStars ?? 0;
  const perfectLevels = stats?.perfectLevels ?? 0;
  const totalAttempts = stats?.totalAttempts ?? 0;
  const bestCompletion = stats?.bestCompletion ?? 0;
  const progressPercent = Math.min(100, Math.round(stats?.progressPercent ?? 0));
  const recentLevels = stats?.recentLevels || [];
  const unlockedBadges = new Set(stats?.achievements || []);

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-[10px] uppercase font-heading font-black tracking-widest text-sky-blue block mb-1">
          HAPPY DROP &bull; PLAYER PROFILE
        </span>
        <h1 className="text-2xl md:text-3xl font-heading font-black text-navy">Player Dashboard</h1>
        <p className="text-xs text-navy/60 mt-1">Review your completed levels, stars, and milestones</p>
      </div>

      {/* 1. Stat Cards (Responsive: 2-column grid on phones, 5-column on desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
        {/* Levels Completed */}
        <Card className="flex flex-col items-center justify-center text-center p-4">
          <div className="w-10 h-10 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-blue mb-2">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-heading font-bold text-navy/60 block">Levels Completed</span>
          <span className="text-2xl font-heading font-black text-navy">
            <CountingNumber value={levelsCompleted} />
          </span>
        </Card>

        {/* Total Stars */}
        <Card className="flex flex-col items-center justify-center text-center p-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-sunny-yellow mb-2">
            <Star className="w-5 h-5 fill-sunny-yellow" />
          </div>
          <span className="text-[11px] font-heading font-bold text-navy/60 block">Total Stars</span>
          <span className="text-2xl font-heading font-black text-navy">
            <CountingNumber value={totalStars} />
          </span>
        </Card>

        {/* Perfect Levels */}
        <Card className="flex flex-col items-center justify-center text-center p-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-mint mb-2">
            <Trophy className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-heading font-bold text-navy/60 block">Perfect Levels</span>
          <span className="text-2xl font-heading font-black text-navy">
            <CountingNumber value={perfectLevels} />
          </span>
        </Card>

        {/* Total Attempts */}
        <Card className="flex flex-col items-center justify-center text-center p-4">
          <div className="w-10 h-10 rounded-2xl bg-pink-100 flex items-center justify-center text-coral-pink mb-2">
            <RotateCcw className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-heading font-bold text-navy/60 block">Total Attempts</span>
          <span className="text-2xl font-heading font-black text-navy">
            <CountingNumber value={totalAttempts} />
          </span>
        </Card>

        {/* Best Completion */}
        <Card className="flex flex-col items-center justify-center text-center p-4 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 mb-2">
            <Award className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-heading font-bold text-navy/60 block">Best Completion</span>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-2xl font-heading font-black text-navy">
              <CountingNumber value={bestCompletion} />
            </span>
            <span className="text-xs font-bold text-amber-500">★</span>
          </div>
        </Card>
      </div>

      {/* 2. Progress Bar */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between text-xs font-heading font-bold mb-2">
          <span className="text-navy flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-sky-blue" /> Campaign Completion Progress
          </span>
          <span className="text-sky-blue font-black font-mono text-sm">{progressPercent}%</span>
        </div>
        <div className="w-full h-3.5 bg-slate-100 rounded-full p-0.5 border border-sky-100 overflow-hidden shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </Card>

      {/* 3. Level Stars Row (GET /progress) */}
      {progressList.length > 0 && (
        <Card className="p-5 mb-6">
          <h3 className="text-xs uppercase font-heading font-black text-navy/70 tracking-wider mb-3">
            Stars Per Level Overview
          </h3>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {progressList.map((prog) => (
              <div
                key={prog.levelId}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-soft/60 border border-sky-100"
              >
                <span className="text-[10px] font-heading font-bold text-navy/60 mb-0.5">
                  L{prog.levelId}
                </span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3].map((starIdx) => (
                    <Star
                      key={starIdx}
                      className={`w-2.5 h-2.5 ${
                        starIdx <= (prog.stars || 0)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300 fill-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 4. Recent Levels List */}
      <Card className="p-5 mb-6">
        <h3 className="text-xs uppercase font-heading font-black text-navy/70 tracking-wider mb-3">
          Recent Completed Levels
        </h3>
        {recentLevels.length === 0 ? (
          <p className="text-xs text-navy/50 py-3 text-center">No recent completed games yet.</p>
        ) : (
          <div className="divide-y divide-sky-100">
            {recentLevels.map((rec, index) => (
              <div key={index} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-soft flex items-center justify-center font-heading font-black text-navy text-sm">
                    {rec.levelId}
                  </div>
                  <div>
                    <span className="text-xs font-heading font-bold text-navy block">
                      Level {rec.levelId}
                    </span>
                    <span className="text-[10px] text-navy/50 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" /> {formatRelativeTime(rec.completedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= rec.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-heading font-black text-sky-600 font-mono w-16 text-right">
                    {rec.score ?? '---'} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 5. Achievement Badges */}
      <Card className="p-5">
        <h3 className="text-xs uppercase font-heading font-black text-navy/70 tracking-wider mb-3">
          Achievements
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {ALL_ACHIEVEMENTS.map((ach) => {
            const isUnlocked = unlockedBadges.has(ach.id);
            return (
              <div
                key={ach.id}
                className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                  isUnlocked
                    ? 'bg-amber-50/70 border-amber-200 shadow-xs'
                    : 'bg-slate-50 border-slate-200 opacity-50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isUnlocked ? 'bg-amber-400 text-white shadow-xs' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {isUnlocked ? <Sparkles className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-xs font-heading font-black text-navy">{ach.title}</h4>
                  <p className="text-[10px] text-navy/60">{ach.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      </div>
    </PageTransition>
  );
};
