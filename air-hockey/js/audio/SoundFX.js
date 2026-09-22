/**
 * Web Audio API Procedural Sound FX and Synthwave Music Generator
 */
export class SoundFX {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.musicEnabled = true;
        this.volume = 0.7;
        this.musicVolume = 0.35;
        this.bgmTimer = null;
        this.isMusicPlaying = false;
        this.step = 0;
    }

    init() {
        if (this.ctx) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        } catch (e) {
            console.warn("Web Audio API not supported", e);
        }
    }

    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playHit(intensity = 0.5) {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Punchy clack
        const baseFreq = 260 + intensity * 400;
        osc.type = intensity > 0.7 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

        const peakGain = Math.min(1.0, (0.2 + intensity * 0.6) * this.volume);
        gain.gain.setValueAtTime(peakGain, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        // Add subtle click noise for puck impact realism
        const bufferSize = this.ctx.sampleRate * 0.02;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(peakGain * 0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        noise.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(now);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    playWallBounce(speedRatio = 0.5) {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const freq = 180 + speedRatio * 150;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.06);

        const peak = Math.min(0.8, (0.15 + speedRatio * 0.35) * this.volume);
        gain.gain.setValueAtTime(peak, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    playGoal(isPlayer = true) {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;

        // Siren synth / chord
        const freqs = isPlayer ? [523.25, 659.25, 783.99, 1046.50] : [349.23, 440.00, 523.25];
        freqs.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(f, now + i * 0.08);
            osc.frequency.linearRampToValueAtTime(f * 1.5, now + i * 0.08 + 0.4);

            gain.gain.setValueAtTime(0, now);
            gain.gain.setValueAtTime(0.25 * this.volume, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

            // Filter for warm synth tone
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1600, now);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + i * 0.08);
            osc.stop(now + 1.3);
        });

        // Sub bass blast
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(140, now);
        sub.frequency.exponentialRampToValueAtTime(35, now + 0.8);
        subGain.gain.setValueAtTime(0.6 * this.volume, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        sub.connect(subGain);
        subGain.connect(this.ctx.destination);
        sub.start(now);
        sub.stop(now + 0.85);
    }

    playSmash() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);

        gain.gain.setValueAtTime(0.4 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.22);
    }

    playWin() {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, idx) => {
            const now = this.ctx.currentTime + idx * 0.12;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.3 * this.volume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.5);
        });
    }

    playLose() {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        const notes = [440, 415.3, 392, 349.2];
        notes.forEach((freq, idx) => {
            const now = this.ctx.currentTime + idx * 0.15;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.2 * this.volume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.45);
        });
    }

    playUiClick() {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
        gain.gain.setValueAtTime(0.15 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
    }

    playBeep(isHigh = false) {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const freq = isHigh ? 880 : 440;
        osc.frequency.setValueAtTime(freq, now);

        const vol = (isHigh ? 0.35 : 0.2) * this.volume;
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isHigh ? 0.35 : 0.18));

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + (isHigh ? 0.38 : 0.2));
    }

    // Procedural Synthwave BGM loop
    startBGM() {
        if (this.isMusicPlaying || !this.musicEnabled) return;
        this.resume();
        this.isMusicPlaying = true;
        this.step = 0;

        const chordProgression = [
            [220, 261.63, 329.63], // Am
            [174.61, 220, 261.63], // F
            [261.63, 329.63, 392], // C
            [196, 246.94, 293.66]  // G
        ];

        const bassNotes = [110, 87.31, 130.81, 98.00];

        const bpm = 124;
        const interval = (60 / bpm / 2) * 1000; // 8th notes

        this.bgmTimer = setInterval(() => {
            if (!this.musicEnabled || !this.ctx) return;
            const now = this.ctx.currentTime;
            const bar = Math.floor(this.step / 8) % 4;
            const beatInBar = this.step % 8;

            // Bass pulse on every 8th note with sidechain feel
            const bassFreq = bassNotes[bar];
            const bassOsc = this.ctx.createOscillator();
            const bassGain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            bassOsc.type = 'sawtooth';
            bassOsc.frequency.setValueAtTime(bassFreq, now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(320, now);

            const bassVol = (beatInBar % 2 === 0 ? 0.22 : 0.14) * this.musicVolume;
            bassGain.gain.setValueAtTime(bassVol, now);
            bassGain.gain.exponentialRampToValueAtTime(0.001, now + (interval / 1000) * 0.9);

            bassOsc.connect(filter);
            filter.connect(bassGain);
            bassGain.connect(this.ctx.destination);
            bassOsc.start(now);
            bassOsc.stop(now + (interval / 1000));

            // Ambient Arpeggio on synth chords
            if (beatInBar % 2 === 0) {
                const noteIdx = (beatInBar / 2) % 3;
                const leadFreq = chordProgression[bar][noteIdx] * 2;
                const leadOsc = this.ctx.createOscillator();
                const leadGain = this.ctx.createGain();

                leadOsc.type = 'triangle';
                leadOsc.frequency.setValueAtTime(leadFreq, now);

                leadGain.gain.setValueAtTime(0.08 * this.musicVolume, now);
                leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

                leadOsc.connect(leadGain);
                leadGain.connect(this.ctx.destination);
                leadOsc.start(now);
                leadOsc.stop(now + 0.32);
            }

            // Hi-hat noise click on offbeats
            if (beatInBar % 2 === 1) {
                const hhBufferSize = this.ctx.sampleRate * 0.02;
                const hhBuffer = this.ctx.createBuffer(1, hhBufferSize, this.ctx.sampleRate);
                const d = hhBuffer.getChannelData(0);
                for (let i = 0; i < hhBufferSize; i++) d[i] = (Math.random() * 2 - 1);
                const hh = this.ctx.createBufferSource();
                hh.buffer = hhBuffer;
                const hhFilter = this.ctx.createBiquadFilter();
                hhFilter.type = 'highpass';
                hhFilter.frequency.setValueAtTime(7000, now);
                const hhGain = this.ctx.createGain();
                hhGain.gain.setValueAtTime(0.04 * this.musicVolume, now);
                hhGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

                hh.connect(hhFilter);
                hhFilter.connect(hhGain);
                hhGain.connect(this.ctx.destination);
                hh.start(now);
            }

            this.step++;
        }, interval);
    }

    stopBGM() {
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
        this.isMusicPlaying = false;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled) {
            this.startBGM();
        } else {
            this.stopBGM();
        }
        return this.musicEnabled;
    }

    toggleSound() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}
