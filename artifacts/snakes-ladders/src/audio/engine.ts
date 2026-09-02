/**
 * All sound in the game, synthesised with Web Audio so nothing has to be
 * downloaded and it all works offline.
 *
 * Effects: a rattle for the dice, a little boing per hop that rises as the
 * token goes, a bright climbing arpeggio for ladders, a slithery slide with a
 * hiss for snakes, a fanfare for the winner. The background tune is a bouncy
 * eight-bar loop on a marimba voice with a light bass and arpeggio, scheduled
 * a little ahead of time so it never stutters.
 *
 * iOS only allows audio to start inside a user gesture, so `unlock()` is
 * called from the first press.
 */

type Osc = OscillatorType;

interface ToneOptions {
  freq: number;
  freqEnd?: number;
  type?: Osc;
  duration: number;
  start?: number;
  gain?: number;
  attack?: number;
  lowpass?: number;
  vibrato?: number;
  dest?: AudioNode;
}

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class AudioEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private unlocked = false;

  sfxEnabled = true;
  musicEnabled = true;

  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private nextStepTime = 0;
  private step = 0;

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      this.sfxGain = ctx.createGain();
      this.sfxGain.gain.value = 0.6;
      this.sfxGain.connect(master);
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = 0.15;
      this.musicGain.connect(master);
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buf;
      this.ctx = ctx;
      return ctx;
    } catch {
      return null;
    }
  }

  /** Call from a user gesture. Creates and resumes the context, starts music if wanted. */
  unlock(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    void ctx.resume();
    this.unlocked = true;
    if (this.musicEnabled) this.startMusic();
  }

  setHidden(hidden: boolean): void {
    if (!this.ctx || !this.unlocked) return;
    if (hidden) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  private tone(o: ToneOptions): void {
    const ctx = this.ctx;
    const dest = o.dest ?? this.sfxGain;
    if (!ctx || !dest) return;
    const t0 = ctx.currentTime + (o.start ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(o.freqEnd, t0 + o.duration);
    const attack = o.attack ?? 0.01;
    const peak = o.gain ?? 0.2;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + o.duration);
    let node: AudioNode = osc;
    if (o.lowpass) {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = o.lowpass;
      node.connect(lp);
      node = lp;
    }
    if (o.vibrato) {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 6;
      lfoGain.gain.value = o.vibrato;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(t0);
      lfo.stop(t0 + o.duration + 0.05);
    }
    node.connect(gain);
    gain.connect(dest);
    osc.start(t0);
    osc.stop(t0 + o.duration + 0.05);
  }

  private burst(duration: number, start: number, gain: number, filterFreq: number, type: BiquadFilterType = "lowpass"): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise || !this.sfxGain) return;
    const t0 = ctx.currentTime + start;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(t0);
    src.stop(t0 + duration + 0.02);
  }

  private bell(freq: number, start: number, duration: number, gain: number, dest?: AudioNode): void {
    this.tone({ freq, duration, start, gain, attack: 0.004, dest });
    this.tone({ freq: freq * 2.76, duration: duration * 0.45, start, gain: gain * 0.25, attack: 0.004, dest });
    this.tone({ freq: freq * 5.4, duration: duration * 0.2, start, gain: gain * 0.08, attack: 0.002, dest });
  }

  private marimba(freq: number, at: number, duration: number, gain: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const start = at - ctx.currentTime;
    this.tone({ freq, duration, start, gain, attack: 0.005, lowpass: 2600, dest: this.musicGain });
    this.tone({ freq: freq * 3.9, duration: duration * 0.35, start, gain: gain * 0.12, attack: 0.003, dest: this.musicGain });
  }

  private guard(): boolean {
    return this.sfxEnabled && !!this.ctx;
  }

  // -----------------------------------------------------------------------
  // Effects
  // -----------------------------------------------------------------------

  /** Dice in a cup: a rattle of clicks that slows down, then a landing knock. */
  playRoll(): void {
    if (!this.guard()) return;
    const times = [0, 0.06, 0.13, 0.21, 0.3, 0.4, 0.52];
    times.forEach((t, i) => {
      this.burst(0.03, t, 0.22 - i * 0.015, 3200 + (i % 3) * 600, "bandpass");
      this.tone({ freq: 1400 + (i % 2) * 500, freqEnd: 700, type: "square", duration: 0.03, start: t, gain: 0.05, attack: 0.002 });
    });
    this.tone({ freq: 240, freqEnd: 110, type: "sine", duration: 0.12, start: 0.62, gain: 0.35, attack: 0.004 });
    this.burst(0.05, 0.62, 0.18, 1000);
  }

  /** One square hop. Pitch rises a little with each hop of the same move. */
  playHop(i: number): void {
    if (!this.guard()) return;
    const f = 440 * Math.pow(2, Math.min(i, 8) / 12);
    this.tone({ freq: f, freqEnd: f * 1.5, type: "triangle", duration: 0.1, gain: 0.16, attack: 0.005 });
    this.burst(0.03, 0.06, 0.06, 1200);
  }

  /** Up a ladder: a quick climbing arpeggio and a whoosh. */
  playLadder(): void {
    if (!this.guard()) return;
    this.burst(0.35, 0, 0.1, 1200, "bandpass");
    this.tone({ freq: 300, freqEnd: 1200, type: "triangle", duration: 0.5, gain: 0.08, attack: 0.05 });
    [72, 76, 79, 84, 88, 91].forEach((m, i) => this.bell(midiHz(m), 0.08 + i * 0.09, 0.4, 0.2));
  }

  /** Down a snake: a slithery falling glide with a hiss. */
  playSnake(): void {
    if (!this.guard()) return;
    this.burst(0.55, 0, 0.14, 5000, "highpass");
    this.tone({ freq: 700, freqEnd: 120, type: "sawtooth", duration: 0.75, gain: 0.14, attack: 0.03, lowpass: 900, vibrato: 12 });
    this.tone({ freq: 350, freqEnd: 70, type: "sine", duration: 0.75, gain: 0.18, attack: 0.03 });
    this.tone({ freq: 110, freqEnd: 60, type: "sine", duration: 0.2, start: 0.72, gain: 0.3, attack: 0.005 });
  }

  /** Home! A fanfare. */
  playWin(): void {
    if (!this.guard()) return;
    const notes = [72, 76, 79, 84, 79, 84, 88];
    notes.forEach((m, i) => this.bell(midiHz(m), i * 0.11, 0.5, 0.22));
    for (const m of [72, 76, 79, 84]) this.tone({ freq: midiHz(m), type: "triangle", duration: 1.2, start: 0.8, gain: 0.07, attack: 0.05 });
    this.tone({ freq: midiHz(96), duration: 1.2, start: 0.85, gain: 0.04, attack: 0.1 });
  }

  /** That roll does not count: a soft double boop. */
  playNope(): void {
    if (!this.guard()) return;
    this.tone({ freq: 220, freqEnd: 180, type: "triangle", duration: 0.12, gain: 0.16, attack: 0.01 });
    this.tone({ freq: 190, freqEnd: 150, type: "triangle", duration: 0.16, start: 0.13, gain: 0.16, attack: 0.01 });
  }

  /** Your go: a friendly two-note ping. */
  playYourTurn(): void {
    if (!this.guard()) return;
    this.tone({ freq: midiHz(79), duration: 0.12, gain: 0.1, attack: 0.005 });
    this.tone({ freq: midiHz(84), duration: 0.25, start: 0.1, gain: 0.12, attack: 0.005 });
  }

  /** A button tap. */
  playTick(): void {
    if (!this.guard()) return;
    this.tone({ freq: 900, freqEnd: 700, duration: 0.05, gain: 0.08, attack: 0.003 });
  }

  // -----------------------------------------------------------------------
  // Background tune
  // -----------------------------------------------------------------------

  setMusic(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (enabled && this.unlocked) this.startMusic();
    if (!enabled) this.stopMusic();
  }

  private startMusic(): void {
    const ctx = this.ensure();
    if (!ctx || this.musicTimer) return;
    this.step = 0;
    this.nextStepTime = ctx.currentTime + 0.1;
    this.musicTimer = setInterval(() => this.schedule(), 90);
  }

  stopMusic(): void {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    while (this.nextStepTime < ctx.currentTime + 0.3) {
      this.playStep(this.step % TUNE_STEPS, this.nextStepTime);
      this.step += 1;
      this.nextStepTime += EIGHTH;
    }
  }

  private playStep(i: number, at: number): void {
    const melody = MELODY[i];
    if (melody) this.marimba(midiHz(melody), at, 0.5, 0.26);
    const bar = Math.floor(i / 8);
    const inBar = i % 8;
    const chord = CHORDS[bar % CHORDS.length];
    if (inBar === 0 || inBar === 4) this.marimba(midiHz(chord.root - 12), at, 0.8, 0.2);
    if (inBar === 2 || inBar === 6) this.marimba(midiHz(chord.root - 5), at, 0.4, 0.12);
    const arp = [chord.root + 12, chord.root + chord.third + 12, chord.root + 19, chord.root + chord.third + 12][inBar % 4];
    if (inBar % 2 === 1) this.marimba(midiHz(arp), at, 0.3, 0.07);
  }
}

// 108 beats per minute, eighth-note grid, eight bars. A bouncy skipping tune.
const EIGHTH = 60 / 108 / 2;
const TUNE_STEPS = 64;
const MELODY: number[] = [
  72, 0, 76, 0, 79, 0, 76, 0,
  77, 0, 76, 74, 72, 0, 0, 0,
  74, 0, 77, 0, 81, 0, 77, 0,
  79, 0, 77, 76, 74, 0, 0, 0,
  72, 0, 76, 0, 79, 0, 84, 0,
  81, 0, 79, 0, 77, 0, 76, 0,
  74, 0, 77, 0, 79, 0, 77, 0,
  76, 0, 74, 0, 72, 0, 0, 0,
];
/** root as MIDI note, third as semitones above the root (4 major, 3 minor). */
const CHORDS = [
  { root: 60, third: 4 }, // C
  { root: 53, third: 4 }, // F
  { root: 50, third: 3 }, // Dm
  { root: 55, third: 4 }, // G
  { root: 60, third: 4 }, // C
  { root: 53, third: 4 }, // F
  { root: 55, third: 4 }, // G
  { root: 60, third: 4 }, // C
];

export const audio = new AudioEngine();
