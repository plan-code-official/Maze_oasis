// Web Audio API Synthesizer for Game Sound Effects
import portalSoundUrl from '../assets/sound1.mp3';
import sandFootstepUrl from '../../assets/sand.mp3';

class AudioSynth {
  private ctx: AudioContext | null = null;
  private portalSound = new Audio(portalSoundUrl);
  private footstepSound = new Audio(sandFootstepUrl);
  private footstepRequested = false;

  constructor() {
    this.portalSound.preload = 'auto';
    this.footstepSound.preload = 'auto';
    this.footstepSound.volume = 0.28;
    this.footstepSound.loop = true;
  }

  playFootstep() {
    if (this.footstepRequested || (!this.footstepSound.paused && !this.footstepSound.ended)) return;
    this.footstepRequested = true;
    this.footstepSound.currentTime = 0;
    void this.footstepSound.play().catch((error: unknown) => {
      console.warn('Footstep audio failed', error);
    });
  }

  stopFootsteps() {
    if (!this.footstepRequested && this.footstepSound.paused) return;
    this.footstepRequested = false;
    this.footstepSound.pause();
    this.footstepSound.currentTime = 0;
  }

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playMove() {
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  playCorrect() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.1, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration - 0.01);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + duration);
      };

      // Play a happy rising arpeggio: C5 -> E5 -> G5 -> C6
      playTone(523.25, now, 0.1);
      playTone(659.25, now + 0.1, 0.1);
      playTone(783.99, now + 0.2, 0.1);
      playTone(1046.50, now + 0.3, 0.25);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  playWrong() {
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  playHit() {
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  playGameOver() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.1, start);
        gain.gain.linearRampToValueAtTime(0.001, start + duration - 0.02);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + duration);
      };

      // Sad descending tones
      playTone(392.00, now, 0.2); // G4
      playTone(349.23, now + 0.2, 0.2); // F4
      playTone(311.13, now + 0.4, 0.2); // Eb4
      playTone(261.63, now + 0.6, 0.5); // C4
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  playVictory() {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.1, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration - 0.02);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + duration);
      };

      // Upbeat victory tune
      playTone(523.25, now, 0.15); // C5
      playTone(523.25, now + 0.15, 0.15); // C5
      playTone(523.25, now + 0.3, 0.15); // C5
      playTone(523.25, now + 0.45, 0.3); // C5
      playTone(415.30, now + 0.75, 0.3); // Ab4
      playTone(466.16, now + 1.05, 0.3); // Bb4
      playTone(523.25, now + 1.35, 0.6); // C5
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  playTeleport() {
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  playPortalTeleport() {
    try {
      this.portalSound.currentTime = 0;
      void this.portalSound.play().catch(() => undefined);
    } catch (e) {
      console.warn('Portal sound play failed', e);
    }
  }
}

export const gameAudio = new AudioSynth();
