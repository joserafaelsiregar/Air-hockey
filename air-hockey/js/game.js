/**
 * Neon Cyber Air Hockey Championship - Standalone Engine & Game Bundle
 * Compatible with local file:// and web server environments.
 */

// ==========================================
// 1. Vector2D Math Helper
// ==========================================
class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    copy(v) {
        this.x = v.x;
        this.y = v.y;
        return this;
    }

    clone() {
        return new Vector2D(this.x, this.y);
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    mult(n) {
        this.x *= n;
        this.y *= n;
        return this;
    }

    div(n) {
        if (n !== 0) {
            this.x /= n;
            this.y /= n;
        }
        return this;
    }

    magSq() {
        return this.x * this.x + this.y * this.y;
    }

    mag() {
        return Math.sqrt(this.magSq());
    }

    heading() {
        return Math.atan2(this.y, this.x);
    }

    normalize() {
        const m = this.mag();
        if (m > 0.00001) {
            this.div(m);
        }
        return this;
    }

    limit(max) {
        const mSq = this.magSq();
        if (mSq > max * max) {
            this.normalize().mult(max);
        }
        return this;
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    dist(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    distSq(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return dx * dx + dy * dy;
    }

    lerp(v, amt) {
        this.x += (v.x - this.x) * amt;
        this.y += (v.y - this.y) * amt;
        return this;
    }

    static fromAngle(angle, length = 1) {
        return new Vector2D(Math.cos(angle) * length, Math.sin(angle) * length);
    }

    static dist(v1, v2) {
        return v1.dist(v2);
    }

    static sub(v1, v2) {
        return new Vector2D(v1.x - v2.x, v1.y - v2.y);
    }

    static add(v1, v2) {
        return new Vector2D(v1.x + v2.x, v1.y + v2.y);
    }
}

// ==========================================
// 2. Web Audio Procedural Sound FX & BGM
// ==========================================
class SoundFX {
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

        const baseFreq = 260 + intensity * 400;
        osc.type = intensity > 0.7 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

        const peakGain = Math.min(1.0, (0.2 + intensity * 0.6) * this.volume);
        gain.gain.setValueAtTime(peakGain, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        // Sub click noise
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.02);
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

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1600, now);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + i * 0.08);
            osc.stop(now + 1.3);
        });

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

    startBGM() {
        if (this.isMusicPlaying || !this.musicEnabled) return;
        this.resume();
        this.isMusicPlaying = true;
        this.step = 0;

        const chordProgression = [
            [220, 261.63, 329.63],
            [174.61, 220, 261.63],
            [261.63, 329.63, 392],
            [196, 246.94, 293.66]
        ];
        const bassNotes = [110, 87.31, 130.81, 98.00];
        const bpm = 124;
        const interval = (60 / bpm / 2) * 1000;

        this.bgmTimer = setInterval(() => {
            if (!this.musicEnabled || !this.ctx) return;
            const now = this.ctx.currentTime;
            const bar = Math.floor(this.step / 8) % 4;
            const beatInBar = this.step % 8;

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

            if (beatInBar % 2 === 1) {
                const hhBufferSize = Math.floor(this.ctx.sampleRate * 0.02);
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

// ==========================================
// 3. Particle System
// ==========================================
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.shockwaves = [];
        this.airJets = [];
        this.maxParticles = 600;
    }

    initAirJets(width, height) {
        this.airJets = [];
        const count = 45;
        for (let i = 0; i < count; i++) {
            this.airJets.push({
                x: Math.random() * (width - 60) + 30,
                y: Math.random() * (height - 60) + 30,
                radius: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.4 + 0.1,
                speedY: (Math.random() - 0.5) * 0.3,
                pulse: Math.random() * Math.PI * 2
            });
        }
    }

    createHitSparks(x, y, count = 25, color = '#00f0ff', power = 1.0) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (Math.random() * 6 + 3) * power;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                size: Math.random() * 3.5 + 1.5,
                life: 1.0,
                decay: Math.random() * 0.03 + 0.02,
                shape: 'circle'
            });
        }
    }

    createWallBounceSparks(x, y, normalX, normalY, color = '#ff007f', power = 1.0) {
        const baseAngle = Math.atan2(normalY, normalX);
        const count = Math.floor(15 * power);
        for (let i = 0; i < count; i++) {
            const angle = baseAngle + (Math.random() - 0.5) * 1.8;
            const speed = (Math.random() * 5 + 2) * power;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                size: Math.random() * 2.5 + 1,
                life: 1.0,
                decay: Math.random() * 0.04 + 0.03,
                shape: 'spark'
            });
        }
    }

    createShockwave(x, y, maxRadius = 90, color = '#00f0ff', width = 4) {
        this.shockwaves.push({
            x,
            y,
            radius: 5,
            maxRadius,
            color,
            width,
            alpha: 1.0,
            growSpeed: 7
        });
    }

    createGoalCelebration(x, y, color = '#ffe600') {
        const colors = [color, '#ff007f', '#00f0ff', '#ffffff', '#a855f7'];
        for (let i = 0; i < 90; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 11 + 4;
            const c = colors[Math.floor(Math.random() * colors.length)];
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: c,
                size: Math.random() * 5 + 2,
                life: 1.0,
                decay: Math.random() * 0.015 + 0.01,
                shape: Math.random() > 0.4 ? 'confetti' : 'circle',
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.2
            });
        }

        this.createShockwave(x, y, 160, color, 8);
        setTimeout(() => this.createShockwave(x, y, 220, '#ffffff', 5), 100);
        setTimeout(() => this.createShockwave(x, y, 280, '#ff007f', 4), 200);
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.life -= p.decay;

            if (p.shape === 'confetti') {
                p.rot += p.rotSpeed;
            }

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        if (this.particles.length > this.maxParticles) {
            this.particles.splice(0, this.particles.length - this.maxParticles);
        }

        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.growSpeed;
            sw.alpha = 1 - (sw.radius / sw.maxRadius);

            if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
                this.shockwaves.splice(i, 1);
            }
        }

        for (const jet of this.airJets) {
            jet.pulse += 0.05;
            jet.y += jet.speedY;
        }
    }

    render(ctx) {
        ctx.save();

        for (const jet of this.airJets) {
            const currentAlpha = jet.alpha * (0.6 + 0.4 * Math.sin(jet.pulse));
            ctx.beginPath();
            ctx.arc(jet.x, jet.y, jet.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 240, 255, ${currentAlpha * 0.5})`;
            ctx.fill();
        }

        for (const sw of this.shockwaves) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, Math.max(0, sw.radius), 0, Math.PI * 2);
            ctx.strokeStyle = sw.color;
            ctx.globalAlpha = Math.max(0, sw.alpha);
            ctx.lineWidth = sw.width * sw.alpha;
            ctx.shadowColor = sw.color;
            ctx.shadowBlur = 18;
            ctx.stroke();
            ctx.restore();
        }

        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 12;

            if (p.shape === 'confetti') {
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        ctx.restore();
    }
}

// ==========================================
// 4. Table Renderer
// ==========================================
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.theme = 'cyberpunk';
        this.shakeAmount = 0;
        this.flashAlpha = 0;
        this.flashColor = '#ffffff';
        this.ledOffset = 0;
    }

    setTheme(themeName) {
        this.theme = themeName;
    }

    shake(amount = 10) {
        this.shakeAmount = Math.max(this.shakeAmount, amount);
    }

    flash(color = '#ffffff', alpha = 0.5) {
        this.flashColor = color;
        this.flashAlpha = alpha;
    }

    getThemeColors() {
        switch (this.theme) {
            case 'synthwave':
                return {
                    tableBgStart: '#140c24',
                    tableBgEnd: '#090412',
                    border: '#ff007f',
                    centerLine: '#ff007f',
                    centerCircle: '#ffe600',
                    crease: '#a855f7',
                    puckGlow: '#ffe600',
                    goals: '#ff007f',
                    grid: 'rgba(255, 0, 127, 0.08)'
                };
            case 'tokyo-neon':
                return {
                    tableBgStart: '#081a15',
                    tableBgEnd: '#020b08',
                    border: '#00ff88',
                    centerLine: '#00ff88',
                    centerCircle: '#00f0ff',
                    crease: '#00ff88',
                    puckGlow: '#00ff88',
                    goals: '#00ff88',
                    grid: 'rgba(0, 255, 136, 0.08)'
                };
            case 'lava-forge':
                return {
                    tableBgStart: '#200d08',
                    tableBgEnd: '#0d0402',
                    border: '#ff4400',
                    centerLine: '#ff4400',
                    centerCircle: '#ffe600',
                    crease: '#ff2200',
                    puckGlow: '#ff5500',
                    goals: '#ff3300',
                    grid: 'rgba(255, 68, 0, 0.09)'
                };
            case 'deep-cosmos':
                return {
                    tableBgStart: '#0b0c26',
                    tableBgEnd: '#030310',
                    border: '#b800ff',
                    centerLine: '#b800ff',
                    centerCircle: '#00f0ff',
                    crease: '#7b00ff',
                    puckGlow: '#00f0ff',
                    goals: '#b800ff',
                    grid: 'rgba(184, 0, 255, 0.08)'
                };
            case 'cyberpunk':
            default:
                return {
                    tableBgStart: '#0c1626',
                    tableBgEnd: '#040913',
                    border: '#00f0ff',
                    centerLine: '#00f0ff',
                    centerCircle: '#ff007f',
                    crease: '#00f0ff',
                    puckGlow: '#00f0ff',
                    goals: '#ff007f',
                    grid: 'rgba(0, 240, 255, 0.08)'
                };
        }
    }

    renderTable(table) {
        const ctx = this.ctx;
        const w = table.width;
        const h = table.height;
        const colors = this.getThemeColors();
        const b = table.bounds;

        this.ledOffset = (this.ledOffset + 0.5) % 40;

        ctx.save();
        if (this.shakeAmount > 0) {
            const sx = (Math.random() - 0.5) * this.shakeAmount;
            const sy = (Math.random() - 0.5) * this.shakeAmount;
            ctx.translate(sx, sy);
            this.shakeAmount *= 0.9;
            if (this.shakeAmount < 0.2) this.shakeAmount = 0;
        }

        // Table Outer Frame
        ctx.save();
        ctx.fillStyle = '#06080e';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(b.left - 24, b.top - 24, w + 48, h + 48, 28);
        } else {
            ctx.rect(b.left - 24, b.top - 24, w + 48, h + 48);
        }
        ctx.fill();

        ctx.strokeStyle = '#1a2233';
        ctx.lineWidth = 14;
        ctx.stroke();

        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([12, 12]);
        ctx.lineDashOffset = -this.ledOffset;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Main Playfield Surface
        ctx.save();
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(b.left, b.top, w, h, 16);
        } else {
            ctx.rect(b.left, b.top, w, h);
        }
        ctx.clip();

        const tableGrad = ctx.createLinearGradient(b.left, b.top, b.left, b.bottom);
        tableGrad.addColorStop(0, colors.tableBgStart);
        tableGrad.addColorStop(0.5, colors.tableBgEnd);
        tableGrad.addColorStop(1, colors.tableBgStart);
        ctx.fillStyle = tableGrad;
        ctx.fill();

        // Grid
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        const gridSize = 40;
        ctx.beginPath();
        for (let x = b.left; x <= b.right; x += gridSize) {
            ctx.moveTo(x, b.top);
            ctx.lineTo(x, b.bottom);
        }
        for (let y = b.top; y <= b.bottom; y += gridSize) {
            ctx.moveTo(b.left, y);
            ctx.lineTo(b.right, y);
        }
        ctx.stroke();

        // Neon Markings
        const centerX = b.left + w / 2;
        const centerY = b.top + h / 2;

        ctx.save();
        ctx.strokeStyle = colors.centerLine;
        ctx.lineWidth = 3;
        ctx.shadowColor = colors.centerLine;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.setLineDash([16, 12]);
        ctx.moveTo(centerX, b.top);
        ctx.lineTo(centerX, b.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        ctx.save();
        ctx.shadowColor = colors.centerCircle;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = colors.centerCircle;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, 16, 0, Math.PI * 2);
        ctx.fillStyle = colors.centerCircle;
        ctx.fill();
        ctx.restore();

        // Crease Arcs
        const creaseRadius = 110;
        ctx.save();
        ctx.strokeStyle = colors.crease;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = colors.crease;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.arc(b.left, centerY, creaseRadius, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(b.right, centerY, creaseRadius, Math.PI / 2, -Math.PI / 2);
        ctx.stroke();
        ctx.restore();

        // Goal Pockets
        const goalH = table.goalHeight;
        const goalTop = centerY - goalH / 2;

        ctx.save();
        const leftGoalGrad = ctx.createLinearGradient(b.left, centerY, b.left - 30, centerY);
        leftGoalGrad.addColorStop(0, 'rgba(255, 0, 127, 0.4)');
        leftGoalGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        ctx.fillStyle = leftGoalGrad;
        ctx.fillRect(b.left - 20, goalTop, 20, goalH);

        const rightGoalGrad = ctx.createLinearGradient(b.right, centerY, b.right + 30, centerY);
        rightGoalGrad.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
        rightGoalGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        ctx.fillStyle = rightGoalGrad;
        ctx.fillRect(b.right, goalTop, 20, goalH);
        ctx.restore();

        // Inner Border
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 3;
        ctx.shadowColor = colors.border;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(b.left, b.top, w, h, 16);
        } else {
            ctx.rect(b.left, b.top, w, h);
        }
        ctx.stroke();

        ctx.restore(); // end clip

        if (this.flashAlpha > 0) {
            ctx.save();
            ctx.fillStyle = this.flashColor;
            ctx.globalAlpha = this.flashAlpha;
            ctx.fillRect(b.left - 20, b.top - 20, w + 40, h + 40);
            ctx.restore();
            this.flashAlpha *= 0.88;
            if (this.flashAlpha < 0.02) this.flashAlpha = 0;
        }

        ctx.restore();
    }
}

// ==========================================
// 5. Entities: Puck & Mallet
// ==========================================
class Puck {
    constructor(x, y, radius = 16) {
        this.pos = new Vector2D(x, y);
        this.vel = new Vector2D(0, 0);
        this.radius = radius;
        this.trail = [];
        this.maxTrail = 16;
        this.color = '#00f0ff';
        this.glowColor = '#00f0ff';
        this.isRespawning = false;
        this.respawnTimer = 0;
        this.scale = 1.0;
    }

    reset(x, y, serveDirection = 0) {
        this.pos.set(x, y);
        this.vel.set(serveDirection * (Math.random() * 2 + 3), (Math.random() - 0.5) * 4);
        this.trail = [];
        this.isRespawning = true;
        this.respawnTimer = 1.0;
        this.scale = 0.2;
    }

    update() {
        if (this.isRespawning) {
            this.respawnTimer -= 0.05;
            this.scale = Math.min(1.0, this.scale + 0.08);
            if (this.respawnTimer <= 0) {
                this.isRespawning = false;
                this.scale = 1.0;
            }
        }

        this.trail.unshift({
            x: this.pos.x,
            y: this.pos.y,
            speed: this.vel.mag()
        });

        if (this.trail.length > this.maxTrail) {
            this.trail.pop();
        }
    }

    render(ctx) {
        const speed = this.vel.mag();

        if (this.trail.length > 1 && speed > 2) {
            ctx.save();
            for (let i = this.trail.length - 1; i >= 1; i--) {
                const p1 = this.trail[i];
                const p0 = this.trail[i - 1];
                const alpha = (1 - i / this.trail.length) * Math.min(1.0, speed / 12);
                const width = (this.radius * 2) * (1 - i / this.trail.length) * 0.85;

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p0.x, p0.y);
                ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.7})`;
                ctx.lineWidth = width;
                ctx.lineCap = 'round';
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 10 * alpha;
                ctx.stroke();
            }
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.scale(this.scale, this.scale);

        ctx.shadowColor = speed > 18 ? '#ff007f' : this.glowColor;
        ctx.shadowBlur = 14 + Math.min(20, speed);

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0d18';
        ctx.fill();

        const strokeColor = speed > 18 ? '#ff007f' : this.color;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, this.radius * 0.75);
        if (speed > 18) {
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.5, '#ff007f');
            grad.addColorStop(1, '#7a0038');
        } else {
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.4, this.color);
            grad.addColorStop(1, '#004c80');
        }

        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.restore();
    }
}

class Mallet {
    constructor(x, y, radius = 30, side = 'left', skin = 'cyber-cyan') {
        this.pos = new Vector2D(x, y);
        this.prevPos = new Vector2D(x, y);
        this.targetPos = new Vector2D(x, y);
        this.vel = new Vector2D(0, 0);
        this.radius = radius;
        this.side = side;
        this.skin = skin;
        this.bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        this.isAI = false;
        this.lerpSpeed = 0.65;
    }

    setBounds(tableBounds, tableWidth) {
        const halfWidth = tableWidth / 2;
        const r = this.radius;

        if (this.side === 'left') {
            this.bounds = {
                minX: tableBounds.left + r,
                maxX: tableBounds.left + halfWidth - r - 2,
                minY: tableBounds.top + r,
                maxY: tableBounds.bottom - r
            };
        } else {
            this.bounds = {
                minX: tableBounds.left + halfWidth + r + 2,
                maxX: tableBounds.right - r,
                minY: tableBounds.top + r,
                maxY: tableBounds.bottom - r
            };
        }
    }

    setTarget(x, y) {
        const clampedX = Math.max(this.bounds.minX, Math.min(x, this.bounds.maxX));
        const clampedY = Math.max(this.bounds.minY, Math.min(y, this.bounds.maxY));
        this.targetPos.set(clampedX, clampedY);
    }

    update() {
        this.prevPos.copy(this.pos);
        this.pos.lerp(this.targetPos, this.lerpSpeed);
        this.pos.x = Math.max(this.bounds.minX, Math.min(this.pos.x, this.bounds.maxX));
        this.pos.y = Math.max(this.bounds.minY, Math.min(this.pos.y, this.bounds.maxY));
        this.vel.set(this.pos.x - this.prevPos.x, this.pos.y - this.prevPos.y);
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);

        const skinStyles = {
            'cyber-cyan': { primary: '#00f0ff', secondary: '#0066aa', accent: '#ffffff', glow: '#00f0ff' },
            'crimson-fury': { primary: '#ff0055', secondary: '#990033', accent: '#ffe6eb', glow: '#ff0055' },
            'cyber-gold': { primary: '#ffe600', secondary: '#b39500', accent: '#ffffff', glow: '#ffe600' },
            'void-violet': { primary: '#b800ff', secondary: '#62008f', accent: '#ffd6ff', glow: '#b800ff' },
            'emerald-matrix': { primary: '#00ff66', secondary: '#008a36', accent: '#e6fff0', glow: '#00ff66' },
            'laser-flame': { primary: '#ff6600', secondary: '#b34700', accent: '#fff0e6', glow: '#ff6600' }
        };

        const theme = skinStyles[this.skin] || skinStyles['cyber-cyan'];

        ctx.shadowColor = theme.glow;
        ctx.shadowBlur = 18;

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#0f121e';
        ctx.fill();

        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = 3.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.78, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, 0.25)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const domeGrad = ctx.createRadialGradient(
            -this.radius * 0.2, -this.radius * 0.2, 2,
            0, 0, this.radius * 0.65
        );
        domeGrad.addColorStop(0, theme.accent);
        domeGrad.addColorStop(0.35, theme.primary);
        domeGrad.addColorStop(0.9, theme.secondary);
        domeGrad.addColorStop(1, '#080a10');

        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.62, 0, Math.PI * 2);
        ctx.fillStyle = domeGrad;
        ctx.fill();

        const knobGrad = ctx.createRadialGradient(
            -this.radius * 0.1, -this.radius * 0.1, 1,
            0, 0, this.radius * 0.32
        );
        knobGrad.addColorStop(0, '#ffffff');
        knobGrad.addColorStop(0.5, theme.primary);
        knobGrad.addColorStop(1, '#05070c');

        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = knobGrad;
        ctx.fill();
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }
}

// ==========================================
// 6. Physics Engine
// ==========================================
class PhysicsEngine {
    constructor(table) {
        this.table = table;
        this.subSteps = 8;
        this.friction = 0.9982;
        this.restitution = 0.94;
        this.malletRestitution = 1.15;
        this.maxPuckSpeed = 38;
        this.minPuckSpeed = 0.05;
    }

    update(puck, mallets, obstacles = [], onWallBounce, onMalletHit, onGoal) {
        const dt = 1.0 / this.subSteps;

        for (let step = 0; step < this.subSteps; step++) {
            puck.vel.mult(Math.pow(this.friction, dt));

            const speed = puck.vel.mag();
            if (speed > this.maxPuckSpeed) {
                puck.vel.normalize().mult(this.maxPuckSpeed);
            }

            puck.pos.x += puck.vel.x * dt;
            puck.pos.y += puck.vel.y * dt;

            if (obstacles && obstacles.length > 0) {
                this.handleObstacleCollisions(puck, obstacles, onWallBounce);
            }

            for (const mallet of mallets) {
                this.handleMalletPuckCollision(mallet, puck, dt, onMalletHit);
            }

            const goalScored = this.handleTableCollisions(puck, onWallBounce);
            if (goalScored) {
                if (onGoal) onGoal(goalScored);
                return;
            }
        }

        if (puck.vel.magSq() < this.minPuckSpeed * this.minPuckSpeed) {
            puck.vel.set(0, 0);
        }
    }

    handleMalletPuckCollision(mallet, puck, dt, onMalletHit) {
        const distSq = mallet.pos.distSq(puck.pos);
        const minDist = mallet.radius + puck.radius;

        if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq) || 0.001;
            const normal = new Vector2D(
                (puck.pos.x - mallet.pos.x) / dist,
                (puck.pos.y - mallet.pos.y) / dist
            );

            const overlap = minDist - dist;
            puck.pos.x += normal.x * overlap;
            puck.pos.y += normal.y * overlap;

            const relVel = new Vector2D(
                puck.vel.x - mallet.vel.x,
                puck.vel.y - mallet.vel.y
            );

            const velAlongNormal = relVel.dot(normal);

            if (velAlongNormal < 0) {
                const impulse = -(1 + this.malletRestitution) * velAlongNormal;
                puck.vel.x += normal.x * impulse;
                puck.vel.y += normal.y * impulse;

                puck.vel.x += mallet.vel.x * 0.7;
                puck.vel.y += mallet.vel.y * 0.7;

                if (puck.vel.mag() > this.maxPuckSpeed) {
                    puck.vel.normalize().mult(this.maxPuckSpeed);
                }

                const hitSpeed = puck.vel.mag();
                const intensity = Math.min(1.0, hitSpeed / 20.0);
                if (onMalletHit) {
                    onMalletHit(puck.pos.x, puck.pos.y, intensity, mallet);
                }
            }
        }
    }

    handleTableCollisions(puck, onWallBounce) {
        const t = this.table;
        const r = puck.radius;
        const goalTop = t.goalY - t.goalHeight / 2;
        const goalBottom = t.goalY + t.goalHeight / 2;

        let bounced = false;
        let normalX = 0;
        let normalY = 0;

        if (puck.pos.y - r < t.bounds.top) {
            puck.pos.y = t.bounds.top + r;
            puck.vel.y = -puck.vel.y * this.restitution;
            bounced = true;
            normalY = 1;
        } else if (puck.pos.y + r > t.bounds.bottom) {
            puck.pos.y = t.bounds.bottom - r;
            puck.vel.y = -puck.vel.y * this.restitution;
            bounced = true;
            normalY = -1;
        }

        if (puck.pos.x < t.bounds.left) {
            if (puck.pos.y >= goalTop && puck.pos.y <= goalBottom) {
                return 'player2';
            } else {
                puck.pos.x = t.bounds.left + r;
                puck.vel.x = -puck.vel.x * this.restitution;
                bounced = true;
                normalX = 1;
            }
        }

        if (puck.pos.x > t.bounds.right) {
            if (puck.pos.y >= goalTop && puck.pos.y <= goalBottom) {
                return 'player1';
            } else {
                puck.pos.x = t.bounds.right - r;
                puck.vel.x = -puck.vel.x * this.restitution;
                bounced = true;
                normalX = -1;
            }
        }

        const posts = [
            { x: t.bounds.left, y: goalTop },
            { x: t.bounds.left, y: goalBottom },
            { x: t.bounds.right, y: goalTop },
            { x: t.bounds.right, y: goalBottom }
        ];

        const postRadius = 6;
        for (const post of posts) {
            const dx = puck.pos.x - post.x;
            const dy = puck.pos.y - post.y;
            const distSq = dx * dx + dy * dy;
            const minD = r + postRadius;

            if (distSq < minD * minD) {
                const dist = Math.sqrt(distSq) || 0.001;
                const nx = dx / dist;
                const ny = dy / dist;

                puck.pos.x = post.x + nx * minD;
                puck.pos.y = post.y + ny * minD;

                const dot = puck.vel.x * nx + puck.vel.y * ny;
                if (dot < 0) {
                    puck.vel.x = (puck.vel.x - 2 * dot * nx) * this.restitution;
                    puck.vel.y = (puck.vel.y - 2 * dot * ny) * this.restitution;
                    bounced = true;
                    normalX = nx;
                    normalY = ny;
                }
            }
        }

        if (bounced && onWallBounce) {
            const speedRatio = Math.min(1.0, puck.vel.mag() / 22.0);
            onWallBounce(puck.pos.x, puck.pos.y, normalX, normalY, speedRatio);
        }

        return null;
    }

    handleObstacleCollisions(puck, obstacles, onWallBounce) {
        for (const obs of obstacles) {
            if (obs.type === 'circle') {
                const dx = puck.pos.x - obs.x;
                const dy = puck.pos.y - obs.y;
                const distSq = dx * dx + dy * dy;
                const minD = puck.radius + obs.radius;

                if (distSq < minD * minD) {
                    const dist = Math.sqrt(distSq) || 0.001;
                    const nx = dx / dist;
                    const ny = dy / dist;

                    puck.pos.x = obs.x + nx * minD;
                    puck.pos.y = obs.y + ny * minD;

                    const dot = puck.vel.x * nx + puck.vel.y * ny;
                    if (dot < 0) {
                        puck.vel.x = (puck.vel.x - 2 * dot * nx) * 1.1;
                        puck.vel.y = (puck.vel.y - 2 * dot * ny) * 1.1;
                        if (obs.onHit) obs.onHit();
                        if (onWallBounce) onWallBounce(puck.pos.x, puck.pos.y, nx, ny, 1.0);
                    }
                }
            } else if (obs.type === 'rect') {
                const halfW = obs.width / 2;
                const halfH = obs.height / 2;
                const closestX = Math.max(obs.x - halfW, Math.min(puck.pos.x, obs.x + halfW));
                const closestY = Math.max(obs.y - halfH, Math.min(puck.pos.y, obs.y + halfH));
                const dx = puck.pos.x - closestX;
                const dy = puck.pos.y - closestY;
                const distSq = dx * dx + dy * dy;

                if (distSq < puck.radius * puck.radius) {
                    const dist = Math.sqrt(distSq) || 0.001;
                    const nx = dx / dist;
                    const ny = dy / dist;

                    puck.pos.x = closestX + nx * puck.radius;
                    puck.pos.y = closestY + ny * puck.radius;

                    const dot = puck.vel.x * nx + puck.vel.y * ny;
                    if (dot < 0) {
                        puck.vel.x = (puck.vel.x - 2 * dot * nx) * 1.05;
                        puck.vel.y = (puck.vel.y - 2 * dot * ny) * 1.05;
                        if (obs.onHit) obs.onHit();
                        if (onWallBounce) onWallBounce(puck.pos.x, puck.pos.y, nx, ny, 0.9);
                    }
                }
            }
        }
    }
}

// ==========================================
// 7. AI Controller
// ==========================================
class AIController {
    constructor(mallet, difficulty = 'medium') {
        this.mallet = mallet;
        this.difficulty = difficulty;
        this.target = new Vector2D(mallet.pos.x, mallet.pos.y);
        this.homePos = new Vector2D(mallet.pos.x, mallet.pos.y);
        this.predictedPuckPos = new Vector2D(0, 0);
        this.reactionDelay = 0;
        this.reactionTimer = 0;
        this.aggressiveness = 0.5;
        this.setDifficulty(difficulty);
    }

    setDifficulty(diff) {
        this.difficulty = diff;
        switch (diff) {
            case 'easy':
                this.speed = 3.5;
                this.reactionDelay = 8;
                this.aggressiveness = 0.2;
                this.predictSteps = 10;
                break;
            case 'medium':
                this.speed = 7.0;
                this.reactionDelay = 4;
                this.aggressiveness = 0.55;
                this.predictSteps = 25;
                break;
            case 'hard':
                this.speed = 12.0;
                this.reactionDelay = 1;
                this.aggressiveness = 0.85;
                this.predictSteps = 45;
                break;
            case 'insane':
                this.speed = 18.0;
                this.reactionDelay = 0;
                this.aggressiveness = 1.0;
                this.predictSteps = 60;
                break;
        }
    }

    setHomePos(x, y) {
        this.homePos.set(x, y);
    }

    update(puck, table) {
        const isLeft = this.mallet.side === 'left';
        const puckInMyHalf = isLeft ? 
            (puck.pos.x < table.bounds.left + table.width / 2) : 
            (puck.pos.x > table.bounds.left + table.width / 2);

        const puckHeadingTowardsMe = isLeft ? (puck.vel.x < -0.5) : (puck.vel.x > 0.5);

        this.reactionTimer++;
        if (this.reactionTimer >= this.reactionDelay) {
            this.reactionTimer = 0;
            this.calculatePredictedPosition(puck, table);
        }

        if (puckInMyHalf) {
            if (this.difficulty === 'easy') {
                this.target.y = puck.pos.y;
                this.target.x = this.homePos.x + (puck.pos.x - this.homePos.x) * 0.3;
            } else {
                const targetGoalX = isLeft ? table.bounds.right : table.bounds.left;
                const targetGoalY = table.goalY + (Math.random() - 0.5) * (table.goalHeight * 0.5);
                const dirToGoal = new Vector2D(targetGoalX - puck.pos.x, targetGoalY - puck.pos.y).normalize();
                
                const attackDist = this.mallet.radius + puck.radius + 6;
                let attackX = puck.pos.x - dirToGoal.x * attackDist;
                let attackY = puck.pos.y - dirToGoal.y * attackDist;

                const isBehind = isLeft ? (puck.pos.x < this.mallet.pos.x) : (puck.pos.x > this.mallet.pos.x);
                if (isBehind) {
                    attackX = this.homePos.x;
                    attackY = puck.pos.y;
                } else if (Math.random() < this.aggressiveness) {
                    attackX = puck.pos.x + (isLeft ? 15 : -15);
                    attackY = puck.pos.y;
                }

                this.target.set(attackX, attackY);
            }
        } else {
            if (puckHeadingTowardsMe && (this.difficulty === 'hard' || this.difficulty === 'insane')) {
                this.target.x = this.homePos.x;
                this.target.y = Math.max(table.bounds.top + 50, Math.min(this.predictedPuckPos.y, table.bounds.bottom - 50));
            } else {
                this.target.x = this.homePos.x;
                this.target.y = this.homePos.y + (puck.pos.y - table.goalY) * 0.45;
            }
        }

        const currentTarget = this.mallet.targetPos;
        const diff = Vector2D.sub(this.target, currentTarget);
        if (diff.mag() > this.speed) {
            diff.normalize().mult(this.speed);
            this.mallet.setTarget(currentTarget.x + diff.x, currentTarget.y + diff.y);
        } else {
            this.mallet.setTarget(this.target.x, this.target.y);
        }
    }

    calculatePredictedPosition(puck, table) {
        let simX = puck.pos.x;
        let simY = puck.pos.y;
        let simVx = puck.vel.x;
        let simVy = puck.vel.y;

        for (let i = 0; i < this.predictSteps; i++) {
            simX += simVx;
            simY += simVy;

            if (simY - puck.radius < table.bounds.top) {
                simY = table.bounds.top + puck.radius;
                simVy = -simVy;
            } else if (simY + puck.radius > table.bounds.bottom) {
                simY = table.bounds.bottom - puck.radius;
                simVy = -simVy;
            }
        }

        this.predictedPuckPos.set(simX, simY);
    }
}

// ==========================================
// 8. Tournament & Challenges Data & Managers
// ==========================================
const TOURNAMENT_STAGES = [
    {
        id: 1,
        name: "Stage 1: Neon Rookie",
        rival: "SPARK-01",
        title: "Arcade Novice",
        avatar: "⚡",
        difficulty: "easy",
        targetScore: 5,
        arena: "cyberpunk",
        skin: "cyber-cyan",
        intro: "Welcome to the circuit, kid. Let's see if you can handle basic table physics!"
    },
    {
        id: 2,
        name: "Stage 2: Precision Master",
        rival: "COBALT VECTOR",
        title: "Bank Shot Specialist",
        avatar: "💠",
        difficulty: "medium",
        targetScore: 5,
        arena: "tokyo-neon",
        skin: "emerald-matrix",
        intro: "Every ricochet is calculated. You cannot defend against geometry."
    },
    {
        id: 3,
        name: "Stage 3: Crimson Striker",
        rival: "VIPER BLADE",
        title: "Offensive Heavyweight",
        avatar: "🔥",
        difficulty: "hard",
        targetScore: 7,
        arena: "lava-forge",
        skin: "crimson-fury",
        intro: "Hope you brought your helmet! I smash hard and I don't give second chances."
    },
    {
        id: 4,
        name: "Stage 4: Cyber Synthesizer",
        rival: "AURA PROTOCOL",
        title: "AI Defense Core",
        avatar: "🔮",
        difficulty: "hard",
        targetScore: 7,
        arena: "synthwave",
        skin: "void-violet",
        intro: "Processing opponent velocity... defensive matrix initialized."
    },
    {
        id: 5,
        name: "Grand Final: Championship",
        rival: "NEON VALKYRIE",
        title: "Cyber World Champion",
        avatar: "👑",
        difficulty: "insane",
        targetScore: 9,
        arena: "deep-cosmos",
        skin: "cyber-gold",
        intro: "Only the fastest hands and sharpest minds reach this table. Show me everything you've got!"
    }
];

class TournamentManager {
    constructor() {
        this.currentStageIndex = 0;
        this.unlockedStageIndex = 0;
        this.loadProgress();
    }

    getCurrentStage() {
        return TOURNAMENT_STAGES[this.currentStageIndex];
    }

    advanceStage() {
        if (this.currentStageIndex < TOURNAMENT_STAGES.length - 1) {
            this.currentStageIndex++;
            if (this.currentStageIndex > this.unlockedStageIndex) {
                this.unlockedStageIndex = this.currentStageIndex;
                this.saveProgress();
            }
            return true;
        }
        return false;
    }

    selectStage(index) {
        if (index <= this.unlockedStageIndex && index >= 0 && index < TOURNAMENT_STAGES.length) {
            this.currentStageIndex = index;
            return true;
        }
        return false;
    }

    saveProgress() {
        try {
            localStorage.setItem('neon_airhockey_tournament_stage', this.unlockedStageIndex.toString());
        } catch (e) {}
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('neon_airhockey_tournament_stage');
            if (saved !== null) {
                this.unlockedStageIndex = parseInt(saved, 10) || 0;
            }
        } catch (e) {}
    }
}

const CHALLENGE_LEVELS = [
    {
        id: 1,
        title: "Target Break: Fundamentals",
        description: "Smash the puck to break all 3 glowing targets within 30 seconds!",
        timeLimit: 30,
        targets: [
            { xRatio: 0.75, yRatio: 0.3, radius: 18, hit: false, points: 100 },
            { xRatio: 0.75, yRatio: 0.7, radius: 18, hit: false, points: 100 },
            { xRatio: 0.85, yRatio: 0.5, radius: 22, hit: false, points: 200 }
        ],
        obstacles: []
    },
    {
        id: 2,
        title: "Neon Bumper Pinball",
        description: "Hit the moving bumper cores to rack up combos and score into the goal!",
        timeLimit: 40,
        targets: [
            { xRatio: 0.96, yRatio: 0.5, radius: 28, hit: false, points: 500, isGoal: true }
        ],
        obstacles: [
            { type: 'circle', xRatio: 0.5, yRatio: 0.3, radius: 25, color: '#ff007f', speedY: 1.5, minRange: 0.2, maxRange: 0.8 },
            { type: 'circle', xRatio: 0.5, yRatio: 0.7, radius: 25, color: '#ff007f', speedY: -1.5, minRange: 0.2, maxRange: 0.8 },
            { type: 'circle', xRatio: 0.7, yRatio: 0.5, radius: 30, color: '#00f0ff', speedY: 0 }
        ]
    },
    {
        id: 3,
        title: "Laser Gate Ricochet",
        description: "Bank shot around impenetrable defensive barriers to hit the target orb!",
        timeLimit: 35,
        targets: [
            { xRatio: 0.9, yRatio: 0.5, radius: 20, hit: false, points: 1000 }
        ],
        obstacles: [
            { type: 'rect', xRatio: 0.65, yRatio: 0.5, width: 24, height: 180, color: '#ffe600' },
            { type: 'circle', xRatio: 0.35, yRatio: 0.25, radius: 20, color: '#ff0055' },
            { type: 'circle', xRatio: 0.35, yRatio: 0.75, radius: 20, color: '#ff0055' }
        ]
    }
];

class ChallengeManager {
    constructor() {
        this.currentLevelIndex = 0;
        this.activeTargets = [];
        this.activeObstacles = [];
        this.timeLeft = 0;
        this.score = 0;
        this.isCompleted = false;
        this.isFailed = false;
    }

    startLevel(index, tableWidth, tableHeight, tableBounds) {
        this.currentLevelIndex = index;
        const level = CHALLENGE_LEVELS[index] || CHALLENGE_LEVELS[0];
        this.timeLeft = level.timeLimit;
        this.score = 0;
        this.isCompleted = false;
        this.isFailed = false;

        this.activeTargets = level.targets.map(t => ({
            x: tableBounds.left + t.xRatio * tableWidth,
            y: tableBounds.top + t.yRatio * tableHeight,
            radius: t.radius,
            hit: false,
            points: t.points,
            isGoal: !!t.isGoal,
            color: t.isGoal ? '#00f0ff' : '#ffe600',
            pulse: Math.random() * Math.PI * 2
        }));

        this.activeObstacles = level.obstacles.map(o => {
            const obs = {
                type: o.type,
                x: tableBounds.left + o.xRatio * tableWidth,
                y: tableBounds.top + o.yRatio * tableHeight,
                color: o.color || '#ff007f',
                pulse: 0
            };
            if (o.type === 'circle') {
                obs.radius = o.radius;
                obs.speedY = o.speedY || 0;
                obs.minY = tableBounds.top + (o.minRange || 0.1) * tableHeight;
                obs.maxY = tableBounds.top + (o.maxRange || 0.9) * tableHeight;
            } else if (o.type === 'rect') {
                obs.width = o.width;
                obs.height = o.height;
            }
            return obs;
        });
    }

    update(dt, puck, onTargetHit, onLevelWin, onLevelFail) {
        if (this.isCompleted || this.isFailed) return;

        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.isFailed = true;
            if (onLevelFail) onLevelFail();
            return;
        }

        for (const obs of this.activeObstacles) {
            obs.pulse += 0.05;
            if (obs.speedY) {
                obs.y += obs.speedY;
                if (obs.y < obs.minY || obs.y > obs.maxY) {
                    obs.speedY = -obs.speedY;
                }
            }
        }

        let allHit = true;
        for (const target of this.activeTargets) {
            target.pulse += 0.08;
            if (!target.hit) {
                const distSq = (puck.pos.x - target.x) ** 2 + (puck.pos.y - target.y) ** 2;
                const minD = puck.radius + target.radius;
                if (distSq < minD * minD) {
                    target.hit = true;
                    this.score += target.points;
                    if (onTargetHit) onTargetHit(target);
                } else {
                    allHit = false;
                }
            }
        }

        if (allHit && !this.isCompleted) {
            this.isCompleted = true;
            if (onLevelWin) onLevelWin(this.score);
        }
    }

    render(ctx) {
        for (const obs of this.activeObstacles) {
            ctx.save();
            ctx.shadowColor = obs.color;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = obs.color;
            ctx.lineWidth = 3;
            ctx.fillStyle = 'rgba(20, 20, 35, 0.85)';

            if (obs.type === 'circle') {
                ctx.beginPath();
                ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(obs.x, obs.y, obs.radius * 0.4, 0, Math.PI * 2);
                ctx.fillStyle = obs.color;
                ctx.fill();
            } else if (obs.type === 'rect') {
                const halfW = obs.width / 2;
                const halfH = obs.height / 2;
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(obs.x - halfW, obs.y - halfH, obs.width, obs.height, 8);
                } else {
                    ctx.rect(obs.x - halfW, obs.y - halfH, obs.width, obs.height);
                }
                ctx.fill();
                ctx.stroke();
            }
            ctx.restore();
        }

        for (const t of this.activeTargets) {
            if (t.hit) continue;
            ctx.save();
            const scale = 1 + Math.sin(t.pulse) * 0.08;
            ctx.translate(t.x, t.y);
            ctx.scale(scale, scale);

            ctx.shadowColor = t.color;
            ctx.shadowBlur = 20;

            ctx.beginPath();
            ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
            ctx.strokeStyle = t.color;
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, 0, t.radius * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = t.color;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(0, 0, t.radius * 0.2, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            ctx.restore();
        }
    }
}

// ==========================================
// 9. Main Game Application Engine
// ==========================================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.sound = new SoundFX();
        this.particles = new ParticleSystem();
        this.renderer = new Renderer(this.canvas);
        this.tournament = new TournamentManager();
        this.challenges = new ChallengeManager();

        this.state = 'MENU';
        this.mode = 'vs_ai';
        this.targetScore = 7;
        this.difficulty = 'medium';
        this.menuSelectedDifficulty = 'medium';
        this.selectedSkin = 'cyber-cyan';
        this.selectedArena = 'cyberpunk';

        this.table = {
            width: 900,
            height: 500,
            goalHeight: 160,
            goalY: 250,
            bounds: { left: 40, right: 940, top: 40, bottom: 540 }
        };

        this.physics = new PhysicsEngine(this.table);

        this.puck = new Puck(490, 290, 16);
        this.player1 = new Mallet(200, 290, 30, 'left', this.selectedSkin);
        this.player2 = new Mallet(780, 290, 30, 'right', 'crimson-fury');
        this.ai = new AIController(this.player2, this.difficulty);

        this.scoreP1 = 0;
        this.scoreP2 = 0;
        this.lastScorer = null;
        this.goalCelebrationTimer = 0;

        this.keys = {};
        this.lastTime = 0;
        this.timeScale = 1.0;
        this.targetTimeScale = 1.0;

        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.setupEventListeners();
        this.setupUI();
        this.particles.initAirJets(this.canvas.width, this.canvas.height);

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    resizeCanvas() {
        const container = document.getElementById('canvas-wrapper');
        if (!container) return;

        this.canvas.width = 980;
        this.canvas.height = 580;

        this.table.width = 900;
        this.table.height = 500;
        this.table.bounds = {
            left: 40,
            right: 940,
            top: 40,
            bottom: 540
        };
        this.table.goalY = 290;
        this.table.goalHeight = 160;

        this.player1.setBounds(this.table.bounds, this.table.width);
        this.player2.setBounds(this.table.bounds, this.table.width);
        this.ai.setHomePos(this.table.bounds.right - 90, this.table.goalY);
    }

    startMatch(mode, options = {}) {
        this.sound.resume();
        this.sound.startBGM();

        this.mode = mode;
        this.scoreP1 = 0;
        this.scoreP2 = 0;
        this.timeScale = 1.0;

        if (mode === 'vs_ai') {
            this.difficulty = options.difficulty || this.menuSelectedDifficulty || 'medium';
            this.targetScore = options.targetScore || 7;
            this.ai.setDifficulty(this.difficulty);
            this.player2.isAI = true;
            this.player2.skin = 'crimson-fury';
            this.player1.skin = this.selectedSkin;
            this.renderer.setTheme(this.selectedArena);
            this.updateHUDTitles("PLAYER", `AI (${this.difficulty.toUpperCase()})`);
        } else if (mode === 'pvp') {
            this.targetScore = options.targetScore || 7;
            this.player2.isAI = false;
            this.player1.skin = this.selectedSkin;
            this.player2.skin = 'crimson-fury';
            this.renderer.setTheme(this.selectedArena);
            this.updateHUDTitles("PLAYER 1 (WASD/Touch)", "PLAYER 2 (Arrows/Touch)");
        } else if (mode === 'tournament') {
            const stage = this.tournament.getCurrentStage();
            this.targetScore = stage.targetScore;
            this.ai.setDifficulty(stage.difficulty);
            this.player2.isAI = true;
            this.player2.skin = stage.skin;
            this.player1.skin = this.selectedSkin;
            this.renderer.setTheme(stage.arena);
            this.updateHUDTitles("PLAYER", `${stage.rival} (${stage.title})`);
        } else if (mode === 'challenge') {
            const levelIdx = options.levelIndex || 0;
            this.challenges.startLevel(levelIdx, this.table.width, this.table.height, this.table.bounds);
            this.player2.isAI = false;
            this.player2.pos.set(2000, 2000);
            this.player1.skin = this.selectedSkin;
            this.renderer.setTheme(this.selectedArena);
            this.updateHUDTitles("CHALLENGE SCORE", "TIME LEFT");
        }

        this.resetPositions(0);
        this.updateHUDScore();
        this.showScreen('game-screen');
        this.resizeCanvas();
        this.startCountdown();
    }

    startCountdown() {
        this.state = 'COUNTDOWN';
        const overlay = document.getElementById('match-countdown');
        const textEl = document.getElementById('countdown-text');
        if (!overlay || !textEl) {
            this.state = 'PLAYING';
            return;
        }

        overlay.classList.add('active');
        let step = 3;
        textEl.textContent = step;
        textEl.className = 'countdown-text count-pop';
        this.sound.playBeep(false);

        const countInterval = setInterval(() => {
            step--;
            if (step > 0) {
                textEl.textContent = step;
                textEl.className = 'countdown-text';
                void textEl.offsetWidth;
                textEl.className = 'countdown-text count-pop';
                this.sound.playBeep(false);
            } else if (step === 0) {
                textEl.textContent = 'GO!';
                textEl.className = 'countdown-text count-go';
                this.sound.playBeep(true);
            } else {
                clearInterval(countInterval);
                overlay.classList.remove('active');
                this.state = 'PLAYING';
            }
        }, 650);
    }

    resetPositions(serveDirection = 0) {
        const centerY = this.table.goalY;
        this.player1.pos.set(this.table.bounds.left + 120, centerY);
        this.player1.targetPos.copy(this.player1.pos);
        this.player1.vel.set(0, 0);

        if (this.mode !== 'challenge') {
            this.player2.pos.set(this.table.bounds.right - 120, centerY);
            this.player2.targetPos.copy(this.player2.pos);
            this.player2.vel.set(0, 0);
        }

        const centerX = this.table.bounds.left + this.table.width / 2;
        this.puck.reset(centerX, centerY, serveDirection);
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                this.togglePause();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.state !== 'PLAYING' && this.state !== 'COUNTDOWN' && this.state !== 'GOAL_CELEBRATION') return;
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;

            if (this.mode === 'vs_ai' || this.mode === 'tournament' || this.mode === 'challenge') {
                this.player1.setTarget(mouseX, mouseY);
            } else if (this.mode === 'pvp') {
                if (mouseX < this.table.bounds.left + this.table.width / 2) {
                    this.player1.setTarget(mouseX, mouseY);
                } else {
                    this.player2.setTarget(mouseX, mouseY);
                }
            }
        });

        const handleTouch = (e) => {
            e.preventDefault();
            if (this.state !== 'PLAYING' && this.state !== 'COUNTDOWN' && this.state !== 'GOAL_CELEBRATION') return;
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;

            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                const tx = (touch.clientX - rect.left) * scaleX;
                const ty = (touch.clientY - rect.top) * scaleY;
                const midX = this.table.bounds.left + this.table.width / 2;

                if (tx < midX) {
                    this.player1.setTarget(tx, ty);
                } else if (this.mode === 'pvp') {
                    this.player2.setTarget(tx, ty);
                }
            }
        };

        this.canvas.addEventListener('touchstart', handleTouch, { passive: false });
        this.canvas.addEventListener('touchmove', handleTouch, { passive: false });
    }

    handleKeyboardInput() {
        const p1Speed = 14;
        const p2Speed = 14;

        let p1X = this.player1.targetPos.x;
        let p1Y = this.player1.targetPos.y;

        if (this.keys['w'] || this.keys['W']) p1Y -= p1Speed;
        if (this.keys['s'] || this.keys['S']) p1Y += p1Speed;
        if (this.keys['a'] || this.keys['A']) p1X -= p1Speed;
        if (this.keys['d'] || this.keys['D']) p1X += p1Speed;
        if (this.keys['w'] || this.keys['W'] || this.keys['s'] || this.keys['S'] || this.keys['a'] || this.keys['A'] || this.keys['d'] || this.keys['D']) {
            this.player1.setTarget(p1X, p1Y);
        }

        if (this.mode === 'pvp' && !this.player2.isAI) {
            let p2X = this.player2.targetPos.x;
            let p2Y = this.player2.targetPos.y;

            if (this.keys['ArrowUp']) p2Y -= p2Speed;
            if (this.keys['ArrowDown']) p2Y += p2Speed;
            if (this.keys['ArrowLeft']) p2X -= p2Speed;
            if (this.keys['ArrowRight']) p2X += p2Speed;
            if (this.keys['ArrowUp'] || this.keys['ArrowDown'] || this.keys['ArrowLeft'] || this.keys['ArrowRight']) {
                this.player2.setTarget(p2X, p2Y);
            }
        }
    }

    update(dt) {
        this.particles.update();

        this.timeScale += (this.targetTimeScale - this.timeScale) * 0.1;
        const effectiveDt = dt * this.timeScale;

        if (this.state === 'PAUSED') return;

        if (this.state === 'COUNTDOWN') {
            this.handleKeyboardInput();
            this.player1.update();
            if (this.mode !== 'challenge') {
                this.player2.update();
            }
            return;
        }

        if (this.state === 'GOAL_CELEBRATION') {
            this.goalCelebrationTimer -= dt;
            if (this.goalCelebrationTimer <= 0) {
                this.targetTimeScale = 1.0;
                this.checkMatchEnd();
            }
            return;
        }

        if (this.state !== 'PLAYING') return;

        this.handleKeyboardInput();

        this.player1.update();
        if (this.mode !== 'challenge') {
            if (this.player2.isAI) {
                this.ai.update(this.puck, this.table);
            }
            this.player2.update();
        }

        this.puck.update();

        if (this.mode === 'challenge') {
            this.challenges.update(
                dt,
                this.puck,
                (target) => {
                    this.sound.playSmash();
                    this.particles.createHitSparks(target.x, target.y, 30, target.color, 1.2);
                    this.renderer.shake(8);
                },
                (score) => this.onChallengeWon(score),
                () => this.onChallengeFailed()
            );

            this.updateHUDChallenge(this.challenges.score, this.challenges.timeLeft);

            this.physics.update(
                this.puck,
                [this.player1],
                this.challenges.activeObstacles,
                (x, y, nx, ny, speedRatio) => {
                    this.sound.playWallBounce(speedRatio);
                    this.particles.createWallBounceSparks(x, y, nx, ny, '#00f0ff', speedRatio);
                },
                (x, y, intensity) => {
                    this.sound.playHit(intensity);
                    this.particles.createHitSparks(x, y, 20, '#00f0ff', intensity);
                    if (intensity > 0.7) {
                        this.sound.playSmash();
                        this.renderer.shake(intensity * 12);
                    }
                },
                null
            );
        } else {
            this.physics.update(
                this.puck,
                [this.player1, this.player2],
                [],
                (x, y, nx, ny, speedRatio) => {
                    this.sound.playWallBounce(speedRatio);
                    this.particles.createWallBounceSparks(x, y, nx, ny, '#00f0ff', speedRatio);
                },
                (x, y, intensity, mallet) => {
                    this.sound.playHit(intensity);
                    const sparkColor = mallet.side === 'left' ? '#00f0ff' : '#ff0055';
                    this.particles.createHitSparks(x, y, 20, sparkColor, intensity);
                    if (intensity > 0.7) {
                        this.sound.playSmash();
                        this.renderer.shake(intensity * 14);
                    }
                },
                (scorer) => this.onGoalScored(scorer)
            );
        }
    }

    onGoalScored(scorer) {
        this.lastScorer = scorer;
        this.state = 'GOAL_CELEBRATION';
        this.goalCelebrationTimer = 1.6;
        this.targetTimeScale = 0.25;

        if (scorer === 'player1') {
            this.scoreP1++;
            this.sound.playGoal(true);
            this.particles.createGoalCelebration(this.table.bounds.right, this.table.goalY, '#00f0ff');
            this.renderer.flash('#00f0ff', 0.6);
            this.showGoalBanner("GOAL! PLAYER 1 SCORED!", "#00f0ff");
        } else {
            this.scoreP2++;
            this.sound.playGoal(false);
            this.particles.createGoalCelebration(this.table.bounds.left, this.table.goalY, '#ff007f');
            this.renderer.flash('#ff007f', 0.6);
            const p2Name = this.mode === 'pvp' ? "PLAYER 2" : "OPPONENT";
            this.showGoalBanner(`GOAL! ${p2Name} SCORED!`, "#ff007f");
        }

        this.renderer.shake(20);
        this.updateHUDScore();
    }

    showGoalBanner(text, color) {
        const banner = document.getElementById('goal-banner');
        banner.textContent = text;
        banner.style.color = color;
        banner.style.textShadow = `0 0 25px ${color}`;
        banner.classList.add('show');
        setTimeout(() => {
            banner.classList.remove('show');
        }, 1400);
    }

    checkMatchEnd() {
        if (this.scoreP1 >= this.targetScore || this.scoreP2 >= this.targetScore) {
            this.state = 'GAME_OVER';
            const p1Won = this.scoreP1 >= this.targetScore;

            if (p1Won) {
                this.sound.playWin();
            } else {
                this.sound.playLose();
            }

            if (this.mode === 'tournament') {
                if (p1Won) {
                    const advanced = this.tournament.advanceStage();
                    this.showVictoryModal(true, advanced ? "STAGE CLEARED! NEXT RIVAL UNLOCKED!" : "CHAMPIONSHIP CONQUERED!");
                } else {
                    this.showVictoryModal(false, "DEFEATED IN TOURNAMENT MATCH");
                }
            } else {
                const winnerName = p1Won ? "PLAYER 1" : (this.mode === 'pvp' ? "PLAYER 2" : "AI OPPONENT");
                this.showVictoryModal(p1Won, `${winnerName} WINS THE MATCH!`);
            }
        } else {
            const serveDir = this.lastScorer === 'player1' ? 1 : -1;
            this.resetPositions(serveDir);
            this.state = 'PLAYING';
        }
    }

    onChallengeWon(score) {
        this.sound.playWin();
        this.state = 'GAME_OVER';
        this.showVictoryModal(true, `CHALLENGE COMPLETE! SCORE: ${score}`);
    }

    onChallengeFailed() {
        this.sound.playLose();
        this.state = 'GAME_OVER';
        this.showVictoryModal(false, "TIME EXPIRED! CHALLENGE FAILED");
    }

    render() {
        this.ctx.fillStyle = '#03060c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.renderer.renderTable(this.table);

        if (this.mode === 'challenge') {
            this.challenges.render(this.ctx);
        }

        this.puck.render(this.ctx);

        this.player1.render(this.ctx);
        if (this.mode !== 'challenge') {
            this.player2.render(this.ctx);
        }

        this.particles.render(this.ctx);
    }

    gameLoop(time) {
        const dt = Math.min((time - this.lastTime) / 1000, 0.05);
        this.lastTime = time;

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(screenId);
        if (target) {
            target.classList.add('active');
            if (screenId === 'game-screen') {
                this.resizeCanvas();
            }
        }
    }

    updateHUDTitles(p1Text, p2Text) {
        document.getElementById('hud-p1-name').textContent = p1Text;
        document.getElementById('hud-p2-name').textContent = p2Text;
    }

    updateHUDScore() {
        document.getElementById('hud-p1-score').textContent = this.scoreP1;
        document.getElementById('hud-p2-score').textContent = this.scoreP2;
    }

    updateHUDChallenge(score, timeLeft) {
        document.getElementById('hud-p1-score').textContent = score;
        document.getElementById('hud-p2-score').textContent = Math.ceil(timeLeft) + 's';
    }

    togglePause() {
        if (this.state === 'PLAYING' || this.state === 'COUNTDOWN') {
            this.state = 'PAUSED';
            document.getElementById('pause-modal').classList.add('active');
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            document.getElementById('pause-modal').classList.remove('active');
        }
    }

    showVictoryModal(isWin, message) {
        const modal = document.getElementById('victory-modal');
        const title = document.getElementById('victory-title');
        const subtitle = document.getElementById('victory-subtitle');
        const p1Final = document.getElementById('victory-p1-score');
        const p2Final = document.getElementById('victory-p2-score');

        title.textContent = isWin ? "VICTORY!" : "DEFEAT";
        title.style.color = isWin ? '#00f0ff' : '#ff0055';
        title.style.textShadow = `0 0 30px ${isWin ? '#00f0ff' : '#ff0055'}`;
        subtitle.textContent = message;

        if (this.mode === 'challenge') {
            p1Final.textContent = `Score: ${this.challenges.score}`;
            p2Final.textContent = ``;
        } else {
            p1Final.textContent = `P1: ${this.scoreP1}`;
            p2Final.textContent = `P2: ${this.scoreP2}`;
        }

        modal.classList.add('active');
    }

    setupUI() {
        // Main Menu Difficulty Pills
        const diffPills = document.querySelectorAll('#menu-diff-pills .diff-pill');
        diffPills.forEach(pill => {
            pill.addEventListener('click', (e) => {
                e.stopPropagation();
                this.sound.playUiClick();
                diffPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.menuSelectedDifficulty = pill.dataset.diff;
                const radio = document.querySelector(`input[name="diff-option"][value="${this.menuSelectedDifficulty}"]`);
                if (radio) radio.checked = true;
            });
        });

        // Quick Match Direct Start
        document.getElementById('btn-quick-match').addEventListener('click', () => {
            this.sound.playUiClick();
            this.startMatch('vs_ai', { difficulty: this.menuSelectedDifficulty, targetScore: 7 });
        });

        // Custom Match Setup Screen Open
        const btnCustom = document.getElementById('btn-custom-match');
        if (btnCustom) {
            btnCustom.addEventListener('click', () => {
                this.sound.playUiClick();
                this.showScreen('quickmatch-screen');
            });
        }

        // HUD Quick Pause Button
        const btnHudPause = document.getElementById('btn-hud-pause');
        if (btnHudPause) {
            btnHudPause.addEventListener('click', () => {
                this.sound.playUiClick();
                this.togglePause();
            });
        }

        // 2-Player Local
        document.getElementById('btn-pvp-match').addEventListener('click', () => {
            this.sound.playUiClick();
            this.startMatch('pvp', { targetScore: 7 });
        });

        // Tournament
        document.getElementById('btn-tournament').addEventListener('click', () => {
            this.sound.playUiClick();
            this.renderTournamentLadder();
            this.showScreen('tournament-screen');
        });

        // Challenges
        document.getElementById('btn-challenges').addEventListener('click', () => {
            this.sound.playUiClick();
            this.renderChallengeList();
            this.showScreen('challenges-screen');
        });

        // Locker Customization
        document.getElementById('btn-customization').addEventListener('click', () => {
            this.sound.playUiClick();
            this.showScreen('customization-screen');
        });

        // Custom Match Start
        document.getElementById('btn-start-quickmatch').addEventListener('click', () => {
            this.sound.playUiClick();
            const diff = document.querySelector('input[name="diff-option"]:checked').value;
            const score = parseInt(document.querySelector('input[name="score-option"]:checked').value, 10);
            this.startMatch('vs_ai', { difficulty: diff, targetScore: score });
        });

        // Radio change sync
        document.querySelectorAll('input[name="diff-option"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.menuSelectedDifficulty = e.target.value;
                diffPills.forEach(p => p.classList.toggle('active', p.dataset.diff === e.target.value));
            });
        });

        // Back Buttons
        document.querySelectorAll('.btn-back-menu').forEach(btn => {
            btn.addEventListener('click', () => {
                this.sound.playUiClick();
                document.getElementById('victory-modal').classList.remove('active');
                document.getElementById('pause-modal').classList.remove('active');
                const overlay = document.getElementById('match-countdown');
                if (overlay) overlay.classList.remove('active');
                this.state = 'MENU';
                this.showScreen('main-menu-screen');
            });
        });

        // Pause Modal Controls
        document.getElementById('btn-resume').addEventListener('click', () => {
            this.sound.playUiClick();
            this.togglePause();
        });

        document.getElementById('btn-restart').addEventListener('click', () => {
            this.sound.playUiClick();
            document.getElementById('pause-modal').classList.remove('active');
            document.getElementById('victory-modal').classList.remove('active');
            this.startMatch(this.mode, { difficulty: this.difficulty, targetScore: this.targetScore });
        });

        document.getElementById('btn-victory-restart').addEventListener('click', () => {
            this.sound.playUiClick();
            document.getElementById('victory-modal').classList.remove('active');
            this.startMatch(this.mode, { difficulty: this.difficulty, targetScore: this.targetScore });
        });

        // Audio & Music Toggles
        document.getElementById('btn-toggle-sound').addEventListener('click', (e) => {
            const on = this.sound.toggleSound();
            e.currentTarget.textContent = `Sound: ${on ? 'ON' : 'OFF'}`;
            e.currentTarget.classList.toggle('off', !on);
        });

        document.getElementById('btn-toggle-music').addEventListener('click', (e) => {
            const on = this.sound.toggleMusic();
            e.currentTarget.textContent = `Music: ${on ? 'ON' : 'OFF'}`;
            e.currentTarget.classList.toggle('off', !on);
        });

        // Skin Selectors in Locker
        document.querySelectorAll('.skin-card').forEach(card => {
            card.addEventListener('click', () => {
                this.sound.playUiClick();
                document.querySelectorAll('.skin-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedSkin = card.dataset.skin;
                this.player1.skin = this.selectedSkin;
            });
        });

        // Arena Selectors in Locker
        document.querySelectorAll('.arena-card').forEach(card => {
            card.addEventListener('click', () => {
                this.sound.playUiClick();
                document.querySelectorAll('.arena-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedArena = card.dataset.arena;
                this.renderer.setTheme(this.selectedArena);
            });
        });
    }

    renderTournamentLadder() {
        const container = document.getElementById('tournament-stages-container');
        container.innerHTML = '';

        TOURNAMENT_STAGES.forEach((stage, idx) => {
            const isUnlocked = idx <= this.tournament.unlockedStageIndex;
            const isCurrent = idx === this.tournament.currentStageIndex;

            const card = document.createElement('div');
            card.className = `tournament-card ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'selected' : ''}`;
            card.innerHTML = `
                <div class="stage-avatar">${isUnlocked ? stage.avatar : '🔒'}</div>
                <div class="stage-info">
                    <div class="stage-title">${stage.name}</div>
                    <div class="stage-rival">${stage.rival} — <span>${stage.title}</span></div>
                    <div class="stage-meta">Difficulty: <strong>${stage.difficulty.toUpperCase()}</strong> | Target: <strong>${stage.targetScore} pts</strong></div>
                    <div class="stage-intro">"${stage.intro}"</div>
                </div>
                ${isUnlocked ? `<button class="btn btn-primary btn-play-stage" data-idx="${idx}">PLAY STAGE</button>` : `<div class="locked-badge">LOCKED</div>`}
            `;

            if (isUnlocked) {
                card.querySelector('.btn-play-stage').addEventListener('click', () => {
                    this.tournament.selectStage(idx);
                    this.startMatch('tournament');
                });
            }

            container.appendChild(card);
        });
    }

    renderChallengeList() {
        const container = document.getElementById('challenges-container');
        container.innerHTML = '';

        CHALLENGE_LEVELS.forEach((level, idx) => {
            const card = document.createElement('div');
            card.className = 'challenge-card';
            card.innerHTML = `
                <div class="challenge-num">0${level.id}</div>
                <div class="challenge-info">
                    <div class="challenge-title">${level.title}</div>
                    <div class="challenge-desc">${level.description}</div>
                    <div class="challenge-time">⏱ Time Limit: ${level.timeLimit}s</div>
                </div>
                <button class="btn btn-primary btn-play-challenge" data-idx="${idx}">START CHALLENGE</button>
            `;

            card.querySelector('.btn-play-challenge').addEventListener('click', () => {
                this.startMatch('challenge', { levelIndex: idx });
            });

            container.appendChild(card);
        });
    }
}

// Instantiate Game on DOM Ready or immediately if DOM is already ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.game = new Game();
    });
} else {
    window.game = new Game();
}
