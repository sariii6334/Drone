/**
 * Procedural Web Audio Engine for Drone Sound Effects
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // Drone motor oscillators
  private motorMasterGain: GainNode | null = null;
  private motorOscs: { osc: OscillatorNode; gain: GainNode }[] = [];
  private motorFilter: BiquadFilterNode | null = null;
  private windNoiseGain: GainNode | null = null;

  // Lock-on beeper
  private lockBeepTimer: number | null = null;
  private isTargetLocked: boolean = false;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.setupMotorSynth();
      this.setupWindSynth();
    } catch (e) {
      console.warn('AudioContext failed to initialize:', e);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private setupMotorSynth() {
    if (!this.ctx) return;

    this.motorMasterGain = this.ctx.createGain();
    this.motorMasterGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.motorFilter = this.ctx.createBiquadFilter();
    this.motorFilter.type = 'lowpass';
    this.motorFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);

    // Quadcopter 4-propeller harmonics
    const baseFreqs = [140, 280, 420, 560];
    const gains = [0.25, 0.18, 0.1, 0.05];

    this.motorOscs = baseFreqs.map((freq, i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = i % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(gains[i], this.ctx!.currentTime);

      osc.connect(gain);
      gain.connect(this.motorFilter!);
      osc.start();

      return { osc, gain };
    });

    this.motorFilter.connect(this.motorMasterGain);
    this.motorMasterGain.connect(this.ctx.destination);
  }

  private setupWindSynth() {
    if (!this.ctx) return;

    // Buffer noise generator
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(350, this.ctx.currentTime);
    windFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.windNoiseGain = this.ctx.createGain();
    this.windNoiseGain.gain.setValueAtTime(0.01, this.ctx.currentTime);

    whiteNoise.connect(windFilter);
    windFilter.connect(this.windNoiseGain);
    this.windNoiseGain.connect(this.ctx.destination);
    whiteNoise.start();
  }

  /**
   * Updates drone motor pitch & volume based on power output and airspeed
   */
  public updateDroneAudio(throttle: number, speed: number, isMoving: boolean) {
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const power = Math.max(0.1, (throttle + 1) * 0.5 + (isMoving ? 0.3 : 0));
    const speedFactor = Math.min(speed / 40, 1.5);

    const basePitch = 130 + power * 180 + speedFactor * 90;

    this.motorOscs.forEach((m, idx) => {
      const multiplier = idx + 1;
      // Slight detune for organic rotor phasing
      const detune = (idx - 1.5) * 6;
      m.osc.frequency.setTargetAtTime(basePitch * multiplier + detune, now, 0.08);
    });

    if (this.motorFilter) {
      this.motorFilter.frequency.setTargetAtTime(1000 + power * 2500 + speedFactor * 1500, now, 0.08);
    }

    if (this.motorMasterGain) {
      const targetVol = this.isMuted ? 0 : 0.08 + power * 0.07;
      this.motorMasterGain.gain.setTargetAtTime(targetVol, now, 0.05);
    }

    if (this.windNoiseGain) {
      const windVol = this.isMuted ? 0 : Math.min(speedFactor * 0.08, 0.08);
      this.windNoiseGain.gain.setTargetAtTime(windVol, now, 0.1);
    }
  }

  public setTargetLock(locked: boolean, distance: number = 200) {
    if (this.isTargetLocked === locked) return;
    this.isTargetLocked = locked;

    if (this.lockBeepTimer) {
      window.clearInterval(this.lockBeepTimer);
      this.lockBeepTimer = null;
    }

    if (locked && !this.isMuted && this.ctx) {
      // Rapid lock acquisition beep
      this.playBeep(880, 0.06, 0.15);
      const interval = Math.max(120, Math.min(400, distance * 2));
      this.lockBeepTimer = window.setInterval(() => {
        if (this.isTargetLocked && !this.isMuted) {
          this.playBeep(1100, 0.05, 0.12);
        }
      }, interval);
    }
  }

  public playBeep(freq: number = 800, duration: number = 0.08, volume: number = 0.1) {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Ignore audio error
    }
  }

  public playKamikazeBooster() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // High-thrust rocket scream
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 1.2);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.6, now + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 2.5);
    } catch {
      // Ignore
    }
  }

  public playMissileLaunch() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Sharp air-to-ground rocket whoosh / ignition roar
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.35);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);

      // Noise hiss burst
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.4);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.15));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(500, now + 0.4);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
    } catch {
      // Ignore
    }
  }

  public playTargetDestroyedAlert() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      [587.33, 880, 1174.66].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.2, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.2);
      });
    } catch {
      // Ignore
    }
  }

  public playNewDroneDeployChime() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      [440, 659.25, 880].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.25, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.35);
      });
    } catch {
      // Ignore
    }
  }

  public playVictoryFanfare() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.15);
        gain.gain.setValueAtTime(0.3, now + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.5);
      });
    } catch {
      // Ignore
    }
  }

  public playExplosion(intensity: number = 1.0) {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Sub-bass punch
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(140 * intensity, now);
      subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.8);

      subGain.gain.setValueAtTime(0.6 * intensity, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.9);

      // Noise blast & crackle
      const bufferSize = Math.floor(this.ctx.sampleRate * 1.5);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.4));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800 * intensity, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 1.2);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4 * intensity, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(now);
    } catch {
      // Ignore
    }
  }

  public playMissionFailedBuzzer() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      [220, 180].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + i * 0.2);
        gain.gain.setValueAtTime(0.25, now + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.2);
        osc.stop(now + i * 0.2 + 0.25);
      });
    } catch {
      // Ignore
    }
  }

  public playCountdownBeep(count: number) {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const freq = count === 1 ? 1200 : count === 2 ? 960 : 800;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Ignore
    }
  }

  public playCinematicWhoosh() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 1.0);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(2400, now + 0.5);
      filter.frequency.exponentialRampToValueAtTime(200, now + 1.0);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.35, now + 0.4);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
    } catch {
      // Ignore
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.motorMasterGain && this.ctx) {
      this.motorMasterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.08, this.ctx.currentTime, 0.05);
    }
    if (this.windNoiseGain && this.ctx) {
      this.windNoiseGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.01, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public getMuted() {
    return this.isMuted;
  }
}

export const soundManager = new SoundManager();
