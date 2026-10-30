import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { FloatingBubbles } from '../components/FloatingBubbles';
import { PageTransition } from '../components/PageTransition';
import { useAuthStore } from '../store/authStore';
import { useAudioStore } from '../store/audioStore';
import { audioManager } from '../audio/AudioManager';
import {
  Play,
  Trophy,
  LayoutDashboard,
  Volume2,
  VolumeX,
  Music,
  Music2,
} from 'lucide-react';

export const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { soundEnabled, musicEnabled, toggleSound, toggleMusic } = useAudioStore();

  const handlePlayClick = () => {
    audioManager.play('click');
    if (user) {
      navigate('/levels');
    } else {
      navigate('/login');
    }
  };

  return (
    <PageTransition>
      <div className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
        {/* Soft Ambient Floating Bubbles Background (Light on CPU & respects reduced motion) */}
        <FloatingBubbles count={16} />
      {/* Background Animation: Animated Water Drop Falling into a Smiling Glass */}
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-15 overflow-hidden">
        <svg
          viewBox="0 0 500 500"
          className="w-[500px] h-[500px] max-w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Background Falling Drops with CSS animations */}
          <g className="animate-pulse">
            <path
              d="M 250 50 C 250 50 238 75 238 88 C 238 98 243 105 250 105 C 257 105 262 98 262 88 C 262 75 250 50 250 50 Z"
              fill="#2BA7F0"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 0,220; 0,0"
                dur="4s"
                repeatCount="indefinite"
              />
            </path>
          </g>

          {/* Background Glass Outline */}
          <path
            d="M 190 280 L 190 420 Q 190 440 210 440 L 290 440 Q 310 440 310 420 L 310 280"
            stroke="#12355B"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Glass Smiling Face */}
          <circle cx="230" cy="360" r="5" fill="#12355B" />
          <circle cx="270" cy="360" r="5" fill="#12355B" />
          <path
            d="M 235 385 Q 250 405 265 385"
            stroke="#12355B"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 max-w-xl w-full text-center flex flex-col items-center">
        {/* Big Original Happy Drop Logo: SVG Drop + Smiling Glass */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="relative w-36 h-36 md:w-44 md:h-44 flex items-center justify-center">
            <svg
              viewBox="0 0 160 160"
              className="w-full h-full drop-shadow-lg"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="homeDropGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#2BA7F0" />
                </linearGradient>
                <linearGradient id="homeGlassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(224, 242, 254, 0.4)" />
                  <stop offset="100%" stopColor="rgba(186, 230, 253, 0.7)" />
                </linearGradient>
              </defs>

              {/* Smiling Glass on Right */}
              <g transform="translate(68, 55)">
                <path
                  d="M 8 0 L 8 68 Q 8 82 22 82 L 56 82 Q 70 82 70 68 L 70 0"
                  fill="url(#homeGlassGrad)"
                  stroke="#12355B"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Water level inside glass */}
                <path
                  d="M 12 45 L 12 68 Q 12 78 22 78 L 56 78 Q 66 78 66 68 L 66 45 Z"
                  fill="#7DD3FC"
                  opacity="0.85"
                />
                {/* Cheerful glass eyes & smile */}
                <circle cx="28" cy="38" r="4" fill="#12355B" />
                <circle cx="50" cy="38" r="4" fill="#12355B" />
                <path
                  d="M 32 52 Q 39 62 46 52"
                  stroke="#12355B"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
                <circle cx="22" cy="44" r="3" fill="#FB7185" opacity="0.8" />
                <circle cx="56" cy="44" r="3" fill="#FB7185" opacity="0.8" />
              </g>

              {/* Big Happy Droplet on Left */}
              <g transform="translate(4, 10)">
                <path
                  d="M 44 4 C 44 4, 12 46, 12 68 C 12 88 28 102 48 102 C 68 102 84 88 84 68 C 84 46, 44 4, 44 4 Z"
                  fill="url(#homeDropGrad)"
                  stroke="#12355B"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
                {/* Droplet Highlight */}
                <path
                  d="M 28 54 C 28 42, 36 28, 44 20"
                  stroke="#FFFFFF"
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity="0.85"
                />
                {/* Droplet Face */}
                <circle cx="37" cy="65" r="4" fill="#12355B" />
                <circle cx="57" cy="65" r="4" fill="#12355B" />
                <path
                  d="M 39 74 Q 47 84 55 74"
                  stroke="#12355B"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
                <circle cx="28" cy="72" r="3.5" fill="#FF6B9D" opacity="0.85" />
                <circle cx="66" cy="72" r="3.5" fill="#FF6B9D" opacity="0.85" />
              </g>
            </svg>
          </div>
        </div>

        {/* Brand Title */}
        <h1 className="text-4xl md:text-5xl font-heading font-black text-navy tracking-tight mb-2">
          HAPPY <span className="text-sky-blue">DROP</span>
        </h1>

        {/* Tagline */}
        <div className="inline-block px-4 py-1.5 rounded-full bg-white border-2 border-sky-100 shadow-soft mb-6">
          <p className="font-heading font-black text-xs md:text-sm tracking-widest text-navy uppercase">
            DRAW &bull; GUIDE &bull; FILL &bull; SMILE
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col w-full max-w-xs gap-3 mb-6">
          <Button
            variant="primary"
            onClick={handlePlayClick}
            className="w-full text-lg !py-4 font-black shadow-lg"
          >
            <Play className="w-5 h-5 mr-2 fill-white" /> Play
          </Button>

          <Link to="/leaderboard" className="w-full" onClick={() => audioManager.play('click')}>
            <Button variant="secondary" className="w-full font-bold !py-3">
              <Trophy className="w-4 h-4 mr-2 text-sunny-yellow fill-sunny-yellow" /> Leaderboard
            </Button>
          </Link>

          <Link to="/dashboard" className="w-full" onClick={() => audioManager.play('click')}>
            <Button variant="secondary" className="w-full font-bold !py-3">
              <LayoutDashboard className="w-4 h-4 mr-2 text-sky-blue" /> Dashboard
            </Button>
          </Link>
        </div>

        {/* Music & Sound Toggles in Home Screen */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={toggleSound}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-heading font-bold shadow-soft cursor-pointer transition-all ${
              soundEnabled
                ? 'bg-white border-sky-200 text-sky-blue hover:border-sky-300'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
            title="Sound Effects Toggle"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4" /> Sound: On
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4" /> Sound: Off
              </>
            )}
          </button>

          <button
            onClick={toggleMusic}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-heading font-bold shadow-soft cursor-pointer transition-all ${
              musicEnabled
                ? 'bg-white border-sky-200 text-sky-blue hover:border-sky-300'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
            title="Background Music Toggle"
          >
            {musicEnabled ? (
              <>
                <Music className="w-4 h-4" /> Music: On
              </>
            ) : (
              <>
                <Music2 className="w-4 h-4" /> Music: Off
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </PageTransition>
);
};
