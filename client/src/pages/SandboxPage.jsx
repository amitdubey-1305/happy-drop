import React, { useRef, useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { GameEngine } from '../game/GameEngine';
import { WORLD } from '../physics/constants';
import { Play, Pause, RotateCcw, Droplets, Info, Undo2, PenTool } from 'lucide-react';

export const SandboxPage = () => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  const [particleCount, setParticleCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [inkState, setInkState] = useState({
    maxInk: 600,
    inkUsed: 0,
    inkLeft: 600,
    percentage: 100,
  });
  const [strokeCount, setStrokeCount] = useState(0);
  const [hasStartedWater, setHasStartedWater] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Instantiate game engine with maxInk 600
    const engine = new GameEngine(canvasRef.current, {
      tap: { x: WORLD.width / 2, y: 80 },
      maxInk: 600,
      onParticleCountChange: (count) => {
        setParticleCount(count);
      },
    });

    engine.setupSandboxBoundaries();

    // Hook up DrawingController callbacks
    const dc = engine.drawingController;

    dc.onInkChange((stats) => {
      setInkState(stats);
    });

    // Step 8: Water starts when the first stroke is released
    dc.onStrokeAdded(() => {
      setStrokeCount(dc.strokes.length);
      if (!engine.isRunning) {
        engine.start();
        setIsRunning(true);
        setHasStartedWater(true);
      }
    });

    // Initial render
    engine.renderer.render([], engine.staticBodies, engine.tap);

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleStart = () => {
    if (!engineRef.current) return;
    engineRef.current.start();
    setIsRunning(true);
    setHasStartedWater(true);
  };

  const handlePause = () => {
    if (!engineRef.current) return;
    engineRef.current.stop();
    setIsRunning(false);
  };

  const handleReset = () => {
    if (!engineRef.current) return;
    engineRef.current.reset();
    engineRef.current.drawingController.clearStrokes();
    setStrokeCount(0);
    setHasStartedWater(false);
    setIsRunning(false);
  };

  const handleUndo = () => {
    if (!engineRef.current) return;
    engineRef.current.drawingController.undo();
    setStrokeCount(engineRef.current.drawingController.strokes.length);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-3">
        <div>
          <span className="text-xs uppercase font-heading font-bold tracking-widest text-sky-blue block">
            HAPPY DROP
          </span>
          <h1 className="text-2xl md:text-3xl font-heading font-black text-navy">Physics Sandbox</h1>
        </div>

        {/* HUD Info & Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white border border-sky-200 shadow-soft">
            <Droplets className="w-4 h-4 text-sky-blue" />
            <span className="font-heading font-bold text-navy text-sm">
              Drops: <strong className="text-sky-blue">{particleCount}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleUndo}
              disabled={strokeCount === 0}
              className="!py-2 !px-3 !text-sm"
              title="Undo Last Stroke"
            >
              <Undo2 className="w-4 h-4 mr-1 text-sky-600" /> Undo
            </Button>

            {!isRunning ? (
              <Button variant="primary" onClick={handleStart} className="!py-2 !px-4 !text-sm">
                <Play className="w-4 h-4 mr-1.5 fill-white" /> Start Flow
              </Button>
            ) : (
              <Button variant="secondary" onClick={handlePause} className="!py-2 !px-4 !text-sm">
                <Pause className="w-4 h-4 mr-1.5" /> Pause
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={handleReset}
              className="!py-2 !px-4 !text-sm"
              title="Reset Sandbox"
            >
              <RotateCcw className="w-4 h-4 mr-1.5 text-coral-pink" /> Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Ink Bar Component (maxInk: 600) */}
      <div className="w-full max-w-[480px] mb-3">
        <div className="flex items-center justify-between text-xs font-heading font-bold text-navy mb-1.5 px-1">
          <div className="flex items-center gap-1.5 text-navy">
            <PenTool className="w-3.5 h-3.5 text-sky-blue" />
            <span>Ink Remaining</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-navy/60 font-mono text-[11px]">
              {inkState.inkLeft} / {inkState.maxInk}
            </span>
            <span
              className={`font-mono font-bold ${
                inkState.percentage < 20 ? 'text-coral-pink' : 'text-sky-blue'
              }`}
            >
              {inkState.percentage}%
            </span>
          </div>
        </div>
        <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-sky-200 shadow-inner p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-100 ease-out ${
              inkState.percentage < 20
                ? 'bg-gradient-to-r from-orange-400 to-coral-pink'
                : 'bg-gradient-to-r from-sky-400 to-blue-600'
            }`}
            style={{ width: `${inkState.percentage}%` }}
          />
        </div>
      </div>

      {/* Canvas Letterbox Container */}
      <div className="w-full max-w-[480px] aspect-[3/4] bg-soft rounded-3xl border-4 border-sky-100 shadow-soft-lg overflow-hidden relative touch-none">
        <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />
      </div>

      {/* Instructions & Memory Inspection Info */}
      <Card className="w-full max-w-xl mt-6 p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-sky-blue shrink-0 mt-0.5" />
          <div className="text-xs text-navy/70 leading-relaxed">
            <strong className="text-navy font-heading font-bold block mb-1">
              Drawing System & Physics Sandbox:
            </strong>
            Draw lines anywhere on the canvas to guide water! Water automatically begins flowing from the tap when the first stroke is released. You can click <strong>Undo</strong> to step back and reclaim ink, or change <code>STROKE_MODE</code> to switch between dynamic physical strokes and static barriers.
          </div>
        </div>
      </Card>
    </div>
  );
};

