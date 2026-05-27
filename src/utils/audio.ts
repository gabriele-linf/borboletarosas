/**
 * Safe, interactive Piezo Buzzer Sound Generator using Web Audio API
 */
class BuzzerSound {
  private ctx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isMuted: boolean = false;
  private isPlaying: boolean = false;
  private beepInterval: any = null;

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    } catch (e) {
      console.warn("Web Audio API is not supported in this environment.", e);
    }
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.isPlaying) {
      this.stop();
    }
  }

  getMute() {
    return this.isMuted;
  }

  /**
   * Play any custom tone interactively (great for knobs and sliders)
   */
  playTone(frequency: number = 800, duration: number = 0.08, type: 'sine' | 'square' | 'triangle' | 'sawtooth' = 'sine', volume: number = 0.08) {
    this.init();
    if (!this.ctx || this.isMuted) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    try {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

      gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Could not play sound:", e);
    }
  }

  /**
   * Sound effect when the butterfly flaps or lands (PIR Sensor Trigger)
   */
  playFlutter(isFlyIn: boolean = true) {
    this.init();
    if (!this.ctx || this.isMuted) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    try {
      const times = 3;
      const baseFreq = isFlyIn ? 600 : 400;
      const step = isFlyIn ? 150 : -100;

      for (let i = 0; i < times; i++) {
        const timeOffset = i * 0.08;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();

        o.type = 'sine';
        o.frequency.setValueAtTime(baseFreq + (i * step), this.ctx.currentTime + timeOffset);

        g.gain.setValueAtTime(0, this.ctx.currentTime + timeOffset);
        g.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + timeOffset + 0.02);
        g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + timeOffset + 0.06);

        o.connect(g);
        g.connect(this.ctx.destination);

        o.start(this.ctx.currentTime + timeOffset);
        o.stop(this.ctx.currentTime + timeOffset + 0.07);
      }
    } catch (e) {
      console.warn("Could not play flutter sound:", e);
    }
  }

  /**
   * Sweet success or settings saved chime
   */
  playChime() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    try {
      const originalTime = this.ctx.currentTime;
      // Arpeggio chime
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const timeOffset = idx * 0.08;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();

        o.type = 'sine';
        o.frequency.setValueAtTime(freq, originalTime + timeOffset);

        g.gain.setValueAtTime(0.02, originalTime + timeOffset);
        g.gain.exponentialRampToValueAtTime(0.001, originalTime + timeOffset + 0.3);

        o.connect(g);
        g.connect(this.ctx.destination);

        o.start(originalTime + timeOffset);
        o.stop(originalTime + timeOffset + 0.35);
      });
    } catch (e) {
      console.warn("Could not play chime:", e);
    }
  }

  start(frequency: number = 1000) {
    this.init();
    if (!this.ctx || this.isMuted || this.isPlaying) return;

    // Direct Web Audio beep sequence
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isPlaying = true;

    // Simulate Intermittent alarm "Beep-Beep-Beep" instead of a continuous flat tone
    this.beepInterval = setInterval(() => {
      if (!this.ctx || this.isMuted) return;
      
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square'; // Gives that classic harsh piezo buzzing sound
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

        // Quick volume envelope to sound like an authentic buzzer pulse
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime + 0.25);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.35);
      } catch (e) {
        console.error("Error generating buzzer pulse:", e);
      }
    }, 500);
  }

  stop() {
    if (this.beepInterval) {
      clearInterval(this.beepInterval);
      this.beepInterval = null;
    }
    this.isPlaying = false;
  }
}

export const buzzerSound = new BuzzerSound();
