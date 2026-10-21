// Offline dialogue, original procedural sound effects, and an original horror score.
export const lines = {
  welcome: ['Another night. Same old store.', 'JIMMY'],
  firstCustomer: ['Just these, please. And my change.', 'CUSTOMER'],
  thanks: ['Thanks. Have a good night.', 'CUSTOMER'],
  trapped: ['Sss... some kind of monster shoved me in here!', 'TRAPPED CUSTOMER'],
  jimmyFreezer: ['Are you okay? You can go. The exit is over there.', 'JIMMY'],
  grinner: ['Open uuup, Jimmy. I want some coooookies.', 'THE GRINNER'],
  secondCustomer: ['Evening. Just the milk and these chips, please.', 'CUSTOMER'],
  secondThanks: ['Thank you. Take care.', 'CUSTOMER'],
  shadowCustomer: ['Is something wrong?', 'CUSTOMER'],
  jimmyLeave: ['I am sorry, but we are closing. Could you please leave?', 'JIMMY'],
  shadowLeave: ['Of course. Good night.', 'CUSTOMER'],
  end: ['I think that is enough for one night.', 'JIMMY'],
  hungry: ['I skipped dinner. A bag of chips should get me through this shift.', 'JIMMY'],
  visionary: ['Oh, Kimmy... you’re so kiiiind.', 'THE VISIONARY'],
  callPolice: ['There is someone in the store. Covered in eyes. Please send help!', 'JIMMY'],
  dispatcher: ['Stay behind the counter. Officers are on their way.', 'DISPATCH'],
  police: ['Step away from the clerk. You’re coming with us.', 'OFFICER'],
  policeClear: ['We have him. Stay inside and call if anything else happens.', 'OFFICER'],
  night2Customer: ['Long night? Just these groceries, please.', 'CUSTOMER'],
  night2Thanks: ['Keep the change. Hope the rest of your shift is quiet.', 'CUSTOMER'],
  grinner2: ['Jiiimmy... I can see you. Let me in. I saved you the last biiite.', 'THE GRINNER'],
  night2End: ['Sunrise can’t come soon enough.', 'JIMMY'],
};

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.volume = 0.7;
    this.musicVolume = 0.35;
    this.onSubtitle = () => {};
    this.buffers = new Map();
    this._epoch = 0;
    this._queue = Promise.resolve();
    this._sources = new Set();
    this._ambient = [];
    this._music = [];
    this._musicBuffers = null;
    this._musicMood = 'calm';
    this._dialogueActive = false;
    this._sessionActive = false;
    this._voice = null;
    this._activeFinish = null;
    this._paused = false;
    this._ready = null;
    this._fallbackTimer = null;
  }

  async init() {
    const epoch = this._epoch;
    this._sessionActive = true;
    if (!this.ctx) {
      const AudioContextType = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContextType) return;
      try {
        this.ctx = new AudioContextType();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume * 0.75;
        this._musicBus = this.ctx.createGain();
        this._musicBus.gain.value = this.musicVolume;
        this._musicBus.connect(this.master);
        // A soft compressor prevents overlapping impacts from becoming harsh.
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.value = -9;
        this.limiter.knee.value = 18;
        this.limiter.ratio.value = 6;
        this.limiter.attack.value = 0.003;
        this.limiter.release.value = 0.15;
        this.master.connect(this.limiter);
        this.limiter.connect(this.ctx.destination);
        this._noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
        const samples = this._noiseBuffer.getChannelData(0);
        let previous = 0;
        for (let i = 0; i < samples.length; i++) {
          previous = (previous + Math.random() * 0.12 - 0.06) / 1.025;
          samples[i] = previous;
        }
      } catch {
        this.ctx = null;
        return;
      }
    }
    if (!this._paused && this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch { /* subtitles remain available */ }
    }
    if (!this._ready) {
      this._ready = Promise.all(Object.keys(lines).map(async key => {
        try {
          const response = await fetch(new URL(`./audio/${key}.wav`, import.meta.url));
          if (!response.ok) return;
          const data = await response.arrayBuffer();
          const decoded = await this.ctx.decodeAudioData(data);
          this.buffers.set(key, decoded);
        } catch { /* Each missing clip falls back to local browser speech. */ }
      }));
    }
    await this._ready;
    if (epoch === this._epoch && !this._paused) {
      if (!this._ambient.length) this._startAmbient();
      if (!this._music.length) this._startMusic();
    }
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(this.volume * 0.75, this.ctx.currentTime, 0.025);
  }

  setMusicVolume(value) {
    this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
    this._updateMusicLevel();
  }

  setMusicMood(mood) {
    if (mood !== 'calm' && mood !== 'threat') return;
    this._musicMood = mood;
    if (!this.ctx || !this._music.length) return;
    const t = this.ctx.currentTime;
    this._calmGain.gain.setTargetAtTime(mood === 'calm' ? 1 : 0, t, .8);
    this._threatGain.gain.setTargetAtTime(mood === 'threat' ? 1 : 0, t, .8);
  }

  _updateMusicLevel() {
    if (!this.ctx || !this._musicBus) return;
    this._musicBus.gain.setTargetAtTime(this.musicVolume * (this._dialogueActive ? .28 : 1), this.ctx.currentTime, this._dialogueActive ? .08 : .65);
  }

  speak(key) {
    const epoch = this._epoch;
    const task = this._queue.then(async () => {
      if (epoch !== this._epoch || !lines[key]) return;
      await this.init();
      if (epoch !== this._epoch) return;
      const [text, speaker] = lines[key];
      this.onSubtitle(text, speaker);
      this._dialogueActive = true;
      this._updateMusicLevel();
      const buffer = this.buffers.get(key);
      if (this.ctx && buffer) {
        await new Promise(resolve => {
          const source = this.ctx.createBufferSource();
          source.buffer = buffer;
          const voiceGain = this.ctx.createGain();
          voiceGain.gain.value = 1;
          source.connect(voiceGain);
          voiceGain.connect(this.master);
          this._voice = source;
          let complete = false;
          const finish = () => {
            if (complete) return;
            complete = true;
            if (this._voice === source) this._voice = null;
            if (this._activeFinish === finish) this._activeFinish = null;
            source.disconnect();
            voiceGain.disconnect();
            resolve();
          };
          this._activeFinish = finish;
          source.onended = finish;
          try { source.start(); } catch { finish(); }
        });
      } else {
        await this._fallbackSpeech(key, text);
      }
      if (epoch === this._epoch) {
        this._dialogueActive = false;
        this._updateMusicLevel();
        this.onSubtitle('', '');
      }
    });
    this._queue = task.catch(() => {});
    return this._queue;
  }

  _fallbackSpeech(key, text) {
    return new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearInterval(this._fallbackTimer);
        this._fallbackTimer = null;
        if (this._activeFinish === finish) this._activeFinish = null;
        resolve();
      };
      this._activeFinish = finish;
      // Some browsers silently fail speech. Always allow the story to continue.
      let remaining = Math.max(2600, text.length * 80);
      this._fallbackTimer = setInterval(() => {
        if (this._paused) return;
        remaining -= 100;
        if (remaining <= 0) finish();
      }, 100);
      if (!globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.volume = this.volume * 0.75;
      const monster = key.startsWith('grinner') || key === 'visionary';
      utterance.rate = monster ? 0.64 : 0.95;
      utterance.pitch = monster ? 0.4 : lines[key][1] === 'JIMMY' ? 0.78 : 1.05;
      utterance.onend = finish;
      utterance.onerror = finish;
      try {
        globalThis.speechSynthesis.speak(utterance);
        if (this._paused) globalThis.speechSynthesis.pause();
      } catch { finish(); }
    });
  }

  _track(source) {
    this._sources.add(source);
    source.onended = () => { this._sources.delete(source); source.disconnect(); };
    return source;
  }

  _tone(frequency, duration, volume = 0.1, delay = 0, type = 'sine', target = frequency) {
    if (!this.ctx || !this.master) return;
    const start = this.ctx.currentTime + delay;
    const osc = this._track(this.ctx.createOscillator());
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(15, target), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + Math.min(.012, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(start);
    osc.stop(start + duration + .02);
  }

  _noise(duration, volume = 0.1, frequency = 800, delay = 0, highpass = false) {
    if (!this.ctx || !this._noiseBuffer) return;
    const start = this.ctx.currentTime + delay;
    const source = this._track(this.ctx.createBufferSource());
    source.buffer = this._noiseBuffer;
    source.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = highpass ? 'highpass' : 'lowpass';
    filter.frequency.value = frequency;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), start + Math.min(.02, duration / 4));
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(start, Math.random());
    source.stop(start + duration + .02);
  }

  sfx(name) {
    if (!this.ctx || this._paused || this.ctx.state !== 'running') return;
    switch (name) {
      case 'cash': case 'register':
        this._noise(.16, .5, 1400);
        this._tone(1950, .28, .08, .07);
        this._tone(2700, .18, .045, .12);
        this._noise(.17, .23, 950, .25);
        break;
      case 'knock': case 'freezerKnock':
        [0, .27, .59].forEach((delay, i) => {
          this._tone(112 - i * 7, .18, .28, delay, 'sine', 58);
          this._noise(.055, .22, 1300, delay);
        });
        break;
      case 'grinnerKnock':
        [0, .42, .79, 1.05].forEach((delay, i) => {
          this._tone(78, .29, .34, delay, 'triangle', 37);
          this._noise(.12, .37, 700, delay);
        });
        break;
      case 'doorbell': case 'bell':
        this._tone(2180, .55, .08);
        this._tone(1540, .65, .065, .19);
        this._tone(3513, .25, .025, .01);
        break;
      case 'freezer': case 'door': case 'open':
        this._noise(.15, .32, 900);
        this._tone(130, .75, .09, .08, 'triangle', 270);
        this._noise(1.1, .26, 1600, .12);
        break;
      case 'shutter':
        this._noise(1.2, .75, 1600);
        for (let i = 0; i < 11; i++) this._tone(95 + i * 7, .07, .085, i * .09, 'triangle', 63);
        this._tone(67, .35, .25, 1.05, 'sine', 32);
        break;
      case 'shadow': case 'creep':
        this._noise(2.4, .42, 580);
        this._noise(.55, .12, 1800, .6, true);
        this._tone(46, 1.7, .075, .1, 'sine', 31);
        break;
      case 'floodlight': case 'power':
        this._noise(.08, .65, 2500);
        this._tone(58, .95, .22, .03, 'sawtooth', 116);
        this._noise(.45, .3, 1900, .07);
        break;
      case 'scare':
        this._noise(.75, .75, 2200);
        this._tone(119, .65, .22, 0, 'sawtooth', 31);
        break;
      case 'footstep': case 'step':
        this._tone(69 + Math.random() * 16, .08, .065, 0, 'sine', 35);
        this._noise(.095, .14, 800);
        break;
      case 'camera': case 'click':
        this._noise(.055, .18, 2200);
        this._tone(880, .055, .025, .025, 'square', 875);
        break;
      case 'phone':
        [0,.22,.44].forEach(delay => {
          this._tone(697, .14, .075, delay);
          this._tone(1209, .14, .055, delay);
        });
        this._noise(.2, .05, 2100, .7, true);
        break;
      case 'siren':
        for (let i = 0; i < 4; i++) {
          this._tone(440, .75, .085, i * 1.4, 'triangle', 780);
          this._tone(780, .65, .075, i * 1.4 + .75, 'triangle', 440);
        }
        break;
      case 'visionary':
        this._noise(2.2, .36, 1650, 0, true);
        this._tone(57, 2.2, .12, 0, 'sine', 35);
        this._tone(183, 1.5, .055, .15, 'triangle', 144);
        break;
      case 'chips':
        [0,.09,.19,.33,.46].forEach((delay, i) => this._noise(.09 + i*.015, .2, 2600, delay, true));
        break;
    }
  }

  _startAmbient() {
    // Refrigerator motor and rain-like room hiss, not a musical soundtrack.
    const hum = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    hum.frequency.value = 60;
    hum.type = 'sine';
    gain.gain.value = .018;
    hum.connect(gain);
    gain.connect(this.master);
    hum.start();
    const room = this.ctx.createBufferSource();
    room.buffer = this._noiseBuffer;
    room.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    const roomGain = this.ctx.createGain();
    roomGain.gain.value = .038;
    room.connect(filter);
    filter.connect(roomGain);
    roomGain.connect(this.master);
    room.start();
    this._ambient = [hum, room];
  }

  _createMusicBuffers() {
    // An original six-note motif, bowed-sine drones, and a soft threat pulse.
    // The score is generated locally, with seamless edge fades and no timers.
    const rate = 22050, seconds = 24, frames = rate * seconds;
    const calm = this.ctx.createBuffer(2, frames, rate);
    const threat = this.ctx.createBuffer(2, frames, rate);
    const notes = [146.832, 138.591, 110, 130.813, 146.832, 103.826];
    for (let channel = 0; channel < 2; channel++) {
      const c = calm.getChannelData(channel), d = threat.getChannelData(channel);
      for (let i = 0; i < frames; i++) {
        const t = i / rate, phase = channel * .31;
        const edge = Math.min(1, t / 1.2, (seconds - t) / 1.2);
        const swell = .72 + .28 * Math.sin(Math.PI * t / 12) ** 2;
        const drone = (.095 * Math.sin(2*Math.PI*73.416*t + phase)
          + .055 * Math.sin(2*Math.PI*110*t - phase)
          + .045 * Math.sin(2*Math.PI*36.708*t)) * swell;
        c[i] = drone * edge;
        const pulse = Math.exp(-((t % 1.2) * 13)) * Math.sin(2*Math.PI*48*t) * .1;
        d[i] = (drone * .85 + .055*Math.sin(2*Math.PI*77.782*t + phase) + pulse) * edge;
      }
      for (let n = 0; n < notes.length; n++) {
        const start = .55 + n * 3.8 + channel * .035;
        const duration = 3.4;
        for (let j = 0; j < duration * rate; j++) {
          const index = Math.floor(start * rate) + j;
          if (index >= frames) break;
          const t = j / rate;
          const envelope = (1 - Math.exp(-t * 4)) * Math.exp(-t * 1.35) * Math.min(1, (duration-t)/.2);
          const note = Math.sin(2*Math.PI*notes[n]*t) + .15*Math.sin(2*Math.PI*notes[n]*2.002*t);
          c[index] += note * envelope * .15;
          d[index] += note * envelope * .1;
        }
      }
    }
    this._musicBuffers = {calm, threat};
  }

  _startMusic() {
    if (this._music.length || !this.ctx || this._paused) return;
    if (!this._musicBuffers) this._createMusicBuffers();
    this._calmGain = this.ctx.createGain();
    this._threatGain = this.ctx.createGain();
    this._calmGain.gain.value = this._musicMood === 'calm' ? 1 : 0;
    this._threatGain.gain.value = this._musicMood === 'threat' ? 1 : 0;
    const start = this.ctx.currentTime + .03;
    for (const [mood, gain] of [['calm', this._calmGain], ['threat', this._threatGain]]) {
      const source = this.ctx.createBufferSource();
      source.buffer = this._musicBuffers[mood];
      source.loop = true;
      source.connect(gain);
      gain.connect(this._musicBus);
      source.start(start);
      this._music.push(source);
    }
    this._updateMusicLevel();
  }

  pause() {
    this._paused = true;
    if (this.ctx?.state === 'running') this.ctx.suspend().catch(() => {});
    globalThis.speechSynthesis?.pause();
  }

  resume() {
    this._paused = false;
    if (this.ctx?.state === 'suspended') this.ctx.resume().then(() => {
      if (!this._sessionActive || this._paused) return;
      if (!this._ambient.length) this._startAmbient();
      if (!this._music.length) this._startMusic();
    }).catch(() => {});
    globalThis.speechSynthesis?.resume();
  }

  stop() {
    // Changing the epoch invalidates queued dialogue even if asset fetches finish later.
    this._epoch++;
    this._sessionActive = false;
    this._queue = Promise.resolve();
    if (this._voice) { try { this._voice.stop(); } catch {} }
    this._voice = null;
    this._activeFinish?.();
    this._activeFinish = null;
    clearInterval(this._fallbackTimer);
    this._fallbackTimer = null;
    globalThis.speechSynthesis?.cancel();
    for (const source of [...this._sources, ...this._ambient, ...this._music]) {
      try { source.stop(); source.disconnect(); } catch {}
    }
    this._sources.clear();
    this._ambient = [];
    this._music = [];
    this._calmGain?.disconnect();
    this._threatGain?.disconnect();
    this._musicMood = 'calm';
    this._dialogueActive = false;
    this._updateMusicLevel();
    this._paused = false;
    this.onSubtitle('', '');
  }
}
