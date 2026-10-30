import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { Button } from './Button';
import { useAuthStore } from '../store/authStore';
import { useAudioStore } from '../store/audioStore';
import {
  Trophy,
  LayoutGrid,
  LayoutDashboard,
  LogOut,
  User,
  Volume2,
  VolumeX,
  Music,
  Music2,
} from 'lucide-react';

export const TopBar = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuthStore();
  const { soundEnabled, musicEnabled, toggleSound, toggleMusic } = useAudioStore();
  const isLoggedIn = !!token && !!user;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Levels', path: '/levels', icon: <LayoutGrid className="w-4 h-4" /> },
    { name: 'Practice', path: '/practice/custom-seed', icon: <LayoutGrid className="w-4 h-4" /> },
    { name: 'Leaderboard', path: '/leaderboard', icon: <Trophy className="w-4 h-4" /> },
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b-2 border-sky-100 px-4 py-3 shadow-soft">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Logo size="md" />

        {/* Navigation items (available to all, routes will guard if protected) */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-heading text-sm font-semibold transition ${
                  isActive
                    ? 'bg-soft text-sky-blue'
                    : 'text-navy/70 hover:text-navy hover:bg-slate-50'
                }`
              }
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Audio Controls & User / Auth CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sound & Music Toggles */}
          <div className="flex items-center gap-1 bg-soft p-1 rounded-2xl border border-sky-200">
            <button
              onClick={toggleSound}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-white text-sky-blue shadow-xs'
                  : 'text-slate-400 hover:text-navy'
              }`}
              title={soundEnabled ? 'Mute SFX' : 'Enable SFX'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleMusic}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                musicEnabled
                  ? 'bg-white text-sky-blue shadow-xs'
                  : 'text-slate-400 hover:text-navy'
              }`}
              title={musicEnabled ? 'Stop Music' : 'Play Music'}
            >
              {musicEnabled ? <Music className="w-4 h-4" /> : <Music2 className="w-4 h-4 opacity-50" />}
            </button>
          </div>

          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-soft border border-sky-200">
                <div className="w-7 h-7 rounded-full bg-sky-blue/20 flex items-center justify-center text-sky-blue">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-heading font-black text-navy leading-none">
                    {user.name}
                  </span>
                  <span className="block text-[10px] text-sky-blue font-bold">
                    {user.totalStars ?? 0} ★
                  </span>
                </div>
              </div>

              <Button
                variant="secondary"
                onClick={handleLogout}
                className="!py-2 !px-3 !text-xs text-coral-pink hover:text-red-700"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5 sm:mr-1.5" /> <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <NavLink to="/login">
                <Button variant="secondary" className="!py-2 !px-3 sm:!px-4 !text-xs sm:!text-sm">
                  Log In
                </Button>
              </NavLink>
              <NavLink to="/register">
                <Button variant="primary" className="!py-2 !px-3 sm:!px-4 !text-xs sm:!text-sm">
                  Sign Up
                </Button>
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
