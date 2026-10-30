import React, { useRef, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { Toast } from '../components/Toast';
import { CountingNumber } from '../components/CountingNumber';
import { LoadingDrop } from '../components/LoadingDrop';
import { PageTransition } from '../components/PageTransition';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { GameEngine } from '../game/GameEngine';
import { STATES } from '../game/GameState';
import { calculateStars } from '../game/StarCalculator';
import { levelService } from '../services/levelService';
import { gameService } from '../services/gameService';
import {
  ArrowLeft,
  RotateCcw,
  Play,
  Pause,
  Undo2,
  PenTool,
  AlertCircle,
  HelpCircle,
  Star,
  CheckCircle2,
  XCircle,
  Trophy,
  Clock,
  Layers,
  ChevronRight,
  Home,
  RefreshCw,
  Lightbulb,
  Volume2,
  VolumeX,
  Code2,
  Eye,
  EyeOff,
  Copy,
  FastForward,
} from 'lucide-react';

export const PlayPage = ({ customLevel = null, isPracticeMode = false }) => {
  const { levelId, seed } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  // Level & Session state
  const [levelData, setLevelData] = useState(customLevel);
  const [loading, setLoading] = useState(!customLevel);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');

  const [sessionId, setSessionId] = useState(null);
  const isStartingSession = useRef(false);
  const lastStartRequestTime = useRef(0);

  // Game Engine & Simulation state
  const [particleCount, setParticleCount] = useState(0);
  const [gameStateName, setGameStateName] = useState(STATES.IDLE);
  const [outOfInk, setOutOfInk] = useState(false);

  // Dev tools state (active when customLevel is passed or import.meta.env.DEV)
  const isDevMode = Boolean(customLevel || import.meta.env.DEV);
  const [devOverlayActive, setDevOverlayActive] = useState(false);
  const [pointerCoords, setPointerCoords] = useState(null);
  const [lastClickedCoords, setLastClickedCoords] = useState(null);

  // Hint state: max 3 hints per level, client-side only
  const [hintCount, setHintCount] = useState(3);
  const [isSoundMuted, setIsSoundMuted] = useState(false);

  // Timer tracking (started when water starts, paused time does not count)
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerStartRef = useRef(0);
  const accumulatedTimeRef = useRef(0);
  const timerRafRef = useRef(null);
  const isTimerRunningRef = useRef(false);

  const [inkState, setInkState] = useState({
    maxInk: 400,
    inkUsed: 0,
    inkLeft: 400,
    percentage: 100,
  });
  const [strokeCount, setStrokeCount] = useState(0);

  // Result submission state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [serverResult, setServerResult] = useState(null);
  const pendingPayloadRef = useRef(null);

  // 1. Timer Helpers
  const startTimer = () => {
    if (isTimerRunningRef.current) return;
    isTimerRunningRef.current = true;
    timerStartRef.current = performance.now();

    let lastTimerUpdate = 0;
    const updateTimer = (time) => {
      if (!isTimerRunningRef.current) return;
      if (time - lastTimerUpdate >= 100) {
        lastTimerUpdate = time;
        const now = performance.now();
        const currentElapsed = (accumulatedTimeRef.current + (now - timerStartRef.current)) / 1000;
        setElapsedTime(Math.round(currentElapsed * 10) / 10);
      }
      timerRafRef.current = requestAnimationFrame(updateTimer);
    };
    timerRafRef.current = requestAnimationFrame(updateTimer);
  };

  const pauseTimer = () => {
    if (!isTimerRunningRef.current) return;
    isTimerRunningRef.current = false;
    accumulatedTimeRef.current += performance.now() - timerStartRef.current;
    if (timerRafRef.current) {
      cancelAnimationFrame(timerRafRef.current);
      timerRafRef.current = null;
    }
  };

  const resetTimer = () => {
    isTimerRunningRef.current = false;
    if (timerRafRef.current) {
      cancelAnimationFrame(timerRafRef.current);
      timerRafRef.current = null;
    }
    accumulatedTimeRef.current = 0;
    timerStartRef.current = 0;
    setElapsedTime(0);
  };

  // 2. Start new game session (debounced against double-taps)
  const startNewSession = async (targetLevelId) => {
    if (isPracticeMode || customLevel) return;

    const now = Date.now();
    if (now - lastStartRequestTime.current < 600 || isStartingSession.current) {
      return;
    }
    lastStartRequestTime.current = now;
    isStartingSession.current = true;

    try {
      const res = await gameService.start(targetLevelId);
      setSessionId(res.sessionId);
    } catch (err) {
      const status = err?.response?.status;
      const errorCode = err?.response?.data?.error;

      if (status === 403 || errorCode === 'LEVEL_LOCKED') {
        setToastMessage(`Level ${targetLevelId} is locked. Complete previous levels first.`);
        setToastType('warning');
        setTimeout(() => navigate('/levels'), 1500);
      } else {
        console.warn('[PlayPage] Failed to start game session:', err);
      }
    } finally {
      isStartingSession.current = false;
    }
  };

  // 3. Initial Level Fetch & Session Start
  const loadLevelAndSession = async () => {
    if (customLevel) {
      setLevelData(customLevel);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let data = null;
      if (isPracticeMode && seed) {
        data = await levelService.generated(seed);
      } else {
        const id = parseInt(levelId, 10);
        data = await levelService.byId(id);
      }

      setLevelData(data);
      setHintCount(3);
      setLoading(false);

      if (!isPracticeMode && data?.id) {
        startNewSession(data.id);
      }
    } catch (err) {
      const status = err?.response?.status;
      const errorCode = err?.response?.data?.error;

      if (status === 403 || errorCode === 'LEVEL_LOCKED') {
        setToastMessage('Level is locked!');
        setToastType('warning');
        setTimeout(() => navigate('/levels'), 1500);
      } else if (status === 404) {
        setError('Level not found');
      } else {
        setError(err?.response?.data?.error || err.message || 'Network error');
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLevelAndSession();
    return () => {
      resetTimer();
    };
  }, [levelId, seed, customLevel]);

  // 4. Initialize Physics Engine & Event Handlers
  useEffect(() => {
    if (!canvasRef.current || !levelData) return;

    const maxInk = levelData.maxInk || 400;
    const engine = new GameEngine(canvasRef.current, {
      maxInk,
      onParticleCountChange: (count) => {
        setParticleCount(count);
      },
    });

    engine.loadLevel(levelData);

    setInkState({
      maxInk,
      inkUsed: 0,
      inkLeft: maxInk,
      percentage: 100,
    });
    setOutOfInk(false);
    resetTimer();
    setServerResult(null);
    setSaveError(false);
    pendingPayloadRef.current = null;

    const dc = engine.drawingController;
    let lastInkUpdate = 0;
    dc.onInkChange((stats) => {
      // Throttle HUD ink updates to ~10 per second (100ms) to prevent unnecessary React re-renders per frame
      const now = performance.now();
      if (now - lastInkUpdate > 95 || stats.inkLeft <= 0) {
        lastInkUpdate = now;
        setInkState(stats);
      }
      if (stats.inkLeft <= 0) {
        setOutOfInk(true);
      }
    });

    dc.onNoInk(() => {
      setOutOfInk(true);
    });

    dc.onStrokeAdded(() => {
      setStrokeCount(dc.strokes.length);
      // Final flush of ink state on stroke completion
      setInkState({
        maxInk: dc.maxInk,
        inkUsed: dc.inkUsed,
        inkLeft: Math.max(0, dc.maxInk - dc.inkUsed),
        percentage: Math.max(0, Math.round(((dc.maxInk - dc.inkUsed) / dc.maxInk) * 100)),
      });
    });

    // GameState transitions
    const unsubState = engine.gameState.onStateChange(({ current }) => {
      setGameStateName(current);
      if (current === STATES.SIMULATING) {
        startTimer();
        dc.setEnabled(true);
      } else if (current === STATES.PAUSED) {
        pauseTimer();
        dc.setEnabled(false); // disable drawing while paused
      } else if (current === STATES.WON || current === STATES.FAILED) {
        pauseTimer();
        dc.setEnabled(false); // disable drawing after complete
      } else {
        dc.setEnabled(true);
      }
    });

    // 5. Handle WON condition -> Submit to backend
    const unsubWin = engine.gameState.onWin(async (winPayload) => {
      pauseTimer();

      const finalElapsed = Math.max(2, Math.round(accumulatedTimeRef.current / 100) / 10);
      const rawInkUsed = winPayload.inkUsed ?? dc.getInkUsed();
      const roundedInkUsed = Math.round(rawInkUsed * 10) / 10;

      const payload = {
        sessionId,
        levelId: levelData.id,
        inkUsed: roundedInkUsed,
        completionTime: finalElapsed,
      };

      pendingPayloadRef.current = payload;

      if (isPracticeMode || !sessionId) {
        // Practice mode: calculate locally and don't save
        setServerResult({
          stars: calculateStars(roundedInkUsed, levelData.maxInk || 400),
          score: 800,
          isNewBest: false,
          nextLevelUnlocked: null,
          inkUsed: roundedInkUsed,
          completionTime: finalElapsed,
        });
        return;
      }

      submitCompletion(payload);
    });

    engineRef.current = engine;

    return () => {
      unsubState();
      unsubWin();
      engine.destroy();
      engineRef.current = null;
      resetTimer();
    };
  }, [levelData, sessionId]);

  // Submit result with Retry handling on network failure
  const submitCompletion = async (payload) => {
    setIsSaving(true);
    setSaveError(false);

    try {
      const res = await gameService.complete(payload);
      setServerResult({
        ...res,
        inkUsed: payload.inkUsed,
        completionTime: payload.completionTime,
      });
      setIsSaving(false);
    } catch (err) {
      console.error('[PlayPage] Failed to save completion:', err);
      setIsSaving(false);
      setSaveError(true);
    }
  };

  const handleRetrySubmit = () => {
    if (pendingPayloadRef.current) {
      submitCompletion(pendingPayloadRef.current);
    }
  };

  const handleStart = () => {
    if (!engineRef.current) return;
    engineRef.current.start();
    engineRef.current.gameState.transitionTo(STATES.SIMULATING);
  };

  const handlePause = () => {
    if (!engineRef.current) return;
    if (gameStateName === STATES.WON || gameStateName === STATES.FAILED) return;
    engineRef.current.stop();
    engineRef.current.gameState.transitionTo(STATES.PAUSED);
  };

  const handleResume = () => {
    if (!engineRef.current) return;
    engineRef.current.start();
    engineRef.current.gameState.transitionTo(STATES.SIMULATING);
  };

  const handleReset = () => {
    if (!engineRef.current || !levelData) return;
    engineRef.current.reset();
    engineRef.current.drawingController.clearStrokes();
    setStrokeCount(0);
    setOutOfInk(false);
    resetTimer();
    setServerResult(null);
    setSaveError(false);
    pendingPayloadRef.current = null;

    setInkState({
      maxInk: levelData.maxInk || 400,
      inkUsed: 0,
      inkLeft: levelData.maxInk || 400,
      percentage: 100,
    });

    // Start a fresh session on restart
    if (!isPracticeMode && levelData.id) {
      startNewSession(levelData.id);
    }
  };

  // Undo button: works in IDLE and SIMULATING, does nothing after WON or FAILED
  const handleUndo = () => {
    if (!engineRef.current) return;
    if (gameStateName === STATES.WON || gameStateName === STATES.FAILED || gameStateName === STATES.PAUSED) {
      return;
    }
    engineRef.current.drawingController.undo();
    setStrokeCount(engineRef.current.drawingController.strokes.length);
    if (engineRef.current.drawingController.getInkLeft() > 0) {
      setOutOfInk(false);
    }
  };

  // Hint button: shows hint.points as dashed animated ghost line for 4 seconds, max 3 hints
  const handleShowHint = () => {
    if (!engineRef.current || hintCount <= 0) return;
    const hintPoints = levelData?.hint?.points || levelData?.referenceSolution;
    if (!hintPoints || hintPoints.length < 2) return;

    engineRef.current.showHint(hintPoints, 4000);
    setHintCount((prev) => Math.max(0, prev - 1));
  };

  // --- Task 15 Dev Tool Handlers ---
  const handleToggleDevOverlay = () => {
    const nextState = !devOverlayActive;
    setDevOverlayActive(nextState);
    if (engineRef.current) {
      engineRef.current.setDevOverlay({
        enabled: nextState,
        glassSensor: engineRef.current.levelLoader.glassSensor,
        hintLine: levelData?.referenceSolution || levelData?.hint?.points,
        pointerWorld: pointerCoords,
        lastTapWorld: lastClickedCoords,
      });
    }
  };

  // Copy simplified points of the last stroke as JSON
  const handleCopyStrokeJson = () => {
    if (!engineRef.current) return;
    const strokes = engineRef.current.drawingController.strokes;
    if (strokes.length === 0) {
      setToastMessage('Draw a stroke first to copy its JSON!');
      setToastType('warning');
      return;
    }
    const lastStroke = strokes[strokes.length - 1];
    const simplified = lastStroke.points.map((pt) => ({
      x: Math.round(pt.x),
      y: Math.round(pt.y),
    }));
    const jsonStr = JSON.stringify(simplified, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      setToastMessage(`Copied stroke JSON (${simplified.length} pts) to clipboard!`);
      setToastType('success');
    }).catch(() => {
      setToastMessage('Failed to copy stroke JSON');
      setToastType('warning');
    });
  };

  // Replay referenceSolution so the developer can check the level is solvable
  const handleReplaySolution = () => {
    if (!engineRef.current || !levelData) return;
    const solution = levelData.referenceSolution || levelData.hint?.points;
    if (!solution || solution.length < 2) {
      setToastMessage('No referenceSolution defined for this level');
      setToastType('warning');
      return;
    }
    handleReset();
    setTimeout(() => {
      if (!engineRef.current) return;
      engineRef.current.drawingController.autoDrawStroke(solution);
      setStrokeCount(1);
      setToastMessage('Auto-drew referenceSolution! Starting flow...');
      setToastType('info');
      setTimeout(() => {
        if (engineRef.current && engineRef.current.gameState.is(STATES.IDLE)) {
          engineRef.current.gameState.transitionTo(STATES.SIMULATING);
          engineRef.current.start();
        }
      }, 300);
    }, 150);
  };

  // Canvas click listener in dev mode: copies { x, y } in world units to clipboard
  const handleCanvasClick = (e) => {
    if (!engineRef.current || !canvasRef.current) return;
    const pt = engineRef.current.screenToWorld(e.clientX, e.clientY);
    const rounded = { x: Math.round(pt.x), y: Math.round(pt.y) };
    setLastClickedCoords(rounded);

    if (devOverlayActive) {
      engineRef.current.setDevOverlay({
        lastTapWorld: rounded,
      });
    }

    if (isDevMode) {
      const coordJson = JSON.stringify(rounded);
      navigator.clipboard?.writeText(coordJson);
      setToastMessage(`Copied world coords: ${coordJson}`);
      setToastType('info');
    }
  };

  // Track pointer movements for dev overlay in real-time
  const handleCanvasPointerMove = (e) => {
    if (!devOverlayActive || !engineRef.current) return;
    const pt = engineRef.current.screenToWorld(e.clientX, e.clientY);
    const rounded = { x: Math.round(pt.x), y: Math.round(pt.y) };
    setPointerCoords(rounded);
    engineRef.current.setDevOverlay({
      pointerWorld: rounded,
    });
  };

  // Sync dev overlay with live changes
  useEffect(() => {
    if (engineRef.current && devOverlayActive) {
      engineRef.current.setDevOverlay({
        enabled: devOverlayActive,
        glassSensor: engineRef.current.levelLoader.glassSensor,
        hintLine: levelData?.referenceSolution || levelData?.hint?.points,
        pointerWorld: pointerCoords,
        lastTapWorld: lastClickedCoords,
      });
    }
  }, [devOverlayActive, levelData]);

  // Desktop keyboard shortcuts: R (Restart), Z (Undo), P (Pause), H (Hint)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is focused on an input or textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const key = e.key.toLowerCase();
      if (key === 'r') {
        e.preventDefault();
        handleReset();
      } else if (key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (key === 'p') {
        e.preventDefault();
        if (gameStateName === STATES.SIMULATING) {
          handlePause();
        } else if (gameStateName === STATES.PAUSED) {
          handleResume();
        }
      } else if (key === 'h') {
        e.preventDefault();
        handleShowHint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameStateName, strokeCount, hintCount, levelData]);

  // Confetti burst for 3 stars completion
  useEffect(() => {
    if (isWon) {
      const earnedStars = serverResult?.stars || currentStars;
      if (earnedStars === 3) {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#38BDF8', '#FBBF24', '#34D399', '#FB7185', '#A78BFA'],
        });
      }
    }
  }, [isWon, serverResult?.stars, currentStars]);

  // Preview star rating based on current ink
  const currentStars = calculateStars(inkState.inkUsed, inkState.maxInk);
  const inkRatio = inkState.maxInk > 0 ? inkState.inkUsed / inkState.maxInk : 0;

  let inkBarGradient = 'from-emerald-400 to-green-500';
  if (inkRatio > 0.7) {
    inkBarGradient = 'from-orange-500 to-red-500';
  } else if (inkRatio > 0.4) {
    inkBarGradient = 'from-amber-400 to-orange-500';
  }

  // Check if current level has hint points available
  const hasHintPoints = Boolean(
    (levelData?.hint?.points && levelData.hint.points.length >= 2) ||
    (levelData?.referenceSolution && levelData.referenceSolution.length >= 2)
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <LoadingDrop message="Loading puzzle..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 max-w-md mx-auto text-center">
        <AlertCircle className="w-12 h-12 text-coral-pink mb-3" />
        <h2 className="text-xl font-heading font-black text-navy mb-2">
          {error === 'Level not found' ? 'Level Not Found' : 'Connection Error'}
        </h2>
        <p className="text-xs text-navy/70 mb-5">{error}</p>
        <div className="flex gap-2 justify-center">
          <Button variant="primary" onClick={loadLevelAndSession}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Retry
          </Button>
          <Link to="/levels">
            <Button variant="secondary">Go to Levels</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isSimulating = gameStateName === STATES.SIMULATING;
  const isPaused = gameStateName === STATES.PAUSED;
  const isWon = gameStateName === STATES.WON;
  const isFailed = gameStateName === STATES.FAILED;

  return (
    <div className="flex flex-col items-center justify-between h-[100dvh] max-h-[100dvh] w-full px-3 py-2 max-w-xl mx-auto select-none safe-top safe-bottom safe-left safe-right overflow-hidden">
      <Toast message={toastMessage} type={toastType} isVisible={Boolean(toastMessage)} onClose={() => setToastMessage('')} />

      {/* 1. Top HUD Header with Always-Visible Logo and Min-44px touch targets */}
      <div className="w-full flex-none flex items-center justify-between bg-white rounded-2xl p-1.5 px-3 border-2 border-sky-100 shadow-soft">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(isPracticeMode ? '/' : '/levels')}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-soft hover:bg-sky-50 text-navy cursor-pointer transition-colors active:scale-95"
            title={isPracticeMode ? 'Home' : 'Back to Levels'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {/* Always Visible Small Happy Drop Logo */}
          <Logo size="sm" showText={false} />
        </div>

        <div className="text-center px-1">
          {isPracticeMode ? (
            <span className="text-[10px] font-heading font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 tracking-wider uppercase inline-block">
              Practice Mode
            </span>
          ) : (
            <span className="text-[9px] font-heading font-bold text-sky-blue uppercase tracking-widest block">
              HAPPY DROP
            </span>
          )}
          <h2 className="text-sm font-heading font-black text-navy truncate max-w-[140px] sm:max-w-[200px]">
            {isPracticeMode ? `Seed: ${seed}` : `Lvl ${levelData?.id}: ${levelData?.name || 'Puzzle'}`}
          </h2>
        </div>

        {/* HUD Info: Stars, Timer, Hint, Pause, Restart with Min-44px buttons */}
        <div className="flex items-center gap-1.5">
          {/* Star Preview (dims as ink passes 40% and 70%) */}
          <div className="hidden sm:flex items-center gap-0.5 px-2 py-1.5 bg-amber-50 rounded-xl border border-amber-200">
            {[1, 2, 3].map((starIdx) => (
              <Star
                key={starIdx}
                className={`w-3.5 h-3.5 transition-all duration-300 ${
                  starIdx <= currentStars
                    ? 'text-amber-400 fill-amber-400 scale-105'
                    : 'text-slate-300 fill-slate-200 opacity-40'
                }`}
              />
            ))}
          </div>

          {/* Active Gameplay Timer */}
          <div className="flex items-center gap-1 px-2.5 min-h-[44px] rounded-xl bg-soft border border-sky-200 text-xs font-mono font-bold text-navy">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>{elapsedTime.toFixed(1)}s</span>
          </div>

          {/* Hint Button (client-side only, 3 hints max, hidden if no points) */}
          {hasHintPoints && (
            <button
              onClick={handleShowHint}
              disabled={hintCount <= 0 || isWon || isFailed}
              className={`relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border transition-all cursor-pointer active:scale-95 ${
                hintCount > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
              }`}
              title={`Hint (Shortcuts: H) - ${hintCount} left`}
            >
              <Lightbulb className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white font-mono font-black text-[9px] flex items-center justify-center shadow-xs">
                {hintCount}
              </span>
            </button>
          )}

          {/* Pause / Resume Button (min-44px) */}
          {isSimulating ? (
            <button
              onClick={handlePause}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-soft hover:bg-amber-50 text-amber-600 cursor-pointer active:scale-95"
              title="Pause (P)"
            >
              <Pause className="w-5 h-5" />
            </button>
          ) : isPaused ? (
            <button
              onClick={handleResume}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-sky-50 text-sky-600 cursor-pointer active:scale-95"
              title="Resume (P)"
            >
              <Play className="w-5 h-5" />
            </button>
          ) : null}

          {/* Dev Mode Overlay Toggle (Eye icon) */}
          {isDevMode && (
            <button
              onClick={handleToggleDevOverlay}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border transition-all cursor-pointer active:scale-95 ${
                devOverlayActive
                  ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                  : 'bg-soft text-purple-700 hover:bg-purple-50 border-purple-200'
              }`}
              title="Dev Overlay (Grid, Sensor, Obstacle IDs, Coords)"
            >
              {devOverlayActive ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          )}

          {/* Restart Button (min-44px) */}
          <button
            onClick={handleReset}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-soft hover:bg-coral-pink/10 text-coral-pink cursor-pointer active:scale-95"
            title="Restart Level (R)"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Dev Mode Toolbar for Copying Stroke & Replaying Solution */}
      {isDevMode && (
        <div className="w-full flex-none mt-1.5 flex items-center justify-between gap-2 px-2 py-1.5 bg-purple-50 border border-purple-200 rounded-xl text-xs font-mono">
          <div className="flex items-center gap-1.5 text-purple-800 font-bold">
            <Code2 className="w-4 h-4 text-purple-600" />
            <span className="hidden sm:inline">DEV TOOLS:</span>
            {pointerCoords ? (
              <span className="text-[11px] bg-white px-2 py-0.5 rounded border border-purple-200">
                X:{pointerCoords.x} Y:{pointerCoords.y}
              </span>
            ) : (
              <span className="text-[10px] text-purple-600">Click canvas to copy coords</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyStrokeJson}
              className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-800 rounded-lg border border-purple-300 font-sans font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
              title="Copy simplified points of last drawn stroke as JSON for referenceSolution"
            >
              <Copy className="w-3.5 h-3.5 text-purple-600" />
              <span>Copy stroke JSON</span>
            </button>

            <button
              onClick={handleReplaySolution}
              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-sans font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              title="Auto-draw referenceSolution to check if solvable"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Replay solution</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. HUD Ink Bar Overlay */}
      <div className="w-full flex-none mt-1.5 px-1">
        <div className="flex justify-between items-center text-xs font-heading font-bold text-navy mb-1">
          <div className="flex items-center gap-1.5">
            <PenTool className="w-3.5 h-3.5 text-sky-blue" />
            <span>Ink Gauge</span>
            {outOfInk && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-coral-pink/15 text-coral-pink font-black animate-pulse">
                NO MORE INK
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-navy/50 font-mono text-[11px]">
              {inkState.inkLeft} / {inkState.maxInk}
            </span>
            <span
              className={`font-mono font-bold ${
                inkRatio > 0.7
                  ? 'text-red-500'
                  : inkRatio > 0.4
                  ? 'text-amber-500'
                  : 'text-emerald-500'
              }`}
            >
              {inkState.percentage}%
            </span>
          </div>
        </div>

        <div className="w-full h-2.5 bg-white rounded-full p-0.5 border border-sky-200 overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${inkBarGradient} transition-all duration-100 ease-out`}
            style={{ width: `${inkState.percentage}%` }}
          />
        </div>
      </div>

      {/* 3. Canvas Container (uses available height under HUD, 3:4 world, letterboxed) */}
      <div className="flex-1 w-full flex items-center justify-center min-h-0 my-1.5 overflow-hidden">
        <div className="relative w-full h-full max-h-full aspect-[3/4] bg-white rounded-3xl border-4 border-sky-100 shadow-soft-lg overflow-hidden touch-none flex items-center justify-center">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onPointerMove={handleCanvasPointerMove}
            className="w-full h-full block cursor-crosshair"
          />

          {/* Warning Toast for Out of Ink */}
          {outOfInk && !isWon && !isFailed && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-600/90 backdrop-blur-xs text-white text-[11px] font-heading font-black px-3 py-1 rounded-full shadow-md animate-bounce pointer-events-none">
              NO MORE INK! Water will keep flowing...
            </div>
          )}

        {/* 4. Complete Pause Menu Overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-navy/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in z-30">
            <div className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl border-4 border-sky-100 text-navy text-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2">
                <Pause className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-heading font-black text-navy mb-1">Paused</h3>
              <p className="text-xs text-navy/60 mb-5">Water & timer frozen</p>

              {/* Pause Menu Options: Resume, Restart, Level Select, Home, Sound Toggle */}
              <div className="flex flex-col gap-2.5">
                <Button variant="primary" onClick={handleResume} className="w-full !py-2.5 font-black text-sm">
                  <Play className="w-4 h-4 mr-1.5 fill-white" /> Resume
                </Button>

                <Button variant="secondary" onClick={handleReset} className="w-full !py-2 font-bold text-xs">
                  <RotateCcw className="w-4 h-4 mr-1.5 text-coral-pink" /> Restart
                </Button>

                <Button variant="secondary" onClick={() => navigate('/levels')} className="w-full !py-2 font-bold text-xs">
                  <Layers className="w-4 h-4 mr-1.5 text-sky-blue" /> Level Select
                </Button>

                <Button variant="secondary" onClick={() => navigate('/')} className="w-full !py-2 font-bold text-xs">
                  <Home className="w-4 h-4 mr-1.5 text-navy" /> Home
                </Button>

                {/* Sound Toggle */}
                <button
                  onClick={() => setIsSoundMuted(!isSoundMuted)}
                  className="mt-1 flex items-center justify-center gap-1.5 text-xs font-heading font-bold text-navy/70 hover:text-navy py-1"
                >
                  {isSoundMuted ? (
                    <>
                      <VolumeX className="w-4 h-4 text-coral-pink" /> Sound: Off
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-sky-blue" /> Sound: On
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. Success Modal (Happy Drop Branded) */}
        {isWon && (
          <div className="absolute inset-0 bg-navy/75 backdrop-blur-sm flex flex-col items-center justify-center p-5 text-center animate-fade-in z-20">
            <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border-4 border-sky-100 text-navy relative overflow-hidden">
              <div className="flex justify-center mb-1">
                <Logo size="md" showText={false} />
              </div>

              <span className="text-[10px] font-heading font-black text-sky-blue uppercase tracking-widest block mb-0.5">
                HAPPY DROP
              </span>
              <h3 className="text-xl font-heading font-black text-navy mb-1">
                GREAT! GLASS FILLED
              </h3>

              {serverResult?.isNewBest && (
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sunny-yellow text-navy font-heading font-black text-[11px] mb-2 shadow-sm animate-bounce">
                  <Trophy className="w-3.5 h-3.5 fill-navy" /> NEW BEST SOLUTION!
                </div>
              )}

              {isSaving ? (
                <div className="py-6 flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-blue rounded-full animate-spin mb-2" />
                  <span className="text-xs font-heading font-bold text-navy/70">Saving results...</span>
                </div>
              ) : saveError ? (
                <div className="py-3 px-4 bg-coral-pink/10 rounded-2xl border border-coral-pink/20 mb-3 text-center">
                  <span className="text-xs font-heading font-bold text-coral-pink block mb-2">
                    Could not save result.
                  </span>
                  <Button variant="secondary" onClick={handleRetrySubmit} className="!py-1.5 !px-3 !text-xs mx-auto">
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
                  </Button>
                </div>
              ) : (
                <>
                  {/* Stars Pop in One by One with Scale and Rotate */}
                  <div className="flex justify-center gap-3 my-3">
                    {[1, 2, 3].map((starIdx) => {
                      const isEarned = starIdx <= (serverResult?.stars || currentStars);
                      return (
                        <motion.div
                          key={starIdx}
                          initial={{ scale: 0, rotate: -60, opacity: 0 }}
                          animate={
                            isEarned
                              ? { scale: [0, 1.3, 1], rotate: [-60, 15, 0], opacity: 1 }
                              : { scale: 0.85, rotate: 0, opacity: 0.3 }
                          }
                          transition={{
                            delay: 0.2 + (starIdx - 1) * 0.25,
                            duration: 0.45,
                            ease: 'easeOut',
                          }}
                        >
                          <Star
                            className={`w-9 h-9 ${
                              isEarned
                                ? 'text-sunny-yellow fill-sunny-yellow drop-shadow-md'
                                : 'text-slate-300 fill-slate-200'
                            }`}
                          />
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-soft p-2.5 rounded-2xl border border-sky-100 mb-4 text-center">
                    <div>
                      <span className="text-[10px] font-heading font-bold text-navy/50 block">SCORE</span>
                      <span className="text-base font-heading font-black text-sky-600">
                        {serverResult?.score ? (
                          <CountingNumber value={serverResult.score} duration={1.2} />
                        ) : (
                          '---'
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-heading font-bold text-navy/50 block">INK USED</span>
                      <span className="text-base font-mono font-bold text-navy">
                        {serverResult?.inkUsed ?? Math.round(inkState.inkUsed * 10) / 10}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-heading font-bold text-navy/50 block">TIME</span>
                      <span className="text-base font-mono font-bold text-navy">
                        {serverResult?.completionTime ? `${serverResult.completionTime.toFixed(1)}s` : `${elapsedTime}s`}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {serverResult?.nextLevelUnlocked && (
                      <Button
                        variant="primary"
                        onClick={() => navigate(`/play/${serverResult.nextLevelUnlocked}`)}
                        className="w-full !py-2.5 font-black text-sm"
                      >
                        Next Level <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={handleReset}
                        className="flex-1 !py-2 !text-xs font-bold"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1 text-coral-pink" /> Replay
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => navigate('/levels')}
                        className="flex-1 !py-2 !text-xs font-bold"
                      >
                        <Layers className="w-3.5 h-3.5 mr-1 text-sky-blue" /> Level Select
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => navigate('/')}
                        className="!p-2 text-navy"
                        title="Home"
                      >
                        <Home className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 6. Fail Modal */}
        {isFailed && (
          <div className="absolute inset-0 bg-navy/75 backdrop-blur-sm flex flex-col items-center justify-center p-5 text-center animate-fade-in z-20">
            <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border-4 border-rose-100 text-navy text-center">
              <div className="w-16 h-16 mx-auto mb-2 relative">
                <svg viewBox="0 0 60 70" className="w-full h-full drop-shadow">
                  <path
                    d="M 12 10 L 12 55 Q 12 65 22 65 L 38 65 Q 48 65 48 55 L 48 10"
                    fill="rgba(224, 242, 254, 0.4)"
                    stroke="#0284C7"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <circle cx="23" cy="32" r="3" fill="#0F172A" />
                  <circle cx="37" cy="32" r="3" fill="#0F172A" />
                  <path
                    d="M 23 47 Q 30 40 37 47"
                    stroke="#0F172A"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <circle cx="20" cy="38" r="2" fill="#38BDF8" />
                </svg>
              </div>

              <h3 className="text-lg font-heading font-black text-navy mb-1">
                TRY AGAIN
              </h3>
              <p className="text-xs text-navy/70 mb-4 px-2 leading-relaxed">
                The glass needs more water. Adjust your drawn path and try again!
              </p>

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={handleReset}
                  className="flex-1 !py-2.5 font-black text-xs"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" /> Retry
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/levels')}
                  className="flex-1 !py-2.5 font-bold text-xs"
                >
                  <Layers className="w-4 h-4 mr-1.5" /> Level Select
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

      {/* 7. Bottom Controls Bar (all buttons min-44px touch targets) */}
      <div className="w-full flex-none flex items-center justify-between gap-3 mb-1">
        {/* Undo button: calls drawingController.undo(), disabled when no strokes or won/failed */}
        <Button
          variant="secondary"
          onClick={handleUndo}
          disabled={strokeCount === 0 || isWon || isFailed || isPaused}
          className="!min-h-[44px] !px-4 !text-sm flex-1 font-bold active:scale-95 transition-transform"
          title="Undo Last Stroke (Shortcut: Z)"
        >
          <Undo2 className="w-4 h-4 mr-1 text-sky-600" /> Undo
        </Button>

        {!isSimulating ? (
          <Button
            variant="primary"
            onClick={handleStart}
            disabled={isWon}
            className="!min-h-[44px] !px-5 !text-sm flex-1 font-black active:scale-95 transition-transform"
          >
            <Play className="w-4 h-4 mr-1.5 fill-white" /> Start Flow
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={handlePause}
            className="!min-h-[44px] !px-5 !text-sm flex-1 font-black active:scale-95 transition-transform"
          >
            <Pause className="w-4 h-4 mr-1.5" /> Pause
          </Button>
        )}

        <Button
          variant="secondary"
          onClick={handleReset}
          className="!min-h-[44px] !min-w-[44px] !p-2 active:scale-95 transition-transform flex items-center justify-center"
          title="Restart Level (Shortcut: R)"
        >
          <RotateCcw className="w-4 h-4 text-coral-pink" />
        </Button>
      </div>
    </div>
  );
};
