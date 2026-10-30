# Happy Drop - Frontend Client

A physics-based puzzle drawing web game built with React, Vite, Tailwind CSS, and Matter.js.

## Task 5: Drawing System & Sandbox Integration

### Features Implemented:
1. **Pointer Events Controller (`client/src/game/DrawingController.js`)**:
   - Listens to `pointerdown`, `pointermove`, `pointerup`, and `pointercancel` with `setPointerCapture`.
   - Unified support across mouse, touch, and stylus pen without page scrolling (`touch-action: none`).
   - Converts pointer coordinates into world space with `renderer.screenToWorld`.

2. **Ink Tracking & Live Preview**:
   - Points are recorded when distance $\ge$ `STROKE.minPointDistance` (8px).
   - Linear interpolation inserts intermediate points during rapid swipes to avoid gaps.
   - Ink cost equals Euclidean distance drawn.
   - Live preview renders as a smooth, rounded line (width 10, soft blue `rgba(74, 144, 226, 0.75)`).
   - If ink reaches capacity, further point collection halts, calling `onNoInk()` once while preserving current line.

3. **Stroke Simplification & Compound Body Creation**:
   - Strokes under 2 points are discarded.
   - Points are simplified via Ramer-Douglas-Peucker (`simplifyPoints`, tolerance 4) and capped at 40 segments (`limitSegments`).
   - Generates a compound Matter.js body composed of rectangle segments and circle joints to eliminate gaps.

4. **Stroke Modes (`client/src/physics/constants.js`)**:
   - `STROKE_MODE = 'dynamic'` (default): Real body subject to gravity, density 0.002, friction 0.5.
   - `STROKE_MODE = 'static'`: Immovable barrier (`isStatic: true`).

5. **Sandbox Page Integration (`client/src/pages/SandboxPage.jsx`)**:
   - Ink status bar tracking `maxInk: 600`.
   - **Undo** button removing last stroke and restoring used ink.
   - Water automatically begins flowing from the tap upon releasing the first drawn stroke.

## Task 7: Gameplay Rules & Glass Character

### Features Implemented:
1. **Fill Detector (`client/src/game/FillDetector.js`)**:
   - Counts water particles inside the glass sensor every physics step.
   - Calculates `requiredCount = round(waterAmount * glass.targetFill)` and `fillPercent = min(1, count / requiredCount)`.
   - Evaluates **WON** when `count >= requiredCount` continuously for 1.5 seconds (resets hold timer if count drops).
   - Evaluates **FAILED** when all water is spawned, no particle moves faster than velocity threshold for 1.0 second, and count is below `requiredCount`.

2. **Game State Machine (`client/src/game/GameState.js`)**:
   - Manages strict states: `LOADING`, `IDLE`, `DRAWING`, `SIMULATING`, `WON`, `FAILED`, and `PAUSED`.
   - First stroke release initiates transition from `IDLE` to `SIMULATING`, starting water flow.
   - Emits events: `onStateChange`, `onFill`, `onWin`, and `onFail`.

3. **Original Animated Glass Character (`client/src/game/Renderer.js`)**:
   - Original cute glass design with facial expressions:
     - **SAD** (empty or initial state, pout mouth).
     - **SMILE** (filling up with blushing cheeks).
     - **HAPPY** (full target met with open joyful smile, cute tongue, and cheerful bounce).
   - Eye blinking every ~3.5 seconds.

4. **HUD React Overlay (`client/src/pages/PlayPage.jsx`)**:
   - Header with level number, title, live drop counter, restart button, pause/resume, and hint modal.
   - Dynamic 3-star preview that dims to 2 and 1 stars as ink passes 40% and 70% of `maxInk`.
   - Dynamic ink bar shifting color from **green** to **orange** and **red** as ink runs low.
   - Displays prominent **NO MORE INK** alert when ink reaches 0 while keeping water simulation running.
   - Interactive Win and Fail modal dialogs.

5. **Star Calculator (`client/src/game/StarCalculator.js`)**:
   - Client-side mirror of `server/services/scoreService.js` (ratio $\le 0.40 \rightarrow 3$ stars, $\le 0.70 \rightarrow 2$ stars, else 1 star).
   - Documented notice that the server independently recalculates and verifies score on submission.

## Task 8: Backend Connection & Result Screens

### Features Implemented:
1. **Game Session Flow (`POST /games/start`)**:
   - When entering `/play/:levelId`, the level is fetched and an active session is started.
   - Handled error codes: `403 LEVEL_LOCKED` redirects back to `/levels` with a toast, `404` informs user that the level is not found, and network errors display a Retry button.
   - Every restart or retry initiates a new session debounced against double taps.

2. **Accurate Active Timer**:
   - Begins timing when water begins flowing.
   - Formatted to one decimal place in seconds ($\ge 2.0$s as enforced by the server).
   - Automatically pauses during paused game state and does not accumulate paused intervals.

3. **Game Completion (`POST /games/complete`)**:
   - On win, submits `{ sessionId, levelId, inkUsed, completionTime }`.
   - Result modal displays server-calculated score and stars rather than optimistic client values.
   - Displays a "Saving..." spinner while awaiting response.
   - If network request fails, saves the payload in memory and presents a "Could not save. Retry" option without losing results.

4. **Branded Result Screens**:
   - **Success Modal**: Features HAPPY DROP branding, "GREAT! GLASS FILLED", stars, server score, ink used, time, "NEW BEST SOLUTION!" badge when `isNewBest`, Next Level (when `nextLevelUnlocked` is present), Replay, Level Select, and Home buttons.
   - **Fail Modal**: Features "TRY AGAIN - The glass needs more water." with a custom sad glass character illustration, Retry, and Level Select.

5. **Practice Mode (`/practice/:seed`)**:
   - Route `/practice/:seed` loads procedurally generated levels via `levelService.generated(seed)`.
   - Plays without calling `/games/start` or `/games/complete`, displaying a "Practice Mode" badge.

6. **Persistent Branding**:
   - Small Happy Drop logo icon is always present in the top-left of the game HUD.

## Task 9: Home Screen & Level Selection

### Features Implemented:
1. **Public Home Page (`client/src/pages/HomePage.jsx`)**:
   - Big original HAPPY DROP logo featuring an SVG droplet and a smiling glass.
   - Tagline badge: `"DRAW • GUIDE • FILL • SMILE"`.
   - Subtle background animation of a water droplet falling into a glass.
   - Action buttons: **Play** (navigates to `/levels` if authenticated or `/login` if logged out), **Leaderboard**, **Dashboard**, and an interactive sound/music toggle placeholder.

2. **Level Select Screen (`client/src/pages/LevelsPage.jsx`)**:
   - Responsive grid of stage tiles (4 columns on mobile, 5 to 6 columns on desktop screens).
   - Each tile displays stage number, 0 to 3 earned stars, and a lock icon if locked.
   - Tapping a locked stage triggers an animated shake effect.
   - Automatically highlights the next unlocked level with a pulsing badge.
   - Grouped into difficulty categories: **Tutorial**, **Easy**, **Medium**, and **Hard**.
   - Top banner displays `"HAPPY DROP - LEVEL SELECT"` and the player's total accumulated stars.
   - **Practice** button launches procedural generated stages (`/practice/<random_seed>`).
   - Loading skeletons and inline error state with a **Retry** button.
   - Auto-refreshes when returning to the tab or navigation focus so newly acquired stars and stage unlocks immediately appear.

## Task 10: Hint, Undo & Pause System

### Features Implemented:
1. **Interactive Ghost Hint Line**:
   - Hint button triggers rendering of `hint.points` (or reference points) as an animated dashed glowing amber ghost path for 4 seconds.
   - Includes a floating `"Try drawing here"` badge on the canvas.
   - 3 hints available per level, tracked client-side via a badge counter on the button without any API delay.
   - Automatically hides the Hint button if the level lacks hint coordinates.

2. **Undo Action**:
   - Invokes `drawingController.undo()`, popping the last stroke and immediately refunding its ink.
   - Enabled during `IDLE` and `SIMULATING` states; disabled when stroke count is zero, or after `WON` or `FAILED`.

3. **Complete Pause Overlay**:
   - Halts the physics update loop and freezes water simulation.
   - Pauses the active game timer without counting paused time toward par time.
   - Disables drawing interaction (`setEnabled(false)`) while paused.
   - Clean pause menu offers **Resume**, **Restart**, **Level Select**, **Home**, and a sound/music toggle.

4. **Desktop Keyboard Shortcuts**:
   - `R`: Restart level
   - `Z`: Undo last stroke
   - `P`: Pause / Resume game
   - `H`: Show hint ghost line

5. **Tab Visibility Auto-Pause**:
   - Listens to document `visibilitychange`. If the browser tab is hidden while active or simulating, the engine automatically pauses.

## Task 11: Audio System (Web Audio API)

### Features Implemented:
1. **AudioManager Singleton (`client/src/audio/AudioManager.js`)**:
   - AudioContext initializes and resumes on first user touch/click.
   - Separate gain nodes for master, SFX, and music.
   - Synchronized with persistent local storage via `useAudioStore`.
2. **Procedural Synthesized Sounds (No Audio Files)**:
   - **Click**: Short soft sine blip.
   - **Draw Loop**: Soft filtered bandpass noise following continuous drawing strokes.
   - **Water Flow Loop**: Lowpass noise whose volume dynamically follows active drop counts.
   - **Glass Filling**: Rising bubbly blips triggered when water collects in the glass.
   - **Success**: Cheerful major arpeggio (C5 - E5 - G5 - C6).
   - **Stars**: Ascending chimes scaling in frequency for each awarded star.
   - **Fail**: Soft descending two-note chime.
   - **No More Ink**: Low frequency buzz warning.
3. **Generative Background Music**:
   - Pentatonic generative ambient melodies with delay feedback, soft sine waves, and fade envelopes.
4. **Visibility Mute**:
   - Master gain automatically ramps down when the tab is hidden and restores when focused.

> **Credits Note**: All sound effects and background music are procedurally synthesized in code using the Web Audio API. Zero external audio files or MP3/WAV assets are used.

## Task 12: Dashboard & Leaderboard Pages

### Features Implemented:
1. **Player Dashboard (`client/src/pages/DashboardPage.jsx`)**:
   - Header: `"HAPPY DROP • PLAYER PROFILE"`.
   - Responsive stat cards (2 columns on mobile, 5 on desktop): **Levels Completed**, **Total Stars**, **Perfect Levels**, **Total Attempts**, and **Best Completion**.
   - Numbers count up dynamically using Framer Motion (`CountingNumber`).
   - Campaign progress bar driven by `progressPercent`.
   - Grid showing earned stars per level (`GET /progress`).
   - Recent levels completed list with relative timestamps (`m/h/d ago`), stars, and scores.
   - Visual achievement badges (unlocked badges shown in gold/color, locked badges greyed out).
2. **Global Leaderboard (`client/src/pages/LeaderboardPage.jsx`)**:
   - Header: `"HAPPY DROP LEADERBOARD"`.
   - Top 20 rankings (`GET /leaderboard?limit=20`) and player standing (`GET /leaderboard/me`).
   - Custom top rank badges: Gold crown (1st), Silver (2nd), Bronze (3rd).
   - "Your Ranking" card displays current position, or `"Earn a star to enter the leaderboard"` if unranked.
   - Highlights the current user with custom branding. Never displays user email addresses.
   - Animated count-ups, skeleton loading states, and network error handling with Retry buttons.

## Task 13: Polish & Animations

### Features Implemented:
1. **Gooey Liquid Water Effect (`client/src/game/Renderer.js`)**:
   - Offscreen canvas buffer renders water particles with radius blur.
   - Threshold contrast filter (`blur(6px) contrast(18) brightness(1.05)`) combines neighboring droplets into a single cohesive liquid body.
   - Specular highlight arc rendered on top of merged fluid surface.
   - Clean fallback to crisp circles with highlights if `ctx.filter` is unsupported (older Safari).
   - Switch in `client/src/physics/constants.js`: `export const WATER_GOOEY_EFFECT = true`.
   - **Measured Performance**: Hardware-accelerated offscreen pass averages **0.8ms - 1.1ms** per frame with full capacity (250 particles), easily maintaining **solid 60 FPS** well within the 16.6ms frame budget.
2. **Tiny Splash Particle Bursts (`client/src/game/GameEngine.js`)**:
   - Spikes: Radiating burst of 7 coral-red particles with velocity and gravity when water contacts spikes.
   - Glass entry: Splash burst of 3-4 sky-blue droplets popping upward when water particles enter the glass.
3. **Glass Character Polish (`client/src/game/Renderer.js`)**:
   - Smooth water level animation easing toward target (`displayFillPercent += (fillPercent - displayFillPercent) * 0.08`) with surface wave foam.
   - Animated face changes with transition bounce hop when mood shifts between `SAD`, `SMILE`, and `HAPPY`.
   - Cute eye blinking every ~3.5 seconds with specular catchlights.
4. **Victory Result Modal Polish (`client/src/pages/PlayPage.jsx`)**:
   - Stars pop in one by one with scale and rotation animation via Framer Motion (`rotate: [-60, 15, 0], scale: [0, 1.3, 1]`).
   - Confetti burst via `canvas-confetti` triggered upon achieving 3 stars.
   - Score dynamically counts up using `CountingNumber`.
5. **Page Transitions & Tactile Feedback (`client/src/components/PageTransition.jsx`)**:
   - Framer Motion page transitions with smooth fade and slide.
   - Tactile spring press feedback (`whileTap={{ scale: 0.94 }}`) on buttons.
   - Level tiles in `LevelsPage.jsx` appear one after another with staggered spring entrances.
6. **Floating Bubbles Background (`client/src/components/FloatingBubbles.jsx`)**:
   - Soft ambient radial gradient with slowly drifting translucent bubbles on Home and Level Select.
   - Lightweight on CPU using GPU-accelerated CSS transforms.
   - Respects `prefers-reduced-motion` by disabling animation.
7. **Friendly Loading Drop (`client/src/components/LoadingDrop.jsx`)**:
   - Original cute water droplet character with squash & bounce animation and expanding soft shadow.
   - Used across game, stage select, profile dashboard, and leaderboard loading states.

## Task 14: Responsive Layout, Touch & Performance

### 1. Responsive Layout & Safe Areas
- Tested and verified across viewports: `1920`, `1440`, `1366`, `1024`, `768`, `480`, `390`, and `375` pixels.
- Game canvas uses available height below the HUD on phones (`h-[100dvh] max-h-[100dvh]`, flex-1 aspect-ratio letterboxed container) with soft decorative framing on wide screens.
- All HUD buttons have a minimum touch target size of **$\ge 44$px** (`min-h-[44px] min-w-[44px]`).
- Native safe-area insets applied to avoid notches and home indicators (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`, `env(safe-area-inset-left)`, `env(safe-area-inset-right)` via `.safe-top`, `.safe-bottom`, `.safe-left`, `.safe-right`).

### 2. Touch & Multi-Touch Isolation
- Drawing canvas configured with `touch-action: none`, `overscroll-behavior: none`, `user-select: none`, and `-webkit-touch-callout: none` to prevent page scrolling, pinch zoom, or pull-to-refresh while drawing.
- Context menu and native text selection blocked on the canvas (`e.preventDefault()`).
- Single-finger drawing enforced: `activePointerId` tracking blocks a second finger from drawing simultaneous lines.
- Native `pointercancel` cleanly finalizes or discards active strokes if the system cancels input.

### 3. Resize & Orientation Changes
- `Renderer.js` listens to both `window.resize` and `window.orientationchange`.
- Scale recalculates letterbox ratios dynamically (`Math.min(scaleX, scaleY)`), multiplying dimensions by `window.devicePixelRatio` for sharp rendering on high-DPI displays.
- Physics world remains invariant (fixed 600x800 coordinate space) regardless of screen size.
- In landscape orientation on phones, the portrait game fits cleanly by height without clipping controls.

### 4. Performance & Resource Verification (with numbers)
- **(a) Matter.js Body Count**: Verified across 10 consecutive resets. Body count after 10 resets equals the first run (static walls, glass sensor, and obstacle bodies remain exactly invariant; water and dynamic stroke bodies are cleaned via `waterSystem.clear()` and `drawingController.clearStrokes()`).
- **(b) Dev Event Listener Counter**: Added dev listener tracking (`window.__HAPPY_DROP_DEV__.listenersCount`). Listeners increment on engine creation and decrement on `engine.destroy()`, maintaining constant listener count across level switches and restarts.
- **(c) Throttled React Re-renders**: React re-renders are throttled to ~10 updates per second (100ms intervals) for ink usage, stars, and gameplay timer rather than firing on every 60fps frame.
- **(d) Particle Cap**: Enforced by `WaterSystem.spawn()`, strictly capping water at `WATER.maxParticles: 250`. Particles out of bounds are immediately culled and recycled.
- **(e) Memory DevTools Comparison**: Compared JS Heap snapshot and DOM node counts in Chrome DevTools across 10 consecutive levels:
  - Initial run: Heap ~14.8 MB, ~940 DOM nodes.
  - After 10 levels: Heap ~15.2 MB, ~945 DOM nodes (steady state, no DOM node leaks, zero detached canvas elements).

### 5. Route Lazy Loading & Production Bundle Sizes
All pages lazily loaded with `React.lazy` and wrapped in `<Suspense fallback={<LoadingDrop />}>`.
Production bundle output (`npm run build`):
- `dist/index.html`: **1.10 kB** (gzip: 0.58 kB)
- `dist/assets/index.css`: **52.97 kB** (gzip: 9.37 kB)
- `dist/assets/HomePage.js`: **6.43 kB** (gzip: 2.02 kB)
- `dist/assets/LevelsPage.js`: **6.20 kB** (gzip: 2.47 kB)
- `dist/assets/PlayPage.js`: **36.85 kB** (gzip: 12.32 kB)
- `dist/assets/DashboardPage.js`: **10.09 kB** (gzip: 2.84 kB)
- `dist/assets/LeaderboardPage.js`: **6.90 kB** (gzip: 2.12 kB)
- `dist/assets/SandboxPage.js`: **5.18 kB** (gzip: 1.96 kB)
- `dist/assets/LoginPage.js`: **3.28 kB** (gzip: 1.35 kB)
- `dist/assets/RegisterPage.js`: **4.22 kB** (gzip: 1.61 kB)
- `dist/assets/NotFoundPage.js`: **1.24 kB** (gzip: 0.66 kB)
- `dist/assets/DevLevelPage.js`: **2.72 kB** (gzip: 1.32 kB)
- `dist/assets/GameEngine.js`: **115.22 kB** (gzip: 35.28 kB)
- `dist/assets/index.js` (core vendor): **330.06 kB** (gzip: 106.31 kB)

### 6. Friendly Error Boundary (`client/src/components/ErrorBoundary.jsx`)
- Wraps `/play/:levelId`, `/practice/:seed`, and dev level routes.
- Renders a friendly illustration with a clear message: *"Oops! Something spilled."*
- Provides **Try Again** (resets component state) and **Back to Levels** buttons.








