/**
 * Particle and Visual Effects System for Neon Air Hockey
 */
export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.shockwaves = [];
        this.sparks = [];
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
                sparkle: Math.random() > 0.5,
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
        // Massive burst of fireworks / neon confetti
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

        // Multi-ring shockwaves
        this.createShockwave(x, y, 160, color, 8);
        setTimeout(() => this.createShockwave(x, y, 220, '#ffffff', 5), 100);
        setTimeout(() => this.createShockwave(x, y, 280, '#ff007f', 4), 200);
    }

    update() {
        // Update particles
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

        // Keep cap
        if (this.particles.length > this.maxParticles) {
            this.particles.splice(0, this.particles.length - this.maxParticles);
        }

        // Update shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.growSpeed;
            sw.alpha = 1 - (sw.radius / sw.maxRadius);

            if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
                this.shockwaves.splice(i, 1);
            }
        }

        // Update air jets
        for (const jet of this.airJets) {
            jet.pulse += 0.05;
            jet.y += jet.speedY;
        }
    }

    render(ctx) {
        ctx.save();

        // Render air jets
        for (const jet of this.airJets) {
            const currentAlpha = jet.alpha * (0.6 + 0.4 * Math.sin(jet.pulse));
            ctx.beginPath();
            ctx.arc(jet.x, jet.y, jet.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 240, 255, ${currentAlpha * 0.5})`;
            ctx.fill();
        }

        // Render shockwaves
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

        // Render particles
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
            } else if (p.shape === 'spark') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        ctx.restore();
    }

    clear() {
        this.particles = [];
        this.shockwaves = [];
    }
}
