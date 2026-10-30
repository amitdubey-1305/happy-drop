/**
 * Pure Web Audio API Manager (No audio files, all sounds synthesized in code)
 */
class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;

    // Persisted preferences
    this.sfxEnabled = localStorage.getItem('happy_drop_sound') !== 'false';
    this.musicEnabled = localStorage.getItem('happy_drop_music') !== 'false';

    // Loop state
    this.isDrawing = false;
    this.drawNoiseNode = null;
    this.drawGainNode = null;

    this.isWaterFlowing = false;
    this.waterNoiseNode = null;
    this.waterFilterNode = null;
    this.waterGainNode = null;

    this.isMusicPlaying = false;
    this.musicTimer = null;
    this.musicInterval = null;

    // Attach user interaction listener to resume AudioContext (browser autoplay policy)
    this.handleFirstInteraction = this.handleFirstInteraction.bind(this);
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', this.handleFirstInteraction, { once: true });
      window.addEventListener('keydown', this.handleFirstInteraction, { once: true });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.muteOnHidden();
        } else {
          this.unmuteOnVisible();
        }
      });
    }
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();

    // Master, SFX, and Music Gain Nodes
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();

    this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 1.0 : 0.0, this.ctx.currentTime);
    this.musicGain.gain.setValueAtTime(this.musicEnabled ? 0.35 : 0.0, this.ctx.currentTime);

    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  handleFirstInteraction() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.musicEnabled && !this.isMusicPlaying) {
      this.startMusic();
    }
  }

  setSfxEnabled(bool) {
    this.sfxEnabled = bool;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(bool ? 1.0 : 0.0, this.ctx.currentTime);
    }
    if (!bool) {
      this.stopDrawLoop();
      this.stopWaterLoop();
    }
  }

  setMusicEnabled(bool) {
    this.musicEnabled = bool;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(bool ? 0.35 : 0.0, this.ctx.currentTime);
    }
    if (bool) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  muteOnHidden() {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.05);
    }
  }

  unmuteOnVisible() {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.05);
    }
  }

  // --- Sound Effects Synthesizers ---
  play(name) {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    switch (name) {
      case 'click':
        this.playClick();
        break;
      case 'glass_fill':
      case 'bubble':
        this.playGlassFill();
        break;
      case 'success':
        this.playSuccess();
        break;
      case 'star':
        this.playStar(1);
        break;
      case 'fail':
        this.playFail();
        break;
      case 'no_ink':
        this.playNoInk();
        break;
      default:
        break;
    }
  }

  // 1. Click: Short soft blip
  playClick() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  // 2. Glass filling: Small rising bubble blips
  playGlassFill() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = 450 + Math.random() * 200;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, t + 0.08);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  // 3. Success: Cheerful major arpeggio (C5 - E5 - G5 - C6)
  playSuccess() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const start = t + idx * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  // 4. Star: Rising chime per star, higher each time
  playStar(starIndex = 1) {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Base frequency rises with star index: 1 -> 880Hz, 2 -> 1174Hz, 3 -> 1567Hz
    const freqs = [880, 1174.66, 1567.98];
    const targetFreq = freqs[starIndex - 1] || 880;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(targetFreq, t);
    osc.frequency.exponentialRampToValueAtTime(targetFreq * 1.25, t + 0.25);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.36);
  }

  // 5. Fail: Soft descending two notes (F4 -> C4)
  playFail() {
    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(349.23, t); // F4
    gain1.gain.setValueAtTime(0.2, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(t);
    osc1.stop(t + 0.26);

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    const t2 = t + 0.2;

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(261.63, t2); // C4
    gain2.gain.setValueAtTime(0.2, t2);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.35);

    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(t2);
    osc2.stop(t2 + 0.36);
  }

  // 6. No more ink: Short low buzz
  playNoInk() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.setValueAtTime(120, t + 0.08);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  // --- Continuous Loops: Drawing & Water Flow ---

  // Helper to create white noise buffer
  createNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  startDrawLoop() {
    if (!this.sfxEnabled || this.isDrawing) return;
    this.init();
    if (!this.ctx) return;

    this.isDrawing = true;
    const t = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer();
    noise.loop = true;

    // Filter to quiet, soft scratching sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.Q.setValueAtTime(2.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);

    this.drawNoiseNode = noise;
    this.drawGainNode = gain;
  }

  stopDrawLoop() {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.drawGainNode && this.ctx) {
      const t = this.ctx.currentTime;
      this.drawGainNode.gain.linearRampToValueAtTime(0.001, t + 0.04);
      setTimeout(() => {
        if (this.drawNoiseNode) {
          try {
            this.drawNoiseNode.stop();
            this.drawNoiseNode.disconnect();
          } catch {}
          this.drawNoiseNode = null;
        }
      }, 50);
    }
  }

  startWaterLoop(intensity = 1.0) {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx) return;

    if (!this.isWaterFlowing) {
      this.isWaterFlowing = true;
      const t = this.ctx.currentTime;

      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer();
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(Math.min(0.12, 0.03 * intensity), t + 0.1);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(t);

      this.waterNoiseNode = noise;
      this.waterFilterNode = filter;
      this.waterGainNode = gain;
    } else if (this.waterGainNode && this.ctx) {
      // Dynamic volume follows number of falling drops
      const targetVolume = Math.min(0.15, Math.max(0.01, 0.02 * intensity));
      this.waterGainNode.gain.setTargetAtTime(targetVolume, this.ctx.currentTime, 0.08);
    }
  }

  stopWaterLoop() {
    if (!this.isWaterFlowing) return;
    this.isWaterFlowing = false;

    if (this.waterGainNode && this.ctx) {
      const t = this.ctx.currentTime;
      this.waterGainNode.gain.linearRampToValueAtTime(0.001, t + 0.08);
      setTimeout(() => {
        if (this.waterNoiseNode) {
          try {
            this.waterNoiseNode.stop();
            this.waterNoiseNode.disconnect();
          } catch {}
          this.waterNoiseNode = null;
        }
      }, 100);
    }
  }

  // --- Background Generative Music ---
  // Pentatonic notes, slow tempo, soft sine/triangle waves, light delay
  startMusic() {
    if (!this.musicEnabled || this.isMusicPlaying) return;
    this.init();
    if (!this.ctx) return;

    this.isMusicPlaying = true;

    // Pentatonic scale frequencies in Hz: C4, D4, E4, G4, A4, C5, D5, E5
    const pentatonic = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];

    // Simple delay feedback network for relaxing space
    const delay = this.ctx.createDelay();
    delay.delayTime.value = 0.45;

    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.35;

    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(this.musicGain);

    const playTone = () => {
      if (!this.isMusicPlaying || !this.ctx) return;

      const freq = pentatonic[Math.floor(Math.random() * pentatonic.length)];
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = Math.random() > 0.4 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      const duration = 1.6 + Math.random() * 0.8;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.3); // soft fade in
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration); // soft fade out

      osc.connect(gain);
      gain.connect(this.musicGain);
      gain.connect(delay);

      osc.start(t);
      osc.stop(t + duration + 0.1);
    };

    // Slow generative tempo: play note every 700ms - 1400ms
    const scheduleNext = () => {
      if (!this.isMusicPlaying) return;
      playTone();
      const delayMs = 750 + Math.random() * 650;
      this.musicTimer = setTimeout(scheduleNext, delayMs);
    };

    scheduleNext();
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  destroy() {
    this.stopDrawLoop();
    this.stopWaterLoop();
    this.stopMusic();
  }
}

export const audioManager = new AudioManager();
