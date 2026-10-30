import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { CountingNumber } from '../components/CountingNumber';
import { LoadingDrop } from '../components/LoadingDrop';
import { PageTransition } from '../components/PageTransition';
import { leaderboardService } from '../services/leaderboardService';
import { useAuthStore } from '../store/authStore';
import {
  Trophy,
  Medal,
  Star,
  Layers,
  Crown,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const LeaderboardPage = () => {
  const { user } = useAuthStore();
  const [topUsers, setTopUsers] = useState([]);
  const [myRankData, setMyRankData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [topData, myData] = await Promise.all([
        leaderboardService.top(20),
        leaderboardService.me().catch(() => null),
      ]);
      setTopUsers(Array.isArray(topData) ? topData : []);
      setMyRankData(myData);
      setLoading(false);
    } catch (err) {
      console.error('[LeaderboardPage] Error fetching leaderboard:', err);
      setError(err?.response?.data?.error || err.message || 'Failed to load leaderboard');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-heading font-black text-sm shadow-xs border border-amber-300">
          <Crown className="w-4 h-4 fill-amber-500 text-amber-500" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-heading font-black text-sm shadow-xs border border-slate-300">
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-8 h-8 rounded-xl bg-amber-700/15 text-amber-900 flex items-center justify-center font-heading font-black text-sm shadow-xs border border-amber-700/30">
          3
        </span>
      );
    }
    return (
      <span className="w-8 h-8 rounded-xl bg-soft text-navy/60 flex items-center justify-center font-heading font-bold text-xs">
        {rank}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <LoadingDrop message="Loading standings..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-coral-pink mx-auto mb-3" />
        <h3 className="text-xl font-heading font-black text-navy mb-1">Could Not Load Standings</h3>
        <p className="text-xs text-navy/70 mb-5">{error}</p>
        <Button variant="primary" onClick={fetchLeaderboard}>
          <RefreshCw className="w-4 h-4 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="text-center mb-6">
        <span className="text-[10px] uppercase font-heading font-black tracking-widest text-sky-blue block mb-1">
          HAPPY DROP LEADERBOARD
        </span>
        <h1 className="text-2xl md:text-3xl font-heading font-black text-navy">Global Rankings</h1>
        <p className="text-xs text-navy/60 mt-1">Ranked by total stars, levels completed and efficiency</p>
      </div>

      {/* "Your Rank" Card */}
      <Card className="p-4 sm:p-5 mb-6 bg-gradient-to-r from-sky-50 via-white to-blue-50 border-2 border-sky-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-blue/20 flex items-center justify-center text-sky-blue">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-heading font-bold text-navy/60 block">Your Ranking</span>
              <span className="text-xl font-heading font-black text-navy">
                {myRankData?.rank !== null && myRankData?.rank !== undefined ? (
                  <>
                    Rank #<CountingNumber value={myRankData.rank} />
                  </>
                ) : (
                  <span className="text-sm font-heading font-bold text-amber-600">
                    Earn a star to enter the leaderboard
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-center">
            <div className="px-3 py-1.5 rounded-xl bg-white border border-sky-100 shadow-xs">
              <span className="text-[10px] font-heading font-bold text-navy/50 block">Stars</span>
              <span className="text-base font-heading font-black text-amber-500 flex items-center gap-1 justify-center">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <CountingNumber value={myRankData?.totalStars ?? 0} />
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-white border border-sky-100 shadow-xs">
              <span className="text-[10px] font-heading font-bold text-navy/50 block">Levels</span>
              <span className="text-base font-heading font-black text-navy">
                <CountingNumber value={myRankData?.completedLevels ?? 0} />
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Leaderboard Table Card */}
      <Card className="p-0 overflow-hidden border-2 border-sky-100 shadow-soft">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 p-3.5 px-5 bg-soft/70 border-b border-sky-100 text-[11px] font-heading font-black text-navy/60 uppercase tracking-wider">
          <div className="col-span-2 text-center">Rank</div>
          <div className="col-span-5">Player</div>
          <div className="col-span-3 text-center">Stars</div>
          <div className="col-span-2 text-center">Levels</div>
        </div>

        {/* Rows */}
        {topUsers.length === 0 ? (
          <div className="py-12 text-center">
            <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-heading font-bold text-navy/60">No players on the leaderboard yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-sky-100">
            {topUsers.map((player) => {
              const isCurrentUser = user && (user.name === player.name || user._id === player._id);

              return (
                <div
                  key={player.rank}
                  className={`grid grid-cols-12 gap-2 items-center p-3.5 px-5 transition ${
                    isCurrentUser
                      ? 'bg-sky-50/90 font-bold border-l-4 border-l-sky-500'
                      : 'hover:bg-soft/30'
                  }`}
                >
                  {/* Rank */}
                  <div className="col-span-2 flex justify-center">
                    {getRankBadge(player.rank)}
                  </div>

                  {/* Player Name (No emails) */}
                  <div className="col-span-5 flex items-center gap-2 truncate">
                    <span className="font-heading font-black text-navy text-sm md:text-base truncate">
                      {player.name}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded-md bg-sky-200 text-sky-800">
                        You
                      </span>
                    )}
                  </div>

                  {/* Total Stars */}
                  <div className="col-span-3 flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-heading font-black text-navy text-sm">
                      <CountingNumber value={player.totalStars} />
                    </span>
                  </div>

                  {/* Levels Completed */}
                  <div className="col-span-2 text-center font-heading font-bold text-navy/80 text-sm">
                    <CountingNumber value={player.completedLevels} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      </div>
    </PageTransition>
  );
};
